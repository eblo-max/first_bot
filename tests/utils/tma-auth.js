/**
 * Утилиты для работы с аутентификацией Telegram Mini Apps
 */
const crypto = require('crypto');

/**
 * Создаёт правильную подпись для initData Telegram Mini App
 * 
 * @param {Object} data - Данные для включения в initData
 * @param {string} botToken - Токен бота, полученный от BotFather
 * @returns {string} - Строка initData с правильной подписью
 */
function generateInitData(data, botToken) {
    // Базовые данные, которые должны быть в initData
    const initDataObj = {
        user: data.user || {
            id: 12345678,
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            language_code: "ru",
            is_premium: true,
            allows_write_to_pm: true
        },
        auth_date: data.auth_date || Math.floor(Date.now() / 1000),
        ...data
    };

    // Исключаем параметр hash из проверочной строки
    const { hash, ...checkParams } = initDataObj;

    // Сортируем параметры по алфавиту
    const sortedParams = Object.keys(checkParams).sort();

    // Создаем строку для проверки в формате key=value\n
    const checkString = sortedParams
        .map(key => {
            let value = checkParams[key];
            // Преобразуем объекты в JSON строку
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            return `${key}=${value}`;
        })
        .join('\n');

    // Создаем секретный ключ на основе токена и строки "WebAppData"
    const secret = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

    // Создаем HMAC SHA-256 хеш с использованием созданного секретного ключа
    const hash_hex = crypto
        .createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');

    // Добавляем hash к параметрам
    initDataObj.hash = hash_hex;

    // Преобразуем объект в строку URL-параметров
    const initDataStr = Object.keys(initDataObj)
        .map(key => {
            let value = initDataObj[key];
            // Преобразуем объекты в JSON строку и кодируем для URL
            if (typeof value === 'object') {
                value = encodeURIComponent(JSON.stringify(value));
            }
            return `${key}=${value}`;
        })
        .join('&');

    return initDataStr;
}

/**
 * Проверяет подпись initData
 * 
 * @param {string} initDataStr - Строка initData
 * @param {string} botToken - Токен бота
 * @returns {boolean} - Результат проверки
 */
function verifyInitData(initDataStr, botToken) {
    // Парсим initData в объект
    const urlParams = new URLSearchParams(initDataStr);
    const initData = {};

    for (const [key, value] of urlParams.entries()) {
        if (key === 'user') {
            try {
                initData[key] = JSON.parse(decodeURIComponent(value));
            } catch (e) {
                return false;
            }
        } else {
            initData[key] = value;
        }
    }

    // Получаем хеш из initData
    const receivedHash = initData.hash;
    if (!receivedHash) {
        return false;
    }

    // Исключаем параметр hash из проверочной строки
    const { hash, ...checkParams } = initData;

    // Сортируем параметры по алфавиту
    const sortedParams = Object.keys(checkParams).sort();

    // Создаем строку для проверки в формате key=value\n
    const checkString = sortedParams
        .map(key => {
            let value = checkParams[key];
            // Преобразуем объекты в JSON строку
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            return `${key}=${value}`;
        })
        .join('\n');

    // Создаем секретный ключ на основе токена и строки "WebAppData"
    const secret = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

    // Создаем HMAC SHA-256 хеш с использованием созданного секретного ключа
    const calculatedHash = crypto
        .createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');

    // Сравниваем хеши
    return calculatedHash === receivedHash;
}

module.exports = {
    generateInitData,
    verifyInitData
}; 