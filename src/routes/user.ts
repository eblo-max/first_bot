/**
 * Типизированные маршруты для пользователей
 * Обрабатывает профили, статистику, историю игр и аватары
 */

import { Router, Request, Response } from 'express';
import UserController from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import User, { type IUser, UserRank } from '../models/User';

// Добавляем fetch для Node.js если не поддерживается встроенно
const fetch = globalThis.fetch || require('node-fetch');

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

interface UpdateProfileRequest extends AuthenticatedRequest {
    body: {
        nickname?: string;
    };
}

interface LeaderboardRequest extends AuthenticatedRequest {
    query: {
        period?: string;
        limit?: string;
    };
}

// Типы ответов
interface ProfileData {
    telegramId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    rank: UserRank;
    stats: {
        investigations: number;
        solvedCases: number;
        winStreak: number;
        maxWinStreak: number;
        accuracy: number;
        totalScore: number;
    };
    achievements: any[];
    registeredAt: Date;
    lastVisit: Date;
    gameHistory: any[];
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    username?: string;
    telegramId: string;
    totalScore: number;
    userRank: UserRank;
}

interface AvatarData {
    hasAvatar: boolean;
    avatarUrl: string | null;
    fileSize?: number;
    dimensions?: {
        width: number;
        height: number;
    };
    message?: string;
}

// Все маршруты требуют аутентификации
router.use(authMiddleware as any);

/**
 * @route   GET /api/user/profile
 * @desc    Получение профиля пользователя
 * @access  Private
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('👤 Запрос профиля пользователя');

        // Получаем пользователя из middleware
        if (!req.user || !req.user.telegramId) {
            console.error('❌ Пользователь не авторизован');
            res.status(401).json({
                status: 'error',
                message: 'Пользователь не авторизован'
            });
            return;
        }

        const telegramId = req.user.telegramId;
        console.log(`🔍 Поиск пользователя: ${telegramId}`);

        // Находим пользователя в базе данных
        let user = await User.findOne({ telegramId });

        // Если пользователь не найден, создаем его с данными из JWT токена
        if (!user) {
            console.log(`🆕 Создание нового пользователя: ${telegramId}`);

            user = new User({
                telegramId: req.user.telegramId,
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                rank: 'СТАЖЕР' as UserRank,
                stats: {
                    investigations: 0,
                    solvedCases: 0,
                    totalQuestions: 0,
                    accuracy: 0,
                    experience: 0,
                    level: 1,
                    totalScore: 0,
                    winStreak: 0,
                    maxWinStreak: 0,
                    perfectGames: 0,
                    averageTime: 0,
                    fastestGame: 0,
                    dailyStreakCurrent: 0,
                    dailyStreakBest: 0,
                    lastActiveDate: new Date(),
                    crimeTypeMastery: {
                        murder: { level: 0, experience: 0 },
                        robbery: { level: 0, experience: 0 },
                        fraud: { level: 0, experience: 0 },
                        theft: { level: 0, experience: 0 },
                        cybercrime: { level: 0, experience: 0 }
                    },
                    gamesThisHour: 0,
                    gamesToday: 0,
                    experienceMultiplier: 1.0,
                    easyGames: 0,
                    mediumGames: 0,
                    hardGames: 0,
                    expertGames: 0
                },
                achievements: [],
                registeredAt: new Date(),
                lastVisit: new Date(),
                gameHistory: []
            });

            try {
                await user.save();
                console.log(`✅ Пользователь создан: ${telegramId}`);
            } catch (saveError) {
                console.error('❌ Ошибка создания пользователя:', saveError);
                res.status(500).json({
                    status: 'error',
                    message: 'Ошибка создания профиля пользователя'
                });
                return;
            }
        } else {
            console.log(`✅ Пользователь найден: ${telegramId}`);
            // Обновляем время последнего визита
            user.lastVisit = new Date();
            await user.save();
        }

        // Формируем имя пользователя для отображения
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : (user.username || 'Детектив');

        // Формируем данные профиля
        const profileData: ProfileData = {
            telegramId: user.telegramId,
            name: displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            rank: user.rank || 'СТАЖЕР' as UserRank,
            stats: {
                investigations: user.stats?.investigations || 0,
                solvedCases: user.stats?.solvedCases || 0,
                winStreak: user.stats?.winStreak || 0,
                maxWinStreak: user.stats?.maxWinStreak || 0,
                accuracy: user.stats?.accuracy || 0,
                totalScore: user.stats?.totalScore || 0
            },
            achievements: user.achievements || [],
            registeredAt: user.registeredAt || new Date(),
            lastVisit: user.lastVisit || new Date(),
            gameHistory: user.gameHistory || []
        };

        console.log('📤 Отправка данных профиля:', {
            telegramId,
            name: displayName,
            rank: profileData.rank,
            totalScore: profileData.stats.totalScore
        });

        // Возвращаем данные профиля
        res.json({
            status: 'success',
            data: profileData
        });

    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Обновление профиля пользователя
 * @access  Private
 */
