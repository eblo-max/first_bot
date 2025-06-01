#!/usr/bin/env node

/**
 * Расширенный скрипт очистки debug кода
 * Удаляет console.log, отладочные комментарии и неиспользуемые файлы
 */

const fs = require('fs').promises;
const path = require('path');

// Список неиспользуемых файлов для удаления
const DEAD_FILES = [
    'public/debug.js',
    'public/game-state.js',
    'public/security-utils.js'
];

// Паттерны debug кода для удаления
const DEBUG_PATTERNS = [
    // Console вызовы с эмодзи (характерные для проекта)
    /console\.log\([^)]*['"`][🔍🚀📱🔄✅❌🔧📊🔐📋🎯📤🔚⚠️💻📅🌍⚡📝🛣️🏗️🛡️📦⏱️🔄📊🔐🔄📱🚀📊🔍✅❌📋🎯📤🔚⚠️][^)]*\);?\s*$/gm,

    // Блоки debug комментариев с эмодзи
    /\/\/ [🔍🚀📱🔄✅❌🔧📊🔐📋🎯📤🔚⚠️💻📅🌍⚡📝🛣️🏗️🛡️📦⏱️🔄📊🔐🔄📱🚀📊🔍✅❌📋🎯📤🔚⚠️].*$/gm,

    // Подробные console.log блоки
    /console\.log\(['"`]🔍.*?\);?\s*$/gm,

    // Debug блоки === 
    /console\.log\(['"`][=]+ .*? [=]+['"`]\);?\s*$/gm,

    // Простые console.log для отладки
    /console\.log\(['"`](Инициализация|Начало|Конец|Проверка|Анализ|Отправка|Получение|Загрузка).*?\);?\s*$/gm,

    // Console.log с объектами для отладки
    /console\.log\(['"`].*?:['"`], [^)]+\);?\s*$/gm
];

// Файлы которые нужно очистить от debug кода
const FILES_TO_CLEAN = [
    'public/profile.js',
    'src/middleware/auth.js',
    'src/index.js',
    'src/routes/profile.js',
    'src/routes/user.js',
    'src/routes/auth.js',
    'src/controllers/authController.js'
];

async function deleteDeadFiles() {
    console.log('🗑️ Удаление неиспользуемых файлов...\n');

    for (const filePath of DEAD_FILES) {
        try {
            await fs.unlink(filePath);
            console.log(`✅ Удален: ${filePath}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`⚠️ Файл уже отсутствует: ${filePath}`);
            } else {
                console.error(`❌ Ошибка удаления ${filePath}:`, error.message);
            }
        }
    }
}

async function cleanDebugCode() {
    console.log('\n🧹 Очистка debug кода...\n');

    for (const filePath of FILES_TO_CLEAN) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            let cleanedContent = content;
            let removedLines = 0;

            // Применяем каждый паттерн
            for (const pattern of DEBUG_PATTERNS) {
                const matches = cleanedContent.match(pattern);
                if (matches) {
                    removedLines += matches.length;
                    cleanedContent = cleanedContent.replace(pattern, '');
                }
            }

            // Удаляем пустые строки после очистки
            cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

            if (removedLines > 0) {
                await fs.writeFile(filePath, cleanedContent);
                console.log(`✅ ${filePath}: удалено ${removedLines} debug строк`);
            } else {
                console.log(`➖ ${filePath}: debug код не найден`);
            }

        } catch (error) {
            console.error(`❌ Ошибка обработки ${filePath}:`, error.message);
        }
    }
}

async function analyzeCodeDuplication() {
    console.log('\n🔍 Анализ дублированного кода...\n');

    // Проверяем дублирование между crime-app.js и app.js
    try {
        const [crimeAppContent, appContent] = await Promise.all([
            fs.readFile('public/crime-app.js', 'utf8').catch(() => null),
            fs.readFile('public/app.js', 'utf8').catch(() => null)
        ]);

        if (crimeAppContent && appContent) {
            // Ищем похожие функции
            const crimeAppFunctions = crimeAppContent.match(/function\s+\w+\s*\(/g) || [];
            const appFunctions = appContent.match(/function\s+\w+\s*\(/g) || [];

            const duplicatedFunctions = crimeAppFunctions.filter(func =>
                appFunctions.some(appFunc => appFunc === func)
            );

            if (duplicatedFunctions.length > 0) {
                console.log(`⚠️ Найдено ${duplicatedFunctions.length} дублированных функций между crime-app.js и app.js:`);
                duplicatedFunctions.forEach(func => console.log(`   - ${func}`));
                console.log('\n💡 Рекомендация: объединить файлы или удалить crime-app.js');
            }
        }

    } catch (error) {
        console.error('❌ Ошибка анализа дублирования:', error.message);
    }
}

async function generateReport() {
    console.log('\n📊 ОТЧЕТ ПО ОЧИСТКЕ:\n');

    // Подсчет размера до очистки
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (const filePath of FILES_TO_CLEAN) {
        try {
            const stats = await fs.stat(filePath);
            totalSizeAfter += stats.size;
        } catch (error) {
            // Файл может не существовать
        }
    }

    console.log(`📁 Очищено файлов: ${FILES_TO_CLEAN.length}`);
    console.log(`🗑️ Удалено файлов: ${DEAD_FILES.length}`);
    console.log(`📉 Размер после очистки: ${Math.round(totalSizeAfter / 1024)} KB`);
    console.log(`🎯 Оптимизация завершена!`);
}

async function main() {
    console.log('🔍 РАСШИРЕННАЯ ОЧИСТКА МЕРТВОГО КОДА\n');
    console.log('=' * 50);

    try {
        await deleteDeadFiles();
        await cleanDebugCode();
        await analyzeCodeDuplication();
        await generateReport();

        console.log('\n✅ Очистка завершена успешно!');

    } catch (error) {
        console.error('\n❌ Критическая ошибка очистки:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main }; 