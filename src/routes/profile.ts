/**
 * Типизированные маршруты для расширенного профиля пользователя
 * Обрабатывает детальную статистику, репутацию, достижения и лидерборды
 */

import { Router, Request, Response } from 'express';
import User, { type IUser, UserRank, type IAchievement } from '../models/User';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Интерфейсы для запросов и ответов
interface AuthenticatedRequest extends Request {
    user?: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

interface LeaderboardRequest extends AuthenticatedRequest {
    params: {
        period?: 'day' | 'week' | 'month' | 'all';
    };
    query: {
        limit?: string;
    };
}

// Типы ответов
interface ProfileData {
    basic: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        nickname?: string;
        registeredAt: Date;
        lastVisit: Date;
    };
    rank: {
        current: UserRank;
        displayName: string;
    };
    stats: {
        investigations: number;
        solvedCases: number;
        totalQuestions: number;
        totalScore: number;
        accuracy: number;
        winStreak: number;
        maxWinStreak: number;
        perfectGames: number;
        averageTime: number;
        fastestGame: number;
        dailyStreakCurrent: number;
        dailyStreakBest: number;
    };
    achievements: IAchievement[];
    recentGames: any[];
}

interface ReputationDetails {
    current: any;
    history: Array<{
        date: Date;
        reputationGained: number;
        efficiency: number;
        difficulty: string;
    }>;
    recommendations: ReputationRecommendation[];
}

interface ReputationRecommendation {
    type: 'accuracy' | 'speed' | 'consistency' | 'difficulty';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}

interface AvailableAchievement {
    id: string;
    name: string;
    category: string;
    progress: {
        current: number;
        target: number;
    };
    description: string;
}

interface LeaderboardEntry {
    rank: number;
    telegramId: string;
    name: string;
    username?: string;
    userRank: UserRank;
    stats: {
        totalScore: number;
    };
}

interface NextAchievement {
    type: 'rank' | 'achievement';
    title: string;
    progress: {
        current: number;
        target: number;
        percentage: number;
    };
    description: string;
}

/**
 * @route   GET /api/profile
 * @desc    Получение профиля пользователя с расширенной статистикой
 * @access  Private
 */
router.get('/', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = await User.findOne({ telegramId: req.user?.telegramId });

        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' } as any);
            return;
        }

        console.log('👤 Получение расширенного профиля:', user.telegramId);

        // Формируем расширенный профиль
        const profileData: ProfileData = {
            basic: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                nickname: user.nickname,
                registeredAt: user.registeredAt,
                lastVisit: user.lastVisit
            },

            rank: {
                current: user.rank || 'СТАЖЕР' as UserRank,
                displayName: user.rank || 'СТАЖЕР'
            },

            stats: {
                // Основные показатели
                investigations: user.stats?.investigations || 0,
                solvedCases: user.stats?.solvedCases || 0,
                totalQuestions: user.stats?.totalQuestions || 0,
                totalScore: user.stats?.totalScore || 0,
                accuracy: user.stats?.accuracy || 0,

                // Серии и достижения
                winStreak: user.stats?.winStreak || 0,
                maxWinStreak: user.stats?.maxWinStreak || 0,
                perfectGames: user.stats?.perfectGames || 0,

                // Скорость
                averageTime: user.stats?.averageTime || 0,
                fastestGame: user.stats?.fastestGame || 0,

                // Активность
                dailyStreakCurrent: user.stats?.dailyStreakCurrent || 0,
                dailyStreakBest: user.stats?.dailyStreakBest || 0
            },

            achievements: user.achievements || [],

            recentGames: user.gameHistory ? user.gameHistory.slice(-10).reverse() : []
        };

        console.log('✅ Отправка данных расширенного профиля:', {
            telegramId: user.telegramId,
            rank: profileData.rank.current,
            totalScore: profileData.stats.totalScore,
            achievements: profileData.achievements.length
        });

        res.json({
            status: 'success',
            data: profileData
        });
    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        } as any);
    }
});

/**
 * @route   GET /api/profile/reputation/details
 * @desc    Получение детальной информации о репутации
 * @access  Private
 */
router.get('/reputation/details', authMiddleware as any, async (req: AuthenticatedRequest, res: Response<ReputationDetails>) => {
    try {
        const user = await User.findOne({ telegramId: req.user?.telegramId });

        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' } as any);
            return;
        }

        console.log('📊 Получение деталей репутации:', user.telegramId);

        const reputationDetails: ReputationDetails = {
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

        console.log('✅ Детали репутации получены');
        res.json(reputationDetails);
    } catch (error) {
        console.error('❌ Ошибка получения деталей репутации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' } as any);
    }
});

