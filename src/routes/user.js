const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { authMiddleware: authMiddlewareAlias } = require('../middleware/auth');
const User = require('../models/User');

// Все маршруты требуют авторизации
router.use(authMiddleware);

/**
 * Получение профиля пользователя
 */
router.get('/profile', async (req, res) => {
    try {
        console.log('=== ЗАПРОС ПРОФИЛЯ ===');
        console.log('Headers:', req.headers);
        console.log('User from middleware:', req.user);

        // Получаем пользователя из middleware
        if (!req.user || !req.user.telegramId) {
            console.log('Ошибка: пользователь не найден в req.user');
            return res.status(401).json({
                status: 'error',
                message: 'Пользователь не авторизован'
            });
        }

        const telegramId = req.user.telegramId;
        console.log('Ищем пользователя с telegramId:', telegramId);

        // Находим пользователя в базе данных
        let user = await User.findOne({ telegramId });
        console.log('Найденный пользователь в БД:', user ? {
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            stats: user.stats
        } : 'не найден');

        // Если пользователь не найден, создаем его с данными из JWT токена
        if (!user) {
            console.log('Пользователь не найден в базе данных, создаем нового...');

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
                console.log('Новый пользователь создан:', telegramId);
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

        console.log('Отображаемое имя:', displayName);

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
router.put('/profile', authMiddlewareAlias, async (req, res) => {
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

        console.log(`Запрос лидерборда: period=${period}, limit=${limit}, currentUser=${currentUserTelegramId}`);

        // Получаем топ пользователей по общему счету
        const leaders = await User.find({ 'stats.totalScore': { $gt: 0 } })
            .sort({ 'stats.totalScore': -1 })
            .limit(parseInt(limit))
            .select('telegramId firstName lastName username stats.totalScore rank');

        console.log(`Найдено пользователей с очками: ${leaders.length}`);

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

module.exports = router; 