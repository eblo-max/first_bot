/**
 * 🚀 ОСНОВНОЙ СЕРВЕР "КРИМИНАЛЬНЫЙ БЛЕФ"
 * Типизированная версия с полной поддержкой TypeScript
 * 
 * Основные возможности:
 * - Express сервер с полной типизацией
 * - Telegram Mini App API
 * - MongoDB через Mongoose
 * - Система безопасности (Helmet, CORS, Rate Limiting)
 * - Профессиональное логирование
 * - Graceful shutdown
 */

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import mongoose from 'mongoose';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

console.log('📅 Время запуска:', new Date().toISOString());

// =============== ТИПИЗИРОВАННЫЕ ИМПОРТЫ ===============

import { error, warn, info, httpMiddleware } from './utils/logger';

import {
    generalLimiter,
    authLimiter,
    gameLimiter,
    apiLimiter,
    staticLimiter
} from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import userRoutes from './routes/user';
import profileRoutes from './routes/profile';

import seedDatabase from './utils/seedData';
import * as leaderboardService from './services/leaderboardService';

// =============== ТИПЫ И ИНТЕРФЕЙСЫ ===============

interface HealthCheckResponse {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    environment: string | undefined;
    memory: NodeJS.MemoryUsage;
    mongodb: 'connected' | 'disconnected';
}

interface ErrorResponse {
    error: string;
    message: string;
    stack?: string;
}

interface CorsOptions {
    origin: (string | RegExp)[];
    credentials: boolean;
    optionsSuccessStatus: number;
}

interface ServerConfig {
    port: number;
    mongoURIs: (string | undefined)[];
    isProduction: boolean;
    isDevelopment: boolean;
    maxJsonSize: string;
}

// =============== КОНФИГУРАЦИЯ СЕРВЕРА ===============

const serverConfig: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    mongoURIs: [
        process.env.MONGO_URL,
        'mongodb://localhost:27017/criminal-bluff',
        'mongodb://127.0.0.1:27017/criminal-bluff'
    ],
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    maxJsonSize: process.env.MAX_JSON_SIZE || '1mb'
};

// =============== СОЗДАНИЕ EXPRESS ПРИЛОЖЕНИЯ ===============

const app: Application = express();

// =============== MIDDLEWARE БЕЗОПАСНОСТИ (ПОРЯДОК ВАЖЕН!) ===============

// 1. Настройка trust proxy для корректного получения IP адресов
app.set('trust proxy', 1);

