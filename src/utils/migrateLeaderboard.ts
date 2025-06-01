/**
 * Типизированная система миграции данных лидерборда
 */

import mongoose from 'mongoose';
require('dotenv').config();

// Импорт моделей
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

// Типы для миграции
interface UserData {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    nickname?: string;
    stats?: {
        totalScore: number;
        investigations: number;
        accuracy: number;
        winStreak: number;
    };
    rank?: string;
    lastVisit?: Date;
    createdAt: Date;
}

interface LeaderboardEntry {
    userId: string;
    username: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    score: number;
    rank: number;
    userRank?: string;
    period: string;
    investigations: number;
    accuracy: number;
    winStreak: number;
    lastGameDate?: Date;
    updatedAt: Date;
}

interface Period {
    name: string;
    filter: Record<string, any>;
}

interface DateFilter {
    lastVisit?: {
        $gte: Date;
    };
}

interface IndexInfo {
    key: Record<string, number>;
    name: string;
}

/**
 * Миграция данных рейтинга из коллекции users в leaderboard
 */
async function migrateLeaderboard(): Promise<void> {
    try {
        console.log('🚀 Начинаем миграцию лидерборда...');

        // Подключение к MongoDB
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('✅ Подключение к MongoDB установлено');

        // Очищаем старые данные leaderboard, если есть
        const existingCount = await Leaderboard.countDocuments();
        if (existingCount > 0) {
            console.log(`🗑️ Удаляем ${existingCount} старых записей лидерборда...`);
            await Leaderboard.deleteMany({});
            console.log('✅ Старые данные удалены');
        }

        // Получаем всех пользователей
        const users: UserData[] = await User.find({})
            .select('telegramId firstName lastName username nickname stats rank lastVisit createdAt')
            .lean();

        if (users.length === 0) {
            console.log('⚠️ Пользователи не найдены');
            return;
        }

        console.log(`📊 Найдено пользователей: ${users.length}`);

        const now = new Date();
        const periods: Period[] = [
            { name: 'all', filter: {} },
            { name: 'month', filter: getDateFilter('month') },
            { name: 'week', filter: getDateFilter('week') },
            { name: 'day', filter: getDateFilter('day') }
        ];

        let totalCreated = 0;

        for (const period of periods) {
            console.log(`📈 Обрабатываем период: ${period.name}`);

            // Фильтруем пользователей по периоду
            const periodUsers = users.filter(user => {
                if (Object.keys(period.filter).length === 0) return true; // all time

                const userDate = user.lastVisit || user.createdAt;
                if (!userDate) return false;

                return userDate >= period.filter.lastVisit.$gte;
            });

            if (periodUsers.length === 0) {
                console.log(`⚠️ Нет пользователей для периода ${period.name}`);
                continue;
            }

            // Сортируем по очкам
            const sortedUsers = periodUsers.sort((a, b) => (b.stats?.totalScore || 0) - (a.stats?.totalScore || 0));

            // Создаем записи рейтинга
            const leaderboardEntries: LeaderboardEntry[] = sortedUsers.map((user, index) => {
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
                console.log(`✅ Создано записей для периода ${period.name}: ${leaderboardEntries.length}`);
            }
        }

        console.log(`🎉 Всего создано записей: ${totalCreated}`);

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
        console.log('🔌 Соединение с MongoDB закрыто');
    }
}

/**
 * Получение фильтра даты для периода
 */
function getDateFilter(period: string): DateFilter {
    const now = new Date();
    let filterDate: Date;

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
async function createIndexes(): Promise<void> {
    try {
        console.log('🔧 Создаем индексы для лидерборда...');

        const indexesInfo: IndexInfo[] = [
            { key: { period: 1, score: -1, rank: 1 }, name: 'period_score_rank' },
            { key: { period: 1, userId: 1 }, name: 'period_userId' },
            { key: { updatedAt: 1 }, name: 'updatedAt' },
            { key: { userId: 1 }, name: 'userId' },
            { key: { period: 1 }, name: 'period' }
        ];

        for (const indexInfo of indexesInfo) {
            try {
                await Leaderboard.collection.createIndex(indexInfo.key, { name: indexInfo.name });
                console.log(`✅ Индекс создан: ${indexInfo.name}`);
            } catch (error: any) {
                if (error.code === 85) {
                    console.log(`ℹ️ Индекс уже существует: ${indexInfo.name}`);
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
            console.log('🎉 Миграция лидерборда завершена успешно!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Ошибка миграции:', error);
            process.exit(1);
        });
}

export { migrateLeaderboard, createIndexes };
module.exports = { migrateLeaderboard, createIndexes }; 