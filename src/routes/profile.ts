/**
 * Типизированные маршруты для расширенного профиля пользователя
 * Обрабатывает детальную статистику, репутацию, достижения и лидерборды
 */

import { Router, Request, Response } from 'express';
import User, { type IUser, UserRank, type IAchievement } from '../models/User';
import { authMiddleware } from '../middleware/auth';

// НОВАЯ СИСТЕМА ДОСТИЖЕНИЙ (50 достижений) - СИНХРОНИЗИРОВАНА С КЛИЕНТОМ
const SERVER_ACHIEVEMENTS_CONFIG = [
    // =========================================================================
    // 🔍 КАТЕГОРИЯ: СЛЕДОВАТЕЛЬ (Базовые достижения для начинающих)
    // =========================================================================
    {
        id: 'first_investigation',
        name: 'Первое расследование',
        description: 'Завершите ваше первое криминальное расследование',
        category: 'investigation',
        requirement: { type: 'investigations', value: 1 }
    },
    {
        id: 'truth_seeker',
        name: 'Искатель истины',
        description: 'Правильно определите ошибку преступника в первый раз',
        category: 'investigation',
        requirement: { type: 'correctAnswers', value: 1 }
    },
    {
        id: 'rookie_detective',
        name: 'Детектив-новичок',
        description: 'Проведите 5 расследований',
        category: 'investigation',
        requirement: { type: 'investigations', value: 5 }
    },
    {
        id: 'crime_solver',
        name: 'Раскрыватель преступлений',
        description: 'Раскройте 10 криминальных дел',
        category: 'investigation',
        requirement: { type: 'solvedCases', value: 10 }
    },
    {
        id: 'experienced_investigator',
        name: 'Опытный следователь',
        description: 'Проведите 25 расследований',
        category: 'investigation',
        requirement: { type: 'investigations', value: 25 }
    },
    {
        id: 'senior_detective',
        name: 'Старший детектив',
        description: 'Проведите 50 расследований',
        category: 'investigation',
        requirement: { type: 'investigations', value: 50 }
    },
    {
        id: 'veteran_investigator',
        name: 'Ветеран следствия',
        description: 'Проведите 100 расследований',
        category: 'investigation',
        requirement: { type: 'investigations', value: 100 }
    },
    {
        id: 'master_detective',
        name: 'Мастер-детектив',
        description: 'Проведите 250 расследований',
        category: 'investigation',
        requirement: { type: 'investigations', value: 250 }
    },

    // =========================================================================
    // 🎯 КАТЕГОРИЯ: ТОЧНОСТЬ (Достижения за правильные ответы)
    // =========================================================================
    {
        id: 'sharp_eye',
        name: 'Острый глаз',
        description: 'Достигните точности 60% в 10+ расследованиях',
        category: 'accuracy',
        requirement: { type: 'accuracy', value: 60, minGames: 10 }
    },
    {
        id: 'keen_observer',
        name: 'Внимательный наблюдатель',
        description: 'Достигните точности 75% в 20+ расследованиях',
        category: 'accuracy',
        requirement: { type: 'accuracy', value: 75, minGames: 20 }
    },
    {
        id: 'master_analyst',
        name: 'Мастер анализа',
        description: 'Достигните точности 85% в 50+ расследованиях',
        category: 'accuracy',
        requirement: { type: 'accuracy', value: 85, minGames: 50 }
    },
    {
        id: 'sherlock_holmes',
        name: 'Шерлок Холмс',
        description: 'Достигните точности 95% в 100+ расследованиях',
        category: 'accuracy',
        requirement: { type: 'accuracy', value: 95, minGames: 100 }
    },

    // =========================================================================
    // ⚡ КАТЕГОРИЯ: СКОРОСТЬ (Достижения за быстрое решение)
    // =========================================================================
    {
        id: 'quick_thinker',
        name: 'Быстрый ум',
        description: 'Решите дело за 30 секунд',
        category: 'speed',
        requirement: { type: 'fastestGame', value: 30 }
    },
    {
        id: 'lightning_detective',
        name: 'Молниеносный детектив',
        description: 'Решите дело за 20 секунд',
        category: 'speed',
        requirement: { type: 'fastestGame', value: 20 }
    },
    {
        id: 'instant_deduction',
        name: 'Мгновенная дедукция',
        description: 'Решите дело за 15 секунд',
        category: 'speed',
        requirement: { type: 'fastestGame', value: 15 }
    },
    {
        id: 'speed_demon',
        name: 'Демон скорости',
        description: 'Решите дело за 10 секунд',
        category: 'speed',
        requirement: { type: 'fastestGame', value: 10 }
    },

    // =========================================================================
    // 🔥 КАТЕГОРИЯ: СЕРИИ (Достижения за череды побед)
    // =========================================================================
    {
        id: 'perfect_start',
        name: 'Идеальное начало',
        description: 'Сыграйте одну идеальную игру (5/5 правильных ответов)',
        category: 'streak',
        requirement: { type: 'perfectGames', value: 1 }
    },
    {
        id: 'winning_streak_3',
        name: 'Тройная серия',
        description: 'Выиграйте 3 идеальные игры подряд',
        category: 'streak',
        requirement: { type: 'winStreak', value: 3 }
    },
    {
        id: 'winning_streak_5',
        name: 'Пятикратная серия',
        description: 'Выиграйте 5 идеальных игр подряд',
        category: 'streak',
        requirement: { type: 'winStreak', value: 5 }
    },
    {
        id: 'winning_streak_10',
        name: 'Десятикратная серия',
        description: 'Выиграйте 10 идеальных игр подряд',
        category: 'streak',
        requirement: { type: 'winStreak', value: 10 }
    },
    {
        id: 'perfectionist',
        name: 'Перфекционист',
        description: 'Сыграйте 10 идеальных игр',
        category: 'streak',
        requirement: { type: 'perfectGames', value: 10 }
    },
    {
        id: 'flawless_master',
        name: 'Безупречный мастер',
        description: 'Сыграйте 25 идеальных игр',
        category: 'streak',
        requirement: { type: 'perfectGames', value: 25 }
    },

    // =========================================================================
    // 💰 КАТЕГОРИЯ: ОЧКИ (Достижения за набранные очки)
    // =========================================================================
    {
        id: 'first_thousand',
        name: 'Первая тысяча',
        description: 'Наберите 1,000 очков',
        category: 'score',
        requirement: { type: 'totalScore', value: 1000 }
    },
    {
        id: 'five_thousand_points',
        name: 'Пять тысяч очков',
        description: 'Наберите 5,000 очков',
        category: 'score',
        requirement: { type: 'totalScore', value: 5000 }
    },
    {
        id: 'ten_thousand_elite',
        name: 'Элита десяти тысяч',
        description: 'Наберите 10,000 очков',
        category: 'score',
        requirement: { type: 'totalScore', value: 10000 }
    },
    {
        id: 'legendary_scorer',
        name: 'Легендарный рекордсмен',
        description: 'Наберите 25,000 очков',
        category: 'score',
        requirement: { type: 'totalScore', value: 25000 }
    },

    // =========================================================================
    // 🎭 КАТЕГОРИЯ: СПЕЦИАЛИЗАЦИЯ (Достижения по типам преступлений)
    // =========================================================================
    {
        id: 'murder_specialist',
        name: 'Специалист по убийствам',
        description: 'Решите 20 дел об убийствах',
        category: 'specialization',
        requirement: { type: 'crimeType', crimeType: 'murder', value: 20 }
    },
    {
        id: 'robbery_expert',
        name: 'Эксперт по ограблениям',
        description: 'Решите 20 дел об ограблениях',
        category: 'specialization',
        requirement: { type: 'crimeType', crimeType: 'robbery', value: 20 }
    },
    {
        id: 'fraud_hunter',
        name: 'Охотник за мошенниками',
        description: 'Решите 20 дел о мошенничестве',
        category: 'specialization',
        requirement: { type: 'crimeType', crimeType: 'fraud', value: 20 }
    },
    {
        id: 'theft_tracker',
        name: 'Следопыт воров',
        description: 'Решите 20 дел о кражах',
        category: 'specialization',
        requirement: { type: 'crimeType', crimeType: 'theft', value: 20 }
    },
    {
        id: 'cyber_investigator',
        name: 'Киберследователь',
        description: 'Решите 20 киберпреступлений',
        category: 'specialization',
        requirement: { type: 'crimeType', crimeType: 'cybercrime', value: 20 }
    },

    // =========================================================================
    // 📈 КАТЕГОРИЯ: СЛОЖНОСТЬ (Достижения по уровням сложности)
    // =========================================================================
    {
        id: 'easy_master',
        name: 'Мастер простых дел',
        description: 'Решите 50 дел легкой сложности',
        category: 'difficulty',
        requirement: { type: 'difficultyType', difficulty: 'easy', value: 50 }
    },
    {
        id: 'medium_expert',
        name: 'Эксперт средних дел',
        description: 'Решите 30 дел средней сложности',
        category: 'difficulty',
        requirement: { type: 'difficultyType', difficulty: 'medium', value: 30 }
    },
    {
        id: 'hard_challenger',
        name: 'Покоритель сложных дел',
        description: 'Решите 20 дел повышенной сложности',
        category: 'difficulty',
        requirement: { type: 'difficultyType', difficulty: 'hard', value: 20 }
    },
    {
        id: 'expert_legend',
        name: 'Легенда экспертного уровня',
        description: 'Решите 10 дел экспертной сложности',
        category: 'difficulty',
        requirement: { type: 'difficultyType', difficulty: 'expert', value: 10 }
    },

    // =========================================================================
    // ⭐ КАТЕГОРИЯ: РЕПУТАЦИЯ (Достижения за репутацию)
    // =========================================================================
    {
        id: 'rising_reputation',
        name: 'Растущая репутация',
        description: 'Достигните репутации 50',
        category: 'reputation',
        requirement: { type: 'reputation', value: 50 }
    },
    {
        id: 'respected_detective',
        name: 'Уважаемый детектив',
        description: 'Достигните репутации 70',
        category: 'reputation',
        requirement: { type: 'reputation', value: 70 }
    },
    {
        id: 'elite_investigator',
        name: 'Элитный следователь',
        description: 'Достигните репутации 85',
        category: 'reputation',
        requirement: { type: 'reputation', value: 85 }
    },
    {
        id: 'legendary_reputation',
        name: 'Легендарная репутация',
        description: 'Достигните репутации 95',
        category: 'reputation',
        requirement: { type: 'reputation', value: 95 }
    },

    // =========================================================================
    // 📅 КАТЕГОРИЯ: АКТИВНОСТЬ (Достижения за регулярность)
    // =========================================================================
    {
        id: 'daily_dedication',
        name: 'Ежедневная преданность',
        description: 'Играйте 7 дней подряд',
        category: 'activity',
        requirement: { type: 'dailyStreak', value: 7 }
    },
    {
        id: 'weekly_warrior',
        name: 'Недельный воин',
        description: 'Играйте 14 дней подряд',
        category: 'activity',
        requirement: { type: 'dailyStreak', value: 14 }
    },
    {
        id: 'monthly_master',
        name: 'Месячный мастер',
        description: 'Играйте 30 дней подряд',
        category: 'activity',
        requirement: { type: 'dailyStreak', value: 30 }
    },
    {
        id: 'eternal_detective',
        name: 'Вечный детектив',
        description: 'Играйте 100 дней подряд',
        category: 'activity',
        requirement: { type: 'dailyStreak', value: 100 }
    },

    // =========================================================================
    // 🏆 КАТЕГОРИЯ: КОМБО (Сложные комбинированные достижения)
    // =========================================================================
    {
        id: 'triple_threat',
        name: 'Тройная угроза',
        description: 'Достигните 80% точности, 5 серии побед и 5000 очков',
        category: 'combo',
        requirement: {
            type: 'combo', requirements: [
                { type: 'accuracy', value: 80, minGames: 20 },
                { type: 'winStreak', value: 5 },
                { type: 'totalScore', value: 5000 }
            ]
        }
    },
    {
        id: 'master_of_all',
        name: 'Мастер всех дел',
        description: 'Решите минимум 10 дел каждого типа преступлений',
        category: 'combo',
        requirement: {
            type: 'combo', requirements: [
                { type: 'crimeType', crimeType: 'murder', value: 10 },
                { type: 'crimeType', crimeType: 'robbery', value: 10 },
                { type: 'crimeType', crimeType: 'fraud', value: 10 },
                { type: 'crimeType', crimeType: 'theft', value: 10 }
            ]
        }
    },
    {
        id: 'perfect_balance',
        name: 'Идеальный баланс',
        description: 'Достигните высоких показателей во всех категориях',
        category: 'combo',
        requirement: {
            type: 'combo', requirements: [
                { type: 'accuracy', value: 85, minGames: 50 },
                { type: 'fastestGame', value: 20 },
                { type: 'perfectGames', value: 15 },
                { type: 'dailyStreak', value: 14 }
            ]
        }
    },

    // =========================================================================
    // 🎪 КАТЕГОРИЯ: ОСОБЫЕ (Уникальные и редкие достижения)
    // =========================================================================
    {
        id: 'speed_and_accuracy',
        name: 'Скорость и точность',
        description: 'Решите дело за 15 секунд с 100% точностью',
        category: 'special',
        requirement: {
            type: 'combo', requirements: [
                { type: 'fastestGame', value: 15 },
                { type: 'perfectGames', value: 1 }
            ]
        }
    },
    {
        id: 'first_day_hero',
        name: 'Герой первого дня',
        description: 'Получите 10 достижений в первый день игры',
        category: 'special',
        requirement: { type: 'achievementsInDay', value: 10 }
    },
    {
        id: 'comeback_king',
        name: 'Король возвращения',
        description: 'Вернитесь в игру после 30+ дней отсутствия',
        category: 'special',
        requirement: { type: 'comebackAfterDays', value: 30 }
    },
    {
        id: 'midnight_detective',
        name: 'Полуночный детектив',
        description: 'Сыграйте игру между 00:00 и 06:00',
        category: 'special',
        requirement: { type: 'timeOfDay', hours: [0, 1, 2, 3, 4, 5] }
    },
    {
        id: 'weekend_warrior',
        name: 'Воин выходных',
        description: 'Сыграйте 10 игр в выходные дни',
        category: 'special',
        requirement: { type: 'weekendGames', value: 10 }
    },
    {
        id: 'perfect_week',
        name: 'Идеальная неделя',
        description: 'Играйте каждый день недели с 80%+ точностью',
        category: 'special',
        requirement: {
            type: 'combo', requirements: [
                { type: 'dailyStreak', value: 7 },
                { type: 'accuracy', value: 80, minGames: 7 }
            ]
        }
    },
    {
        id: 'crime_encyclopedia',
        name: 'Криминальная энциклопедия',
        description: 'Решите 500+ дел и достигните всех основных достижений',
        category: 'special',
        requirement: {
            type: 'combo', requirements: [
                { type: 'investigations', value: 500 },
                { type: 'achievementsCount', value: 40 }
            ]
        }
    }
];

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
                progress: {}
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
 * Генерация списка доступных достижений - НОВАЯ СИСТЕМА!
 */
