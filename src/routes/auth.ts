/**
 * Типизированные маршруты для аутентификации
 * Обрабатывает авторизацию через Telegram WebApp и проверку токенов
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyTelegramWebAppData, authMiddleware } from '../middleware/auth';
import User, { type IUser } from '../models/User';
import AuthController from '../controllers/authController';

const router = Router();

// Интерфейс для Telegram пользователя из middleware
interface TelegramUserRequest extends Request {
    telegramUser?: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

// Интерфейс для авторизованного пользователя
interface AuthenticatedRequest extends Request {
    user?: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

/**
 * @route   POST /api/auth/init
 * @desc    Инициализация и аутентификация через Telegram WebApp
 * @access  Public
 */
router.post('/init', verifyTelegramWebAppData as any, async (req: TelegramUserRequest, res: Response) => {
    try {
        const telegramUser = req.telegramUser;

        if (!telegramUser || !telegramUser.telegramId) {
            console.error('❌ Не удалось получить telegramId из middleware');
            res.status(400).json({
                status: 'error',
                message: 'Не удалось получить данные пользователя'
            });
            return;
        }

        const telegramId = telegramUser.telegramId;
        console.log(`🔐 Инициализация для пользователя ${telegramId}`);

        // Ищем пользователя в базе или создаем нового
        let user = await User.findOne({ telegramId });
        let isNewUser = false;

        if (!user) {
            console.log(`🆕 Создание нового пользователя ${telegramId}`);
            isNewUser = true;
            user = new User({
                telegramId,
                username: telegramUser.username || undefined,
                firstName: telegramUser.firstName || undefined,
                lastName: telegramUser.lastName || undefined,
                registeredAt: new Date(),
                lastVisit: new Date()
            });
            await user.save();
        } else {
            console.log(`✅ Обновление данных пользователя ${telegramId}`);
            // Обновляем дату последнего визита
            user.lastVisit = new Date();
            await user.save();
        }

        // Создаем JWT токен с правильной структурой
        const token = jwt.sign(
            {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName
            },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: '7d' }
        );

        // Формируем имя пользователя для отображения
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : (user.username || 'Аноним');

        // Отправляем токен и данные пользователя в формате совместимом с authController
        res.json({
            status: 'success',
            data: {
                token,
                user: {
                    telegramId: user.telegramId,
                    name: displayName,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    rank: user.rank,
                    stats: user.stats,
                    totalScore: user.stats.totalScore,
                    isNew: isNewUser
                }
            }
        });

    } catch (error) {
        console.error('❌ Ошибка аутентификации в /api/auth/init:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка сервера при аутентификации'
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Алиас для /init - для совместимости с frontend кодом
 * @access  Public
 */
router.post('/login', verifyTelegramWebAppData as any, async (req: TelegramUserRequest, res: Response) => {
    try {
        const telegramUser = req.telegramUser;

        if (!telegramUser || !telegramUser.telegramId) {
            console.error('❌ Не удалось получить telegramId из middleware');
            res.status(400).json({
                success: false,
                error: 'Не удалось получить данные пользователя'
            });
            return;
        }

        const telegramId = telegramUser.telegramId;
        console.log(`🔐 Авторизация для пользователя ${telegramId}`);

        // Ищем пользователя в базе или создаем нового
        let user = await User.findOne({ telegramId });
        let isNewUser = false;

        if (!user) {
            console.log(`🆕 Создание нового пользователя ${telegramId}`);
            isNewUser = true;
            user = new User({
                telegramId,
                username: telegramUser.username || undefined,
                firstName: telegramUser.firstName || undefined,
                lastName: telegramUser.lastName || undefined,
                registeredAt: new Date(),
                lastVisit: new Date()
            });
            await user.save();
        } else {
            console.log(`✅ Обновление данных пользователя ${telegramId}`);
            // Обновляем дату последнего визита
            user.lastVisit = new Date();
            await user.save();
        }

        // Создаем JWT токен
        const token = jwt.sign(
            {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName
            },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: '7d' }
        );

        // Формируем имя пользователя для отображения
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : (user.username || 'Аноним');

        // Отправляем ответ в формате ожидаемом frontend
        res.json({
            success: true,
            data: {
                token,
                user: {
                    telegramId: user.telegramId,
                    name: displayName,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    rank: user.rank,
                    stats: user.stats,
                    totalScore: user.stats.totalScore,
                    gamesPlayed: user.stats.investigations,
                    accuracy: user.stats.accuracy,
                    isNew: isNewUser
                }
            }
        });

    } catch (error) {
        console.error('❌ Ошибка авторизации в /api/auth/login:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при авторизации'
        });
    }
});

/**
 * @route   POST /api/auth/telegram
 * @desc    Альтернативная точка входа через Telegram WebApp (использует authController)
 * @access  Public
 */
router.post('/telegram', AuthController.authenticateTelegram as any);

/**
 * @route   POST /api/auth/direct-access
 * @desc    Прямой доступ для пользователей, которые не через Telegram (отключён)
 * @access  Public
 */
router.post('/direct-access', AuthController.directAccess as any);

/**
 * @route   POST /api/auth/guest
 * @desc    Гостевая аутентификация (отключена, требуется Telegram авторизация)
 * @access  Public
 */
router.post('/guest', AuthController.directAccess as any);

/**
 * @route   GET /api/auth/verify
 * @desc    Проверка действительности JWT токена (использует authController)
 * @access  Private
 */
router.get('/verify', AuthController.verifyToken as any);

/**
 * @route   GET /api/auth/verify-middleware
 * @desc    Проверка токена через middleware (legacy метод)
 * @access  Private
 */
router.get('/verify-middleware', authMiddleware as any, (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'Токен действителен',
        data: {
            user: req.user
        }
    });
});

export default router; 