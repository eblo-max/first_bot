const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Получение профиля пользователя с расширенной статистикой
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.user.telegramId });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Формируем расширенный профиль
        const profileData = {
            basic: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                nickname: user.nickname,
                registeredAt: user.registeredAt,
                lastVisit: user.lastVisit
            },

            // 🏆 Детективное звание
            rank: {
                current: user.rank,
                displayName: user.getRankDisplayName(),
                rarity: user.getRankRarity(),
                progress: user.rewards.nextRankProgress
            },

            // ⭐ Репутационная система
            reputation: user.getReputationBreakdown(),

            // 📊 Расширенная статистика
            stats: {
                // Основные показатели
                investigations: user.stats.investigations,
                solvedCases: user.stats.solvedCases,
                totalQuestions: user.stats.totalQuestions,
                totalScore: user.stats.totalScore,
                accuracy: user.stats.accuracy,

                // Серии и достижения
                winStreak: user.stats.winStreak,
                maxWinStreak: user.stats.maxWinStreak,
                perfectGames: user.stats.perfectGames,

                // Скорость
                averageTime: user.stats.averageTime,
                fastestGame: user.stats.fastestGame,

                // Активность
                dailyStreakCurrent: user.stats.dailyStreakCurrent,
                dailyStreakBest: user.stats.dailyStreakBest,

                // По сложности
                gamesBySifficulty: {
                    easy: user.stats.easyGames,
                    medium: user.stats.mediumGames,
                    hard: user.stats.hardGames,
                    expert: user.stats.expertGames
                }
            },

            // 🏅 Достижения
            achievements: {
                progress: user.getAchievementsProgress(),
                list: user.achievements.map(achievement => ({
                    ...achievement.toObject(),
                    isRecent: achievement.unlockedAt &&
                        (Date.now() - achievement.unlockedAt.getTime()) < 7 * 24 * 60 * 60 * 1000 // последние 7 дней
                }))
            },

            // 📈 Недавние игры
            recentGames: user.gameHistory
                .slice(-10)
                .reverse()
                .map(game => ({
                    ...game.toObject(),
                    efficiency: game.totalQuestions > 0 ?
                        Math.round((game.correctAnswers / game.totalQuestions) * 100) : 0
                }))
        };

        res.json(profileData);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 📈 Получение детальной статистики репутации
