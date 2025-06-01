/**
 * Типизированный контроллер аутентификации (AuthController)
 * Обрабатывает авторизацию через Telegram WebApp и JWT токены
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { type IUser, type UserRank } from '../models/User';

// Интерфейсы для данных Telegram WebApp
interface TelegramUser {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
}

// Интерфейс для запроса аутентификации
interface AuthenticateRequest extends Request {
    body: {
        initData?: string;
        telegramUser?: TelegramUser;
        user?: TelegramUser;
    };
}

// Интерфейс для информации о пользователе
interface UserInfo {
    telegramId: string;
    username: string | undefined;
    firstName: string | undefined;
    lastName: string | undefined;
    languageCode: string;
}

// Интерфейс для JWT payload
interface JWTPayload {
    telegramId: string;
    username: string | undefined;
    firstName: string | undefined;
    lastName: string | undefined;
    id?: string; // Для обратной совместимости
}

// Интерфейс для ответа об успешной аутентификации
interface AuthSuccessResponse {
    status: 'success';
    data: {
        token: string;
        user: {
            telegramId: string;
            name: string;
            firstName: string | undefined;
            lastName: string | undefined;
            username: string | undefined;
            rank: UserRank;
            stats: IUser['stats'];
            totalScore: number;
        };
    };
}

// Интерфейс для ответа об ошибке
interface ErrorResponse {
    status: 'error';
    message: string;
    code?: string;
}

// Интерфейс для ответа верификации токена
interface VerifyTokenResponse {
    status: 'success';
    data: {
        telegramId: string;
        name: string;
        rank: UserRank;
        stats: IUser['stats'];
    };
}

// Типы ответов
type AuthResponse = AuthSuccessResponse | ErrorResponse;
type VerifyResponse = VerifyTokenResponse | ErrorResponse;

class AuthController {
    /**
     * Аутентификация пользователя через Telegram WebApp
     */
    public static async authenticateTelegram(req: AuthenticateRequest, res: Response<AuthResponse>): Promise<void> {
        try {
            const { initData } = req.body;
            console.log('🔐 Получен запрос на аутентификацию с initData:', initData ? `${initData.substring(0, 30)}...` : 'отсутствует');

            if (!initData) {
                res.status(400).json({
                    status: 'error',
                    message: 'Отсутствуют данные инициализации Telegram WebApp'
                });
                return;
            }

            // Парсим строку initData
            const params = new URLSearchParams(initData);

            // Извлекаем данные
            const hash = params.get('hash');
            params.delete('hash');

            // Сортируем параметры в алфавитном порядке
            const sortedParams = Array.from(params.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');

            // Создаем HMAC-SHA-256 хэш
            const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN!).digest();
            const calculatedHash = crypto.createHmac('sha256', secretKey).update(sortedParams).digest('hex');

            // Проверяем совпадение хэшей
            if (calculatedHash !== hash) {
                console.error('❌ Неверная подпись данных Telegram WebApp. Ожидалось:', calculatedHash, 'Получено:', hash);
                res.status(401).json({
                    status: 'error',
                    message: 'Неверная подпись данных Telegram WebApp'
                });
                return;
            }

            // Извлекаем данные пользователя
            let user: TelegramUser | null = null;
            let userStr = '';

            try {
                userStr = params.get('user') || '';

                if (userStr) {
                    user = JSON.parse(userStr);
                } else {
                    // Попытка извлечь данные из другого параметра (startParam или initDataUnsafe)
                    const startParam = params.get('start_param');
                    if (startParam && startParam.startsWith('{')) {
                        try {
                            user = JSON.parse(startParam);
                            console.log('📝 Данные пользователя извлечены из start_param');
                        } catch (e) {
                            console.error('❌ Ошибка при парсинге start_param:', e);
                        }
                    }
                }
            } catch (e) {
                console.error('❌ Ошибка при парсинге данных пользователя:', e, 'Исходная строка:', userStr);
            }

            if (!user || !user.id) {
                console.error('❌ Отсутствуют данные пользователя Telegram после парсинга.');

                // Проверка доп. данных из запроса, если есть
                if (req.body.telegramUser) {
                    user = req.body.telegramUser;
                    console.log('📝 Данные пользователя получены из telegramUser');
                } else if (req.body.user) {
                    user = req.body.user;
                    console.log('📝 Данные пользователя получены из user');
                } else {
                    res.status(400).json({
                        status: 'error',
                        message: 'Отсутствуют данные пользователя Telegram'
                    });
                    return;
                }
            }

            // Проверяем, что id пользователя существует и конвертируем в строку
            if (!user.id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Отсутствует ID пользователя Telegram'
                });
                return;
            }

            // Данные пользователя Telegram
            const userInfo: UserInfo = {
                telegramId: user.id.toString(),
                username: user.username || undefined,
                firstName: user.first_name || undefined,
                lastName: user.last_name || undefined,
                languageCode: user.language_code || 'ru'
            };

            // Создаем или обновляем пользователя в базе данных
            let dbUser = await User.findOne({ telegramId: userInfo.telegramId });

            if (!dbUser) {
                // Создаем нового пользователя
                dbUser = new User({
                    telegramId: userInfo.telegramId,
                    username: userInfo.username,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    registeredAt: new Date(),
                    lastVisit: new Date()
                });

                await dbUser.save();
                console.log('✅ Создан новый пользователь:', userInfo.telegramId);
            } else {
                // Обновляем данные пользователя
                dbUser.username = userInfo.username;
                dbUser.firstName = userInfo.firstName;
                dbUser.lastName = userInfo.lastName;
                dbUser.lastVisit = new Date();

                await dbUser.save();
                console.log('✅ Обновлены данные пользователя:', userInfo.telegramId);
            }

            // Генерируем JWT токен
            const tokenPayload: JWTPayload = {
                telegramId: userInfo.telegramId,
                username: userInfo.username,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName
            };

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET!,
                { expiresIn: '7d' }
            );

            // Формируем имя пользователя для отображения
            const displayName = userInfo.firstName
                ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim()
                : (dbUser.nickname || userInfo.username || 'Аноним');

            // Возвращаем токен и данные пользователя
            res.status(200).json({
                status: 'success',
                data: {
                    token,
                    user: {
                        telegramId: dbUser.telegramId,
                        name: displayName,
                        firstName: userInfo.firstName,
                        lastName: userInfo.lastName,
                        username: userInfo.username,
                        rank: dbUser.rank,
                        stats: dbUser.stats,
                        totalScore: dbUser.stats.totalScore
                    }
                }
            });

        } catch (error) {
            console.error('❌ Ошибка аутентификации Telegram WebApp:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }

    /**
     * Проверка действительности токена
     */
    public static async verifyToken(req: Request, res: Response<VerifyResponse>): Promise<void> {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                console.log('❌ Отсутствует токен авторизации');
                res.status(401).json({
                    status: 'error',
                    message: 'Отсутствует токен авторизации'
                });
                return;
            }

            // Проверяем токен
            let decoded: JWTPayload;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
            } catch (jwtError: any) {
                console.log('❌ Ошибка JWT:', jwtError.name);

                if (jwtError.name === 'TokenExpiredError') {
                    res.status(401).json({
                        status: 'error',
                        message: 'Токен истек',
                        code: 'TOKEN_EXPIRED'
                    });
                    return;
                } else if (jwtError.name === 'JsonWebTokenError') {
                    res.status(401).json({
                        status: 'error',
                        message: 'Недействительный токен',
                        code: 'INVALID_TOKEN'
                    });
                    return;
                }

                throw jwtError;
            }

            // Проверяем существование пользователя в базе
            const user = await User.findOne({ telegramId: decoded.telegramId || decoded.id });

            if (!user) {
                console.log('❌ Пользователь не найден:', decoded.telegramId || decoded.id);
                res.status(401).json({
                    status: 'error',
                    message: 'Пользователь не найден',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            const displayName = decoded.firstName
                ? `${decoded.firstName} ${decoded.lastName || ''}`.trim()
                : (user.nickname || decoded.username || 'Аноним');

            res.status(200).json({
                status: 'success',
                data: {
                    telegramId: user.telegramId,
                    name: displayName,
                    rank: user.rank,
                    stats: user.stats
                }
            });

        } catch (error) {
            console.error('❌ Ошибка проверки токена:', error);
            res.status(401).json({
                status: 'error',
                message: 'Ошибка проверки токена',
                code: 'VERIFICATION_ERROR'
            });
        }
    }

    /**
     * Прямой доступ для тестирования (только development)
     */
    public static async directAccess(_req: Request, res: Response<ErrorResponse>): Promise<void> {
        try {
            console.log('❌ Попытка прямого доступа - отклонено');

            // Больше не создаем гостевых пользователей - требуем авторизацию через Telegram
            res.status(403).json({
                status: 'error',
                message: 'Для использования приложения требуется авторизация через Telegram Mini App',
                code: 'TELEGRAM_AUTH_REQUIRED'
            });

        } catch (error) {
            console.error('❌ Ошибка при обработке запроса прямого доступа:', error);
            res.status(500).json({
                status: 'error',
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
}

// Экспорт методов для совместимости с CommonJS
export const authenticateTelegram = AuthController.authenticateTelegram;
export const verifyToken = AuthController.verifyToken;
export const directAccess = AuthController.directAccess;

export default AuthController; 