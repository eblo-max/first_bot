/**
 * Типизированные Rate Limiting Middleware
 * Защита API от злоупотреблений и DDoS атак
 */

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

// Интерфейс для расширенного Request с информацией о rate limit
interface RateLimitRequest extends Request {
    rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: number;
    };
}

// Типы для конфигурации rate limit
interface RateLimitConfig {
    windowMs: number;
    max: number;
    message: {
        error: string;
        code: string;
        retryAfter?: string;
    };
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
}

/**
 * Базовый лимитер для всех эндпоинтов
 * 100 запросов за 15 минут на IP
 */
export const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 минут
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 запросов
    message: {
        error: 'Слишком много запросов. Попробуйте через 15 минут.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 минут'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers

    // Кастомная обработка ошибок
    handler: (req: RateLimitRequest, res: Response) => {
        console.warn(`🚫 General rate limit exceeded for IP: ${req.ip}`);

        res.status(429).json({
            error: 'Слишком много запросов',
            message: 'Превышен лимит запросов. Попробуйте позже.',
            retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now()) / 1000)
        });
    },

    // Пропускаем localhost в development
    skip: (req: Request) => {
        if (process.env.NODE_ENV === 'development' &&
            (req.ip === '127.0.0.1' || req.ip === '::1')) {
            return true;
        }
        return false;
    }
});

/**
 * Строгий лимитер для аутентификации
 * 50 попыток за 5 минут на IP (ослаблено для удобства разработки)
 */
export const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 минут (было 15)
    max: 50, // 50 попыток входа (было 5)
    message: {
        error: 'Слишком много попыток входа',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 минут'
    },

    // Увеличиваем время блокировки при превышении
    handler: (req: Request, res: Response) => {
        console.error(`🔒 Auth rate limit exceeded for IP: ${req.ip}`);

        res.status(429).json({
            error: 'Заблокировано за превышение попыток входа',
            message: 'Слишком много неудачных попыток. Попробуйте через 5 минут.',
            retryAfter: 300 // 5 минут в секундах (было 900)
        });
    },

    // Пропускаем localhost в development
    skip: (req: Request) => {
        if (process.env.NODE_ENV === 'development' &&
            (req.ip === '127.0.0.1' || req.ip === '::1')) {
            return true;
        }
        return false;
    }
});

/**
 * Лимитер для игровых действий
 * 200 действий за 10 минут на IP
 */
export const gameLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 минут
    max: 200, // 200 игровых действий
    message: {
        error: 'Слишком быстрая игра',
        code: 'GAME_RATE_LIMIT_EXCEEDED',
        retryAfter: '10 минут'
    },

    handler: (req: Request, res: Response) => {
        console.warn(`🎮 Game rate limit exceeded for IP: ${req.ip}`);

        res.status(429).json({
            error: 'Превышена скорость игры',
            message: 'Слишком быстро! Сделайте перерыв на 10 минут.',
            retryAfter: 600
        });
    }
});

/**
 * Лимитер для API запросов
 * 300 запросов за 5 минут на IP
 */
export const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 минут
    max: 300, // 300 API запросов
    message: {
        error: 'Лимит API превышен',
        code: 'API_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 минут'
    },

    handler: (req: Request, res: Response) => {
        console.warn(`📡 API rate limit exceeded for IP: ${req.ip}`);

        res.status(429).json({
            error: 'Лимит API превышен',
            message: 'Слишком много запросов к API. Попробуйте через 5 минут.',
            retryAfter: 300
        });
    }
});

/**
 * Лимитер для статических файлов
 * 1000 запросов за минуту на IP
 */
export const staticLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 1000, // 1000 статических файлов
    message: {
        error: 'Слишком много загрузок',
        code: 'STATIC_RATE_LIMIT_EXCEEDED'
    },

    handler: (req: Request, res: Response) => {
        console.warn(`📁 Static rate limit exceeded for IP: ${req.ip}`);

        res.status(429).json({
            error: 'Слишком много загрузок',
            message: 'Превышен лимит загрузки статических файлов.',
            retryAfter: 60
        });
    }
});

// Экспорт всех лимитеров
const rateLimiters = {
    generalLimiter,
    authLimiter,
    gameLimiter,
    apiLimiter,
    staticLimiter
};

export default rateLimiters; 