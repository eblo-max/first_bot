/**
 * Профессиональная система логирования для "Криминальный Блеф"
 * Поддерживает различные уровни логирования в зависимости от окружения
 */

class Logger {
    constructor() {
        // Определяем окружение
        this.environment = this.detectEnvironment();

        // Уровни логирования
        this.levels = {
            ERROR: 0,   // Только ошибки
            WARN: 1,    // Предупреждения и ошибки
            INFO: 2,    // Информационные сообщения
            DEBUG: 3    // Все сообщения (только для разработки)
        };

        // Устанавливаем уровень в зависимости от окружения
        this.currentLevel = this.setLogLevel();

        // Инициализируем систему
        this.init();
    }

    /**
     * Определение окружения
     */
    detectEnvironment() {
        // Проверяем признаки production окружения
        const isProduction =
            // Домен production
            window.location.hostname.includes('.railway.app') ||
            window.location.hostname.includes('criminal-bluff') ||
            // HTTPS в production
            (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')) ||
            // Отсутствие debug параметров
            (!window.location.search.includes('debug=true') && !window.location.search.includes('test=true'));

        return isProduction ? 'production' : 'development';
    }

    /**
     * Установка уровня логирования
     */
    setLogLevel() {
        switch (this.environment) {
            case 'production':
                return this.levels.ERROR; // Только ошибки в production
            case 'development':
                return this.levels.DEBUG; // Все логи в development
            default:
                return this.levels.WARN;
        }
    }

    /**
     * Инициализация системы логирования
     */
    init() {
        // В production перехватываем console.log и отключаем его
        if (this.environment === 'production') {
            this.overrideConsole();
        }

        // Информируем о текущем режиме
        if (this.currentLevel >= this.levels.INFO) {
            console.info(`🔧 Логирование инициализировано: ${this.environment} (уровень: ${this.getLevelName()})`);
        }
    }

    /**
     * Перехват console методов в production
     */
    overrideConsole() {
        // Сохраняем оригинальные методы
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };

        // Заменяем console.log на пустую функцию в production
        console.log = () => { };
        console.debug = () => { };

        // Оставляем только важные методы с фильтрацией
        console.info = this.createFilteredLogger('info');
        console.warn = this.createFilteredLogger('warn');
        console.error = this.createFilteredLogger('error');
    }

    /**
     * Создание фильтрованного логгера
     */
    createFilteredLogger(type) {
        return (...args) => {
            // Фильтруем чувствительные данные
            const filteredArgs = this.sanitizeLogData(args);

            // Вызываем оригинальный метод
            if (this.originalConsole && this.originalConsole[type]) {
                this.originalConsole[type](...filteredArgs);
            }
        };
    }

    /**
     * Очистка чувствительных данных из логов
     */
    sanitizeLogData(args) {
        return args.map(arg => {
            if (typeof arg === 'string') {
                // Убираем токены
                return arg
                    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [HIDDEN]')
                    .replace(/token[^:]*:\s*[^,\s}]+/gi, 'token: [HIDDEN]')
                    .replace(/jwt[^:]*:\s*[^,\s}]+/gi, 'jwt: [HIDDEN]')
                    .replace(/password[^:]*:\s*[^,\s}]+/gi, 'password: [HIDDEN]')
                    .replace(/telegramId[^:]*:\s*\d+/gi, 'telegramId: [HIDDEN]');
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
        const sensitiveKeys = ['token', 'jwt', 'password', 'telegramId', 'initData', 'hash'];
        const sanitized = { ...obj };

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[HIDDEN]';
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
     * Методы для контролируемого логирования
     */
    error(...args) {
        if (this.currentLevel >= this.levels.ERROR) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.error) {
                this.originalConsole.error('🔴 [ERROR]', ...filteredArgs);
            } else {
                console.error('🔴 [ERROR]', ...filteredArgs);
            }
        }
    }

    warn(...args) {
        if (this.currentLevel >= this.levels.WARN) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.warn) {
                this.originalConsole.warn('🟡 [WARN]', ...filteredArgs);
            } else {
                console.warn('🟡 [WARN]', ...filteredArgs);
            }
        }
    }

    info(...args) {
        if (this.currentLevel >= this.levels.INFO) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.info) {
                this.originalConsole.info('🔵 [INFO]', ...filteredArgs);
            } else {
                console.info('🔵 [INFO]', ...filteredArgs);
            }
        }
    }

    debug(...args) {
        if (this.currentLevel >= this.levels.DEBUG) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.log) {
                this.originalConsole.log('⚪ [DEBUG]', ...filteredArgs);
            } else {
                
            }
        }
    }

    /**
     * Принудительный лог (игнорирует уровни, для критических ошибок)
     */
    force(...args) {
        const filteredArgs = this.sanitizeLogData(args);
        if (this.originalConsole?.error) {
            this.originalConsole.error('🔥 [FORCE]', ...filteredArgs);
        } else {
            console.error('🔥 [FORCE]', ...filteredArgs);
        }
    }

    /**
     * Включение debug режима (для разработки)
     */
    enableDebug() {
        this.currentLevel = this.levels.DEBUG;
        this.info('Debug режим включен');
    }

    /**
     * Отключение всех логов (для производительности)
     */
    disable() {
        this.currentLevel = -1;
    }
}

// Создаем глобальный экземпляр логгера
window.Logger = new Logger();

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
} 