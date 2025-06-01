/**
 * Типизированные middleware для валидации входящих данных
 * Обеспечивает безопасность и валидность всех пользовательских данных
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, checkSchema, ValidationChain } from 'express-validator';

// Интерфейсы для типизации валидации
interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

interface ValidationErrorResponse {
    error: string;
    message: string;
    details: ValidationError[];
}

interface ValidatedRequest extends Request {
    validationErrors?: ValidationError[];
}

// Типы для игровых данных
type GameAction = 'start' | 'answer' | 'skip' | 'hint';
type CrimeCategory = 'murder' | 'theft' | 'fraud' | 'drugs' | 'cybercrime';
type Difficulty = 'easy' | 'medium' | 'hard';
type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';
type AchievementType = 'score' | 'streak' | 'speed' | 'category' | 'special';

/**
 * Middleware для обработки ошибок валидации
 */
export const handleValidationErrors = (req: ValidatedRequest, res: Response<ValidationErrorResponse>, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.warn('⚠️ Ошибки валидации:', errors.array().length);

        const formattedErrors: ValidationError[] = errors.array().map((err: any) => ({
            field: err.type === 'field' ? (err as any).path : err.type,
            message: err.msg,
            value: err.type === 'field' ? (err as any).value : undefined
        }));

        // Логируем детали для диагностики
        formattedErrors.forEach(error => {
            console.warn(`  - ${error.field}: ${error.message}`);
        });

        res.status(400).json({
            error: 'Ошибка валидации данных',
            message: 'Переданы некорректные данные',
            details: formattedErrors
        });
        return;
    }

    console.log('✅ Валидация пройдена успешно');
    next();
};

/**
 * Валидация авторизации Telegram
 */
export const validateTelegramAuth: ValidationChain[] = [
    body('initData')
        .notEmpty()
        .withMessage('Данные Telegram обязательны')
        .isLength({ min: 10, max: 4096 })
        .withMessage('Некорректная длина данных Telegram'),

    body('initData')
        .custom((value: string) => {
            try {
                // Базовая проверка формата
                if (!value.includes('user=') && !value.includes('auth_date=')) {
                    throw new Error('Некорректный формат Telegram данных');
                }
                return true;
            } catch (error) {
                throw new Error('Ошибка парсинга Telegram данных');
            }
        })
];

/**
 * Валидация игровых действий
 */
export const validateGameAction: ValidationChain[] = [
    body('action')
        .isIn(['start', 'answer', 'skip', 'hint'] as GameAction[])
        .withMessage('Недопустимое игровое действие'),

    body('questionId')
        .optional()
        .isMongoId()
        .withMessage('Некорректный ID вопроса'),

    body('answer')
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage('Ответ должен быть от 1 до 500 символов')
        .trim()
        .escape(),

    body('timeSpent')
        .optional()
        .isInt({ min: 0, max: 300000 })
        .withMessage('Время должно быть от 0 до 300 секунд')
];

/**
 * Валидация пользовательского профиля
 */
export const validateProfile: ValidationChain[] = [
    body('username')
        .optional()
        .isLength({ min: 3, max: 30 })
        .withMessage('Имя пользователя от 3 до 30 символов')
        .matches(/^[a-zA-Z0-9_\u0400-\u04FF]+$/)
        .withMessage('Имя может содержать только буквы, цифры и _')
        .trim(),

    body('firstName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Имя от 1 до 50 символов')
        .trim()
        .escape(),

    body('lastName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Фамилия от 1 до 50 символов')
        .trim()
        .escape()
];

/**
 * Валидация ID параметров
 */
export const validateObjectId: ValidationChain[] = [
    param('id')
        .isMongoId()
        .withMessage('Некорректный формат ID')
];

/**
 * Валидация параметров таблицы лидеров
 */
export const validateLeaderboard: ValidationChain[] = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Лимит должен быть от 1 до 100')
        .toInt(),

    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Смещение должно быть положительным')
        .toInt(),

    query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'all'] as LeaderboardPeriod[])
        .withMessage('Период должен быть: day, week, month, all')
];

/**
 * Валидация достижений
 */
export const validateAchievement: ValidationChain[] = [
    body('type')
        .isIn(['score', 'streak', 'speed', 'category', 'special'] as AchievementType[])
        .withMessage('Недопустимый тип достижения'),

    body('value')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Значение должно быть положительным числом')
];

