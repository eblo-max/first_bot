/**
 * Запуск тестов для проекта "Криминальный Блеф"
 */

const { runE2ETest } = require('./e2e/app.test');
const { runTests: runTMAAuthTests } = require('./unit/tma-auth.test');

// Запуск всех тестов
async function runTests() {
    console.log('=== Запуск тестирования проекта "Криминальный Блеф" ===\n');

    try {
        // Модульные тесты
        console.log('\n--- Запуск модульных тестов ---');
        runTMAAuthTests();

        // E2E тесты
        console.log('\n--- Запуск E2E тестов ---');
        await runE2ETest();

        console.log('\n✅ Все тесты успешно пройдены!');
    } catch (error) {
        console.error('\n❌ Тесты завершились с ошибкой:', error);
        process.exit(1);
    }
}

// Запуск тестов
runTests().catch(console.error); 