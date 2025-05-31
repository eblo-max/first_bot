/**
 * Упрощенная система логирования для сервера "Криминальный Блеф"
 */

class ServerLogger {
    constructor() {
        // Определяем окружение
        this.environment = process.env.NODE_ENV || 'development';

        // Уровни логирования
        this.levels = {
            ERROR: 0,   // Только ошибки
            WARN: 1,    // Предупреждения и ошибки
            INFO: 2,    // Информационные сообщения
            DEBUG: 3    // Все сообщения (только для разработки)
        };

        // Устанавливаем уровень в зависимости от окружения
        this.currentLevel = this.setLogLevel();

        // НЕ логируем при инициализации чтобы избежать цикличности
    }

    /**
     * Установка уровня логирования
     */
    setLogLevel() {
        switch (this.environment) {
            case 'production':
                return this.levels.INFO; // В production показываем INFO и выше
            case 'test':
                return this.levels.WARN;  // В тестах только предупреждения и ошибки
            case 'development':
            default:
                return this.levels.DEBUG; // В development все логи
        }
    }

    /**
     * Очистка чувствительных данных из логов
     */
    sanitizeLogData(args) {
        return args.map(arg => {
            if (typeof arg === 'string') {
                // Убираем токены и чувствительные данные
                return arg
                    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [HIDDEN]')
                    .replace(/token[^:]*:\s*[^,\s}]+/gi, 'token: [HIDDEN]')
                    .replace(/jwt[^:]*:\s*[^,\s}]+/gi, 'jwt: [HIDDEN]')
                    .replace(/password[^:]*:\s*[^,\s}]+/gi, 'password: [HIDDEN]')
                    .replace(/telegramId[^:]*:\s*\d+/gi, 'telegramId: [HIDDEN]')
                    .replace(/initData[^:]*:\s*[^,\s}]+/gi, 'initData: [HIDDEN]')
                    .replace(/hash[^:]*:\s*[^,\s}]+/gi, 'hash: [HIDDEN]');
            }

            if (typeof arg === 'object' && arg !== null) {
                return this.sanitizeObject(arg);
            }

            return arg;
        });
    }

    /**
     * Очистка объектов от чувствительных данных
     */
    sanitizeObject(obj) {
        const sensitiveKeys = [
            'token', 'jwt', 'password', 'telegramId', 'initData', 'hash',
            'auth', 'authorization', 'secret', 'key', 'private'
        ];

        const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[HIDDEN]';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeObject(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Форматирование сообщения с временной меткой
     */
    formatMessage(level, args) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}]`;
        return [prefix, ...args];
    }

    /**
     * Методы для контролируемого логирования
     */
    error(...args) {
        if (this.currentLevel >= this.levels.ERROR) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('ERROR', ['🔴', ...filteredArgs]);
            console.error(...formattedArgs);
        }
    }

    warn(...args) {
        if (this.currentLevel >= this.levels.WARN) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('WARN', ['🟡', ...filteredArgs]);
            console.warn(...formattedArgs);
        }
    }

    info(...args) {
        if (this.currentLevel >= this.levels.INFO) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('INFO', ['🔵', ...filteredArgs]);
            console.info(...formattedArgs);
        }
    }

    debug(...args) {
        if (this.currentLevel >= this.levels.DEBUG) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('DEBUG', ['⚪', ...filteredArgs]);
            console.log(...formattedArgs);
        }
    }

    /**
     * HTTP Middleware для логирования запросов
     */
    httpMiddleware() {
        return (req, res, next) => {
            if (this.currentLevel >= this.levels.DEBUG) {
                const start = Date.now();

                // Логируем запрос
                this.debug(`📤 ${req.method} ${req.originalUrl} от ${req.ip || 'unknown'}`);

                // Перехватываем окончание ответа
                const originalSend = res.send;
                res.send = function (data) {
                    const duration = Date.now() - start;
                    const emoji = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
                    console.log(`📥 ${emoji} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
                    originalSend.call(this, data);
                };
            }
            next();
        };
    }
}

// Создаем singleton экземпляр
const logger = new ServerLogger();

module.exports = {
    logger,
    error: (...args) => logger.error(...args),
    warn: (...args) => logger.warn(...args),
    info: (...args) => logger.info(...args),
    debug: (...args) => logger.debug(...args),
    httpMiddleware: () => logger.httpMiddleware()
}; 