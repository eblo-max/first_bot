#!/usr/bin/env node

/**
 * Скрипт для постепенной миграции JavaScript файлов в TypeScript
 * Анализирует код и предлагает безопасные изменения
 */

const fs = require('fs').promises;
const path = require('path');

// Конфигурация миграции
const MIGRATION_CONFIG = {
    // Папки для анализа
    targetDirs: ['src', 'public', 'scripts'],

    // Исключения
    excludeFiles: [
        'node_modules',
        'dist',
        'build',
        'coverage',
        'test-results',
        '.git'
    ],

    // Приоритет миграции (от простого к сложному)
    migrationPriority: {
        'utils': 1,     // Утилиты первыми
        'models': 2,    // Модели данных
        'services': 3,  // Сервисы
        'controllers': 4, // Контроллеры
        'routes': 5,    // Маршруты
        'middleware': 6, // Мидлвары
        'public': 7     // Клиентский код последним
    }
};

// Анализаторы кода
class CodeAnalyzer {
    static analyzeComplexity(content) {
        const metrics = {
            linesOfCode: content.split('\\n').length,
            functions: (content.match(/function\s+\w+/g) || []).length,
            arrowFunctions: (content.match(/=>\s*{/g) || []).length,
            classes: (content.match(/class\s+\w+/g) || []).length,
            imports: (content.match(/(?:import|require)\s*\(/g) || []).length,
            exports: (content.match(/(?:export|module\.exports)/g) || []).length,
            asyncFunctions: (content.match(/async\s+function|async\s*\(/g) || []).length
        };

        // Вычисляем сложность (0-100)
        const complexity = Math.min(100,
            metrics.linesOfCode * 0.1 +
            metrics.functions * 2 +
            metrics.arrowFunctions * 1.5 +
            metrics.classes * 3 +
            metrics.asyncFunctions * 2
        );

        return { metrics, complexity: Math.round(complexity) };
    }

    static detectTypeAnnotations(content) {
        const patterns = [
            /:\s*string/g,
            /:\s*number/g,
            /:\s*boolean/g,
            /:\s*object/g,
            /:\s*any/g,
            /<.*>/g,  // Generics
            /interface\s+\w+/g,
            /type\s+\w+/g
        ];

        return patterns.some(pattern => pattern.test(content));
    }

    static findPotentialTypes(content) {
        const suggestions = [];

        // Поиск функций без типов
        const functionMatches = content.match(/function\s+(\w+)\s*\([^)]*\)/g);
        if (functionMatches) {
            functionMatches.forEach(match => {
                if (!/:/.test(match)) {
                    suggestions.push({
                        type: 'function',
                        suggestion: `Добавить типы параметров и возвращаемого значения для ${match}`,
                        priority: 'medium'
                    });
                }
            });
        }

        // Поиск переменных с неявными типами
        const varMatches = content.match(/(let|const|var)\s+(\w+)\s*=\s*([^;\\n]+)/g);
        if (varMatches) {
            varMatches.forEach(match => {
                if (match.includes('null') || match.includes('undefined')) {
                    suggestions.push({
                        type: 'variable',
                        suggestion: `Рассмотреть явное типизирование для ${match}`,
                        priority: 'low'
                    });
                }
            });
        }

        return suggestions;
    }
}

// Основной класс миграции
class TypeScriptMigrator {
    constructor() {
        this.analysisResults = [];
        this.migrationPlan = [];
    }

    async analyzeProject() {
        console.log('🔍 АНАЛИЗ ПРОЕКТА ДЛЯ МИГРАЦИИ В TYPESCRIPT\\n');

        for (const dir of MIGRATION_CONFIG.targetDirs) {
            await this.analyzeDirectory(dir);
        }

        this.generateMigrationPlan();
        this.printAnalysisReport();
    }

    async analyzeDirectory(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory() && !MIGRATION_CONFIG.excludeFiles.includes(entry.name)) {
                    await this.analyzeDirectory(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    await this.analyzeFile(fullPath);
                }
            }
        } catch (error) {
            console.error(`❌ Ошибка при анализе директории ${dirPath}:`, error.message);
        }
    }

    async analyzeFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const analysis = CodeAnalyzer.analyzeComplexity(content);
            const hasTypes = CodeAnalyzer.detectTypeAnnotations(content);
            const suggestions = CodeAnalyzer.findPotentialTypes(content);

            // Определяем приоритет на основе пути
            const priority = this.calculatePriority(filePath);

            const fileAnalysis = {
                path: filePath,
                relativePath: path.relative(process.cwd(), filePath),
                size: content.length,
                complexity: analysis.complexity,
                metrics: analysis.metrics,
                hasTypeAnnotations: hasTypes,
                suggestions: suggestions,
                priority: priority,
                migrationDifficulty: this.calculateMigrationDifficulty(analysis.complexity, hasTypes, suggestions.length),
                recommendedAction: this.getRecommendedAction(analysis.complexity, hasTypes, suggestions.length)
            };

