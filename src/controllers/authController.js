const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

/**
 * Аутентификация пользователя через Telegram WebApp
 */
exports.authenticateTelegram = async (req, res) => {
    try {
        const { initData } = req.body;

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
        let user;
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

        // Данные пользователя Telegram
        const userInfo = {
            telegramId: user.id.toString(),
            username: user.username || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            languageCode: user.language_code || 'ru'
        };

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
        } else {
            // Обновляем данные пользователя
            dbUser.username = userInfo.username;
            dbUser.firstName = userInfo.firstName;
            dbUser.lastName = userInfo.lastName;
            dbUser.lastVisit = new Date();

            await dbUser.save();
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

        // Возвращаем токен и данные пользователя
        return res.status(200).json({
            status: 'success',
            data: {
                token,
                user: {
                    telegramId: dbUser.telegramId,
                    name: userInfo.firstName ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim() : (dbUser.nickname || userInfo.username || 'Аноним'),
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
            return res.status(401).json({
                status: 'error',
                message: 'Отсутствует токен авторизации'
            });
        }

        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Проверяем существование пользователя в базе
        const user = await User.findOne({ telegramId: decoded.telegramId });

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                telegramId: user.telegramId,
                name: decoded.firstName ? `${decoded.firstName} ${decoded.lastName || ''}`.trim() : (user.nickname || decoded.username || 'Аноним'),
                rank: user.rank
            }
        });

    } catch (error) {
        console.error('Ошибка проверки токена:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Токен истек'
            });
        }

        return res.status(401).json({
            status: 'error',
            message: 'Недействительный токен'
        });
    }
}; 