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
        console.log('Middleware verifyTelegramWebAppData: проверка данных Telegram WebApp');
        const { initData } = req.body;
        if (!initData) {
            console.error('initData не предоставлены в запросе');
            return res.status(401).json({ error: 'initData не предоставлены' });
        }

        console.log('initData получены, длина:', initData.length);

        // Парсинг данных
        const data = new URLSearchParams(initData);
        const hash = data.get('hash');

        if (!hash) {
            console.error('Отсутствует hash в initData');
            return res.status(401).json({ error: 'Отсутствует hash в данных авторизации' });
        }

        data.delete('hash');

        // Сортировка параметров
        const dataCheckArr = [];
        for (const [key, value] of [...data.entries()].sort()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        const dataCheckString = dataCheckArr.join('\n');

        console.log('dataCheckString создан:', dataCheckString.substring(0, 100) + '...');

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
            console.error('Недействительный hash. Ожидается:', generatedHash, 'Получен:', hash);
            return res.status(401).json({ error: 'Недействительный hash' });
        }

        console.log('Hash валиден, извлекаем данные пользователя');

        // Получение данных пользователя
        if (data.has('user')) {
            try {
                const userRaw = JSON.parse(data.get('user'));
                console.log('Данные пользователя из initData:', userRaw);

                // Преобразуем данные пользователя в правильный формат
                req.telegramUser = {
                    telegramId: userRaw.id.toString(), // Преобразуем id в telegramId
                    username: userRaw.username || null,
                    firstName: userRaw.first_name || null,
                    lastName: userRaw.last_name || null,
                    languageCode: userRaw.language_code || 'ru',
                    isPremium: userRaw.is_premium || false
                };

                console.log('telegramUser установлен:', req.telegramUser);
            } catch (parseError) {
                console.error('Ошибка парсинга данных пользователя:', parseError);
                return res.status(400).json({ error: 'Некорректные данные пользователя' });
            }
        } else {
            console.error('Отсутствуют данные пользователя в initData');
            return res.status(400).json({ error: 'Отсутствуют данные пользователя' });
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