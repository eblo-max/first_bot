/**
 * Типизированные middleware для аутентификации
 * Обрабатывает JWT токены и проверку Telegram WebApp данных
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import crypto from 'crypto';

// Интерфейсы для типизации
interface JWTPayload {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    iat?: number;
    exp?: number;
}

interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}

interface TelegramUser {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    isPremium?: boolean;
}

interface TelegramRequest extends Request {
    telegramUser?: TelegramUser;
    body: {
        initData?: string;
        telegramId?: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        [key: string]: any;
    };
}

interface AuthErrorResponse {
    error: string;
    message?: string;
    code?: string;
}

/**
 * Middleware для проверки JWT токена
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response<AuthErrorResponse>, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Токен доступа не предоставлен',
                message: 'Требуется авторизация',
                code: 'NO_TOKEN'
            });
            return;
        }

        const token = authHeader.substring(7);

        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET не установлен в переменных окружения');
            res.status(500).json({
                error: 'Ошибка конфигурации сервера',
                code: 'CONFIG_ERROR'
            });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
        req.user = decoded;

        console.log('✅ Пользователь аутентифицирован:', {
            telegramId: decoded.telegramId,
            username: decoded.username
        });

        next();
    } catch (error: unknown) {
        console.error('❌ Ошибка аутентификации:', (error as Error).message);

        if (error instanceof TokenExpiredError) {
            res.status(401).json({
                error: 'Токен истек',
                message: 'Требуется повторная авторизация',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }

        if (error instanceof JsonWebTokenError) {
            res.status(401).json({
                error: 'Недействительный токен',
                message: 'Токен поврежден или недействителен',
                code: 'INVALID_TOKEN'
            });
            return;
        }

        res.status(500).json({
            error: 'Ошибка аутентификации',
            message: 'Внутренняя ошибка сервера',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Проверка данных Telegram WebApp
 */
export const verifyTelegramWebAppData = (req: TelegramRequest, res: Response<AuthErrorResponse>, next: NextFunction): void => {
    try {
        const { initData } = req.body;

        if (!initData) {
            res.status(400).json({
                error: 'Отсутствуют данные Telegram WebApp',
                code: 'NO_INIT_DATA'
            });
            return;
        }

        // Проверяем подпись Telegram
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
            res.status(500).json({
                error: 'Ошибка конфигурации сервера',
                code: 'CONFIG_ERROR'
            });
            return;
        }

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        urlParams.sort();

        const dataCheckString = Array.from(urlParams.entries())
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(process.env.TELEGRAM_BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            console.error('❌ Неверная подпись Telegram WebApp');
            res.status(401).json({
                error: 'Неверная подпись данных',
                code: 'INVALID_SIGNATURE'
            });
            return;
        }

        // Извлекаем данные пользователя
        const userDataString = urlParams.get('user');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            req.telegramUser = {
                telegramId: userData.id?.toString(),
                username: userData.username,
                firstName: userData.first_name,
                lastName: userData.last_name,
                languageCode: userData.language_code,
                isPremium: userData.is_premium
            };
        }

        console.log('✅ Данные Telegram WebApp верифицированы');
        next();
    } catch (error: unknown) {
        console.error('❌ Ошибка верификации Telegram WebApp:', (error as Error).message);
        res.status(500).json({
            error: 'Ошибка верификации',
            code: 'VERIFICATION_ERROR'
        });
    }
};

export default authMiddleware; 