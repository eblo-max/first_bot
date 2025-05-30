/**
 * Input Validation Middleware
 * Валидация всех входящих данных для безопасности
 */

const { body, param, query, validationResult, checkSchema } = require('express-validator');

/**
 * Middleware для обработки ошибок валидации
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        
        });

        return res.status(400).json({
            error: 'Ошибка валидации данных',
            message: 'Переданы некорректные данные',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }

    next();
};

/**
 * Валидация авторизации Telegram
 */
const validateTelegramAuth = [
    body('initData')
        .notEmpty()
        .withMessage('Данные Telegram обязательны')
        .isLength({ min: 10, max: 4096 })
        .withMessage('Некорректная длина данных Telegram'),

    body('initData')
        .custom((value) => {
            try {
                // Базовая проверка формата
                if (!value.includes('user=') && !value.includes('auth_date=')) {
                    throw new Error('Некорректный формат Telegram данных');
                }
                return true;
            } catch (error) {
                throw new Error('Ошибка парсинга Telegram данных');
            }
        }),

    handleValidationErrors
];

/**
 * Валидация игровых действий
 */
const validateGameAction = [
    body('action')
        .isIn(['start', 'answer', 'skip', 'hint'])
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
        .withMessage('Время должно быть от 0 до 300 секунд'),

    handleValidationErrors
];

/**
 * Валидация пользовательского профиля
 */
const validateProfile = [
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
        .escape(),

    handleValidationErrors
];

/**
 * Валидация ID параметров
 */
const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Некорректный формат ID'),

    handleValidationErrors
];

/**
 * Валидация параметров таблицы лидеров
 */
const validateLeaderboard = [
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
        .isIn(['day', 'week', 'month', 'all'])
        .withMessage('Период должен быть: day, week, month, all'),

    handleValidationErrors
];

/**
 * Валидация достижений
 */
const validateAchievement = [
    body('type')
        .isIn(['score', 'streak', 'speed', 'category', 'special'])
        .withMessage('Недопустимый тип достижения'),

    body('value')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Значение должно быть положительным числом'),

    handleValidationErrors
];

/**
 * Валидация статистики игры
 */
const validateGameStats = [
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
        .isIn(['murder', 'theft', 'fraud', 'drugs', 'cybercrime'])
        .withMessage('Недопустимая категория'),

    handleValidationErrors
];

/**
 * Общая схема валидации для комплексных объектов
 */
const gameSessionSchema = checkSchema({
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
const validateQuestionSearch = [
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
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('Сложность: easy, medium, hard'),

    handleValidationErrors
];

/**
 * Кастомная валидация для специфических полей
 */
const customValidators = {
    // Валидация Telegram User ID
    isTelegramId: (value) => {
        const telegramId = parseInt(value);
        if (telegramId < 1 || telegramId > 999999999999) {
            throw new Error('Некорректный Telegram ID');
        }
        return true;
    },

    // Валидация времени ответа
    isReasonableResponseTime: (value) => {
        const time = parseInt(value);
        if (time < 100 || time > 300000) { // от 0.1 сек до 5 минут
            throw new Error('Нереальное время ответа');
        }
        return true;
    },

    // Проверка на SQL инъекции и XSS
    isSafeText: (value) => {
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
    }
};

module.exports = {
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