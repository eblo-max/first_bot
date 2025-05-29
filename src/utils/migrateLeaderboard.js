const mongoose = require('mongoose');
require('dotenv').config();

// Импорт моделей
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

/**
 * Миграция данных рейтинга из коллекции users в leaderboard
 */
async function migrateLeaderboard() {
    try {
        
        // Подключение к MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        // Очищаем старые данные leaderboard, если есть
        const existingCount = await Leaderboard.countDocuments();
        if (existingCount > 0) {
            
            await Leaderboard.deleteMany({});
            
        }

        // Получаем всех пользователей
        const users = await User.find({})
            .select('telegramId firstName lastName username nickname stats rank lastVisit createdAt')
            .lean();

        if (users.length === 0) {
            
            return;
        }

        const now = new Date();
        const periods = [
            { name: 'all', filter: {} },
            { name: 'month', filter: getDateFilter('month') },
            { name: 'week', filter: getDateFilter('week') },
            { name: 'day', filter: getDateFilter('day') }
        ];

        let totalCreated = 0;

        for (const period of periods) {
            
            // Фильтруем пользователей по периоду
            const periodUsers = users.filter(user => {
                if (Object.keys(period.filter).length === 0) return true; // all time

                const userDate = user.lastVisit || user.createdAt;
                if (!userDate) return false;

                return userDate >= period.filter.lastVisit.$gte;
            });

            if (periodUsers.length === 0) continue;

            // Сортируем по очкам
            const sortedUsers = periodUsers.sort((a, b) => (b.stats?.totalScore || 0) - (a.stats?.totalScore || 0));

            // Создаем записи рейтинга
            const leaderboardEntries = sortedUsers.map((user, index) => {
                const displayName = user.nickname ||
                    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                        (user.username || `Игрок ${user.telegramId.slice(-4)}`));

                return {
                    userId: user.telegramId,
                    username: displayName,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    nickname: user.nickname,
                    score: user.stats?.totalScore || 0,
                    rank: index + 1,
                    userRank: user.rank,
                    period: period.name,
                    investigations: user.stats?.investigations || 0,
                    accuracy: user.stats?.accuracy || 0,
                    winStreak: user.stats?.winStreak || 0,
                    lastGameDate: user.lastVisit,
                    updatedAt: now
                };
            });

            // Вставляем данные пакетом
            if (leaderboardEntries.length > 0) {
                await Leaderboard.insertMany(leaderboardEntries);
                totalCreated += leaderboardEntries.length;
                
            }
        }

        // Проверяем индексы
        const indexes = await Leaderboard.collection.getIndexes();
        console.log('📑 Проверка индексов:', Object.keys(indexes));

        // Создание индексов, если они не существуют
        await createIndexes();

    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        
    }
}

/**
 * Получение фильтра даты для периода
 */
function getDateFilter(period) {
    const now = new Date();
    let filterDate;

    switch (period) {
        case 'day':
            filterDate = new Date(now);
            filterDate.setDate(filterDate.getDate() - 1);
            break;
        case 'week':
            filterDate = new Date(now);
            filterDate.setDate(filterDate.getDate() - 7);
            break;
        case 'month':
            filterDate = new Date(now);
            filterDate.setMonth(filterDate.getMonth() - 1);
            break;
        default:
            return {};
    }

    return { lastVisit: { $gte: filterDate } };
}

/**
 * Создание индексов для коллекции leaderboard
 */
async function createIndexes() {
    try {
        
        const indexesInfo = [
            { key: { period: 1, score: -1, rank: 1 }, name: 'period_score_rank' },
            { key: { period: 1, userId: 1 }, name: 'period_userId' },
            { key: { updatedAt: 1 }, name: 'updatedAt' },
            { key: { userId: 1 }, name: 'userId' },
            { key: { period: 1 }, name: 'period' }
        ];

        for (const indexInfo of indexesInfo) {
            try {
                await Leaderboard.collection.createIndex(indexInfo.key, { name: indexInfo.name });
                
            } catch (error) {
                if (error.code === 85) {
                    
                } else {
                    console.error(`❌ Ошибка создания индекса ${indexInfo.name}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка создания индексов:', error);
        throw error;
    }
}

/**
 * Функция для запуска миграции из командной строки
 */
if (require.main === module) {
    migrateLeaderboard()
        .then(() => {
            
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Ошибка миграции:', error);
            process.exit(1);
        });
}

module.exports = { migrateLeaderboard, createIndexes }; 