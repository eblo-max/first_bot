/**
 * Типизированный контроллер пользователей (UserController)
 * Управляет профилями, статистикой и историей игр пользователей
 */

import { Request, Response } from 'express';
import User, { type IUser, type UserRank, type IAchievement, type IGameHistory } from '../models/User';

// Интерфейс для запроса с авторизованным пользователем
interface AuthenticatedRequest extends Request {
    user: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

// Интерфейс для обновления никнейма
interface UpdateNicknameRequest extends AuthenticatedRequest {
    body: {
        nickname: string;
    };
}

// Интерфейс для запроса таблицы лидеров
interface LeaderboardRequest extends AuthenticatedRequest {
    query: {
        period?: 'day' | 'week' | 'month' | 'all';
        limit?: string;
    };
}

// Интерфейс для профиля пользователя
interface UserProfile {
    telegramId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    nickname?: string;
    rank: UserRank;
    stats: {
        investigations: number;
        solvedCases: number;
        winStreak: number;
        accuracy: number;
    };
    totalScore: number;
    achievements: Array<{
        id: string;
        name: string;
        description: string;
        unlockedAt: Date;
    }>;
    registeredAt: Date;
    lastVisit: Date;
    isNewUser: boolean;
}

// Интерфейс для статистики пользователя
interface UserStats {
    stats: IUser['stats'];
    achievements: IAchievement[];
    totalScore: number;
    rank: UserRank;
}

// Интерфейс для элемента истории игр
interface GameHistoryItem {
    gameId: string;
    date: Date;
    timeSpent: number;
    score: number;
    perfectGame: boolean;
    difficulty: string;
    crimeType: string;
}

// Интерфейс для таблицы лидеров
interface LeaderboardResponse {
    leaderboard: Array<{
        telegramId: string;
        name: string;
        rank: UserRank;
        totalScore: number;
        position: number;
    }>;
    currentUser?: {
        telegramId: string;
        name: string;
        rank: UserRank;
        totalScore: number;
        position: number;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
    meta: {
        cached: boolean;
        fallback: boolean;
        updatedAt: Date;
    };
}

// Типы ответов
interface SuccessResponse<T> {
    status: 'success';
    data: T;
}

interface ErrorResponse {
    status: 'error';
    message: string;
    code?: string;
}

type UserResponse<T> = SuccessResponse<T> | ErrorResponse;

class UserController {
    /**
     * Получение профиля пользователя
     */
    public static async getProfile(req: AuthenticatedRequest, res: Response<UserResponse<UserProfile>>): Promise<void> {
        try {
            const telegramId = req.user.telegramId;

            // Проверяем, что это не гостевой пользователь
            if (telegramId && telegramId.startsWith('guest_')) {
                console.log('❌ Попытка доступа к профилю гостевого пользователя:', telegramId);
                res.status(403).json({
                    status: 'error',
                    message: 'Профиль недоступен для гостевых пользователей. Требуется авторизация через Telegram.',
                    code: 'GUEST_NOT_ALLOWED'
                });
                return;
            }

            // Находим пользователя в базе данных
            let user = await User.findOne({ telegramId });

            // Если пользователь не найден, но токен валидный с реальными данными Telegram - создаем пользователя
            if (!user && telegramId && !telegramId.startsWith('guest_')) {
                console.log('🆕 Создание нового пользователя из токена:', telegramId);

                // Создаем нового пользователя из данных токена
                user = new User({
                    telegramId: telegramId,
                    username: req.user.username || undefined,
                    firstName: req.user.firstName || undefined,
                    lastName: req.user.lastName || undefined,
                    registeredAt: new Date(),
                    lastVisit: new Date()
                });

                await user.save();
                console.log(`✅ Создан новый пользователь в БД: ${telegramId} (${req.user.firstName || 'без имени'})`);
            }

            // Если пользователь все еще не найден (что не должно происходить после создания)
            if (!user) {
                console.error(`❌ Пользователь с telegramId ${telegramId} не найден в базе данных и не может быть создан`);
                res.status(404).json({
                    status: 'error',
                    message: 'Пользователь не найден в базе данных',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            // Обновляем дату последнего визита
            user.lastVisit = new Date();
            let needsSave = true;

            // Информация из JWT токена для подстраховки
            const firstName = req.user.firstName || user.firstName;
            const lastName = req.user.lastName || user.lastName;
            const username = req.user.username || user.username;

            // Если в БД не сохранены имя/фамилия, но они есть в токене, обновляем
            if (req.user.firstName && (!user.firstName || user.firstName !== req.user.firstName)) {
                user.firstName = req.user.firstName;
                console.log('📝 Обновлено имя пользователя:', req.user.firstName);
            }

            if (req.user.lastName && (!user.lastName || user.lastName !== req.user.lastName)) {
                user.lastName = req.user.lastName;
                console.log('📝 Обновлена фамилия пользователя:', req.user.lastName);
            }

            if (req.user.username && (!user.username || user.username !== req.user.username)) {
                user.username = req.user.username;
                console.log('📝 Обновлен username пользователя:', req.user.username);
            }

            if (needsSave) {
                await user.save();
            }

            // Формируем отображаемое имя
            const displayName = firstName ?
                `${firstName} ${lastName || ''}`.trim() :
                (user.nickname || username || `Пользователь ${telegramId.substring(0, 8)}`);

            // Формируем ответ
            const profile: UserProfile = {
                telegramId: user.telegramId,
                name: displayName,
                firstName: firstName,
                lastName: lastName,
                username: username,
                nickname: user.nickname,
                rank: user.rank,
                stats: {
                    investigations: user.stats.investigations,
                    solvedCases: user.stats.solvedCases,
                    winStreak: user.stats.winStreak,
                    accuracy: user.stats.accuracy
                },
                totalScore: user.stats.totalScore,
                achievements: user.achievements.map(a => ({
                    id: a.id,
                    name: a.name,
                    description: a.description,
                    unlockedAt: a.unlockedAt || new Date()
                })),
                registeredAt: user.registeredAt,
                lastVisit: user.lastVisit,
                isNewUser: user.stats.investigations === 0 // Пометка для новых пользователей
            };

            console.log(`✅ Профиль успешно загружен для пользователя ${displayName} (${telegramId})`);

            res.status(200).json({
                status: 'success',
                data: profile
            });

        } catch (error) {
            console.error('❌ Ошибка при получении профиля:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }

    /**
     * Обновление имени пользователя (никнейма)
     */
    public static async updateNickname(req: UpdateNicknameRequest, res: Response<UserResponse<{ nickname: string }>>): Promise<void> {
        try {
            const { nickname } = req.body;
            const telegramId = req.user.telegramId;

            // Проверяем корректность ввода
            if (!nickname || nickname.length < 2 || nickname.length > 20) {
                res.status(400).json({
                    status: 'error',
                    message: 'Никнейм должен содержать от 2 до 20 символов'
                });
                return;
            }

            // Проверяем на недопустимые символы
            const nicknameRegex = /^[а-яёa-z0-9_\-\s]+$/i;
            if (!nicknameRegex.test(nickname)) {
                res.status(400).json({
                    status: 'error',
                    message: 'Никнейм может содержать только буквы, цифры, пробелы, дефисы и подчеркивания'
                });
                return;
            }

            // Обновляем никнейм пользователя
            const user = await User.findOneAndUpdate(
                { telegramId },
                { nickname: nickname.trim() },
                { new: true }
            );

            // Если пользователь не найден, возвращаем ошибку
            if (!user) {
                res.status(404).json({
                    status: 'error',
                    message: 'Пользователь не найден'
                });
                return;
            }

            console.log(`✅ Никнейм обновлен для пользователя ${telegramId}: "${user.nickname}"`);

            res.status(200).json({
                status: 'success',
                data: { nickname: user.nickname || nickname.trim() }
            });

        } catch (error) {
            console.error('❌ Ошибка при обновлении никнейма:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }

    /**
     * Получение статистики и достижений пользователя
     */
    public static async getStats(req: AuthenticatedRequest, res: Response<UserResponse<UserStats>>): Promise<void> {
        try {
            const telegramId = req.user.telegramId;

            // Находим пользователя в базе данных
            const user = await User.findOne({ telegramId });

            // Если пользователь не найден, возвращаем ошибку
            if (!user) {
                res.status(404).json({
                    status: 'error',
                    message: 'Пользователь не найден'
                });
                return;
            }

            const stats: UserStats = {
                stats: user.stats,
                achievements: user.achievements,
                totalScore: user.stats.totalScore,
                rank: user.rank
            };

            console.log(`📊 Статистика загружена для пользователя ${telegramId}`);

            res.status(200).json({
                status: 'success',
                data: stats
            });

        } catch (error) {
            console.error('❌ Ошибка при получении статистики:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }

    /**
     * Получение истории игр пользователя
     */
    public static async getGameHistory(req: AuthenticatedRequest, res: Response<UserResponse<GameHistoryItem[]>>): Promise<void> {
        try {
            const telegramId = req.user.telegramId;

            // Находим пользователя в базе данных
            const user = await User.findOne({ telegramId });

            // Если пользователь не найден, возвращаем ошибку
            if (!user) {
                res.status(404).json({
                    status: 'error',
                    message: 'Пользователь не найден'
                });
                return;
            }

            // Сортируем историю игр по дате (от новых к старым)
            const gameHistory = user.gameHistory
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10) // Ограничиваем 10 последними играми
                .map(game => ({
                    gameId: game.gameId,
                    date: game.date,
                    timeSpent: game.timeSpent,
                    score: game.score,
                    perfectGame: game.perfectGame,
                    difficulty: game.difficulty,
                    crimeType: game.crimeType
                }));

            console.log(`📖 История игр загружена для пользователя ${telegramId} (${gameHistory.length} игр)`);

            res.status(200).json({
                status: 'success',
                data: gameHistory
            });

        } catch (error) {
            console.error('❌ Ошибка при получении истории игр:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }

    /**
     * Получение таблицы лидеров (оптимизированная версия с кэшированием)
     */
    public static async getLeaderboard(req: LeaderboardRequest, res: Response<UserResponse<LeaderboardResponse>>): Promise<void> {
        try {
            const { period = 'all', limit = '20' } = req.query;
            const telegramId = req.user.telegramId;

            // Проверяем корректность параметров
            const validPeriods = ['day', 'week', 'month', 'all'];
            if (!validPeriods.includes(period)) {
                res.status(400).json({
                    status: 'error',
                    message: 'Некорректный период. Доступные значения: day, week, month, all'
                });
                return;
            }

            const limitNum = parseInt(limit);
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                res.status(400).json({
                    status: 'error',
                    message: 'Некорректный лимит. Значение должно быть от 1 до 100'
                });
                return;
            }

            // Используем новую службу рейтингов
            const leaderboardService = require('../services/leaderboardService');
            const result = await leaderboardService.getLeaderboard(period, limitNum, telegramId);

            const response: LeaderboardResponse = {
                leaderboard: result.leaderboard,
                currentUser: result.currentUser,
                pagination: {
                    page: 1,
                    limit: limitNum,
                    total: result.leaderboard.length
                },
                meta: {
                    cached: result.cached,
                    fallback: result.fallback,
                    updatedAt: result.updatedAt
                }
            };

            console.log(`🏆 Таблица лидеров загружена (${period}, лимит: ${limitNum}, кэш: ${result.cached})`);

            res.status(200).json({
                status: 'success',
                data: response
            });

        } catch (error) {
            console.error('❌ Ошибка при получении таблицы лидеров:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
}

// Экспорт методов для совместимости с CommonJS
export const getProfile = UserController.getProfile;
export const updateNickname = UserController.updateNickname;
export const getStats = UserController.getStats;
export const getGameHistory = UserController.getGameHistory;
export const getLeaderboard = UserController.getLeaderboard;

export default UserController; 