/**
 * Типизированная система логирования для сервера "Криминальный Блеф"
 */

import { Request, Response, NextFunction } from 'express';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type Environment = 'production' | 'development' | 'test';

interface LogLevels {
    ERROR: number;
    WARN: number;
    INFO: number;
    DEBUG: number;
}

type LogFunction = (...args: any[]) => void;

class ServerLogger {
    private environment: Environment;
    private levels: LogLevels;
    private currentLevel: number;

    constructor() {
        // Определяем окружение
        this.environment = (process.env.NODE_ENV as Environment) || 'development';

        // Уровни логирования
        this.levels = {
            ERROR: 0,   // Только ошибки
            WARN: 1,    // Предупреждения и ошибки
            INFO: 2,    // Информационные сообщения
            DEBUG: 3    // Все сообщения (только для разработки)
        };

        // Устанавливаем уровень в зависимости от окружения
        this.currentLevel = this.setLogLevel();
    }

    /**
     * Установка уровня логирования
     */
    private setLogLevel(): number {
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
    private sanitizeLogData(args: any[]): any[] {
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
    private sanitizeObject(obj: any): any {
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
    private formatMessage(level: LogLevel, args: any[]): any[] {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}]`;
        return [prefix, ...args];
    }

    /**
     * Методы для контролируемого логирования
     */
    error(...args: any[]): void {
        if (this.currentLevel >= this.levels.ERROR) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('ERROR', ['🔴', ...filteredArgs]);
            console.error(...formattedArgs);
        }
    }

    warn(...args: any[]): void {
        if (this.currentLevel >= this.levels.WARN) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('WARN', ['🟡', ...filteredArgs]);
            console.warn(...formattedArgs);
        }
    }

    info(...args: any[]): void {
        if (this.currentLevel >= this.levels.INFO) {
            const filteredArgs = this.sanitizeLogData(args);
            const formattedArgs = this.formatMessage('INFO', ['🔵', ...filteredArgs]);
            console.info(...formattedArgs);
        }
    }

    debug(...args: any[]): void {
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
        return (req: Request, res: Response, next: NextFunction): void => {
            if (this.currentLevel >= this.levels.DEBUG) {
                const start = Date.now();

                // Логируем запрос
                this.debug(`📤 ${req.method} ${req.originalUrl} от ${req.ip || 'unknown'}`);

                // Перехватываем окончание ответа
                const originalSend = res.send;
                res.send = function (data: any) {
                    const duration = Date.now() - start;
                    const emoji = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
                    console.log(`📥 ${emoji} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
                    return originalSend.call(this, data);
                };
            }
            next();
        };
    }
}

// Создаем singleton экземпляр
const logger = new ServerLogger();

// Экспорт с типизацией
export const serverLogger = logger;

export const error: LogFunction = (...args) => logger.error(...args);
export const warn: LogFunction = (...args) => logger.warn(...args);
export const info: LogFunction = (...args) => logger.info(...args);
export const debug: LogFunction = (...args) => logger.debug(...args);
export const httpMiddleware = () => logger.httpMiddleware();

// Для совместимости с CommonJS
module.exports = {
    logger,
    error: (...args: any[]) => logger.error(...args),
    warn: (...args: any[]) => logger.warn(...args),
    info: (...args: any[]) => logger.info(...args),
    debug: (...args: any[]) => logger.debug(...args),
    httpMiddleware: () => logger.httpMiddleware()
}; 