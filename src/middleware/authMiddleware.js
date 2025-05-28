const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Middleware для проверки аутентификации по JWT токену
const authMiddleware = (req, res, next) => {
    try {
        console.log('=== AUTH MIDDLEWARE ===');
        console.log('URL:', req.url);
        console.log('Headers authorization:', req.headers.authorization);

        // Получаем токен из заголовка авторизации
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Токен отсутствует или неверный формат');
            return res.status(401).json({
                status: 'error',
                message: 'Необходима авторизация, токен не предоставлен'
            });
        }

        // Извлекаем токен
        const token = authHeader.split(' ')[1];
        console.log('Извлеченный токен:', token.substring(0, 20) + '...');

        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Декодированный токен:', decoded);

        // Добавляем информацию о пользователе в запрос
        req.user = decoded;

        console.log('Авторизация успешна, пользователь:', req.user);
        next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Токен истек, необходимо переавторизоваться'
            });
        }

        return res.status(401).json({
            status: 'error',
            message: 'Неверный токен авторизации'
        });
    }
};

// Middleware для проверки данных Telegram WebApp
const validateTelegramWebAppData = (req, res, next) => {
    try {
        const initData = req.body.initData;

        if (!initData) {
            return res.status(400).json({
                status: 'error',
                message: 'Отсутствуют данные инициализации Telegram WebApp'
            });
        }

        // Парсим строку initData
        const params = new URLSearchParams(initData);

        // Извлекаем данные
        const hash = params.get('hash');
        params.delete('hash');

        // Сортируем параметры в алфавитном порядке
        const sortedParams = Array.from(params.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Создаем HMAC-SHA-256 хэш
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(sortedParams).digest('hex');

        // Проверяем совпадение хэшей
        if (calculatedHash !== hash) {
            return res.status(401).json({
                status: 'error',
                message: 'Неверная подпись данных Telegram WebApp'
            });
        }

        // Извлекаем данные пользователя
        let user = null;
        try {
            const userStr = params.get('user');
            if (userStr) {
                user = JSON.parse(userStr);
            }
        } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e);
        }

        if (!user || !user.id) {
            return res.status(400).json({
                status: 'error',
                message: 'Отсутствуют данные пользователя Telegram'
            });
        }

        // Добавляем информацию о пользователе в запрос
        req.telegramUser = {
            telegramId: user.id.toString(),
            username: user.username || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            languageCode: user.language_code || 'ru'
        };

        next();
    } catch (error) {
        console.error('Ошибка при валидации данных Telegram WebApp:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Ошибка при обработке данных аутентификации'
        });
    }
};

// Объединяем оба middleware для использования в маршрутах
module.exports = authMiddleware; 