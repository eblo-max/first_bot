/**
 * Модульные тесты для утилиты аутентификации Telegram Mini App
 */
const assert = require('assert');
const { generateInitData, verifyInitData } = require('../utils/tma-auth');

// Тестовые данные
const testUser = {
    id: 12345678,
    first_name: "Test",
    last_name: "User",
    username: "testuser",
    language_code: "ru"
};

const testBot = {
    token: '7617823094:AAFXQaaLnn9773sF0BgW-YPRewO2p0b2XU8' // Токен из .env
};

/**
 * Запуск тестов
 */
function runTests() {
    console.log('Запуск тестов TMA Auth...');

    try {
        testGenerateInitData();
        testInitDataVerification();
        testInitDataModification();

        console.log('✅ Все тесты TMA Auth пройдены успешно!');
    } catch (error) {
        console.error('❌ Ошибка в тестах TMA Auth:', error);
        throw error;
    }
}

/**
 * Тест генерации initData
 */
function testGenerateInitData() {
    console.log('Тест: Генерация initData...');

    // Генерируем initData
    const initData = generateInitData({
        user: testUser,
        query_id: '12345',
        auth_date: 1662771648
    }, testBot.token);

    // Проверяем, что строка генерируется и содержит нужные компоненты
    assert(typeof initData === 'string', 'initData должен быть строкой');
    assert(initData.includes('user='), 'initData должен содержать user');
    assert(initData.includes('query_id='), 'initData должен содержать query_id');
    assert(initData.includes('auth_date='), 'initData должен содержать auth_date');
    assert(initData.includes('hash='), 'initData должен содержать hash');

    console.log('✅ Тест генерации initData пройден');
}

/**
 * Тест проверки подписи initData
 */
function testInitDataVerification() {
    console.log('Тест: Проверка подписи initData...');

    // Генерируем initData
    const initData = generateInitData({
        user: testUser,
        query_id: '12345'
    }, testBot.token);

    // Проверяем подпись
    const isValid = verifyInitData(initData, testBot.token);
    assert(isValid === true, 'Подпись должна быть валидной');

    // Проверяем с неправильным токеном
    const isInvalidToken = verifyInitData(initData, 'wrong_token');
    assert(isInvalidToken === false, 'Подпись должна быть невалидной с неправильным токеном');

    console.log('✅ Тест проверки подписи пройден');
}

/**
 * Тест на модификацию данных
 */
function testInitDataModification() {
    console.log('Тест: Модификация данных...');

    // Генерируем initData
    const initData = generateInitData({
        user: testUser,
        query_id: '12345'
    }, testBot.token);

    // Модифицируем данные (меняем значение query_id)
    const modifiedInitData = initData.replace('query_id=12345', 'query_id=54321');

    // Проверяем подпись для модифицированных данных
    const isValid = verifyInitData(modifiedInitData, testBot.token);
    assert(isValid === false, 'Подпись должна быть невалидной после модификации данных');

    console.log('✅ Тест модификации данных пройден');
}

// Экспортируем функцию для запуска тестов
module.exports = { runTests };

// Если запущен непосредственно (не через import/require)
if (require.main === module) {
    runTests();
} 