router.get('/reputation/details', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.user.telegramId });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const reputationDetails = {
            current: user.getReputationBreakdown(),

            // Исторические данные репутации (из последних 20 игр)
            history: user.gameHistory
                .slice(-20)
                .map(game => ({
                    date: game.date,
                    reputationGained: game.reputationGained || 0,
                    efficiency: Math.round((game.correctAnswers / game.totalQuestions) * 100),
                    difficulty: game.difficulty
                })),

            // Рекомендации по улучшению
            recommendations: generateReputationRecommendations(user)
        };

        res.json(reputationDetails);
    } catch (error) {
        console.error('Ошибка получения деталей репутации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 🏅 Получение всех доступных достижений
router.get('/achievements/available', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.user.telegramId });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const availableAchievements = generateAvailableAchievements(user);

        res.json({
            unlocked: user.achievements,
            available: availableAchievements,
            progress: user.getAchievementsProgress()
        });
    } catch (error) {
        console.error('Ошибка получения достижений:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 📊 Получение лидерборда с новыми метриками
router.get('/leaderboard/:period?', authMiddleware, async (req, res) => {
    try {
        const period = req.params.period || 'all';
        const limit = parseInt(req.query.limit) || 50;

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case 'week':
                dateFilter = { lastVisit: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
                break;
            case 'month':
                dateFilter = { lastVisit: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
                break;
            case 'today':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateFilter = { lastVisit: { $gte: today } };
                break;
        }

        // Топ по различным метрикам
        const leaderboards = {
            // Общий рейтинг (очки)
            totalScore: await User.find(dateFilter)
                .sort({ 'stats.totalScore': -1 })
                .limit(limit)
                .select('telegramId username firstName lastName nickname rank stats.totalScore reputation.level')
                .lean(),

            // Репутация
            reputation: await User.find(dateFilter)
                .sort({ 'reputation.level': -1 })
                .limit(limit)
                .select('telegramId username firstName lastName nickname rank reputation stats.investigations')
                .lean(),

            // Точность
            accuracy: await User.find({
                ...dateFilter,
                'stats.investigations': { $gte: 10 } // минимум 10 игр
            })
                .sort({ 'stats.accuracy': -1 })
                .limit(limit)
                .select('telegramId username firstName lastName nickname rank stats.accuracy stats.investigations')
                .lean(),

            // Серии
            streaks: await User.find(dateFilter)
                .sort({ 'stats.maxWinStreak': -1 })
                .limit(limit)
                .select('telegramId username firstName lastName nickname rank stats.maxWinStreak stats.winStreak')
                .lean(),

            // Скорость (только у кого есть время)
            speed: await User.find({
                ...dateFilter,
                'stats.fastestGame': { $gt: 0 }
            })
                .sort({ 'stats.fastestGame': 1 }) // меньше времени = лучше
                .limit(limit)
                .select('telegramId username firstName lastName nickname rank stats.fastestGame stats.averageTime')
                .lean()
        };

        res.json(leaderboards);
    } catch (error) {
        console.error('Ошибка получения лидерборда:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 🎯 Получение прогресса до следующих достижений
router.get('/progress/next-achievements', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.user.telegramId });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const nextAchievements = calculateNextAchievements(user);

        res.json({
            nextRank: {
                current: user.rank,
                progress: user.rewards.nextRankProgress,
                displayName: user.getRankDisplayName()
            },
            nextAchievements
        });
    } catch (error) {
        console.error('Ошибка получения прогресса:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Генерация рекомендаций по улучшению репутации
function generateReputationRecommendations(user) {
    const recommendations = [];

    if (user.reputation.accuracy < 70) {
        recommendations.push({
            type: 'accuracy',
            title: 'Улучшите точность',
            description: 'Старайтесь внимательнее читать вопросы и анализировать варианты ответов',
            priority: 'high'
        });
    }

    if (user.reputation.speed < 50 && user.stats.averageTime > 0) {
        recommendations.push({
            type: 'speed',
            title: 'Увеличьте скорость',
            description: 'Попробуйте решать дела быстрее, но не жертвуя точностью',
            priority: 'medium'
        });
    }

    if (user.reputation.consistency < 60) {
        recommendations.push({
            type: 'consistency',
            title: 'Играйте регулярно',
            description: 'Ежедневные игры помогут улучшить постоянство',
            priority: 'medium'
        });
    }

    if (user.reputation.difficulty < 40) {
        recommendations.push({
            type: 'difficulty',
            title: 'Пробуйте сложные дела',
            description: 'Решение дел повышенной сложности увеличит вашу репутацию',
            priority: 'low'
        });
    }

    return recommendations;
}

// Генерация списка доступных достижений
function generateAvailableAchievements(user) {
    const available = [];

    // Проверяем ближайшие достижения по играм
    const investigationMilestones = [5, 25, 50, 100, 250, 500];
    const nextInvestigationMilestone = investigationMilestones.find(m => m > user.stats.investigations);

    if (nextInvestigationMilestone) {
        available.push({
            id: `detective_milestone_${nextInvestigationMilestone}`,
            name: `${nextInvestigationMilestone} расследований`,
            category: 'ПРОГРЕСС',
            progress: {
                current: user.stats.investigations,
                target: nextInvestigationMilestone
            },
            description: `Проведите ${nextInvestigationMilestone} расследований`
        });
    }

    // Проверяем достижения по точности
    if (user.stats.accuracy < 90 && user.stats.investigations >= 10) {
        available.push({
            id: 'accuracy_90',
            name: 'Мастер-детектив',
            category: 'МАСТЕРСТВО',
            progress: {
                current: user.stats.accuracy,
                target: 90
            },
            description: 'Достигните 90% точности'
        });
    }

    // Проверяем достижения по сериям
    const streakMilestones = [3, 5, 10, 20];
    const nextStreakMilestone = streakMilestones.find(m => m > user.stats.maxWinStreak);

    if (nextStreakMilestone) {
        available.push({
            id: `streak_${nextStreakMilestone}`,
            name: `Серия из ${nextStreakMilestone}`,
            category: 'СЕРИИ',
            progress: {
                current: user.stats.maxWinStreak,
                target: nextStreakMilestone
            },
            description: `Соберите серию из ${nextStreakMilestone} идеальных игр`
        });
    }

    return available;
}

// Расчет ближайших достижений
function calculateNextAchievements(user) {
    const next = [];

    // Следующее звание
    const rankThresholds = [0, 150, 400, 900, 2000, 4500, 10000, 20000];
    const currentRankIndex = rankThresholds.findIndex(threshold => user.stats.totalScore < threshold);

    if (currentRankIndex > 0 && currentRankIndex < rankThresholds.length) {
        const nextThreshold = rankThresholds[currentRankIndex];
        const progress = Math.round(((user.stats.totalScore) / nextThreshold) * 100);

        next.push({
            type: 'rank',
            title: 'Следующее звание',
            progress: {
                current: user.stats.totalScore,
                target: nextThreshold,
                percentage: Math.min(progress, 100)
            },
            description: `До следующего звания: ${nextThreshold - user.stats.totalScore} очков`
        });
    }

    return next;
}

module.exports = router; 