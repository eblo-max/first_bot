/**
 * 📝 ПРОФЕССИОНАЛЬНАЯ СИСТЕМА ЛОГИРОВАНИЯ "КРИМИНАЛЬНЫЙ БЛЕФ"
 * Типизированная версия с улучшенной архитектурой
 * 
 * Основные возможности:
 * - Контролируемые уровни логирования
 * - Автоматическая очистка чувствительных данных
 * - Production/Development режимы
 * - Перехват и фильтрация console методов
 */

// =============== ТИПЫ И ИНТЕРФЕЙСЫ ===============

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type Environment = 'production' | 'development';
type ConsoleMethodType = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LogLevels {
    ERROR: number;
    WARN: number;
    INFO: number;
    DEBUG: number;
}

interface OriginalConsole {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
}

interface SanitizedObject {
    [key: string]: any;
}

// =============== ОСНОВНОЙ КЛАСС ЛОГГЕРА ===============

class LoggerClass {
    private readonly environment: Environment;
    private readonly levels: LogLevels;
    private currentLevel: number;
    private originalConsole: OriginalConsole | null = null;

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
     * Определение окружения на основе URL и параметров
     */
    private detectEnvironment(): Environment {
        if (typeof window === 'undefined') {
            return 'development'; // Server-side рендеринг
        }

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
     * Установка уровня логирования в зависимости от окружения
     */
    private setLogLevel(): number {
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
    private init(): void {
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
     * Перехват console методов в production для безопасности
     */
    private overrideConsole(): void {
        // Сохраняем оригинальные методы
        this.originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
            debug: console.debug.bind(console)
        };

        // Заменяем console.log на пустую функцию в production
        console.log = (): void => { };
        console.debug = (): void => { };

        // Оставляем только важные методы с фильтрацией
        console.info = this.createFilteredLogger('info');
        console.warn = this.createFilteredLogger('warn');
        console.error = this.createFilteredLogger('error');
    }

    /**
     * Создание фильтрованного логгера для определенного типа
     */
    private createFilteredLogger(type: ConsoleMethodType): (...args: any[]) => void {
        return (...args: any[]): void => {
            // Фильтруем чувствительные данные
            const filteredArgs = this.sanitizeLogData(args);

            // Вызываем оригинальный метод если доступен
            if (this.originalConsole && this.originalConsole[type]) {
                this.originalConsole[type](...filteredArgs);
            }
        };
    }

    /**
     * Очистка чувствительных данных из аргументов логирования
     */
    private sanitizeLogData(args: any[]): any[] {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return this.sanitizeString(arg);
            }

            if (typeof arg === 'object' && arg !== null) {
                return this.sanitizeObject(arg);
            }

            return arg;
        });
    }

    /**
     * Очистка чувствительных данных из строк
     */
    private sanitizeString(str: string): string {
        return str
            .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [HIDDEN]')
            .replace(/token[^:]*:\s*[^,\s}]+/gi, 'token: [HIDDEN]')
            .replace(/jwt[^:]*:\s*[^,\s}]+/gi, 'jwt: [HIDDEN]')
            .replace(/password[^:]*:\s*[^,\s}]+/gi, 'password: [HIDDEN]')
            .replace(/telegramId[^:]*:\s*\d+/gi, 'telegramId: [HIDDEN]');
    }

    /**
     * Очистка объектов от чувствительных данных
     */
    private sanitizeObject(obj: any): SanitizedObject {
        const sensitiveKeys = ['token', 'jwt', 'password', 'telegramId', 'initData', 'hash'];

        try {
            const sanitized: SanitizedObject = { ...obj };

            for (const key of Object.keys(sanitized)) {
                if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    sanitized[key] = '[HIDDEN]';
                }
            }

            return sanitized;
        } catch (error) {
            // Если объект не может быть скопирован, возвращаем безопасную версию
            return { message: '[OBJECT_SANITIZATION_ERROR]' };
        }
    }

    /**
     * Получение имени текущего уровня логирования
     */
    private getLevelName(): LogLevel {
        const levelNames: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        return levelNames[this.currentLevel] || 'ERROR';
    }

    // =============== ПУБЛИЧНЫЕ МЕТОДЫ ЛОГИРОВАНИЯ ===============

    /**
     * Логирование ошибок (всегда показывается)
     */
    public error(...args: any[]): void {
        if (this.currentLevel >= this.levels.ERROR) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.error) {
                this.originalConsole.error('🔴 [ERROR]', ...filteredArgs);
            } else {
                console.error('🔴 [ERROR]', ...filteredArgs);
            }
        }
    }

    /**
     * Логирование предупреждений
     */
    public warn(...args: any[]): void {
        if (this.currentLevel >= this.levels.WARN) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.warn) {
                this.originalConsole.warn('🟡 [WARN]', ...filteredArgs);
            } else {
                console.warn('🟡 [WARN]', ...filteredArgs);
            }
        }
    }

    /**
     * Информационное логирование
     */
    public info(...args: any[]): void {
        if (this.currentLevel >= this.levels.INFO) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.info) {
                this.originalConsole.info('🔵 [INFO]', ...filteredArgs);
            } else {
                console.info('🔵 [INFO]', ...filteredArgs);
            }
        }
    }

    /**
     * Debug логирование (только в development)
     */
    public debug(...args: any[]): void {
        if (this.currentLevel >= this.levels.DEBUG) {
            const filteredArgs = this.sanitizeLogData(args);
            if (this.originalConsole?.log) {
                this.originalConsole.log('⚪ [DEBUG]', ...filteredArgs);
            } else {
                console.log('⚪ [DEBUG]', ...filteredArgs);
            }
        }
    }

    /**
     * Принудительный лог (игнорирует уровни, для критических ошибок)
     */
    public force(...args: any[]): void {
        const filteredArgs = this.sanitizeLogData(args);
        if (this.originalConsole?.error) {
            this.originalConsole.error('🔥 [FORCE]', ...filteredArgs);
        } else {
            console.error('🔥 [FORCE]', ...filteredArgs);
        }
    }

    // =============== МЕТОДЫ УПРАВЛЕНИЯ ===============

    /**
     * Включение debug режима (для разработки)
     */
    public enableDebug(): void {
        this.currentLevel = this.levels.DEBUG;
        this.info('Debug режим включен');
    }

    /**
     * Отключение всех логов (для производительности)
     */
    public disable(): void {
        this.currentLevel = -1;
    }

    /**
     * Получение текущего окружения
     */
    public getEnvironment(): Environment {
        return this.environment;
    }

    /**
     * Получение текущего уровня логирования
     */
    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    /**
     * Ручная установка уровня логирования
     */
    public setLevel(level: LogLevel): void {
        if (level in this.levels) {
            this.currentLevel = this.levels[level];
            this.info(`Уровень логирования изменен на: ${level}`);
        } else {
            this.warn(`Неизвестный уровень логирования: ${level}`);
        }
    }
}

// =============== ИНИЦИАЛИЗАЦИЯ И ЭКСПОРТ ===============

// Создаем глобальный экземпляр логгера
const Logger = new LoggerClass();

// Добавляем в window для глобального доступа
if (typeof window !== 'undefined') {
    (window as any).Logger = Logger;
}

// Экспорт для ES модулей
export default Logger;

// Экспорт для CommonJS совместимости
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
} 