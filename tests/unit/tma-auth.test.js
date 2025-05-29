/**
 * Unit-тесты для аутентификации Telegram Mini App
 * Адаптировано для работы с Vanilla JS
 */

const assert = require('assert');
const {
    generateTelegramInitData,
    validateTelegramInitData,
    createTelegramWebAppStub
} = require('../utils/tma-auth');

// Тестовый токен для генерации и проверки подписи
const TEST_BOT_TOKEN = 'TEST_BOT_TOKEN';

/**
 * Тест генерации и валидации Telegram initData
 */
(function testInitDataValidation() {
    
    // Генерируем initData с тестовыми данными
    const initData = generateTelegramInitData({
        user: { id: 12345678, first_name: 'Test', username: 'testuser' },
        botToken: TEST_BOT_TOKEN
    });

    // Проверяем валидность сгенерированных данных
    const isValid = validateTelegramInitData(initData, TEST_BOT_TOKEN);
    assert.strictEqual(isValid, true, 'Валидация должна пройти успешно');

    // Проверяем, что невалидные данные не проходят проверку
    const invalidData = initData.replace('hash=', 'hash=invalid');
    const isInvalid = validateTelegramInitData(invalidData, TEST_BOT_TOKEN);
    assert.strictEqual(isInvalid, false, 'Невалидные данные не должны проходить проверку');

})();

/**
 * Тест создания заглушки Telegram WebApp
 */
(function testTelegramWebAppStub() {
    
    // Создаем заглушку с пользовательскими параметрами
    const customStub = createTelegramWebAppStub({
        userId: 87654321,
        firstName: 'Custom',
        lastName: 'Tester',
        username: 'customtester',
        colorScheme: 'light'
    });

    // Проверяем данные пользователя
    assert.strictEqual(customStub.WebApp.initDataUnsafe.user.id, 87654321, 'ID пользователя должен соответствовать переданному');
    assert.strictEqual(customStub.WebApp.initDataUnsafe.user.first_name, 'Custom', 'Имя пользователя должно соответствовать переданному');
    assert.strictEqual(customStub.WebApp.initDataUnsafe.user.last_name, 'Tester', 'Фамилия пользователя должна соответствовать переданной');
    assert.strictEqual(customStub.WebApp.initDataUnsafe.user.username, 'customtester', 'Username должен соответствовать переданному');
    assert.strictEqual(customStub.WebApp.colorScheme, 'light', 'Цветовая схема должна соответствовать переданной');

    // Создаем заглушку с дефолтными параметрами
    const defaultStub = createTelegramWebAppStub();

    // Проверяем дефолтные значения
    assert.strictEqual(defaultStub.WebApp.initDataUnsafe.user.id, 12345678, 'ID пользователя должен иметь дефолтное значение');
    assert.strictEqual(defaultStub.WebApp.initDataUnsafe.user.first_name, 'Test', 'Имя пользователя должно иметь дефолтное значение');
    assert.strictEqual(defaultStub.WebApp.colorScheme, 'dark', 'Цветовая схема должна иметь дефолтное значение');

})();

/**
 * Тест формата initData
 */
(function testInitDataFormat() {
    
    // Генерируем initData
    const initData = generateTelegramInitData({
        botToken: TEST_BOT_TOKEN
    });

    // Проверяем наличие обязательных параметров
    assert.ok(initData.includes('user='), 'initData должен содержать параметр user');
    assert.ok(initData.includes('auth_date='), 'initData должен содержать параметр auth_date');
    assert.ok(initData.includes('hash='), 'initData должен содержать параметр hash');
    assert.ok(initData.includes('query_id='), 'initData должен содержать параметр query_id');

})();

// Вывод общего результата
