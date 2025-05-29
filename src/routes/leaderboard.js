const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const leaderboardService = require('../services/leaderboardService');
const Leaderboard = require('../models/Leaderboard');

/**
 * @route   GET /api/leaderboard/status
 * @desc    Получение статуса службы рейтингов
 * @access  Private
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const status = leaderboardService.getStatus();

        // Добавляем информацию о записях в кэше
        const cacheStats = {
            all: await Leaderboard.countDocuments({ period: 'all' }),
            day: await Leaderboard.countDocuments({ period: 'day' }),
            week: await Leaderboard.countDocuments({ period: 'week' }),
            month: await Leaderboard.countDocuments({ period: 'month' })
        };

        res.json({
            status: 'success',
            data: {
                ...status,
                cacheStats
            }
        });
    } catch (error) {
        console.error('Ошибка получения статуса рейтингов:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка получения статуса'
        });
    }
});

/**
 * @route   POST /api/leaderboard/force-update
 * @desc    Принудительное обновление всех рейтингов
 * @access  Private (только для администраторов)
 */
router.post('/force-update', authMiddleware, async (req, res) => {
    try {
        const { period } = req.body;

        let result;
        if (period && ['day', 'week', 'month', 'all'].includes(period)) {
            // Обновляем конкретный период
            result = await leaderboardService.forceUpdatePeriod(period);
            res.json({
                status: 'success',
                message: `Рейтинг ${period} успешно обновлен`,
                data: { updatedCount: result }
            });
        } else {
            // Обновляем все рейтинги
            result = await leaderboardService.updateLeaderboards();
            res.json({
                status: 'success',
                message: 'Все рейтинги успешно обновлены',
                data: result
            });
        }
    } catch (error) {
        console.error('Ошибка принудительного обновления рейтингов:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка обновления рейтингов'
        });
    }
});

/**
 * @route   GET /api/leaderboard/:period
 * @desc    Получение рейтинга для конкретного периода
 * @access  Private
 */
router.get('/:period', authMiddleware, async (req, res) => {
    try {
        const { period } = req.params;
        const { limit = 20 } = req.query;
        const telegramId = req.user.telegramId;

        if (!['day', 'week', 'month', 'all'].includes(period)) {
            return res.status(400).json({
                status: 'error',
                message: 'Неверный период. Используйте: day, week, month, all'
            });
        }

        const result = await leaderboardService.getLeaderboard(period, parseInt(limit), telegramId);

        res.json({
            status: 'success',
            data: {
                leaderboard: result.leaderboard,
                currentUser: result.currentUser,
                pagination: {
                    page: 1,
                    limit: parseInt(limit),
                    total: result.leaderboard.length
                },
                meta: {
                    period,
                    cached: result.cached,
                    fallback: result.fallback,
                    updatedAt: result.updatedAt
                }
            }
        });
    } catch (error) {
        console.error(`Ошибка получения рейтинга ${req.params.period}:`, error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка получения рейтинга'
        });
    }
});

/**
 * @route   DELETE /api/leaderboard/cache
 * @desc    Очистка кэша рейтингов
 * @access  Private (только для администраторов)
 */
router.delete('/cache', authMiddleware, async (req, res) => {
    try {
        const { period } = req.query;

        let result;
        if (period && ['day', 'week', 'month', 'all'].includes(period)) {
            // Очищаем конкретный период
            result = await Leaderboard.deleteMany({ period });
        } else {
            // Очищаем весь кэш
            result = await Leaderboard.deleteMany({});
        }

        res.json({
            status: 'success',
            message: period ?
                `Кэш рейтинга ${period} очищен` :
                'Весь кэш рейтингов очищен',
            data: { deletedCount: result.deletedCount }
        });
    } catch (error) {
        console.error('Ошибка очистки кэша рейтингов:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка очистки кэша'
        });
    }
});

/**
 * @route   GET /api/leaderboard/user/:userId
 * @desc    Получение позиции конкретного пользователя во всех рейтингах
 * @access  Private
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const positions = {};
        const periods = ['day', 'week', 'month', 'all'];

        for (const period of periods) {
            try {
                const position = await Leaderboard.getUserPosition(userId, period);
                positions[period] = position ? {
                    rank: position.rank,
                    score: position.score,
                    username: position.username,
                    userRank: position.userRank
                } : null;
            } catch (error) {
                console.error(`Ошибка получения позиции пользователя в рейтинге ${period}:`, error);
                positions[period] = null;
            }
        }

        res.json({
            status: 'success',
            data: {
                userId,
                positions
            }
        });
    } catch (error) {
        console.error('Ошибка получения позиций пользователя:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка получения позиций пользователя'
        });
    }
});

module.exports = router; 