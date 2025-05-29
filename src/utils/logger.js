/**
 * Профессиональная система логирования для сервера "Криминальный Блеф"
 * Поддерживает различные уровни логирования в зависимости от окружения NODE_ENV
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

        // Сохраняем оригинальные методы консоли
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };

        // В production заменяем console методы на наши
        if (this.environment === 'production') {
            this.overrideConsole();
        }

        // Информируем о состоянии логирования
        this.info(`🔧 Server Logger инициализирован: ${this.environment} (уровень: ${this.getLevelName()})`);
    }

    /**
     * Установка уровня логирования
     */
    setLogLevel() {
        switch (this.environment) {
            case 'production':
                return this.levels.ERROR; // Только ошибки в production
            case 'test':
                return this.levels.WARN;  // Предупреждения и ошибки в тестах
            case 'development':
            default:
                return this.levels.DEBUG; // Все логи в development
        }
    }

    /**
     * Перехват console методов в production
     */
    overrideConsole() {
        // Заменяем console.log на пустую функцию в production
        console.log = () => { };
        console.debug = () => { };

        // Оставляем только важные методы с фильтрацией
        console.info = (...args) => this.info(...args);
        console.warn = (...args) => this.warn(...args);
        console.error = (...args) => this.error(...args);
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
                // Рекурсивно обрабатываем вложенные объекты
                sanitized[key] = this.sanitizeObject(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Получение имени текущего уровня
     */
    getLevelName() {
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        return levelNames[this.currentLevel] || 'UNKNOWN';
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
            this.originalConsole.error(...formattedArgs);
        }
    }

    warn(...args) {
        if (this.currentLevel >= this.levels.WARN) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('WARN', ['🟡', ...filteredArgs]);
            this.originalConsole.warn(...formattedArgs);
        }
    }

    info(...args) {
        if (this.currentLevel >= this.levels.INFO) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('INFO', ['🔵', ...filteredArgs]);
            this.originalConsole.info(...formattedArgs);
        }
    }

    debug(...args) {
        if (this.currentLevel >= this.levels.DEBUG) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('DEBUG', ['⚪', ...filteredArgs]);
            this.originalConsole.log(...formattedArgs);
        }
    }

    /**
     * Принудительный лог (игнорирует уровни, для критических ошибок)
     */
    force(...args) {
        const filteredArgs = this.sanitizeLogData(args);
        const formattedArgs = this.formatMessage('FORCE', ['🔥', ...filteredArgs]);
        this.originalConsole.error(...formattedArgs);
    }

    /**
     * Логирование API запросов (только в development)
     */
    api(method, url, status, responseTime) {
        if (this.currentLevel >= this.levels.DEBUG) {
            const emoji = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
            this.debug(`${emoji} ${method} ${url} - ${status} (${responseTime}ms)`);
        }
    }

    /**
     * Логирование подключений к БД
     */
    db(operation, collection, details) {
        if (this.currentLevel >= this.levels.DEBUG) {
            this.debug(`🗃️ DB ${operation} ${collection}:`, details);
        }
    }

    /**
     * Включение debug режима (для разработки)
     */
    enableDebug() {
        this.currentLevel = this.levels.DEBUG;
        this.info('🐛 Debug режим включен на сервере');
    }

    /**
     * Отключение всех логов (для производительности)
     */
    disable() {
        this.currentLevel = -1;
    }

    /**
     * Middleware для логирования HTTP запросов
     */
    httpMiddleware() {
        return (req, res, next) => {
            if (this.currentLevel >= this.levels.INFO) {
                const start = Date.now();

                res.on('finish', () => {
                    const duration = Date.now() - start;
                    this.api(req.method, req.originalUrl, res.statusCode, duration);
                });
            }
            next();
        };
    }
}

// Создаем глобальный экземпляр логгера
const logger = new ServerLogger();

// Экспортируем логгер и его методы для удобства
module.exports = {
    logger,
    error: (...args) => logger.error(...args),
    warn: (...args) => logger.warn(...args),
    info: (...args) => logger.info(...args),
    debug: (...args) => logger.debug(...args),
    force: (...args) => logger.force(...args),
    api: (...args) => logger.api(...args),
    db: (...args) => logger.db(...args),
    httpMiddleware: () => logger.httpMiddleware()
}; 