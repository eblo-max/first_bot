#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки функций crime-app.js после миграции
 */

console.log('🧪 ТЕСТ ФУНКЦИЙ ПОСЛЕ МИГРАЦИИ');
console.log('=====================================');

// Проверяем что мертвый файл удален
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
const crimeAppJsPath = path.join(__dirname, '..', 'public', 'crime-app.js');

console.log('\n📁 ПРОВЕРКА ФАЙЛОВ:');

// Проверка что app.js удален
if (!fs.existsSync(appJsPath)) {
    console.log('✅ app.js успешно удален');
} else {
    console.log('❌ app.js все еще существует!');
}

// Проверка что crime-app.js существует и содержит новые функции
if (fs.existsSync(crimeAppJsPath)) {
    console.log('✅ crime-app.js существует');

    const content = fs.readFileSync(crimeAppJsPath, 'utf8');

    // Проверяем наличие перенесенных функций
    const functionsToCheck = [
        'clearAppCache',
        'verifyExistingToken',
        'authorize',
        'provideFeedback',
        'initAppWithAuth'
    ];

    console.log('\n🔍 ПРОВЕРКА ПЕРЕНЕСЕННЫХ ФУНКЦИЙ:');

    let allFunctionsPresent = true;
    functionsToCheck.forEach(funcName => {
        if (content.includes(`function ${funcName}`)) {
            console.log(`✅ ${funcName}() - найдена`);
        } else {
            console.log(`❌ ${funcName}() - НЕ найдена`);
            allFunctionsPresent = false;
        }
    });

    // Проверяем глобальные экспорты
    console.log('\n🌐 ПРОВЕРКА ГЛОБАЛЬНЫХ ЭКСПОРТОВ:');

    const globalExports = [
        'window.clearAppCache',
        'window.authorize',
        'window.CriminalBluffApp'
    ];

    globalExports.forEach(exportName => {
        if (content.includes(exportName)) {
            console.log(`✅ ${exportName} - экспортирован`);
        } else {
            console.log(`❌ ${exportName} - НЕ экспортирован`);
            allFunctionsPresent = false;
        }
    });

    // Проверяем размер файла
    const stats = fs.statSync(crimeAppJsPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`\n📊 РАЗМЕР ФАЙЛА: ${fileSizeKB} KB`);

    if (allFunctionsPresent) {
        console.log('\n🎉 ВСЕ ФУНКЦИИ УСПЕШНО ПЕРЕНЕСЕНЫ!');
    } else {
        console.log('\n⚠️ НЕКОТОРЫЕ ФУНКЦИИ НЕ НАЙДЕНЫ');
    }

} else {
    console.log('❌ crime-app.js НЕ найден!');
}

// Проверяем подключение в HTML
const gameHtmlPath = path.join(__dirname, '..', 'public', 'game.html');
if (fs.existsSync(gameHtmlPath)) {
    const htmlContent = fs.readFileSync(gameHtmlPath, 'utf8');

    console.log('\n📄 ПРОВЕРКА ПОДКЛЮЧЕНИЯ В HTML:');

    if (htmlContent.includes('crime-app.js')) {
        console.log('✅ crime-app.js подключен в game.html');
    } else {
        console.log('❌ crime-app.js НЕ подключен в game.html');
    }

    // Проверяем ТОЛЬКО прямые упоминания app.js (не telegram-web-app.js)
    if (htmlContent.includes('src="app.js"') || htmlContent.includes("src='app.js'") || htmlContent.includes('src="./app.js"')) {
        console.log('⚠️ Найдено упоминание app.js в HTML (возможно нужно удалить)');
    } else {
        console.log('✅ Упоминаний app.js в HTML не найдено');
    }
}

console.log('\n=====================================');
console.log('✨ ТЕСТ ЗАВЕРШЕН'); 