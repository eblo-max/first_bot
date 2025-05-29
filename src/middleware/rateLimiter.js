/**
 * Rate Limiting Middleware
 * Защита API от злоупотреблений и DDoS атак
 */

const rateLimit = require('express-rate-limit');

/**
 * Базовый лимитер для всех эндпоинтов
 * 100 запросов за 15 минут на IP
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 минут
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 запросов
    message: {
        error: 'Слишком много запросов. Попробуйте через 15 минут.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 минут'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers

    // Кастомная обработка ошибок
    handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
        res.status(429).json({
            error: 'Слишком много запросов',
            message: 'Превышен лимит запросов. Попробуйте позже.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    },

    // Пропускаем localhost в development
    skip: (req) => {
        if (process.env.NODE_ENV === 'development' &&
            (req.ip === '127.0.0.1' || req.ip === '::1')) {
            return true;
        }
        return false;
    }
});

/**
 * Строгий лимитер для аутентификации
 * 5 попыток за 15 минут на IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // 5 попыток входа
    message: {
        error: 'Слишком много попыток входа',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 минут'
    },

    // Увеличиваем время блокировки при превышении
    handler: (req, res) => {
        console.error(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Заблокировано за превышение попыток входа',
            message: 'Слишком много неудачных попыток. Попробуйте через 15 минут.',
            retryAfter: 900 // 15 минут в секундах
        });
    }
});

/**
 * Лимитер для игровых действий
 * 200 действий за 10 минут на IP
 */
const gameLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 минут
    max: 200, // 200 игровых действий
    message: {
        error: 'Слишком быстрая игра',
        code: 'GAME_RATE_LIMIT_EXCEEDED',
        retryAfter: '10 минут'
    },

    handler: (req, res) => {
        console.warn(`Game rate limit exceeded for IP: ${req.ip}`);
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
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 минут
    max: 300, // 300 API запросов
    message: {
        error: 'Лимит API превышен',
        code: 'API_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 минут'
    }
});

/**
 * Лимитер для статических файлов
 * 1000 запросов за минуту на IP
 */
const staticLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 1000, // 1000 статических файлов
    message: {
        error: 'Слишком много загрузок',
        code: 'STATIC_RATE_LIMIT_EXCEEDED'
    }
});

module.exports = {
    generalLimiter,
    authLimiter,
    gameLimiter,
    apiLimiter,
    staticLimiter
}; 