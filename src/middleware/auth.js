const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Middleware для проверки JWT-токена
 */
const authMiddleware = (req, res, next) => {
    try {
        // Получение токена из заголовка
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Токен не предоставлен' });
        }

        // Проверка токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
        req.user = decoded;

        next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        return res.status(401).json({ error: 'Недействительный токен' });
    }
};

/**
 * Middleware для проверки данных Telegram WebApp
 */
const verifyTelegramWebAppData = (req, res, next) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            return res.status(401).json({ error: 'initData не предоставлены' });
        }

        // Парсинг данных
        const data = new URLSearchParams(initData);
        const hash = data.get('hash');
        data.delete('hash');

        // Сортировка параметров
        const dataCheckArr = [];
        for (const [key, value] of [...data.entries()].sort()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        const dataCheckString = dataCheckArr.join('\n');

        // Создание секретного ключа на основе токена бота
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error('TELEGRAM_BOT_TOKEN не задан в переменных окружения');
            return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
        }

        const secret = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Проверка хэша
        const generatedHash = crypto
            .createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        if (generatedHash !== hash) {
            return res.status(401).json({ error: 'Недействительный hash' });
        }

        // Получение данных пользователя
        if (data.has('user')) {
            req.telegramUser = JSON.parse(data.get('user'));
        }

        next();
    } catch (error) {
        console.error('Ошибка проверки данных Telegram:', error);
        res.status(401).json({ error: 'Ошибка аутентификации' });
    }
};

module.exports = {
    authMiddleware,
    verifyTelegramWebAppData
}; 