#!/usr/bin/env node
/**
 * Автоматическое исправление TypeScript ошибок
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Начинаем автоматическое исправление TypeScript ошибок...\n');

// Список файлов для исправления с их проблемами
const fixes = [
    {
        file: 'src/controllers/gameController.ts',
        fixes: [
            {
                type: 'remove_unused_import',
                imports: ['IUser', 'UserRank', 'IGame', 'IStory', 'calculateScore', 'formatTime']
            }
        ]
    },
    {
        file: 'src/controllers/userController.ts',
        fixes: [
            {
                type: 'remove_unused_import',
                imports: ['IGameHistory']
            }
        ]
    },
    {
        file: 'src/index.ts',
        fixes: [
            {
                type: 'add_underscore_to_unused_params',
                params: ['req']
            }
        ]
    },
    {
        file: 'src/middleware/userMiddleware.ts',
        fixes: [
            {
                type: 'add_underscore_to_unused_params',
                params: ['res']
            }
        ]
    },
    {
        file: 'src/models/User.ts',
        fixes: [
            {
                type: 'remove_unused_import',
                imports: ['Model']
            }
        ]
    },
    {
        file: 'src/utils/seedData.ts',
        fixes: [
            {
                type: 'remove_unused_import',
                imports: ['mongoose']
            },
            {
                type: 'add_underscore_to_unused_vars',
                vars: ['sampleStories']
            }
        ]
    }
];

/**
 * Удаляет неиспользуемые импорты из строки
 */
function removeUnusedImports(content, importsToRemove) {
    let updated = content;

    importsToRemove.forEach(importName => {
        // Удаляем из деструктуризации
        updated = updated.replace(
            new RegExp(`(,\\s*)?\\b${importName}\\b(\\s*,)?`, 'g'),
            (match, before, after) => {
                if (before && after) return ',';
                if (before || after) return '';
                return '';
            }
        );

        // Удаляем пустые деструктуризации
        updated = updated.replace(/\{\s*,\s*\}/g, '{}');
        updated = updated.replace(/\{\s*\}/g, '');

        // Удаляем строки импорта, которые стали пустыми
        updated = updated.replace(/import\s*\{\s*\}\s*from\s*['"][^'"]*['"];\s*\n/g, '');
    });

    return updated;
}

/**
 * Добавляет подчеркивание к неиспользуемым параметрам
 */
function addUnderscoreToParams(content, params) {
    let updated = content;

    params.forEach(param => {
        // Ищем параметры функций
        updated = updated.replace(
            new RegExp(`\\b${param}:\\s*[^,)]+`, 'g'),
            match => match.replace(param, `_${param}`)
        );
    });

    return updated;
}

/**
 * Добавляет подчеркивание к неиспользуемым переменным
 */
function addUnderscoreToVars(content, vars) {
    let updated = content;

    vars.forEach(varName => {
        updated = updated.replace(
            new RegExp(`\\bconst\\s+${varName}\\b`, 'g'),
            `const _${varName}`
        );
    });

    return updated;
}

/**
 * Применяет исправления к файлу
 */
function applyFixes(filePath, fileFixes) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;

        fileFixes.forEach(fix => {
            const originalContent = content;

            switch (fix.type) {
                case 'remove_unused_import':
                    content = removeUnusedImports(content, fix.imports);
                    break;
                case 'add_underscore_to_unused_params':
                    content = addUnderscoreToParams(content, fix.params);
                    break;
                case 'add_underscore_to_unused_vars':
                    content = addUnderscoreToVars(content, fix.vars);
                    break;
            }

            if (originalContent !== content) {
                hasChanges = true;
            }
        });

        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Исправлен: ${filePath}`);
        } else {
            console.log(`⚠️  Нет изменений: ${filePath}`);
        }

    } catch (error) {
        console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
    }
}

/**
 * Основная функция
 */
function main() {
    let totalFixed = 0;

    fixes.forEach(({ file, fixes: fileFixes }) => {
        const filePath = path.join(process.cwd(), file);

        if (fs.existsSync(filePath)) {
            applyFixes(filePath, fileFixes);
            totalFixed++;
        } else {
            console.warn(`⚠️  Файл не найден: ${filePath}`);
        }
    });

    console.log(`\n🎉 Обработано файлов: ${totalFixed}`);
    console.log('📋 Рекомендации:');
    console.log('   1. Запустите npm run ts:check для проверки');
    console.log('   2. Проверьте изменения в git');
    console.log('   3. При необходимости внесите ручные правки');
}

main(); 