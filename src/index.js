const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('📅 Время запуска:', new Date().toISOString());

// Подключение системы логирования в самом начале

const { logger, error, warn, info, debug, httpMiddleware } = require('./utils/logger');

// Импорт middleware безопасности

const {
    generalLimiter,
    authLimiter,
    gameLimiter,
    apiLimiter,
    staticLimiter
} = require('./middleware/rateLimiter');

// Импорт маршрутов

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const userRoutes = require('./routes/user'); // Добавляем маршруты пользователя
const profileRoutes = require('./routes/profile'); // Новые расширенные роуты профиля

// Импорт функции для заполнения базы тестовыми данными
const seedDatabase = require('./utils/seedData');

const leaderboardService = require('./services/leaderboardService');

// Создание приложения Express

const app = express();
const PORT = process.env.PORT || 3000;

// ====================================
// MIDDLEWARE БЕЗОПАСНОСТИ (ПОРЯДОК ВАЖЕН!)
// ====================================

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

const corsOptions = {
    origin: [
        'https://t.me',
        'https://web.telegram.org',
        /https:\/\/.*\.railway\.app$/,
        /https:\/\/.*\.vercel\.app$/,
        process.env.FRONTEND_URL,
        'http://localhost:3000'
    ].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 4. Парсинг JSON с ограничением размера

app.use(express.json({
    limit: process.env.MAX_JSON_SIZE || '1mb',
    strict: true
}));
app.use(express.urlencoded({
    extended: true,
    limit: process.env.MAX_JSON_SIZE || '1mb'
}));

// 5. Базовый rate limiter для всех запросов

app.use(generalLimiter);

// 6. Middleware для отключения кеширования

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// 7. Подключаем middleware для логирования HTTP запросов

app.use(httpMiddleware());

// 8. Дополнительные заголовки безопасности

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('X-Download-Options', 'noopen');
    res.set('X-Permitted-Cross-Domain-Policies', 'none');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ====================================
// МАРШРУТЫ С СООТВЕТСТВУЮЩИМИ ЛИМИТЕРАМИ
// ====================================

// Корневой маршрут показывает главное меню - ставим перед статическими файлами
app.get('/', staticLimiter, (req, res) => {
    info('Запрос на корневой маршрут - отправляем index.html (главное меню)', { ip: req.ip });
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Игровой экран
app.get('/game', staticLimiter, (req, res) => {
    info('Запрос на игровой экран - отправляем game.html', { ip: req.ip });
    res.sendFile(path.join(__dirname, '../public/game.html'));
});

// Профиль пользователя
app.get('/profile', staticLimiter, (req, res) => {
    info('Запрос на страницу профиля - отправляем profile.html', { ip: req.ip });
    res.sendFile(path.join(__dirname, '../public/profile.html'));
});

// Редирект для старых ссылок на index.html (больше не требуется)
// app.get('/index.html', (req, res) => {
//     
//     res.redirect(301, '/');
// });

// Статические файлы с лимитером
app.use(staticLimiter, express.static(path.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true
}));

// ====================================
// API МАРШРУТЫ С СПЕЦИФИЧНЫМИ ЛИМИТЕРАМИ
// ====================================

// Маршруты API с соответствующими лимитерами
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/game', gameLimiter, gameRoutes);
app.use('/api/user', apiLimiter, userRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);

// Маршрут для проверки здоровья приложения
app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };

    res.status(200).json(healthCheck);
});

// ====================================
// ОБРАБОТКА ОШИБОК
// ====================================

// Обработка 404
app.use((req, res) => {
    warn('404 - Страница не найдена', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
    });
    res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    error('Ошибка сервера', {
        error: err.message,
        stack: err.stack,
        ip: req.ip,
        path: req.path
    });

    // Не показываем стек ошибки в продакшене
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        error: 'Внутренняя ошибка сервера',
        message: isDevelopment ? err.message : 'Что-то пошло не так',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Массив строк подключения к MongoDB (основной и резервный варианты)
const mongoURIs = [
    process.env.MONGO_URL,
    'mongodb://localhost:27017/criminal-bluff',
    'mongodb://127.0.0.1:27017/criminal-bluff'
];

// Подключение к MongoDB и запуск сервера
const startServer = async () => {
    let isConnected = false;

    // Запускаем сервер независимо от подключения к MongoDB
    const server = app.listen(PORT, () => {

    });

    // Пытаемся подключиться к MongoDB (попробуем все строки подключения)
    for (const uri of mongoURIs) {
        if (!uri) continue;

        try {
            console.log(`Попытка подключения к MongoDB: ${uri.substring(0, uri.indexOf('://') + 6)}...`);

            await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000 // 5 секунд таймаут для быстрого фолбэка
            });

            // Заполнение базы тестовыми данными
            await seedDatabase();

            // Запускаем службу рейтингов после подключения к БД
            leaderboardService.start();

            isConnected = true;
            break; // Выходим из цикла, так как подключение успешно
        } catch (error) {

        }
    }

    if (!isConnected) {
        console.error('❌ Не удалось подключиться ни к одной базе данных MongoDB!');

    }

    // Graceful shutdown
    process.on('SIGTERM', () => {

        leaderboardService.stop();
        server.close(() => {

            mongoose.connection.close(false, () => {

                process.exit(0);
            });
        });
    });

    process.on('SIGINT', () => {

        leaderboardService.stop();
        server.close(() => {

            mongoose.connection.close(false, () => {

                process.exit(0);
            });
        });
    });

    return server;
};

startServer().catch(error => {
    console.error('Критическая ошибка запуска сервера:', error);
    process.exit(1);
}); 