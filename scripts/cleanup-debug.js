/**
 * Скрипт очистки debug информации
 * Автоматическое удаление console.log, debugger и других debug statements
 */

const fs = require('fs').promises;
const path = require('path');

class DebugCleaner {
    constructor() {
        this.processedFiles = 0;
        this.cleanedStatements = 0;
        this.patterns = {
            // Console statements (сохраняем только error и warn в production)
            console: {
                // Удаляем полностью
                remove: [
                    /console\.log\s*\([^)]*\)\s*;?\s*$/gm,
                    /console\.debug\s*\([^)]*\)\s*;?\s*$/gm,
                    /console\.info\s*\([^)]*\)\s*;?\s*$/gm,
                    /console\.trace\s*\([^)]*\)\s*;?\s*$/gm,
                    /console\.table\s*\([^)]*\)\s*;?\s*$/gm
                ],
                // Комментируем (для возможного восстановления) только критичные
                comment: [
                    /console\.error\s*\([^)]*\)\s*;?\s*$/gm
                ],
                // Полностью удаляем warn в production
                removeWarn: [
                    /console\.warn\s*\([^)]*\)\s*;?\s*$/gm
                ]
            },

            debugger: [
                /debugger\s*;?\s*$/gm
            ],

            // Alert, confirm, prompt
            dialogs: [
                /alert\s*\([^)]*\)\s*;?\s*$/gm,
                /confirm\s*\([^)]*\)\s*;?\s*$/gm,
                /prompt\s*\([^)]*\)\s*;?\s*$/gm
            ],

            debugVariables: [
                
                /const\s+debugInfo\s*=\s*document\.createElement\('details'\);[\s\S]*?container\.appendChild\(debugInfo\)\s*;?\s*/gm,
                /let\s+debugInfo\s*=[\s\S]*?container\.appendChild\(debugInfo\)\s*;?\s*$/gm,
                /var\s+debugInfo\s*=[\s\S]*?container\.appendChild\(debugInfo\)\s*;?\s*$/gm,
                
                /<details[^>]*debug[^>]*>[\s\S]*?<\/details>/gim,
                // Временные переменные
                /let\s+temp\w*\s*=.*?;?\s*$/gm,
                /var\s+temp\w*\s*=.*?;?\s*$/gm,
                /const\s+temp\w*\s*=.*?;?\s*$/gm,
                
                /debugText[\s\S]*?JSON\.stringify/gm
            ],

            debugComments: [
                /\/\/\s*TODO.*$/gm,
                /\/\/\s*FIXME.*$/gm,
                /\/\/\s*DEBUG.*$/gm,
                /\/\/\s*TEST.*$/gm,
                /\/\*\s*DEBUG[\s\S]*?\*\//gm,
                /\/\*\s*TODO[\s\S]*?\*\//gm,
                /\/\/.*console.*debug/gi,
                /\/\/.*отладка/gi,
                /\/\/.*debug.*/gi
            ]
        };

        this.preservePatterns = [
            // Сохраняем логирование в logger системе
            /Logger\./,
            /window\.Logger/,
            // Сохраняем важное логирование ошибок
            /error\(/,
            /Error\(/,
            // Сохраняем в тестах
            /test.*console/,
            /expect.*console/,
            // Сохраняем в комментариях с объяснениями
            /\/\/.*console.*production/i,
            /\/\*.*console.*production.*\*\//i,
            // Сохраняем production логирование
            /production.*console/i,
            /error.*console/i
        ];
    }

    /**
     * Проверяет, нужно ли сохранить строку
     */
    shouldPreserve(line) {
        return this.preservePatterns.some(pattern => pattern.test(line));
    }

    /**
     * Удаляет debugInfo блоки из JavaScript
     */
    removeDebugInfoBlocks(content) {
        let cleaned = content;
        let statements = 0;

        const debugInfoPattern = /const\s+debugInfo\s*=\s*document\.createElement\('details'\);[\s\S]*?container\.appendChild\(debugInfo\)\s*;?\s*/gm;
        const matches = cleaned.match(debugInfoPattern) || [];
        if (matches.length > 0) {
            statements += matches.length;
            cleaned = cleaned.replace(debugInfoPattern, '');
        }

        const debugInfoOps = [
            /debugInfo\.style\.[^;]*;?\s*$/gm,
            /debugInfo\.appendChild\([^)]*\)\s*;?\s*$/gm,
            /debugInfo\.textContent\s*=[\s\S]*?;?\s*$/gm
        ];

        debugInfoOps.forEach(pattern => {
            const lineMatches = cleaned.match(pattern) || [];
            statements += lineMatches.length;
            cleaned = cleaned.replace(pattern, '');
        });

        return { content: cleaned, statements };
    }

    /**
     * Очищает JavaScript файл
     */
    cleanJavaScriptFile(content) {
        let cleaned = content;
        let statements = 0;

        const debugInfoResult = this.removeDebugInfoBlocks(cleaned);
        cleaned = debugInfoResult.content;
        statements += debugInfoResult.statements;

        // Удаляем console statements (кроме критичных ошибок)
        this.patterns.console.remove.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            matches.forEach(match => {
                if (!this.shouldPreserve(match)) {
                    cleaned = cleaned.replace(pattern, '');
                    statements++;
                }
            });
        });

        // Удаляем console.warn в production
        this.patterns.console.removeWarn.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            matches.forEach(match => {
                if (!this.shouldPreserve(match)) {
                    cleaned = cleaned.replace(pattern, '');
                    statements++;
                }
            });
        });

        // Комментируем только критичные console.error
        this.patterns.console.comment.forEach(pattern => {
            cleaned = cleaned.replace(pattern, (match) => {
                if (!this.shouldPreserve(match)) {
                    statements++;
                    return `// ${match} // Закомментировано в production`;
                }
                return match;
            });
        });

        this.patterns.debugger.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            statements += matches.length;
            cleaned = cleaned.replace(pattern, '');
        });

        // Удаляем dialogs
        this.patterns.dialogs.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            statements += matches.length;
            cleaned = cleaned.replace(pattern, '');
        });

        this.patterns.debugVariables.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            statements += matches.length;
            cleaned = cleaned.replace(pattern, '');
        });

        this.patterns.debugComments.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            statements += matches.length;
            cleaned = cleaned.replace(pattern, '');
        });

        // Убираем лишние пустые строки
        cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        return { content: cleaned, statements };
    }

    /**
     * Очищает HTML файл
     */
    cleanHTMLFile(content) {
        let cleaned = content;
        let statements = 0;

        const scriptPattern = /<script[^>]*>[\s\S]*?<\/script>/gi;
        cleaned = cleaned.replace(scriptPattern, (match) => {
            const result = this.cleanJavaScriptFile(match);
            statements += result.statements;
            return result.content;
        });

        const htmlDebugComments = [
            /<!--\s*DEBUG[\s\S]*?-->/gm,
            /<!--\s*TODO[\s\S]*?-->/gm,
            /<!--\s*FIXME[\s\S]*?-->/gm
        ];

        htmlDebugComments.forEach(pattern => {
            const matches = cleaned.match(pattern) || [];
            statements += matches.length;
            cleaned = cleaned.replace(pattern, '');
        });

        return { content: cleaned, statements };
    }

    /**
     * Обрабатывает файл
     */
    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const ext = path.extname(filePath).toLowerCase();
            let result;

            switch (ext) {
                case '.js':
                    result = this.cleanJavaScriptFile(content);
                    break;
                case '.html':
                    result = this.cleanHTMLFile(content);
                    break;
                case '.css':
                    
                    let cleaned = content.replace(/\/\*\s*DEBUG[\s\S]*?\*\//gm, '');
                    cleaned = cleaned.replace(/\/\*\s*TODO[\s\S]*?\*\//gm, '');
                    result = {
                        content: cleaned,
                        statements: content.length - cleaned.length > 0 ? 1 : 0
                    };
                    break;
                default:
                    return { processed: false, statements: 0 };
            }

            // Сохраняем только если были изменения
            if (result.statements > 0) {
                await fs.writeFile(filePath, result.content);
                console.log(`✅ ${path.relative(process.cwd(), filePath)}: очищено ${result.statements} debug statements`);
            }

            this.processedFiles++;
            this.cleanedStatements += result.statements;

            return { processed: true, statements: result.statements };

        } catch (error) {
            
            return { processed: false, statements: 0 };
        }
    }

    /**
     * Рекурсивно сканирует директорию
     */
    async scanDirectory(dirPath, excludeDirs = []) {
        try {
            const items = await fs.readdir(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stats = await fs.stat(fullPath);

                if (stats.isDirectory()) {
                    // Пропускаем исключенные директории
                    if (!excludeDirs.includes(item)) {
                        await this.scanDirectory(fullPath, excludeDirs);
                    }
                } else {
                    const ext = path.extname(item).toLowerCase();
                    if (['.js', '.html', '.css'].includes(ext)) {
                        await this.processFile(fullPath);
                    }
                }
            }
        } catch (error) {
            
        }
    }

    /**
     * Создает backup перед очисткой
     */
    async createBackup() {
        const backupDir = path.join(process.cwd(), 'backup_debug');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const specificBackupDir = path.join(backupDir, `backup_${timestamp}`);

        try {
            await fs.mkdir(specificBackupDir, { recursive: true });

            // Копируем важные файлы
            const importantFiles = [
                'public',
                'src'
            ];

            for (const dir of importantFiles) {
                const sourcePath = path.join(process.cwd(), dir);
                const targetPath = path.join(specificBackupDir, dir);

                try {
                    await this.copyDirectory(sourcePath, targetPath);
                } catch (error) {
                    
                }
            }

            return specificBackupDir;

        } catch (error) {
            
            return null;
        }
    }

    /**
     * Копирует директорию рекурсивно
     */
    async copyDirectory(source, target) {
        await fs.mkdir(target, { recursive: true });
        const items = await fs.readdir(source);

        for (const item of items) {
            const sourcePath = path.join(source, item);
            const targetPath = path.join(target, item);
            const stats = await fs.stat(sourcePath);

            if (stats.isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            } else {
                await fs.copyFile(sourcePath, targetPath);
            }
        }
    }

    /**
     * Основной метод очистки
     */
    async clean(options = {}) {
        const {
            createBackup = true,
            excludeDirs = ['node_modules', '.git', 'dist', 'backup_debug', 'test-results']
        } = options;

        const startTime = Date.now();

        try {
            // Создаем backup если нужно
            if (createBackup) {

                await this.createBackup();

            }

            // Сканируем и очищаем файлы

            await this.scanDirectory(process.cwd(), excludeDirs);

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            // Выводим результаты

            console.log('═'.repeat(50));

            if (this.cleanedStatements > 0) {

            } else {

            }

        } catch (error) {
            console.error('❌ Ошибка при очистке:', error);
            process.exit(1);
        }
    }
}

// Запускаем очистку если скрипт вызван напрямую
async function main() {
    const cleaner = new DebugCleaner();

    // Получаем параметры из командной строки
    const args = process.argv.slice(2);
    const options = {
        createBackup: !args.includes('--no-backup'),
        excludeDirs: ['node_modules', '.git', 'dist', 'backup_debug', 'test-results']
    };

    await cleaner.clean(options);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { DebugCleaner }; 