function generateAvailableAchievements(user: IUser): AvailableAchievement[] {
    const available: AvailableAchievement[] = [];
    const userStats = user.stats;

    console.log('🔍 [ИСПРАВЛЕНО] Генерация доступных достижений для пользователя:', user.telegramId);
    console.log('📊 [ИСПРАВЛЕНО] Статистика пользователя:', {
        totalScore: userStats.totalScore,
        investigations: userStats.investigations,
        solvedCases: userStats.solvedCases,
        winStreak: userStats.winStreak,
        maxWinStreak: userStats.maxWinStreak,
        accuracy: userStats.accuracy,
        perfectGames: userStats.perfectGames,
        totalQuestions: userStats.totalQuestions,
        fastestGame: userStats.fastestGame,
        averageTime: userStats.averageTime,
        dailyStreakCurrent: userStats.dailyStreakCurrent
    });

    // Получаем разблокированные достижения
    const unlockedAchievementIds = (user.achievements || []).map(a => a.id);
    console.log('🏆 [ИСПРАВЛЕНО] Разблокированные достижения:', unlockedAchievementIds);

    // ИСПРАВЛЕННАЯ конвертация пользовательских данных в унифицированный формат
    const unifiedUserStats = {
        // Основные метрики
        investigations: userStats.investigations || 0,
        gamesPlayed: userStats.investigations || 0,
        solvedCases: userStats.solvedCases || userStats.investigations || 0,
        totalScore: userStats.totalScore || 0,

        // Точность и правильные ответы
        accuracy: Math.round(userStats.accuracy || 0),
        totalQuestions: userStats.totalQuestions || 0,
        correctAnswers: userStats.solvedCases || Math.round((userStats.totalQuestions || 0) * (userStats.accuracy || 0) / 100),

        // Серии и достижения
        winStreak: userStats.winStreak || 0,
        maxWinStreak: userStats.maxWinStreak || userStats.winStreak || 0,
        perfectGames: userStats.perfectGames || 0,

        // Время
        fastestGame: userStats.fastestGame || 0,
        averageTime: userStats.averageTime || 0,

        // Активность
        dailyStreakCurrent: userStats.dailyStreakCurrent || 0,

        // Сложность
        easyGames: userStats.easyGames || 0,
        mediumGames: userStats.mediumGames || 0,
        hardGames: userStats.hardGames || 0,
        expertGames: userStats.expertGames || 0,

        // Мастерство и репутация
        crimeTypeMastery: userStats.crimeTypeMastery || {},
        reputation: user.reputation || { level: 0, accuracy: 0, speed: 0, consistency: 0, difficulty: 0 }
    };

    console.log('📋 [ИСПРАВЛЕНО] Унифицированная статистика:', unifiedUserStats);

    // Проходим по всем достижениям и показываем только близкие к получению
    for (const achievement of SERVER_ACHIEVEMENTS_CONFIG) {
        // Пропускаем уже разблокированные
        if (unlockedAchievementIds.includes(achievement.id)) {
            continue;
        }

        // ИСПРАВЛЕННЫЙ расчет прогресса
        const progress = calculateServerAchievementProgress(achievement, unifiedUserStats);

        // Показываем достижения с прогрессом > 0% или базовые для новичков
        const shouldShow = progress.percentage > 0 ||
            ['first_investigation', 'truth_seeker', 'rookie_detective', 'sharp_eye', 'perfect_start', 'first_thousand'].includes(achievement.id);

        if (shouldShow) {
            available.push({
                id: achievement.id,
                name: achievement.name,
                category: achievement.category,
                progress: {
                    current: progress.current,
                    target: progress.target
                },
                description: achievement.description
            });
        }
    }

    // Сортируем по близости к завершению (по проценту прогресса)
    available.sort((a, b) => {
        const progressA = (a.progress.current / a.progress.target) * 100;
        const progressB = (b.progress.current / b.progress.target) * 100;
        return progressB - progressA; // От большего к меньшему
    });

    // Ограничиваем количество достижений для оптимизации
    const limitedAvailable = available.slice(0, 15);

    console.log('✅ [ИСПРАВЛЕНО] Сгенерировано доступных достижений:', limitedAvailable.length);
    console.log('📋 [ИСПРАВЛЕНО] Доступные достижения:', limitedAvailable.map(a => ({
        id: a.id,
        name: a.name,
        progress: `${a.progress.current}/${a.progress.target}`,
        percentage: Math.round((a.progress.current / a.progress.target) * 100) + '%'
    })));

    return limitedAvailable;
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

// ПОЛНОСТЬЮ ПЕРЕРАБОТАННАЯ функция расчета прогресса для серверной части
function calculateServerAchievementProgress(achievement: any, userStats: any) {
    const req = achievement.requirement;
    let current = 0;
    let target = req.value || 1;

    console.log(`🔍 [ИСПРАВЛЕНО] Расчет прогресса для достижения ${achievement.id}:`, {
        type: req.type,
        target,
        requirement: req,
        userStats: {
            investigations: userStats.investigations,
            accuracy: userStats.accuracy,
            totalScore: userStats.totalScore,
            correctAnswers: userStats.correctAnswers,
            perfectGames: userStats.perfectGames,
            maxWinStreak: userStats.maxWinStreak,
            fastestGame: userStats.fastestGame,
            dailyStreakCurrent: userStats.dailyStreakCurrent
        }
    });

    switch (req.type) {
        case 'investigations':
            current = userStats.investigations || 0;
            break;

        case 'correctAnswers':
            current = userStats.correctAnswers || 0;
            break;

        case 'solvedCases':
            current = userStats.solvedCases || userStats.investigations || 0;
            break;

        case 'accuracy':
            // ИСПРАВЛЕНО: Проверяем минимальное количество игр для достижений точности
            const gamesPlayed = userStats.investigations || userStats.gamesPlayed || 0;
            const minGamesRequired = req.minGames || 0;

            if (gamesPlayed >= minGamesRequired) {
                current = Math.round(userStats.accuracy || 0);
                // Для достижений точности target = требуемая точность
                target = req.value || 100;
            } else {
                // Недостаточно игр - показываем прогресс по количеству игр
                current = gamesPlayed;
                target = minGamesRequired;
            }
            break;

        case 'totalScore':
            current = userStats.totalScore || 0;
            break;

        case 'perfectGames':
            current = userStats.perfectGames || 0;
            break;

        case 'winStreak':
            // ИСПРАВЛЕНО: Используем правильное поле для серий
            current = userStats.maxWinStreak || 0;
            break;

        case 'fastestGame':
            // ИСПРАВЛЕНО: Для достижений скорости правильная логика
            const fastestTime = userStats.fastestGame || 0;
            const targetTimeMs = target * 1000; // target в секундах, fastestGame в мс

            if (fastestTime > 0) {
                if (fastestTime <= targetTimeMs) {
                    // Достижение выполнено
                    current = target;
                } else {
                    // Показываем обратный прогресс (чем меньше время, тем больше прогресс)
                    const progressRatio = Math.max(0, (targetTimeMs / fastestTime));
                    current = Math.round(target * progressRatio);
                }
            } else {
                current = 0; // Нет записей о времени
            }
            break;

        case 'averageTime':
            // ИСПРАВЛЕНО: Для средего времени также проверяем минимальное количество игр
            const avgGamesPlayed = userStats.investigations || 0;
            const avgMinGames = req.minGames || 0;

            if (avgGamesPlayed >= avgMinGames) {
                const avgTime = userStats.averageTime || 0;
                const targetAvgTimeMs = req.value * 1000;

                if (avgTime > 0 && avgTime <= targetAvgTimeMs) {
                    current = target;
                } else if (avgTime > 0) {
                    const progressRatio = Math.max(0, (targetAvgTimeMs / avgTime));
                    current = Math.round(target * progressRatio);
                } else {
                    current = 0;
                }
            } else {
                // Недостаточно игр для подсчета среднего времени
                current = avgGamesPlayed;
                target = avgMinGames;
            }
            break;

        case 'dailyStreak':
            current = userStats.dailyStreakCurrent || 0;
            break;

        case 'reputation':
            // ИСПРАВЛЕНО: Правильный расчет репутации
            if (userStats.reputation) {
                current = userStats.reputation.level || Math.round((
                    (userStats.reputation.accuracy || 0) +
                    (userStats.reputation.speed || 0) +
                    (userStats.reputation.consistency || 0) +
                    (userStats.reputation.difficulty || 0)
                ) / 4);
            } else {
                current = 0;
            }
            break;

        case 'crimeType':
            // ИСПРАВЛЕНО: Реализация для типов преступлений
            const crimeType = req.crimeType;
            const mastery = userStats.crimeTypeMastery?.[crimeType];
            if (mastery) {
                current = mastery.level || 0;
            } else {
                current = 0;
            }
            break;

        case 'difficultyType':
            // ИСПРАВЛЕНО: Реализация для сложности
            const difficulty = req.difficulty;
            switch (difficulty) {
                case 'easy':
                    current = userStats.easyGames || 0;
                    break;
                case 'medium':
                    current = userStats.mediumGames || 0;
                    break;
                case 'hard':
                    current = userStats.hardGames || 0;
                    break;
                case 'expert':
                    current = userStats.expertGames || 0;
                    break;
                default:
                    current = 0;
            }
            break;

        case 'combo':
            // ИСПРАВЛЕНО: Для комбо-достижений проверяем все требования
            if (req.requirements && Array.isArray(req.requirements)) {
                let completedRequirements = 0;
                const totalRequirements = req.requirements.length;

                for (const subReq of req.requirements) {
                    const subProgress = calculateServerAchievementProgress({ requirement: subReq }, userStats);
                    if (subProgress.percentage >= 100) {
                        completedRequirements++;
                    }
                }

                current = completedRequirements;
                target = totalRequirements;
            }
            break;

        // ИСПРАВЛЕНО: Дополнительные типы для специальных достижений
        case 'achievementsInDay':
        case 'comebackAfterDays':
        case 'timeOfDay':
        case 'weekendGames':
        case 'achievementsCount':
            // Пока не реализованы, возвращаем 0
            current = 0;
            console.warn(`⚠️ [ИСПРАВЛЕНО] Тип требования "${req.type}" пока не реализован для достижения ${achievement.id}`);
            break;

        default:
            console.warn(`⚠️ [ИСПРАВЛЕНО] Неизвестный тип требования: ${req.type} для достижения ${achievement.id}`);
            current = 0;
    }

    // ИСПРАВЛЕНО: Безопасный расчет процента
    const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    console.log(`📊 [ИСПРАВЛЕНО] Результат расчета для ${achievement.id}: ${current}/${target} = ${percentage}%`);

    return { current, target, percentage };
}

export default router; 