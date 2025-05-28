// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        viewport: { width: 428, height: 926 },
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
    reporter: 'list',
    // Запуск локального сервера перед тестами
    webServer: {
        command: 'npm start',
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
}); 