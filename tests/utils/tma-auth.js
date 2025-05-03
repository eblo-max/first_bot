/**
 * Утилиты для тестирования аутентификации Telegram Mini App
 * Адаптировано для работы с Vanilla JS
 */

const crypto = require('crypto');

/**
 * Создает тестовые initData для Telegram WebApp
 * @param {Object} params - Параметры для генерации initData
 * @param {Object} params.user - Данные пользователя Telegram
 * @param {string} params.botToken - Токен бота для генерации подписи
 * @param {number} params.authDate - Дата авторизации в формате Unix timestamp
 * @returns {string} Строка initData для Telegram WebApp
 */
function generateTelegramInitData(params = {}) {
    const {
        user = { id: 12345678, first_name: 'Test', username: 'testuser' },
        botToken = process.env.BOT_TOKEN || 'TEST_BOT_TOKEN',
        authDate = Math.floor(Date.now() / 1000)
    } = params;

    // Создаем объект данных
    const dataObject = {
        user: JSON.stringify(user),
        auth_date: authDate,
        query_id: crypto.randomBytes(8).toString('hex')
    };

    // Создаем строку данных для подписи
    const dataCheckString = Object.keys(dataObject)
        .sort()
        .map(key => `${key}=${dataObject[key]}`)
        .join('\n');

    // Создаем подпись (HMAC-SHA-256) с секретным ключом
    const secretKey = crypto
        .createHash('sha256')
        .update(botToken)
        .digest();

    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Добавляем хэш к объекту данных
    dataObject.hash = hash;

    // Преобразуем объект в URL-encoded строку
    const urlEncodedData = Object.keys(dataObject)
        .map(key => `${key}=${encodeURIComponent(dataObject[key])}`)
        .join('&');

    return urlEncodedData;
}

/**
 * Проверяет валидность initData
 * @param {string} initData - Строка initData от Telegram WebApp
 * @param {string} botToken - Токен бота для проверки подписи
 * @returns {boolean} Результат проверки
 */
function validateTelegramInitData(initData, botToken) {
    // Разбор строки initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) return false;

    // Удаляем хэш из параметров
    params.delete('hash');

    // Создаем data_check_string
    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
        .createHash('sha256')
        .update(botToken)
        .digest();

    // Создаем подпись
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Сравниваем подписи
    return signature === hash;
}

/**
 * Создает заглушку для объекта Telegram.WebApp для тестирования
 * @param {Object} options - Настройки для заглушки
 * @returns {Object} Объект с заглушкой Telegram.WebApp
 */
function createTelegramWebAppStub(options = {}) {
    const {
        userId = 12345678,
        firstName = 'Test',
        lastName = 'User',
        username = 'testuser',
        colorScheme = 'dark'
    } = options;

    // Генерируем initData для заглушки
    const initData = generateTelegramInitData({
        user: { id: userId, first_name: firstName, last_name: lastName, username }
    });

    // Создаем заглушку
    return {
        WebApp: {
            ready: () => console.log('WebApp.ready() вызван'),
            expand: () => console.log('WebApp.expand() вызван'),
            initData,
            initDataUnsafe: {
                user: {
                    id: userId,
                    first_name: firstName,
                    last_name: lastName,
                    username,
                    language_code: 'ru'
                }
            },
            BackButton: {
                show: () => console.log('BackButton.show() вызван'),
                hide: () => console.log('BackButton.hide() вызван'),
                onClick: (callback) => console.log('BackButton.onClick() установлен')
            },
            colorScheme,
            HapticFeedback: {
                impactOccurred: () => { },
                notificationOccurred: () => { },
                selectionChanged: () => { }
            }
        }
    };
}

module.exports = {
    generateTelegramInitData,
    validateTelegramInitData,
    createTelegramWebAppStub
}; 