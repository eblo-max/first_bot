const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

/**
 * Аутентификация пользователя через Telegram WebApp
 */
exports.authenticateTelegram = async (req, res) => {
    try {
        const { initData } = req.body;
        console.log('Получен запрос на аутентификацию с initData:', initData ? `${initData.substring(0, 30)}...` : 'отсутствует');

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
            console.error('Неверная подпись данных Telegram WebApp. Ожидалось:', calculatedHash, 'Получено:', hash);
            return res.status(401).json({
                status: 'error',
                message: 'Неверная подпись данных Telegram WebApp'
            });
        }

        // Извлекаем данные пользователя
        let user;
        let userStr = '';
        try {
            userStr = params.get('user');
            console.log('Данные пользователя из Telegram params:', userStr);

            if (userStr) {
                user = JSON.parse(userStr);
            } else {
                // Попытка извлечь данные из другого параметра (startParam или initDataUnsafe)
                const startParam = params.get('start_param');
                if (startParam && startParam.startsWith('{')) {
                    try {
                        user = JSON.parse(startParam);
                        console.log('Извлечены данные пользователя из start_param');
                    } catch (e) {
                        console.error('Ошибка при парсинге start_param:', e);
                    }
                }
            }
        } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e, 'Исходная строка:', userStr);
        }

        if (!user || !user.id) {
            console.error('Отсутствуют данные пользователя Telegram после парсинга.');

            // Проверка доп. данных из запроса, если есть
            if (req.body.telegramUser) {
                user = req.body.telegramUser;
                console.log('Используем данные из req.body.telegramUser:', user);
            } else if (req.body.user) {
                user = req.body.user;
                console.log('Используем данные из req.body.user:', user);
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: 'Отсутствуют данные пользователя Telegram'
                });
            }
        }

        // Проверяем, что id пользователя существует и конвертируем в строку
        if (!user.id) {
            return res.status(400).json({
                status: 'error',
                message: 'Отсутствует ID пользователя Telegram'
            });
        }

        // Данные пользователя Telegram
        const userInfo = {
            telegramId: user.id.toString(),
            username: user.username || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            languageCode: user.language_code || 'ru'
        };

        console.log('Данные пользователя Telegram для сохранения:', userInfo);

        // Создаем или обновляем пользователя в базе данных
        let dbUser = await User.findOne({ telegramId: userInfo.telegramId });

        if (!dbUser) {
            // Создаем нового пользователя
            dbUser = new User({
                telegramId: userInfo.telegramId,
                username: userInfo.username,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                registeredAt: new Date(),
                lastVisit: new Date()
            });

            await dbUser.save();
            console.log(`Создан новый пользователь Telegram: ${userInfo.telegramId}`);
        } else {
            // Обновляем данные пользователя
            dbUser.username = userInfo.username;
            dbUser.firstName = userInfo.firstName;
            dbUser.lastName = userInfo.lastName;
            dbUser.lastVisit = new Date();

            await dbUser.save();
            console.log(`Обновлен существующий пользователь Telegram: ${userInfo.telegramId}`);
        }

        // Генерируем JWT токен
        const token = jwt.sign(
            {
                telegramId: userInfo.telegramId,
                username: userInfo.username,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Формируем имя пользователя для отображения
        const displayName = userInfo.firstName
            ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim()
            : (dbUser.nickname || userInfo.username || 'Аноним');

        // Возвращаем токен и данные пользователя
        return res.status(200).json({
            status: 'success',
            data: {
                token,
                user: {
                    telegramId: dbUser.telegramId,
                    name: displayName,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    username: userInfo.username,
                    rank: dbUser.rank,
                    stats: dbUser.stats,
                    totalScore: dbUser.stats.totalScore
                }
            }
        });

    } catch (error) {
        console.error('Ошибка аутентификации Telegram WebApp:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Проверка действительности токена
 */
exports.verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('Запрос без токена авторизации');
            return res.status(401).json({
                status: 'error',
                message: 'Отсутствует токен авторизации'
            });
        }

        // Проверяем токен
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            console.log('Ошибка JWT:', jwtError.name, jwtError.message);

            if (jwtError.name === 'TokenExpiredError') {
                console.log('Токен истек, требуется повторная авторизация');
                return res.status(401).json({
                    status: 'error',
                    message: 'Токен истек',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                console.log('Недействительный токен');
                return res.status(401).json({
                    status: 'error',
                    message: 'Недействительный токен',
                    code: 'INVALID_TOKEN'
                });
            }

            throw jwtError;
        }

        // Проверяем существование пользователя в базе
        const user = await User.findOne({ telegramId: decoded.telegramId || decoded.id });

        if (!user) {
            console.log('Пользователь не найден в базе данных:', decoded.telegramId || decoded.id);
            return res.status(401).json({
                status: 'error',
                message: 'Пользователь не найден',
                code: 'USER_NOT_FOUND'
            });
        }

        console.log('Токен проверен успешно для пользователя:', user.telegramId);

        return res.status(200).json({
            status: 'success',
            data: {
                telegramId: user.telegramId,
                name: decoded.firstName ? `${decoded.firstName} ${decoded.lastName || ''}`.trim() : (user.nickname || decoded.username || 'Аноним'),
                rank: user.rank,
                stats: user.stats
            }
        });

    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        return res.status(401).json({
            status: 'error',
            message: 'Ошибка проверки токена',
            code: 'VERIFICATION_ERROR'
        });
    }
};

/**
 * Прямой доступ для пользователей, которые не через Telegram
 */
exports.directAccess = async (req, res) => {
    try {
        console.log('Запрос на прямой доступ без Telegram авторизации');

        // Создаем временного гостя с реальным ID
        const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);

        // Получаем имя пользователя из User-Agent или используем дефолтное
        const userAgent = req.headers['user-agent'] || '';
        const browserInfo = userAgent.split(' ').slice(-2).join(' ');
        const guestName = `Гость ${guestId.substring(6, 11)}`;

        // Сохраняем пользователя в базу данных для корректной работы профиля
        let dbUser = await User.findOne({ telegramId: guestId });

        if (!dbUser) {
            // Создаем нового пользователя-гостя
            dbUser = new User({
                telegramId: guestId,
                username: guestName,
                firstName: guestName,
                lastName: browserInfo,
                registeredAt: new Date(),
                lastVisit: new Date()
            });

            await dbUser.save();
            console.log(`Создан гостевой пользователь: ${guestName} (${guestId})`);
        } else {
            // Обновляем время последнего визита
            dbUser.lastVisit = new Date();
            await dbUser.save();
        }

        // Генерируем JWT токен для гостя
        const token = jwt.sign(
            {
                telegramId: guestId,
                username: guestName,
                firstName: guestName,
                lastName: browserInfo,
                isGuest: true,
                createdAt: new Date().toISOString()
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Возвращаем успешный ответ с токеном и информацией о пользователе
        return res.status(200).json({
            status: 'success',
            data: {
                token,
                isGuest: true,
                user: {
                    telegramId: guestId,
                    name: guestName,
                    rank: dbUser.rank,
                    stats: dbUser.stats
                }
            }
        });
    } catch (error) {
        console.error('Ошибка при создании прямого доступа:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
}; 