            this.analysisResults.push(fileAnalysis);
        } catch (error) {
            console.error(`❌ Ошибка при анализе файла ${filePath}:`, error.message);
        }
    }

    calculatePriority(filePath) {
        for (const [pathSegment, priority] of Object.entries(MIGRATION_CONFIG.migrationPriority)) {
            if (filePath.includes(pathSegment)) {
                return priority;
            }
        }
        return 10; // Низкий приоритет для неизвестных файлов
    }

    calculateMigrationDifficulty(complexity, hasTypes, suggestionsCount) {
        if (hasTypes) return 'already-typed';
        if (complexity < 20 && suggestionsCount < 3) return 'easy';
        if (complexity < 50 && suggestionsCount < 8) return 'medium';
        return 'hard';
    }

    getRecommendedAction(complexity, hasTypes, suggestionsCount) {
        if (hasTypes) return 'rename-to-ts';
        if (complexity < 20) return 'migrate-immediately';
        if (complexity < 50) return 'migrate-with-planning';
        return 'migrate-incrementally';
    }

    generateMigrationPlan() {
        // Сортируем файлы по приоритету и сложности
        this.migrationPlan = this.analysisResults
            .sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.complexity - b.complexity;
            });
    }

    printAnalysisReport() {
        console.log('📊 ОТЧЕТ АНАЛИЗА МИГРАЦИИ\\n');

        // Общая статистика
        const total = this.analysisResults.length;
        const byDifficulty = this.analysisResults.reduce((acc, file) => {
            acc[file.migrationDifficulty] = (acc[file.migrationDifficulty] || 0) + 1;
            return acc;
        }, {});

        console.log(`📁 Всего JavaScript файлов: ${total}`);
        console.log(`🟢 Легкая миграция: ${byDifficulty['easy'] || 0} файлов`);
        console.log(`🟡 Средняя сложность: ${byDifficulty['medium'] || 0} файлов`);
        console.log(`🔴 Сложная миграция: ${byDifficulty['hard'] || 0} файлов`);
        console.log(`✅ Уже типизированы: ${byDifficulty['already-typed'] || 0} файлов\\n`);

        // План миграции
        console.log('🗺️ ПЛАН МИГРАЦИИ (по приоритету):\\n');

        this.migrationPlan.forEach((file, index) => {
            const difficultyIcon = {
                'easy': '🟢',
                'medium': '🟡',
                'hard': '🔴',
                'already-typed': '✅'
            }[file.migrationDifficulty];

            console.log(`${index + 1}. ${difficultyIcon} ${file.relativePath}`);
            console.log(`   Сложность: ${file.complexity}/100 | Действие: ${file.recommendedAction}`);
            if (file.suggestions.length > 0) {
                console.log(`   💡 Предложений по улучшению: ${file.suggestions.length}`);
            }
            console.log('');
        });

        // Рекомендации
        this.printRecommendations();
    }

    printRecommendations() {
        console.log('💡 РЕКОМЕНДАЦИИ ПО МИГРАЦИИ:\\n');

        console.log('1. 🚀 НЕМЕДЛЕННАЯ МИГРАЦИЯ (файлы с низкой сложностью):');
        const easyFiles = this.migrationPlan.filter(f => f.migrationDifficulty === 'easy').slice(0, 5);
        easyFiles.forEach(file => {
            console.log(`   • ${file.relativePath}`);
        });

        console.log('\\n2. 📋 СЛЕДУЮЩИЙ ЭТАП (средняя сложность):');
        const mediumFiles = this.migrationPlan.filter(f => f.migrationDifficulty === 'medium').slice(0, 3);
        mediumFiles.forEach(file => {
            console.log(`   • ${file.relativePath}`);
        });

        console.log('\\n3. 🔧 КОМАНДЫ ДЛЯ НАЧАЛА МИГРАЦИИ:');
        console.log('   npm run ts:check          # Проверка типов без компиляции');
        console.log('   npm run ts:check-js       # Проверка JS файлов на совместимость');
        console.log('   npm run type-check:watch  # Мониторинг типов в реальном времени');
        console.log('   npm run ts:build          # Компиляция проекта');

        console.log('\\n4. 🎯 СТРАТЕГИЯ ВНЕДРЕНИЯ:');
        console.log('   • Начните с утилит и вспомогательных функций');
        console.log('   • Добавляйте типы постепенно, не нарушая работоспособность');
        console.log('   • Используйте "any" как временное решение для сложных случаев');
        console.log('   • Активируйте строгие проверки по мере готовности кода');

        console.log('\\n✨ Миграция завершена! Начните с самых простых файлов.');
    }
}

// Запуск анализа
async function main() {
    try {
        const migrator = new TypeScriptMigrator();
        await migrator.analyzeProject();
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

// Запуск, если файл вызван напрямую
if (require.main === module) {
    main();
}

module.exports = { TypeScriptMigrator, CodeAnalyzer }; 