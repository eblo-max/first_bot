#!/usr/bin/env node
/**
 * Продакшн сборка с минификацией
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Начинаем продакшн сборку...\n');

// 1. Компиляция TypeScript
console.log('📦 Компилируем TypeScript...');
try {
    execSync('npm run build:server', { stdio: 'inherit' });
    execSync('npm run build:frontend', { stdio: 'inherit' });
    console.log('✅ TypeScript скомпилирован\n');
} catch (error) {
    console.error('❌ Ошибка компиляции TypeScript');
    process.exit(1);
}

// 2. Минификация JavaScript файлов
console.log('🗜️ Минифицируем JavaScript...');
try {
    // Минифицируем frontend JS
    if (fs.existsSync('public/dist')) {
        const frontendFiles = fs.readdirSync('public/dist').filter(f => f.endsWith('.js'));
        frontendFiles.forEach(file => {
            const inputPath = `public/dist/${file}`;
            const outputPath = `public/dist/${file.replace('.js', '.min.js')}`;
            execSync(`npx terser ${inputPath} --compress --mangle --output ${outputPath}`, { stdio: 'inherit' });
        });
    }
    console.log('✅ JavaScript минифицирован\n');
} catch (error) {
    console.log('⚠️ Ошибка минификации JavaScript (необязательно)\n');
}

// 3. Минификация CSS
console.log('🎨 Минифицируем CSS...');
try {
    const cssFiles = fs.readdirSync('public').filter(f => f.endsWith('.css'));
    cssFiles.forEach(file => {
        const inputPath = `public/${file}`;
        const outputPath = `public/${file.replace('.css', '.min.css')}`;
        execSync(`npx cleancss -o ${outputPath} ${inputPath}`, { stdio: 'inherit' });
    });
    console.log('✅ CSS минифицирован\n');
} catch (error) {
    console.log('⚠️ Ошибка минификации CSS (необязательно)\n');
}

// 4. Минификация HTML
console.log('📄 Минифицируем HTML...');
try {
    const htmlFiles = fs.readdirSync('public').filter(f => f.endsWith('.html'));
    htmlFiles.forEach(file => {
        const inputPath = `public/${file}`;
        const outputPath = `public/${file.replace('.html', '.min.html')}`;
        execSync(`npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css --minify-js --output ${outputPath} ${inputPath}`, { stdio: 'inherit' });
    });
    console.log('✅ HTML минифицирован\n');
} catch (error) {
    console.log('⚠️ Ошибка минификации HTML (необязательно)\n');
}

// 5. Создание production директории
console.log('📁 Создаем production сборку...');
try {
    if (!fs.existsSync('production')) {
        fs.mkdirSync('production');
    }

    // Копируем важные файлы
    execSync('cp -r dist production/', { stdio: 'inherit' });
    execSync('cp -r public production/', { stdio: 'inherit' });
    execSync('cp package.json production/', { stdio: 'inherit' });

    console.log('✅ Production сборка готова в папке /production\n');
} catch (error) {
    console.log('⚠️ Создание production папки (создайте вручную)\n');
}

console.log('🎉 Продакшн сборка завершена!');
console.log('📂 Результаты:');
console.log('   - Backend: dist/');
console.log('   - Frontend: public/dist/');
console.log('   - Минифицированные файлы: public/*.min.*');
console.log('   - Production: production/'); 