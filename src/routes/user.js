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
router.get('/profile', authMiddlewareAlias, async (req, res) => {
    try {
        // Получаем пользователя из middleware
        const telegramId = req.user.telegramId;

        // Находим пользователя в базе данных
        const user = await User.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Формируем имя пользователя для отображения
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : (user.username || 'Детектив');

        // Возвращаем данные профиля
        res.json({
            status: 'success',
            data: {
                telegramId: user.telegramId,
                name: displayName,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                rank: user.rank || 'НОВИЧОК',
                stats: {
                    investigations: user.stats?.totalGames || 0,
                    solvedCases: user.stats?.correctAnswers || 0,
                    winStreak: user.stats?.currentStreak || 0,
                    maxWinStreak: user.stats?.maxStreak || 0,
                    accuracy: user.stats?.totalGames > 0
                        ? Math.round((user.stats.correctAnswers / user.stats.totalGames) * 100)
                        : 0,
                    totalScore: user.stats?.totalScore || 0
                },
                achievements: user.achievements || [],
                registeredAt: user.registeredAt,
                lastVisit: user.lastVisit,
                gameHistory: user.gameHistory || []
            }
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

        // Получаем топ пользователей по общему счету
        const leaders = await User.find()
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
                score: user.stats?.totalScore || 0,
                userRank: user.rank || 'НОВИЧОК'
            };
        });

        res.json({
            status: 'success',
            data: {
                leaders: formattedLeaders,
                period,
                total: leaders.length
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