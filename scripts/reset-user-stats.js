const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к MongoDB
const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
        if (!mongoUrl) {
            throw new Error('MongoDB URL не найден в переменных окружения');
        }
        await mongoose.connect(mongoUrl);
        console.log('✅ Подключение к MongoDB установлено');
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
};

// Схема пользователя
const userSchema = new mongoose.Schema({
    telegramId: String,
    username: String,
    firstName: String,
    lastName: String,
    stats: {
        investigations: { type: Number, default: 0 },
        solvedCases: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        perfectGames: { type: Number, default: 0 },
        winStreak: { type: Number, default: 0 },
        maxWinStreak: { type: Number, default: 0 },
        fastestGame: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 },
        dailyStreakCurrent: { type: Number, default: 0 },
        dailyStreakBest: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        experience: { type: Number, default: 0 },
        reputation: { type: Number, default: 0 }
    },
    achievements: [{ type: mongoose.Schema.Types.Mixed }],
    gamesHistory: [{ type: mongoose.Schema.Types.Mixed }],
    rank: String,
    createdAt: Date,
    lastSeen: Date
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// Создать бэкап перед сбросом
const createBackup = async () => {
    try {
        const users = await User.find({});
        const backupData = {
            timestamp: new Date().toISOString(),
            totalUsers: users.length,
            users: users.map(user => ({
                telegramId: user.telegramId,
                username: user.username,
                stats: user.stats,
                achievements: user.achievements,
                gamesHistory: user.gamesHistory,
                rank: user.rank
            }))
        };

        const fs = require('fs');
        const backupFileName = `backup-users-${Date.now()}.json`;
        fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));

        console.log(`💾 Бэкап создан: ${backupFileName}`);
        console.log(`📊 Сохранено ${users.length} пользователей`);

        return backupFileName;
    } catch (error) {
        console.error('❌ Ошибка создания бэкапа:', error);
        throw error;
    }
};

// Сброс статистики пользователей
const resetUserStats = async () => {
    try {
        console.log('🔄 Начинаю сброс статистики пользователей...');

        // Найти всех пользователей
        const users = await User.find({});
        console.log(`👥 Найдено пользователей: ${users.length}`);

        if (users.length === 0) {
            console.log('ℹ️ Нет пользователей для сброса');
            return;
        }

        // Сброс статистики каждого пользователя
        let resetCount = 0;
        for (const user of users) {
            await User.findByIdAndUpdate(user._id, {
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
            });
            resetCount++;

            if (resetCount % 10 === 0) {
                console.log(`⏳ Обработано: ${resetCount}/${users.length}`);
            }
        }

        console.log(`✅ Сброс завершен! Обнулено ${resetCount} пользователей`);

        // Показать статистику после сброса
        const updatedUsers = await User.find({});
        const totalInvestigations = updatedUsers.reduce((sum, user) => sum + (user.stats?.investigations || 0), 0);
        const totalScore = updatedUsers.reduce((sum, user) => sum + (user.stats?.totalScore || 0), 0);
        const totalAchievements = updatedUsers.reduce((sum, user) => sum + (user.achievements?.length || 0), 0);

        console.log('\n📊 СТАТИСТИКА ПОСЛЕ СБРОСА:');
        console.log(`👥 Всего пользователей: ${updatedUsers.length}`);
        console.log(`🔍 Общие расследования: ${totalInvestigations}`);
        console.log(`💯 Общий счет: ${totalScore}`);
        console.log(`🏆 Общие достижения: ${totalAchievements}`);

    } catch (error) {
        console.error('❌ Ошибка сброса статистики:', error);
        throw error;
    }
};

// Восстановление из бэкапа
const restoreFromBackup = async (backupFileName) => {
    try {
        const fs = require('fs');
        if (!fs.existsSync(backupFileName)) {
            throw new Error(`Файл бэкапа не найден: ${backupFileName}`);
        }

        const backupData = JSON.parse(fs.readFileSync(backupFileName, 'utf8'));
        console.log(`🔄 Восстанавливаю из бэкапа: ${backupFileName}`);
        console.log(`📅 Дата бэкапа: ${backupData.timestamp}`);
        console.log(`👥 Пользователей в бэкапе: ${backupData.totalUsers}`);

        let restoredCount = 0;
        for (const userData of backupData.users) {
            await User.findOneAndUpdate(
                { telegramId: userData.telegramId },
                {
                    $set: {
                        stats: userData.stats,
                        achievements: userData.achievements,
                        gamesHistory: userData.gamesHistory,
                        rank: userData.rank
                    }
                }
            );
            restoredCount++;
        }

        console.log(`✅ Восстановлено ${restoredCount} пользователей`);
    } catch (error) {
        console.error('❌ Ошибка восстановления:', error);
        throw error;
    }
};

// Основная функция
const main = async () => {
    try {
        await connectDB();

        // Проверяем аргументы командной строки
        const action = process.argv[2];

        if (action === 'restore') {
            const backupFile = process.argv[3];
            if (!backupFile) {
                console.error('❌ Укажите файл бэкапа для восстановления');
                console.log('💡 Использование: node scripts/reset-user-stats.js restore backup-users-1234567890.json');
                process.exit(1);
            }
            await restoreFromBackup(backupFile);
        } else {
            // Создаем бэкап
            const backupFile = await createBackup();

            // Подтверждение
            console.log('\n⚠️  ВНИМАНИЕ: Вы собираетесь ПОЛНОСТЬЮ СБРОСИТЬ статистику всех пользователей!');
            console.log('📝 Это действие:');
            console.log('   • Обнулит все очки, расследования, достижения');
            console.log('   • Сбросит уровни до 1');
            console.log('   • Очистит историю игр');
            console.log('   • Удалит все достижения');
            console.log(`💾 Бэкап сохранен в: ${backupFile}`);
            console.log(`🔄 Для восстановления: node scripts/reset-user-stats.js restore ${backupFile}`);

            // Ждем подтверждения (в продакшене можно убрать)
            console.log('\n❓ Продолжить? (введите "yes" для подтверждения)');

            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('> ', async (answer) => {
                if (answer.toLowerCase() === 'yes') {
                    console.log('\n🚀 Запускаю сброс...');
                    await resetUserStats();
                    console.log('\n🎉 Готово! Статистика всех пользователей сброшена.');
                    console.log(`💾 Не забудьте про бэкап: ${backupFile}`);
                } else {
                    console.log('❌ Операция отменена');
                }
                rl.close();
                process.exit(0);
            });
        }
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        process.exit(1);
    }
};

// Запуск
main(); 