/**
 * @route   GET /api/profile/achievements/available
 * @desc    Получение доступных достижений
 * @access  Private
 */
router.get('/achievements/available', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = await User.findOne({ telegramId: req.user?.telegramId });

        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }

        console.log('🏆 Получение доступных достижений:', user.telegramId);

        const availableAchievements = generateAvailableAchievements(user);

        res.json({
            status: 'success',
            data: {
                unlocked: user.achievements,
                available: availableAchievements,
                progress: user.getAchievementsProgress()
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения достижений:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * @route   GET /api/profile/leaderboard/:period?
 * @desc    Получение лидерборда с фильтрацией по периоду
 * @access  Private
 */
router.get('/leaderboard/:period?', authMiddleware as any, async (req: LeaderboardRequest, res: Response) => {
    try {
        const period = req.params.period || 'all';
        const limit = parseInt(req.query.limit || '50');
        const currentUser = req.user;

        console.log(`🔍 Запрос лидерборда ${period.toUpperCase()}:`, { limit, user: currentUser?.telegramId });

        let dateFilter: any = {};
        const now = new Date();

        switch (period) {
            case 'day':
                const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                dateFilter = {
                    $or: [
                        { lastVisit: { $gte: last24h } },
                        { lastVisit: { $exists: false }, 'stats.totalScore': { $gt: 0 } }
                    ]
                };
                break;
            case 'week':
                const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateFilter = {
                    $or: [
                        { lastVisit: { $gte: lastWeek } },
                        { lastVisit: { $exists: false }, 'stats.totalScore': { $gt: 0 } }
                    ]
                };
                break;
            case 'month':
                const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateFilter = {
                    $or: [
                        { lastVisit: { $gte: lastMonth } },
                        { lastVisit: { $exists: false }, 'stats.totalScore': { $gt: 0 } }
                    ]
                };
                break;
            default:
                dateFilter = { 'stats.totalScore': { $gt: 0 } };
                break;
        }

        console.log('📊 Фильтр запроса:', dateFilter);

        // Получаем топ игроков по общему счету
        const totalScoreLeaderboard = await User.find(dateFilter)
            .sort({ 'stats.totalScore': -1 })
            .limit(limit)
            .select('telegramId username firstName lastName nickname rank stats.totalScore lastVisit')
            .lean();

        console.log(`✅ Найдено ${totalScoreLeaderboard.length} пользователей в лидерборде`);

        // Форматируем данные для frontend
        const formattedLeaderboard: LeaderboardEntry[] = totalScoreLeaderboard.map((user, index) => {
            const displayName = user.nickname ||
                (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                    (user.username || `Игрок ${user.telegramId.toString().slice(-4)}`));

            return {
                rank: index + 1,
                telegramId: user.telegramId,
                name: displayName,
                username: user.username,
                userRank: user.rank || 'СТАЖЕР' as UserRank,
                stats: {
                    totalScore: user.stats?.totalScore || 0
                }
            };
        });

        const result = {
            totalScore: formattedLeaderboard,
            period: period,
            total: formattedLeaderboard.length
        };

        console.log('📤 Отправка данных лидерборда:', {
            period,
            total: result.total,
            leaderboard: result.totalScore.map(user => ({
                rank: user.rank,
                name: user.name,
                score: user.stats.totalScore
            }))
        });

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('❌ Ошибка получения лидерборда:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * @route   GET /api/profile/progress/next-achievements
 * @desc    Получение прогресса к следующим достижениям
 * @access  Private
 */
router.get('/progress/next-achievements', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = await User.findOne({ telegramId: req.user?.telegramId });

        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }

        console.log('📈 Получение прогресса достижений:', user.telegramId);

        const nextAchievements = calculateNextAchievements(user);

        res.json({
            status: 'success',
            data: {
                nextRank: {
                    current: user.rank,
                    progress: user.rewards?.nextRankProgress || 0,
                    displayName: user.getRankDisplayName()
                },
                nextAchievements
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения прогресса:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Генерация рекомендаций по улучшению репутации
 */
function generateReputationRecommendations(user: IUser): ReputationRecommendation[] {
    const recommendations: ReputationRecommendation[] = [];

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

/**
 * Генерация списка доступных достижений
 */
function generateAvailableAchievements(user: IUser): AvailableAchievement[] {
    const available: AvailableAchievement[] = [];
    const userStats = user.stats;

    console.log('🔍 Генерация доступных достижений для пользователя:', user.telegramId);
    console.log('📊 Статистика пользователя:', {
        totalScore: userStats.totalScore,
        investigations: userStats.investigations,
        winStreak: userStats.winStreak,
        accuracy: userStats.accuracy,
        perfectGames: userStats.perfectGames
    });
    console.log('🏆 Разблокированные достижения:', user.achievements?.length || 0);

    // Достижения по счету
    if (userStats.totalScore < 100 && !user.achievements.some(a => a.id === 'detective_novice')) {
        available.push({
            id: 'detective_novice',
            name: 'Детектив-новичок',
            category: 'score',
            progress: { current: userStats.totalScore, target: 100 },
            description: 'Наберите 100 очков'
        });
    }

    if (userStats.totalScore < 1000 && !user.achievements.some(a => a.id === 'detective_expert')) {
        available.push({
            id: 'detective_expert',
            name: 'Опытный детектив',
            category: 'score',
            progress: { current: userStats.totalScore, target: 1000 },
            description: 'Наберите 1000 очков'
        });
    }

    if (userStats.totalScore < 10000 && !user.achievements.some(a => a.id === 'detective_master')) {
        available.push({
            id: 'detective_master',
            name: 'Мастер-детектив',
            category: 'score',
            progress: { current: userStats.totalScore, target: 10000 },
            description: 'Наберите 10000 очков'
        });
    }

    // Достижения по количеству дел - ГЛАВНОЕ ИСПРАВЛЕНИЕ!
    if (userStats.investigations < 10 && !user.achievements.some(a => a.id === 'case_solver')) {
        available.push({
            id: 'case_solver',
            name: 'Решатель дел',
            category: 'investigations',
            progress: { current: userStats.investigations, target: 10 },
            description: 'Решите 10 дел'
        });
    }

    if (userStats.investigations < 25 && !user.achievements.some(a => a.id === 'detective_experienced')) {
        available.push({
            id: 'detective_experienced',
            name: 'Опытный детектив',
            category: 'investigations',
            progress: { current: userStats.investigations, target: 25 },
            description: 'Проведите 25 расследований'
        });
    }

    if (userStats.investigations < 50 && !user.achievements.some(a => a.id === 'veteran_detective')) {
        available.push({
            id: 'veteran_detective',
            name: 'Ветеран сыска',
            category: 'investigations',
            progress: { current: userStats.investigations, target: 50 },
            description: 'Решите 50 дел'
        });
    }

    if (userStats.investigations < 100 && !user.achievements.some(a => a.id === 'detective_master')) {
        available.push({
            id: 'detective_master',
            name: 'Мастер следствия',
            category: 'investigations',
            progress: { current: userStats.investigations, target: 100 },
            description: 'Проведите 100 расследований'
        });
    }

    // Достижения по точности
    if (userStats.investigations >= 10) {
        if (userStats.accuracy < 90 && !user.achievements.some(a => a.id === 'master_detective')) {
            available.push({
                id: 'master_detective',
                name: 'Мастер-детектив точности',
                category: 'accuracy',
                progress: { current: Math.round(userStats.accuracy), target: 90 },
                description: 'Достичь точности 90%+ в 10+ играх'
            });
        }

        if (userStats.accuracy < 95 && userStats.investigations >= 20 && !user.achievements.some(a => a.id === 'perfectionist')) {
            available.push({
                id: 'perfectionist',
                name: 'Перфекционист',
                category: 'accuracy',
                progress: { current: Math.round(userStats.accuracy), target: 95 },
                description: 'Достичь точности 95%+ в 20+ играх'
            });
        }
    }

    // Достижения серий
    if (userStats.maxWinStreak < 5 && !user.achievements.some(a => a.id === 'streak_5')) {
        available.push({
            id: 'streak_5',
            name: 'Горячая рука',
            category: 'streak',
            progress: { current: userStats.maxWinStreak, target: 5 },
            description: 'Серия из 5 идеальных игр'
        });
    }

    if (userStats.maxWinStreak < 10 && !user.achievements.some(a => a.id === 'streak_10')) {
        available.push({
            id: 'streak_10',
            name: 'Неостановимый',
            category: 'streak',
            progress: { current: userStats.maxWinStreak, target: 10 },
            description: 'Серия из 10 идеальных игр'
        });
    }

    console.log('✅ Сгенерировано доступных достижений:', available.length);
    console.log('📋 Доступные достижения:', available.map(a => ({ id: a.id, name: a.name, progress: a.progress })));

    return available;
}

/**
 * Расчет ближайших достижений
 */
function calculateNextAchievements(user: IUser): NextAchievement[] {
    const next: NextAchievement[] = [];

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

export default router; 