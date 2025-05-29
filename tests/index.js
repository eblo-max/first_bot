/**
 * Запуск тестов для проекта "Криминальный Блеф"
 */

const { runE2ETest } = require('./e2e/app.test');
const { runTests: runTMAAuthTests } = require('./unit/tma-auth.test');

// Запуск всех тестов
async function runTests() {
    
    try {
        // Модульные тесты
        
        runTMAAuthTests();

        // E2E тесты
        
        await runE2ETest();

    } catch (error) {
        console.error('\n❌ Тесты завершились с ошибкой:', error);
        process.exit(1);
    }
}

// Запуск тестов
runTests().catch(console.error); 