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

// Проверка статистики
const checkStats = async () => {
    try {
        console.log('📊 ПРОВЕРКА ТЕКУЩЕЙ СТАТИСТИКИ...\n');

        const users = await User.find({});

        if (users.length === 0) {
            console.log('❌ Пользователи не найдены');
            return;
        }

        // Общая статистика
        let totalInvestigations = 0;
        let totalScore = 0;
        let totalAchievements = 0;
        let totalGames = 0;
        let usersWithStats = 0;
        let usersWithAchievements = 0;

        console.log('👥 СПИСОК ПОЛЬЗОВАТЕЛЕЙ:');
        console.log('─'.repeat(80));

        users.forEach((user, index) => {
            const stats = user.stats || {};
            const achievements = user.achievements || [];

            const investigations = stats.investigations || 0;
            const score = stats.totalScore || 0;
            const gamesPlayed = stats.investigations || 0;
            const accuracy = stats.accuracy || 0;
            const level = stats.level || 1;

            console.log(`${index + 1}. ${user.username || user.firstName || 'Без имени'} (ID: ${user.telegramId})`);
            console.log(`   🔍 Расследования: ${investigations} | 💯 Очки: ${score} | 🎯 Точность: ${accuracy}%`);
            console.log(`   🏆 Достижения: ${achievements.length} | 📊 Уровень: ${level} | 👤 Ранг: ${user.rank || 'Не указан'}`);
            console.log('');

            totalInvestigations += investigations;
            totalScore += score;
            totalAchievements += achievements.length;
            totalGames += gamesPlayed;

            if (investigations > 0 || score > 0) usersWithStats++;
            if (achievements.length > 0) usersWithAchievements++;
        });

        console.log('═'.repeat(80));
        console.log('📈 ОБЩАЯ СТАТИСТИКА:');
        console.log(`👥 Всего пользователей: ${users.length}`);
        console.log(`📊 Пользователей с активностью: ${usersWithStats}`);
        console.log(`🏆 Пользователей с достижениями: ${usersWithAchievements}`);
        console.log(`🔍 Общее количество расследований: ${totalInvestigations}`);
        console.log(`💯 Общий счет: ${totalScore}`);
        console.log(`🏆 Общее количество достижений: ${totalAchievements}`);
        console.log(`🎮 Общее количество игр: ${totalGames}`);

        // Топ пользователи
        const topUsers = users
            .sort((a, b) => (b.stats?.totalScore || 0) - (a.stats?.totalScore || 0))
            .slice(0, 5);

        if (topUsers.length > 0 && topUsers[0].stats?.totalScore > 0) {
            console.log('\n🏆 ТОП-5 ПОЛЬЗОВАТЕЛЕЙ:');
            topUsers.forEach((user, index) => {
                const score = user.stats?.totalScore || 0;
                const achievements = (user.achievements || []).length;
                console.log(`${index + 1}. ${user.username || user.firstName || 'Без имени'} - ${score} очков, ${achievements} достижений`);
            });
        }

        // Определяем состояние базы
        if (totalScore === 0 && totalAchievements === 0) {
            console.log('\n✅ СТАТИСТИКА ПОЛНОСТЬЮ ОБНУЛЕНА');
        } else if (usersWithStats > 0) {
            console.log('\n📊 БАЗА СОДЕРЖИТ АКТИВНУЮ СТАТИСТИКУ');
        } else {
            console.log('\n❓ СОСТОЯНИЕ БАЗЫ НЕОПРЕДЕЛЕННОЕ');
        }

    } catch (error) {
        console.error('❌ Ошибка проверки статистики:', error);
        throw error;
    }
};

// Запуск
const main = async () => {
    try {
        await connectDB();
        await checkStats();
        process.exit(0);
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        process.exit(1);
    }
};

main(); 