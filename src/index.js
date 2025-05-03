const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
// const userRoutes = require('./routes/user'); // Будет добавлено в фазе 2
// const leaderboardRoutes = require('./routes/leaderboard'); // Будет добавлено в фазе 2

// Импорт функции для заполнения базы тестовыми данными
const seedDatabase = require('./utils/seedData');

// Создание приложения Express
const app = express();
const PORT = process.env.PORT || 3000;

// Настройка Helmet CSP, разрешающая загрузку необходимых скриптов
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
                "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'", "https://api.telegram.org", "wss://*.telegram.org"],
            imgSrc: ["'self'", "data:", "https://telegram.org", "https://*.telegram.org"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://telegram.org", "https://*.telegram.org"],
            workerSrc: ["'self'", "blob:"]
        }
    },
    crossOriginEmbedderPolicy: false // Разрешить загрузку ресурсов из разных источников
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
// app.use('/api/user', userRoutes); // Будет добавлено в фазе 2
// app.use('/api/leaderboard', leaderboardRoutes); // Будет добавлено в фазе 2

// Маршрут для проверки здоровья приложения
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
        console.log(`Сервер запущен на порту ${PORT}`);
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

            console.log('Подключено к MongoDB успешно!');

            // Заполнение базы тестовыми данными
            await seedDatabase();

            isConnected = true;
            break; // Выходим из цикла, так как подключение успешно
        } catch (error) {
            console.warn(`Не удалось подключиться к MongoDB по адресу ${uri}:`, error.message);
        }
    }

    if (!isConnected) {
        console.error('❌ Не удалось подключиться ни к одной базе данных MongoDB!');
        console.log('⚠️ Приложение запущено в режиме с ограниченной функциональностью.');
        console.log('⚠️ API запросы к базе данных будут возвращать ошибки.');
    }

    return server;
};

startServer().catch(error => {
    console.error('Критическая ошибка запуска сервера:', error);
}); 