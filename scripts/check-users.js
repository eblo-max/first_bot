const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/criminal-bluff');

        const totalUsers = await User.countDocuments();
        const usersWithScore = await User.countDocuments({ 'stats.totalScore': { $gt: 0 } });
        const usersWithLastVisit = await User.countDocuments({ lastVisit: { $exists: true } });

        console.log('📊 Статистика пользователей:');
        console.log('  Всего пользователей:', totalUsers);
        console.log('  С очками > 0:', usersWithScore);
        console.log('  С lastVisit:', usersWithLastVisit);

        // Покажем топ-10 игроков
        const topUsers = await User.find({ 'stats.totalScore': { $gt: 0 } })
            .sort({ 'stats.totalScore': -1 })
            .limit(10)
            .select('telegramId firstName username stats.totalScore lastVisit');

        console.log('\n🏆 Топ-10 игроков:');
        topUsers.forEach((user, index) => {
            const name = user.firstName || user.username || 'Игрок' + user.telegramId.slice(-4);
            console.log(`  ${index + 1}. ${name} - ${user.stats.totalScore} очков (lastVisit: ${user.lastVisit || 'не указан'})`);
        });

        // Проверим пользователей за последние периоды
        const now = new Date();
        const periods = [
            { name: 'день', filter: { lastVisit: { $gte: new Date(now - 24 * 60 * 60 * 1000) } } },
            { name: 'неделю', filter: { lastVisit: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } } },
            { name: 'месяц', filter: { lastVisit: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } } }
        ];

        console.log('\n📅 Активность по периодам:');
        for (const period of periods) {
            const count = await User.countDocuments({
                ...period.filter,
                'stats.totalScore': { $gt: 0 }
            });
            console.log(`  За последний ${period.name}: ${count} активных игроков`);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
})(); 