router.put('/profile', async (req: UpdateProfileRequest, res: Response) => {
    try {
        const telegramId = req.user?.telegramId;
        const { nickname } = req.body;

        if (!telegramId) {
            res.status(401).json({
                status: 'error',
                message: 'Пользователь не авторизован'
            });
            return;
        }

        console.log(`✏️ Обновление профиля пользователя: ${telegramId}`, { nickname });

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
            res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
            return;
        }

        console.log(`✅ Профиль обновлен: ${telegramId}`);

        res.json({
            status: 'success',
            message: 'Профиль обновлен'
        });

    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * @route   GET /api/user/stats
 * @desc    Получение статистики и достижений пользователя (использует UserController)
 * @access  Private
 */
router.get('/stats', UserController.getStats as any);

/**
 * @route   GET /api/user/history
 * @desc    Получение истории игр пользователя (использует UserController)
 * @access  Private
 */
router.get('/history', UserController.getGameHistory as any);

/**
 * @route   GET /api/user/leaderboard
 * @desc    Получение таблицы лидеров (использует UserController)
 * @access  Private
 */
router.get('/leaderboard', UserController.getLeaderboard as any);

/**
 * @route   GET /api/user/leaderboard-legacy
 * @desc    Legacy получение таблицы лидеров
 * @access  Private
 */
router.get('/leaderboard-legacy', async (req: LeaderboardRequest, res: Response) => {
    try {
        const { period = 'all', limit = '20' } = req.query;
        const currentUserTelegramId = req.user?.telegramId;

        console.log(`🏆 Запрос лидерборда (legacy):`, { period, limit, currentUserTelegramId });

        // Получаем топ пользователей по общему счету
        const leaders = await User.find({ 'stats.totalScore': { $gt: 0 } })
            .sort({ 'stats.totalScore': -1 })
            .limit(parseInt(limit))
            .select('telegramId firstName lastName username stats.totalScore rank');

        // Форматируем данные для ответа
        const formattedLeaders: LeaderboardEntry[] = leaders.map((user, index) => {
            const displayName = user.firstName
                ? `${user.firstName} ${user.lastName || ''}`.trim()
                : (user.username || 'Детектив');

            return {
                rank: index + 1,
                name: displayName,
                username: user.username,
                telegramId: user.telegramId,
                totalScore: user.stats?.totalScore || 0,
                userRank: user.rank || 'СТАЖЕР' as UserRank
            };
        });

        console.log(`✅ Лидерборд получен: ${formattedLeaders.length} записей`);

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
        console.error('❌ Ошибка получения таблицы лидеров:', error);
        res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * @route   GET /api/user/avatar
 * @desc    Получение аватара пользователя из Telegram
 * @access  Private
 */
router.get('/avatar', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const telegramId = req.user?.telegramId;

        if (!telegramId) {
            res.status(401).json({
                status: 'error',
                message: 'Пользователь не авторизован'
            });
            return;
        }

        console.log(`🖼️ Запрос аватара пользователя: ${telegramId}`);

        // Проверяем что у нас есть токен бота
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error('❌ TELEGRAM_BOT_TOKEN не задан');
            res.status(500).json({
                status: 'error',
                message: 'Ошибка конфигурации сервера'
            });
            return;
        }

        // Делаем запрос к Telegram API для получения фотографий профиля
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getUserProfilePhotos`;
        const params = new URLSearchParams({
            user_id: telegramId,
            limit: '1'  // Получаем только последнюю фотографию
        });

        console.log(`📸 Запрос фотографии профиля для пользователя ${telegramId}`, {
            telegramId,
            url: `${telegramApiUrl}?${params}`
        });

        const response = await fetch(`${telegramApiUrl}?${params}`);
        const data = await response.json();

        if (!data.ok) {
            console.warn('⚠️ Telegram API вернул ошибку при получении фотографий профиля', {
                telegramId,
                error: data.description
            });
            res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'Фотография профиля недоступна'
                } as AvatarData
            });
            return;
        }

        // Проверяем есть ли фотографии
        if (!data.result || !data.result.photos || data.result.photos.length === 0) {
            console.info('ℹ️ У пользователя нет фотографий профиля', { telegramId });
            res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'У пользователя нет фотографии профиля'
                } as AvatarData
            });
            return;
        }

        // Получаем file_id самой большой версии последней фотографии
        const lastPhoto = data.result.photos[0]; // Последняя загруженная фотография
        const largestPhoto = lastPhoto[lastPhoto.length - 1]; // Самый большой размер

        if (!largestPhoto || !largestPhoto.file_id) {
            console.warn('⚠️ Не удалось получить file_id фотографии', { telegramId });
            res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'Не удалось получить фотографию профиля'
                } as AvatarData
            });
            return;
        }

        // Получаем информацию о файле для получения прямой ссылки
        const fileApiUrl = `https://api.telegram.org/bot${botToken}/getFile`;
        const fileParams = new URLSearchParams({
            file_id: largestPhoto.file_id
        });

        const fileResponse = await fetch(`${fileApiUrl}?${fileParams}`);
        const fileData = await fileResponse.json();

        if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
            console.warn('⚠️ Не удалось получить путь к файлу фотографии', {
                telegramId,
                fileId: largestPhoto.file_id
            });
            res.json({
                status: 'success',
                data: {
                    hasAvatar: false,
                    avatarUrl: null,
                    message: 'Не удалось получить ссылку на фотографию'
                } as AvatarData
            });
            return;
        }

        // Формируем прямую ссылку на фотографию
        const avatarUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

        console.log('✅ Успешно получен аватар пользователя', {
            telegramId,
            avatarUrl: avatarUrl.substring(0, 50) + '...',
            fileSize: fileData.result.file_size
        });

        const avatarData: AvatarData = {
            hasAvatar: true,
            avatarUrl: avatarUrl,
            fileSize: fileData.result.file_size,
            dimensions: {
                width: largestPhoto.width,
                height: largestPhoto.height
            }
        };

        res.json({
            status: 'success',
            data: avatarData
        });

    } catch (error: unknown) {
        console.error('❌ Ошибка загрузки аватара:', error);
        res.status(500).json({
            error: 'Ошибка загрузки аватара',
            message: (error as Error).message,
            stack: (error as Error).stack
        });
    }
});

export default router; 