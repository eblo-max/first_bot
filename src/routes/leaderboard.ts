/**
 * Типизированные маршруты для системы лидерборда
 * Обрабатывает получение рейтингов, статусов и принудительные обновления
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import leaderboardService from '../services/leaderboardService';
import Leaderboard from '../models/Leaderboard';

const router = Router();

// Интерфейсы для запросов и ответов
interface AuthenticatedRequest extends Request {
    user?: {
        telegramId: string;
        username?: string;
    };
}

interface ForceUpdateRequest extends AuthenticatedRequest {
    body: {
        period?: 'day' | 'week' | 'month' | 'all';
    };
}

interface LeaderboardRequest extends AuthenticatedRequest {
    params: {
        period: 'day' | 'week' | 'month' | 'all';
    };
    query: {
        limit?: string;
    };
}

interface UserPositionRequest extends AuthenticatedRequest {
    params: {
        userId: string;
    };
}

interface ClearCacheRequest extends AuthenticatedRequest {
    query: {
        period?: 'day' | 'week' | 'month' | 'all';
    };
}

// Типы ответов
interface StatusResponse {
    status: 'success' | 'error';
    data?: {
        isRunning: boolean;
        isUpdating: boolean;
        lastUpdateTime: Date | null;
        updateIntervalMs: number;
        nextUpdateIn: number | null;
        cacheStats: {
            all: number;
            day: number;
            week: number;
            month: number;
        };
    };
    message?: string;
}

interface LeaderboardResponse {
    status: 'success' | 'error';
    data?: {
        leaderboard: any[];
        currentUser: any;
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
        meta: {
            period: string;
            cached?: boolean;
            fallback?: boolean;
            updatedAt?: string;
        };
    };
    message?: string;
}

/**
 * @route   GET /api/leaderboard/status
 * @desc    Получение статуса службы рейтингов
 * @access  Private
 */
router.get('/status', authMiddleware as any, async (req: AuthenticatedRequest, res: Response<StatusResponse>) => {
    try {
        console.log('📊 Запрос статуса службы лидерборда');
        const status = leaderboardService.getStatus();

        // Добавляем информацию о записях в кэше
        const cacheStats = {
            all: await Leaderboard.countDocuments({ period: 'all' }),
            day: await Leaderboard.countDocuments({ period: 'day' }),
            week: await Leaderboard.countDocuments({ period: 'week' }),
            month: await Leaderboard.countDocuments({ period: 'month' })
        };

        console.log('✅ Статус лидерборда получен:', { status, cacheStats });

        res.json({
            status: 'success',
            data: {
                ...status,
                cacheStats
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения статуса рейтингов:', error);
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
router.post('/force-update', authMiddleware as any, async (req: ForceUpdateRequest, res: Response) => {
    try {
        const { period } = req.body;
        console.log(`🔄 Принудительное обновление рейтинга:`, period || 'all');

        let result;
        if (period && ['day', 'week', 'month', 'all'].includes(period)) {
            // Обновляем конкретный период
            result = await leaderboardService.forceUpdatePeriod(period);
            console.log(`✅ Рейтинг ${period} обновлен, записей: ${result}`);

            res.json({
                status: 'success',
                message: `Рейтинг ${period} успешно обновлен`,
                data: { updatedCount: result }
            });
        } else {
            // Обновляем все рейтинги
            result = await leaderboardService.updateLeaderboards();
            console.log('✅ Все рейтинги обновлены:', result);

            res.json({
                status: 'success',
                message: 'Все рейтинги успешно обновлены',
                data: result
            });
        }
    } catch (error) {
        console.error('❌ Ошибка принудительного обновления рейтингов:', error);
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
router.get('/:period', authMiddleware as any, async (req: LeaderboardRequest, res: Response<LeaderboardResponse>) => {
    try {
        const { period } = req.params;
        const { limit = '20' } = req.query;
        const telegramId = req.user?.telegramId;

        console.log(`📈 Запрос рейтинга:`, { period, limit, telegramId });

        if (!['day', 'week', 'month', 'all'].includes(period)) {
            res.status(400).json({
                status: 'error',
                message: 'Неверный период. Используйте: day, week, month, all'
            });
            return;
        }

        if (!telegramId) {
            res.status(401).json({
                status: 'error',
                message: 'Требуется авторизация'
            });
            return;
        }

        const result = await leaderboardService.getLeaderboard(period, parseInt(limit), telegramId);
        console.log(`✅ Рейтинг ${period} получен:`, {
            count: result.leaderboard.length,
            cached: result.cached,
            fallback: result.fallback
        });

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
                    updatedAt: result.updatedAt ? new Date(result.updatedAt).toISOString() : undefined
                }
            }
        });
    } catch (error) {
        console.error(`❌ Ошибка получения рейтинга ${req.params.period}:`, error);
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
router.delete('/cache', authMiddleware as any, async (req: ClearCacheRequest, res: Response) => {
    try {
        const { period } = req.query;
        console.log('🗑️ Очистка кэша рейтингов:', period || 'all');

        let result;
        if (period && ['day', 'week', 'month', 'all'].includes(period)) {
            // Очищаем конкретный период
            result = await Leaderboard.deleteMany({ period });
        } else {
            // Очищаем весь кэш
            result = await Leaderboard.deleteMany({});
        }

        console.log(`✅ Кэш очищен: ${result.deletedCount} записей`);

        res.json({
            status: 'success',
            message: period ?
                `Кэш рейтинга ${period} очищен` :
                'Весь кэш рейтингов очищен',
            data: { deletedCount: result.deletedCount }
        });
    } catch (error) {
        console.error('❌ Ошибка очистки кэша рейтингов:', error);
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
router.get('/user/:userId', authMiddleware as any, async (req: UserPositionRequest, res: Response) => {
    try {
        const { userId } = req.params;
        console.log(`👤 Запрос позиций пользователя: ${userId}`);

        const positions: Record<string, any> = {};
        const periods: Array<'day' | 'week' | 'month' | 'all'> = ['day', 'week', 'month', 'all'];

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
                console.error(`❌ Ошибка получения позиции пользователя в рейтинге ${period}:`, error);
                positions[period] = null;
            }
        }

        console.log(`✅ Позиции пользователя ${userId} получены:`, positions);

        res.json({
            status: 'success',
            data: {
                userId,
                positions
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения позиций пользователя:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка получения позиций пользователя'
        });
    }
});

export default router; 