/**
 * Валидация статистики игры
 */
export const validateGameStats: ValidationChain[] = [
    body('score')
        .isInt({ min: 0, max: 999999 })
        .withMessage('Счет должен быть от 0 до 999999'),

    body('correctAnswers')
        .isInt({ min: 0, max: 1000 })
        .withMessage('Правильные ответы от 0 до 1000'),

    body('totalQuestions')
        .isInt({ min: 1, max: 1000 })
        .withMessage('Всего вопросов от 1 до 1000'),

    body('timeSpent')
        .isInt({ min: 0, max: 7200000 })
        .withMessage('Время игры от 0 до 2 часов'),

    body('category')
        .optional()
        .isIn(['murder', 'theft', 'fraud', 'drugs', 'cybercrime'] as CrimeCategory[])
        .withMessage('Недопустимая категория')
];

/**
 * Общая схема валидации для комплексных объектов
 */
export const gameSessionSchema = checkSchema({
    sessionId: {
        in: ['body'],
        isUUID: {
            errorMessage: 'ID сессии должен быть валидным UUID'
        }
    },

    startTime: {
        in: ['body'],
        isISO8601: {
            errorMessage: 'Время начала должно быть в формате ISO 8601'
        },
        toDate: true
    },

    endTime: {
        in: ['body'],
        optional: true,
        isISO8601: {
            errorMessage: 'Время окончания должно быть в формате ISO 8601'
        },
        toDate: true
    },

    'questions.*.questionId': {
        isMongoId: {
            errorMessage: 'ID вопроса должен быть валидным ObjectId'
        }
    },

    'questions.*.answer': {
        isLength: {
            options: { min: 1, max: 500 },
            errorMessage: 'Ответ должен быть от 1 до 500 символов'
        },
        trim: true,
        escape: true
    }
});

/**
 * Валидация поиска вопросов
 */
export const validateQuestionSearch: ValidationChain[] = [
    query('q')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Поисковый запрос от 2 до 100 символов')
        .trim()
        .escape(),

    query('category')
        .optional()
        .isIn(['murder', 'theft', 'fraud', 'drugs', 'cybercrime', 'all'])
        .withMessage('Недопустимая категория'),

    query('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard'] as Difficulty[])
        .withMessage('Сложность: easy, medium, hard')
];

/**
 * Кастомные валидаторы для специфических полей
 */
export const customValidators = {
    // Валидация Telegram User ID
    isTelegramId: (value: string | number): boolean => {
        const telegramId = parseInt(value.toString());
        if (telegramId < 1 || telegramId > 999999999999) {
            throw new Error('Некорректный Telegram ID');
        }
        return true;
    },

    // Валидация времени ответа
    isReasonableResponseTime: (value: string | number): boolean => {
        const time = parseInt(value.toString());
        if (time < 100 || time > 300000) { // от 0.1 сек до 5 минут
            throw new Error('Нереальное время ответа');
        }
        return true;
    },

    // Проверка на SQL инъекции и XSS
    isSafeText: (value: string): boolean => {
        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /(union|select|insert|update|delete|drop|create|alter)\s+/gi
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
                throw new Error('Недопустимые символы в тексте');
            }
        }
        return true;
    },

    // Валидация содержимого игрового ответа
    isValidGameAnswer: (value: string): boolean => {
        // Проверяем на пустоту и разумную длину
        if (!value || value.trim().length === 0) {
            throw new Error('Ответ не может быть пустым');
        }

        if (value.length > 500) {
            throw new Error('Ответ слишком длинный');
        }

        // Базовая проверка на спам
        const spamPatterns = [
            /(.)\1{10,}/g, // повторение одного символа более 10 раз
            /[!@#$%^&*]{5,}/g, // много специальных символов подряд
        ];

        for (const pattern of spamPatterns) {
            if (pattern.test(value)) {
                throw new Error('Ответ содержит подозрительные паттерны');
            }
        }

        return true;
    }
};

// Экспорт всех валидаторов для совместимости
const validators = {
    handleValidationErrors,
    validateTelegramAuth,
    validateGameAction,
    validateProfile,
    validateObjectId,
    validateLeaderboard,
    validateAchievement,
    validateGameStats,
    validateQuestionSearch,
    gameSessionSchema,
    customValidators
};

export default validators; 