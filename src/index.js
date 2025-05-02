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

// Middleware
app.use(helmet());
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

// Подключение к MongoDB и запуск сервера
const startServer = async () => {
    try {
        // Подключение к MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Подключено к MongoDB');

        // Заполнение базы тестовыми данными
        await seedDatabase();

        // Запуск сервера
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    } catch (error) {
        console.error('Ошибка запуска сервера:', error);
        process.exit(1);
    }
};

startServer(); 