// 2. Настройка Helmet CSP с улучшенной безопасностью
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                "https://telegram.org",
                "https://unpkg.com",
                "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'",
                "https://unpkg.com",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com"],
            connectSrc: ["'self'", "https://api.telegram.org", "wss://*.telegram.org"],
            imgSrc: ["'self'", "data:", "https://telegram.org", "https://*.telegram.org"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://telegram.org", "https://*.telegram.org"],
            workerSrc: ["'self'", "blob:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// 3. CORS с улучшенной конфигурацией
const corsOptions: CorsOptions = {
    origin: [
        'https://t.me',
        'https://web.telegram.org',
        /https:\/\/.*\.railway\.app$/,
        /https:\/\/.*\.vercel\.app$/,
        process.env.FRONTEND_URL,
        'http://localhost:3000'
    ].filter(Boolean) as (string | RegExp)[],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 4. Парсинг JSON с ограничением размера
app.use(express.json({
    limit: serverConfig.maxJsonSize,
    strict: true
}));
app.use(express.urlencoded({
    extended: true,
    limit: serverConfig.maxJsonSize
}));

// 5. Базовый rate limiter для всех запросов
app.use(generalLimiter);

// 6. Middleware для отключения кеширования
app.use((_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// 7. Подключаем middleware для логирования HTTP запросов
app.use(httpMiddleware());

// 8. Дополнительные заголовки безопасности
app.use((_req: Request, res: Response, next: NextFunction): void => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('X-Download-Options', 'noopen');
    res.set('X-Permitted-Cross-Domain-Policies', 'none');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// =============== СТАТИЧЕСКИЕ МАРШРУТЫ ===============

// Корневой маршрут показывает главное меню
app.get('/', staticLimiter, (req: Request, res: Response): void => {
    info('🏠 Запрос на корневой маршрут - отправляем index.html (главное меню)', { ip: req.ip });
    const publicPath = serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public');
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Игровой экран
app.get('/game', staticLimiter, (req: Request, res: Response): void => {
    info('🎮 Запрос на игровой экран - отправляем game.html', { ip: req.ip });
    const publicPath = serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public');
    res.sendFile(path.join(publicPath, 'game.html'));
});

// Профиль пользователя
app.get('/profile', staticLimiter, (req: Request, res: Response): void => {
    info('👤 Запрос на страницу профиля - отправляем profile.html', { ip: req.ip });
    const publicPath = serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public');
    res.sendFile(path.join(publicPath, 'profile.html'));
});

// Статические файлы с лимитером
app.use('/assets', staticLimiter, express.static(
    serverConfig.isProduction
        ? path.join(__dirname, '../../public/assets')
        : path.join(__dirname, '../public/assets')
));

// CSS файлы
app.use('/*.css', staticLimiter, express.static(
    serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public')
));

// JavaScript файлы с правильным MIME типом для ES6 модулей
app.use('/*.js', staticLimiter, (req: Request, res: Response, next: NextFunction): void => {
    // Устанавливаем правильный MIME тип для JavaScript модулей
    res.type('text/javascript');
    next();
}, express.static(
    serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public')
));

// Специальная обработка для модулей в папке /modules/
app.use('/modules/*.js', staticLimiter, (req: Request, res: Response, next: NextFunction): void => {
    // Устанавливаем правильный MIME тип для модулей
    res.type('text/javascript');
    res.set('Cache-Control', 'no-cache'); // Отключаем кэш для отладки
    next();
}, express.static(
    serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public')
));

// TypeScript файлы (только в development)
if (serverConfig.isDevelopment) {
    app.use('/*.ts', staticLimiter, express.static(path.join(__dirname, '../public')));
}

// Общая обработка всех остальных статических файлов
app.use(staticLimiter, express.static(
    serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public'),
    {
        maxAge: serverConfig.isProduction ? '1d' : 0,
        etag: true,
        lastModified: true
    }
));

// =============== API МАРШРУТЫ С ТИПИЗАЦИЕЙ ===============

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/game', gameLimiter, gameRoutes);
app.use('/api/user', apiLimiter, userRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);

// Маршрут для проверки здоровья приложения
app.get('/api/health', (_req: Request, res: Response<HealthCheckResponse>): void => {
    const healthCheck: HealthCheckResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };

    res.status(200).json(healthCheck);
});

// =============== ОБРАБОТКА ОШИБОК ===============

// Обработка 404
app.use((req: Request, res: Response): void => {
    warn('❌ 404 - Страница не найдена', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
    });

    const publicPath = serverConfig.isProduction
        ? path.join(__dirname, '../../public')
        : path.join(__dirname, '../public');
    res.status(404).sendFile(path.join(publicPath, 'index.html'));
});

// Глобальная обработка ошибок
app.use((err: any, req: Request, res: Response<ErrorResponse>, _next: NextFunction): void => {
    error('💥 Ошибка сервера', {
        error: err.message,
        stack: err.stack,
        ip: req.ip,
        path: req.path
    });

    const errorResponse: ErrorResponse = {
        error: 'Внутренняя ошибка сервера',
        message: serverConfig.isDevelopment ? err.message : 'Что-то пошло не так',
        ...(serverConfig.isDevelopment && { stack: err.stack })
    };

    res.status(err.status || 500).json(errorResponse);
});

// =============== ПОДКЛЮЧЕНИЕ К MONGODB И ЗАПУСК СЕРВЕРА ===============

/**
 * Подключение к MongoDB с обработкой множественных URI
 */
const connectToMongoDB = async (): Promise<boolean> => {
    for (const uri of serverConfig.mongoURIs) {
        if (!uri) continue;

        try {
            console.log(`🔌 Попытка подключения к MongoDB: ${uri.substring(0, uri.indexOf('://') + 6)}...`);

            await mongoose.connect(uri);

            console.log('✅ MongoDB подключена успешно!');

            // Заполнение базы тестовыми данными
            await seedDatabase();

            return true;
        } catch (error: any) {
            console.error(`❌ Ошибка подключения к ${uri}: ${error.message}`);
        }
    }

    return false;
};

/**
 * Graceful shutdown обработчик
 */
const gracefulShutdown = (signal: string, server: any): void => {
    console.log(`📡 Получен сигнал ${signal}, начинаем graceful shutdown...`);

    // Останавливаем службы если есть метод stop
    if (leaderboardService && typeof (leaderboardService as any).stop === 'function') {
        (leaderboardService as any).stop();
    }

    server.close(() => {
        console.log('🔌 HTTP сервер закрыт');

        mongoose.connection.close().then(() => {
            console.log('🍃 MongoDB соединение закрыто');
            console.log('👋 Приложение завершено');
            process.exit(0);
        });
    });
};

/**
 * Основная функция запуска сервера
 */
const startServer = async (): Promise<void> => {
    try {
        // Запускаем сервер независимо от подключения к MongoDB
        const server = app.listen(serverConfig.port, () => {
            console.log(`🚀 Сервер запущен на порту ${serverConfig.port}`);
            console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📱 Telegram Mini App готово к работе!`);
        });

        // Пытаемся подключиться к MongoDB
        const isMongoConnected = await connectToMongoDB();

        if (isMongoConnected) {
            // Запускаем службу рейтингов после подключения к БД если есть метод start
            if (leaderboardService && typeof (leaderboardService as any).start === 'function') {
                (leaderboardService as any).start();
                console.log('📊 Служба лидерборда запущена');
            }
        } else {
            console.error('❌ Не удалось подключиться ни к одной базе данных MongoDB!');
            console.log('⚠️ Сервер работает без подключения к базе данных');
        }

        // Настройка graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));
        process.on('SIGINT', () => gracefulShutdown('SIGINT', server));

        console.log('✨ Инициализация сервера завершена успешно!');

    } catch (error: any) {
        console.error('💥 Критическая ошибка запуска сервера:', error);
        process.exit(1);
    }
};

// Запуск сервера
startServer();

export default app; 