const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const User = require('../models/User');

// Добавляем fetch для Node.js если не поддерживается встроенно
const fetch = globalThis.fetch || require('node-fetch');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

/**
 * Получение профиля пользователя
 */
router.get('/profile', async (req, res) => {
    try {

        // Получаем пользователя из middleware
        if (!req.user || !req.user.telegramId) {

            return res.status(401).json({
                status: 'error',
                message: 'Пользователь не авторизован'
            });
        }

        const telegramId = req.user.telegramId;

        // Находим пользователя в базе данных
        let user = await User.findOne({ telegramId });

        // Если пользователь не найден, создаем его с данными из JWT токена
        if (!user) {

            user = new User({
                telegramId: req.user.telegramId,
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                rank: 'НОВИЧОК',
                stats: {
                    totalGames: 0,
                    correctAnswers: 0,
                    totalScore: 0,
                    currentStreak: 0,
                    maxStreak: 0,
                    accuracy: 0
                },
                achievements: [],
                registeredAt: new Date(),
                lastVisit: new Date(),
                gameHistory: []
            });

            try {
                await user.save();

            } catch (saveError) {
                console.error('Ошибка создания пользователя:', saveError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Ошибка создания профиля пользователя'
                });
            }
        } else {
            // Обновляем время последнего визита
            user.lastVisit = new Date();
            await user.save();
        }

        // Формируем имя пользователя для отображения
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : (user.username || 'Детектив');

        // Формируем данные профиля
        const profileData = {
            telegramId: user.telegramId,
            name: displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            rank: user.rank || 'НОВИЧОК',
            stats: {
                investigations: user.stats?.investigations || user.stats?.totalGames || 0,
                solvedCases: user.stats?.solvedCases || user.stats?.correctAnswers || 0,
                winStreak: user.stats?.winStreak || user.stats?.currentStreak || 0,
                maxWinStreak: user.stats?.maxWinStreak || user.stats?.maxStreak || 0,
                accuracy: user.stats?.accuracy || (user.stats?.totalGames > 0
                    ? Math.round((user.stats.correctAnswers / user.stats.totalGames) * 100)
                    : 0),
                totalScore: user.stats?.totalScore || 0
            },
            achievements: user.achievements || [],
            registeredAt: user.registeredAt,
            lastVisit: user.lastVisit,
            gameHistory: user.gameHistory || []
        };

        console.log('Отправляем данные профиля:', JSON.stringify(profileData, null, 2));

        // Возвращаем данные профиля
        res.json({
            status: 'success',
            data: profileData
        });

    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * Обновление профиля пользователя
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const telegramId = req.user.telegramId;
        const { nickname } = req.body;

        // Находим и обновляем пользователя
        const user = await User.findOneAndUpdate(
            { telegramId },
            {
                nickname,
                lastVisit: new Date()
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        res.json({
            status: 'success',
            message: 'Профиль обновлен'
        });

    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Получение статистики и достижений пользователя
router.get('/stats', userController.getStats);

// Получение истории игр пользователя
router.get('/history', userController.getGameHistory);

/**
 * Получение таблицы лидеров
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { period = 'all', limit = 20 } = req.query;
        const currentUserTelegramId = req.user?.telegramId;

        // Получаем топ пользователей по общему счету
        const leaders = await User.find({ 'stats.totalScore': { $gt: 0 } })
            .sort({ 'stats.totalScore': -1 })
            .limit(parseInt(limit))
            .select('telegramId firstName lastName username stats.totalScore rank');

        // Форматируем данные для ответа
        const formattedLeaders = leaders.map((user, index) => {
            const displayName = user.firstName
                ? `${user.firstName} ${user.lastName || ''}`.trim()
                : (user.username || 'Детектив');

            return {
                rank: index + 1,
                name: displayName,
                username: user.username,
                telegramId: user.telegramId,
                totalScore: user.stats?.totalScore || 0,
                userRank: user.rank || 'НОВИЧОК'
            };
        });

        res.json({
            status: 'success',
            data: {
                entries: formattedLeaders,
                period,
                total: formattedLeaders.length,
                currentUser: {
                    telegramId: currentUserTelegramId
                }
            }
        });

    } catch (error) {
        console.error('Ошибка получения таблицы лидеров:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Получение аватара пользователя из Telegram
router.get('/avatar', authMiddleware, async (req, res) => {
    try {
        const telegramId = req.user.telegramId;

        // Проверяем что у нас есть токен бота
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error('TELEGRAM_BOT_TOKEN не задан');
            return res.status(500).json({
                status: 'error',
                message: 'Ошибка конфигурации сервера'
            });
        }

        // Делаем запрос к Telegram API для получения фотографий профиля
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getUserProfilePhotos`;
        const params = new URLSearchParams({
            user_id: telegramId,
            limit: 1  // Получаем только последнюю фотографию
        });

        logger.info(`Запрос фотографии профиля для пользователя ${telegramId}`, {
            telegramId,
            url: `${telegramApiUrl}?${params}`
        });

        const response = await fetch(`${telegramApiUrl}?${params}`);
        const data = await response.json();

        if (!data.ok) {
            logger.warn('Telegram API вернул ошибку при получении фотографий профиля', {
                telegramId,
                error: data.description
            });
            return res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'Фотография профиля недоступна'
                }
            });
        }

        // Проверяем есть ли фотографии
        if (!data.result || !data.result.photos || data.result.photos.length === 0) {
            logger.info('У пользователя нет фотографий профиля', { telegramId });
            return res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'У пользователя нет фотографии профиля'
                }
            });
        }

        // Получаем file_id самой большой версии последней фотографии
        const lastPhoto = data.result.photos[0]; // Последняя загруженная фотография
        const largestPhoto = lastPhoto[lastPhoto.length - 1]; // Самый большой размер

        if (!largestPhoto || !largestPhoto.file_id) {
            logger.warn('Не удалось получить file_id фотографии', { telegramId });
            return res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'Не удалось получить фотографию профиля'
                }
            });
        }

        // Получаем информацию о файле для получения прямой ссылки
        const fileApiUrl = `https://api.telegram.org/bot${botToken}/getFile`;
        const fileParams = new URLSearchParams({
            file_id: largestPhoto.file_id
        });

        const fileResponse = await fetch(`${fileApiUrl}?${fileParams}`);
        const fileData = await fileResponse.json();

        if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
            logger.warn('Не удалось получить путь к файлу фотографии', {
                telegramId,
                fileId: largestPhoto.file_id
            });
            return res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'Не удалось получить ссылку на фотографию'
                }
            });
        }

        // Формируем прямую ссылку на фотографию
        const avatarUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

        logger.info('Успешно получен аватар пользователя', {
            telegramId,
            avatarUrl: avatarUrl.substring(0, 50) + '...',
            fileSize: fileData.result.file_size
        });

        res.json({
            status: 'success',
            data: {
                hasAvatar: true,
                avatarUrl: avatarUrl,
                fileSize: fileData.result.file_size,
                dimensions: {
                    width: largestPhoto.width,
                    height: largestPhoto.height
                }
            }
        });

    } catch (error) {
        logger.error('Ошибка при получении аватара пользователя', {
            telegramId: req.user.telegramId,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            status: 'error',
            message: 'Ошибка при получении фотографии профиля'
        });
    }
});

module.exports = router; 