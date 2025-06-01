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
        
        // Детальная диагностика запроса
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        Object.entries(req.headers).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`);
        });

        console.log('  - Body keys:', Object.keys(req.body));
        console.log('  - Body size:', JSON.stringify(req.body).length, 'bytes');

        const { initData } = req.body;
        if (!initData) {
            console.error('❌ initData не предоставлены в запросе');
            
            return res.status(401).json({
                status: 'error',
                message: 'initData не предоставлены',
                code: 'INIT_DATA_MISSING',
                debug: {
                    isMobile,
                    userAgent,
                    bodyKeys: Object.keys(req.body)
                }
            });
        }

        console.log('  - Первые 300 символов:', initData.substring(0, 300));
        console.log('  - Последние 100 символов:', initData.slice(-100));

        // Парсинг данных
        const data = new URLSearchParams(initData);
        const hash = data.get('hash');
        const authDate = data.get('auth_date');
        const user = data.get('user');
        const queryId = data.get('query_id');

        console.log('  - hash найден:', !!hash, hash ? `(${hash.substring(0, 20)}...)` : '');

        for (const [key, value] of data.entries()) {
            if (key === 'user') {
                console.log(`  - ${key}: ${value.substring(0, 100)}...`);
            } else {
                console.log(`  - ${key}: ${value}`);
            }
        }

        if (!hash) {
            console.error('❌ Отсутствует hash в initData');
            return res.status(401).json({
                status: 'error',
                message: 'Отсутствует hash в данных авторизации',
                code: 'HASH_MISSING',
                debug: {
                    isMobile,
                    userAgent,
                    initDataLength: initData.length,
                    parsedKeys: [...data.keys()]
                }
            });
        }

        // Проверка даты авторизации для диагностики
        if (authDate) {
            const authTime = parseInt(authDate) * 1000;
            const now = Date.now();
            const timeDiff = now - authTime;
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));

            console.log('  - Время авторизации:', new Date(authTime).toISOString());
            console.log('  - Текущее время:', new Date(now).toISOString());
            
            if (hours > 24) {
                console.warn('⚠️  initData старше 24 часов - может быть проблемой!');
            }
        }

        data.delete('hash');

        // Сортировка параметров
        const dataCheckArr = [];
        for (const [key, value] of [...data.entries()].sort()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        const dataCheckString = dataCheckArr.join('\n');

        console.log('  - Содержимое (первые 500 символов):', dataCheckString.substring(0, 500));

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

        console.log('  - Первые 15 символов:', botToken.substring(0, 15) + '...');
        console.log('  - Содержит двоеточие:', botToken.includes(':'));

        const secret = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Проверка хэша
        const generatedHash = crypto
            .createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        console.log('  - Полученный:     ', hash);
        
        if (generatedHash !== hash) {
            console.error('❌ Недействительный hash');

            // Дополнительная диагностика для мобильных устройств
            if (isMobile) {
                console.error('🔍 МОБИЛЬНОЕ УСТРОЙСТВО - дополнительная диагностика:');
                console.error('  - Возможно различие в URL encoding между mobile и desktop');
                console.error('  - Проверяем исходные данные без декодирования...');

                // Пытаемся альтернативные способы обработки
                try {
                    const rawParams = new URLSearchParams(initData);
                    console.error('  - Raw parameters parsing success');

                    for (const [key, value] of rawParams.entries()) {
                        console.error(`    ${key} = ${value.substring(0, 50)}...`);
                    }
                } catch (e) {
                    console.error('  - Raw parameters parsing failed:', e.message);
                }
            }

            return res.status(401).json({
                status: 'error',
                message: 'Недействительный hash',
                code: 'HASH_INVALID',
                debug: {
                    isMobile,
                    userAgent,
                    expected: generatedHash,
                    received: hash,
                    initDataLength: initData.length,
                    dataCheckStringLength: dataCheckString.length
                }
            });
        }

        // Получение данных пользователя
        if (data.has('user')) {
            try {
                const userRaw = JSON.parse(data.get('user'));
                
                // Преобразуем данные пользователя в правильный формат
                req.telegramUser = {
                    telegramId: userRaw.id.toString(),
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
                    code: 'USER_DATA_PARSE_ERROR',
                    debug: {
                        isMobile,
                        userAgent,
                        parseError: parseError.message
                    }
                });
            }
        } else {
            console.error('❌ Отсутствуют данные пользователя в initData');
            return res.status(400).json({
                status: 'error',
                message: 'Отсутствуют данные пользователя',
                code: 'USER_DATA_MISSING',
                debug: {
                    isMobile,
                    userAgent,
                    availableKeys: [...data.keys()]
                }
            });
        }

        next();

    } catch (error) {
        console.error('❌ Критическая ошибка валидации:', error);
        console.error('❌ Stack trace:', error.stack);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера при валидации',
            code: 'VALIDATION_ERROR',
            debug: {
                error: error.message,
                stack: error.stack
            }
        });
    }
};

module.exports = {
    authMiddleware,
    verifyTelegramWebAppData
}; 