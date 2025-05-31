const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Middleware для проверки JWT-токена
 * Объединяет лучшие практики из обеих реализаций
 */
const authMiddleware = (req, res, next) => {
    try {

        // Получение токена из заголовка
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {

            return res.status(401).json({
                status: 'error',
                message: 'Необходима авторизация, токен не предоставлен'
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {

            return res.status(401).json({
                status: 'error',
                message: 'Токен не предоставлен'
            });
        }

        console.log('Извлеченный токен:', token.substring(0, 20) + '...');

        // Проверка токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        req.user = decoded;

        next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error.message);

        // Детализированная обработка ошибок JWT
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Токен истек, необходимо переавторизоваться',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'Неверный токен авторизации',
                code: 'TOKEN_INVALID'
            });
        }

        return res.status(401).json({
            status: 'error',
            message: 'Ошибка при проверке токена',
            code: 'TOKEN_ERROR'
        });
    }
};

/**
 * Middleware для проверки данных Telegram WebApp
 * Проверяет подпись и извлекает данные пользователя
 */
const verifyTelegramWebAppData = (req, res, next) => {
    try {
        console.log('🔍 === НАЧАЛО ВАЛИДАЦИИ TELEGRAM WEBAPP ===');
        console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('🔍 Body keys:', Object.keys(req.body));
        console.log('🔍 User-Agent:', req.headers['user-agent']);

        const { initData } = req.body;
        if (!initData) {
            console.error('❌ initData не предоставлены в запросе');
            console.log('🔍 Полученный body:', JSON.stringify(req.body, null, 2));
            return res.status(401).json({
                status: 'error',
                message: 'initData не предоставлены',
                code: 'INIT_DATA_MISSING'
            });
        }

        console.log('🔍 Получен initData длиной:', initData.length);
        console.log('🔍 initData (первые 200 символов):', initData.substring(0, 200) + '...');

        // Парсинг данных
        const data = new URLSearchParams(initData);
        const hash = data.get('hash');

        console.log('🔍 Извлеченный hash:', hash);
        console.log('🔍 Все параметры initData:');
        for (const [key, value] of data.entries()) {
            if (key === 'user') {
                console.log(`  ${key}: ${value.substring(0, 100)}...`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }

        if (!hash) {
            console.error('❌ Отсутствует hash в initData');
            return res.status(401).json({
                status: 'error',
                message: 'Отсутствует hash в данных авторизации',
                code: 'HASH_MISSING'
            });
        }

        data.delete('hash');

        // Сортировка параметров
        const dataCheckArr = [];
        for (const [key, value] of [...data.entries()].sort()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        const dataCheckString = dataCheckArr.join('\n');

        console.log('🔍 dataCheckString создан, длина:', dataCheckString.length);
        console.log('🔍 dataCheckString (первые 200 символов):', dataCheckString.substring(0, 200) + '...');

        // Создание секретного ключа на основе токена бота
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error('❌ TELEGRAM_BOT_TOKEN не задан в переменных окружения');
            return res.status(500).json({
                status: 'error',
                message: 'Ошибка конфигурации сервера',
                code: 'BOT_TOKEN_MISSING'
            });
        }

        console.log('🔍 Bot token (первые 10 символов):', botToken.substring(0, 10) + '...');

        const secret = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        console.log('🔍 Secret key создан, длина:', secret.length);

        // Проверка хэша
        const generatedHash = crypto
            .createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        console.log('🔍 Сгенерированный hash:', generatedHash);
        console.log('🔍 Полученный hash:     ', hash);
        console.log('🔍 Хеши совпадают:', generatedHash === hash);

        if (generatedHash !== hash) {
            console.error('❌ Недействительный hash.');
            console.error('❌ Ожидается:', generatedHash);
            console.error('❌ Получен:', hash);
            return res.status(401).json({
                status: 'error',
                message: 'Недействительный hash',
                code: 'HASH_INVALID'
            });
        }

        console.log('✅ Hash валиден, продолжаем обработку пользователя');

        // Получение данных пользователя
        if (data.has('user')) {
            try {
                const userRaw = JSON.parse(data.get('user'));
                console.log('🔍 Данные пользователя из initData:', JSON.stringify(userRaw, null, 2));

                // Преобразуем данные пользователя в правильный формат
                req.telegramUser = {
                    telegramId: userRaw.id.toString(), // Преобразуем id в telegramId
                    username: userRaw.username || null,
                    firstName: userRaw.first_name || null,
                    lastName: userRaw.last_name || null,
                    languageCode: userRaw.language_code || 'ru',
                    isPremium: userRaw.is_premium || false
                };

                console.log('✅ req.telegramUser создан:', JSON.stringify(req.telegramUser, null, 2));

            } catch (parseError) {
                console.error('❌ Ошибка парсинга данных пользователя:', parseError);
                return res.status(400).json({
                    status: 'error',
                    message: 'Некорректные данные пользователя',
                    code: 'USER_DATA_PARSE_ERROR'
                });
            }
        } else {
            console.error('❌ Отсутствуют данные пользователя в initData');
            return res.status(400).json({
                status: 'error',
                message: 'Отсутствуют данные пользователя',
                code: 'USER_DATA_MISSING'
            });
        }

        console.log('✅ === ВАЛИДАЦИЯ TELEGRAM WEBAPP ЗАВЕРШЕНА УСПЕШНО ===');
        next();
    } catch (error) {
        console.error('❌ Ошибка проверки данных Telegram:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(401).json({
            status: 'error',
            message: 'Ошибка аутентификации',
            code: 'TELEGRAM_AUTH_ERROR'
        });
    }
};

module.exports = {
    authMiddleware,
    verifyTelegramWebAppData
}; 