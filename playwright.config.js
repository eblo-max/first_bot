// playwright.config.js
let defineConfig;
try {
    const playwright = require('@playwright/test');
    defineConfig = playwright.defineConfig;
} catch (error) {
    console.error('Ошибка импорта @playwright/test:', error.message);
    // Резервная реализация, если модуль не найден
    defineConfig = (config) => config;
}

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:3000',
        headless: false,
        viewport: { width: 428, height: 926 },
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
    reporter: 'list'
}); 