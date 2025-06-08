const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к MongoDB
const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
        await mongoose.connect(mongoUrl);
        console.log('✅ Подключено к MongoDB');
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        process.exit(1);
    }
};

// Простая схема пользователя
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', userSchema);

// Принудительный сброс без подтверждения
const forceResetStats = async () => {
    try {
        console.log('🚀 ПРИНУДИТЕЛЬНЫЙ СБРОС СТАТИСТИКИ...');

        // Обновляем всех пользователей одним запросом
        const result = await User.updateMany(
            {}, // все пользователи
            {
                $set: {
                    'stats.investigations': 0,
                    'stats.solvedCases': 0,
                    'stats.totalScore': 0,
                    'stats.accuracy': 0,
                    'stats.perfectGames': 0,
                    'stats.winStreak': 0,
                    'stats.maxWinStreak': 0,
                    'stats.fastestGame': 0,
                    'stats.averageTime': 0,
                    'stats.totalQuestions': 0,
                    'stats.dailyStreakCurrent': 0,
                    'stats.dailyStreakBest': 0,
                    'stats.level': 1,
                    'stats.experience': 0,
                    'stats.reputation': 0,
                    'achievements': [],
                    'gamesHistory': [],
                    'rank': 'Новичок',
                    'lastSeen': new Date()
                }
            }
        );

        console.log(`✅ Сброшено пользователей: ${result.modifiedCount}`);

        // Проверка результата
        const users = await User.find({});
        const totalScore = users.reduce((sum, user) => sum + (user.stats?.totalScore || 0), 0);
        const totalAchievements = users.reduce((sum, user) => sum + (user.achievements?.length || 0), 0);

        console.log('\n📊 РЕЗУЛЬТАТ:');
        console.log(`👥 Пользователей: ${users.length}`);
        console.log(`💯 Общий счет: ${totalScore}`);
        console.log(`🏆 Достижений: ${totalAchievements}`);

        if (totalScore === 0 && totalAchievements === 0) {
            console.log('🎉 СТАТИСТИКА УСПЕШНО ОБНУЛЕНА!');
        } else {
            console.log('⚠️ Возможно, сброс выполнен не полностью');
        }

    } catch (error) {
        console.error('❌ Ошибка сброса:', error);
        throw error;
    }
};

// Запуск
const main = async () => {
    try {
        await connectDB();
        await forceResetStats();
        process.exit(0);
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        process.exit(1);
    }
};

main(); 