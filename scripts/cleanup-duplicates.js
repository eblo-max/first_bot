#!/usr/bin/env node

/**
 * Скрипт удаления дублированных JS файлов при наличии TS версий
 * Удаляет только те JS файлы, для которых существует TS версия
 */

const fs = require('fs').promises;
const path = require('path');

// Файлы для удаления (JS версии, для которых есть TS)
const DUPLICATE_JS_FILES = [
    'public/achievement-system.js',
    'public/auth.js',
    'public/logger.js',
    'public/game-core.js',
    'public/game-interface.js',
    'public/crime-app.js',
    'public/profile.js',
    'public/modules/api-service.js',
    'public/modules/auth-service.js',
    'public/modules/profile-config.js',
    'public/types/profile-types.js',
    'public/types.js'
];

// Проверка соответствующих TS файлов
const TS_EQUIVALENTS = [
    'public/achievement-system.ts',
    'public/auth.ts',
    'public/logger.ts',
    'public/game-core.ts',
    'public/game-interface.ts',
    'public/crime-app.ts',
    'public/profile.ts',
    'public/modules/api-service.ts',
    'public/modules/auth-service.ts',
    'public/modules/profile-config.ts',
    'public/types/profile-types.ts',
    'public/types.ts'
];

async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function getFileSize(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch {
        return 0;
    }
}

async function analyzeDuplicates() {
    console.log('🔍 АНАЛИЗ ДУБЛИРОВАННЫХ ФАЙЛОВ\n');
    console.log('='.repeat(50));

    let totalJSSize = 0;
    let totalTSSize = 0;
    let duplicatesFound = 0;

    for (let i = 0; i < DUPLICATE_JS_FILES.length; i++) {
        const jsFile = DUPLICATE_JS_FILES[i];
        const tsFile = TS_EQUIVALENTS[i];

        const jsExists = await checkFileExists(jsFile);
        const tsExists = await checkFileExists(tsFile);

        if (jsExists && tsExists) {
            const jsSize = await getFileSize(jsFile);
            const tsSize = await getFileSize(tsFile);

            totalJSSize += jsSize;
            totalTSSize += tsSize;
            duplicatesFound++;

            console.log(`📄 ${path.basename(jsFile)}`);
            console.log(`   JS: ${Math.round(jsSize / 1024)}KB | TS: ${Math.round(tsSize / 1024)}KB`);
            console.log(`   ❌ Дубликат найден\n`);
        }
    }

    console.log(`📊 СТАТИСТИКА:`);
    console.log(`   Дубликатов найдено: ${duplicatesFound}`);
    console.log(`   Размер JS дубликатов: ${Math.round(totalJSSize / 1024)}KB`);
    console.log(`   Размер TS файлов: ${Math.round(totalTSSize / 1024)}KB`);
    console.log(`   Экономия места: ${Math.round(totalJSSize / 1024)}KB\n`);

    return duplicatesFound;
}

async function removeDuplicates() {
    console.log('🗑️ УДАЛЕНИЕ ДУБЛИКАТОВ\n');

    let removedCount = 0;
    let savedSpace = 0;

    for (let i = 0; i < DUPLICATE_JS_FILES.length; i++) {
        const jsFile = DUPLICATE_JS_FILES[i];
        const tsFile = TS_EQUIVALENTS[i];

        const jsExists = await checkFileExists(jsFile);
        const tsExists = await checkFileExists(tsFile);

        if (jsExists && tsExists) {
            try {
                const jsSize = await getFileSize(jsFile);
                await fs.unlink(jsFile);

                removedCount++;
                savedSpace += jsSize;

                console.log(`✅ Удален: ${jsFile} (${Math.round(jsSize / 1024)}KB)`);
            } catch (error) {
                console.error(`❌ Ошибка удаления ${jsFile}:`, error.message);
            }
        } else if (jsExists && !tsExists) {
            console.log(`⚠️ Пропущен ${jsFile} - нет TS версии`);
        }
    }

    console.log(`\n📊 РЕЗУЛЬТАТ:`);
    console.log(`   Удалено файлов: ${removedCount}`);
    console.log(`   Освобождено места: ${Math.round(savedSpace / 1024)}KB`);
}

async function updateGitignore() {
    console.log('\n📝 Обновление .gitignore...');

    const gitignoreAdditions = `
# Игнорируем скомпилированные JS файлы в public (если есть TS версии)
public/**/*.js
!public/index.html
!public/game.html  
!public/profile.html

# Компилированные файлы
dist/
build/
`;

    try {
        const gitignorePath = '.gitignore';
        const currentContent = await fs.readFile(gitignorePath, 'utf8').catch(() => '');

        if (!currentContent.includes('public/**/*.js')) {
            await fs.writeFile(gitignorePath, currentContent + gitignoreAdditions);
            console.log('✅ .gitignore обновлен');
        } else {
            console.log('➖ .gitignore уже содержит нужные правила');
        }
    } catch (error) {
        console.error('❌ Ошибка обновления .gitignore:', error.message);
    }
}

async function verifyTypescriptSetup() {
    console.log('\n🔧 Проверка настроек TypeScript...');

    // Проверяем tsconfig.json
    try {
        const tsconfig = JSON.parse(await fs.readFile('tsconfig.json', 'utf8'));

        console.log('📋 Текущие настройки:');
        console.log(`   allowJs: ${tsconfig.compilerOptions?.allowJs}`);
        console.log(`   outDir: ${tsconfig.compilerOptions?.outDir}`);
        console.log(`   strict: ${tsconfig.compilerOptions?.strict}`);

        if (tsconfig.compilerOptions?.outDir === './dist') {
            console.log('✅ TypeScript компилирует в dist/ - корректно');
        } else {
            console.log('⚠️ Проверьте настройку outDir в tsconfig.json');
        }

    } catch (error) {
        console.error('❌ Ошибка чтения tsconfig.json:', error.message);
    }
}

async function main() {
    console.log('🚨 ОЧИСТКА ДУБЛИРОВАННЫХ JS/TS ФАЙЛОВ\n');

    try {
        const duplicatesCount = await analyzeDuplicates();

        if (duplicatesCount === 0) {
            console.log('✅ Дубликаты не найдены!');
            return;
        }

        console.log('⚠️ ВНИМАНИЕ: Будут удалены JS файлы, для которых есть TS версии');
        console.log('🔄 Продолжить? (y/N)');

        // В автоматическом режиме удаляем
        await removeDuplicates();
        await updateGitignore();
        await verifyTypescriptSetup();

        console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА!');
        console.log('💡 Рекомендации:');
        console.log('   1. Проверьте работу приложения: npm start');
        console.log('   2. Проверьте TypeScript: npm run type-check');
        console.log('   3. Пересоберите фронтенд: npm run build');

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, analyzeDuplicates, removeDuplicates }; 