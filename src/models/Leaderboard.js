const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    firstName: String,
    lastName: String,
    nickname: String,
    score: {
        type: Number,
        required: true,
        default: 0
    },
    rank: {
        type: Number,
        required: true
    },
    userRank: {
        type: String,
        enum: ['НОВИЧОК', 'ДЕТЕКТИВ', 'ИНСПЕКТОР', 'СЛЕДОВАТЕЛЬ', 'ЭКСПЕРТ', 'КРИМИНАЛИСТ'],
        default: 'НОВИЧОК'
    },
    period: {
        type: String,
        enum: ['day', 'week', 'month', 'all'],
        required: true,
        index: true
    },
    investigations: {
        type: Number,
        default: 0
    },
    accuracy: {
        type: Number,
        default: 0
    },
    winStreak: {
        type: Number,
        default: 0
    },
    lastGameDate: Date,
    updatedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    collection: 'leaderboard'
});

// Составной индекс для быстрой выборки рейтингов
leaderboardSchema.index({ period: 1, score: -1, rank: 1 });

// Индекс для поиска пользователя в рейтинге
leaderboardSchema.index({ period: 1, userId: 1 });

// Индекс для очистки старых записей
leaderboardSchema.index({ updatedAt: 1 });

// Статические методы для работы с рейтингами

/**
 * Обновление рейтинга для конкретного периода
 */
leaderboardSchema.statics.updatePeriodLeaderboard = async function (period) {
    
    const User = mongoose.model('User');
    let dateFilter = {};
    const now = new Date();

    // Настраиваем фильтр по периоду
    switch (period) {
        case 'day':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            dateFilter = { lastVisit: { $gte: yesterday } };
            break;
        case 'week':
            const lastWeek = new Date(now);
            lastWeek.setDate(lastWeek.getDate() - 7);
            dateFilter = { lastVisit: { $gte: lastWeek } };
            break;
        case 'month':
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateFilter = { lastVisit: { $gte: lastMonth } };
            break;
        case 'all':
        default:
            // Для "все время" фильтр не нужен
            break;
    }

    try {
        // Получаем всех пользователей с учетом фильтра
        const users = await User.find(dateFilter)
            .sort({ 'stats.totalScore': -1 })
            .select('telegramId firstName lastName username nickname stats rank lastVisit')
            .lean();

        // Удаляем старые записи для этого периода
        await this.deleteMany({ period });

        // Создаем новые записи рейтинга
        const leaderboardEntries = users.map((user, index) => {
            const displayName = user.nickname ||
                (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                    (user.username || `Игрок ${user.telegramId.slice(-4)}`));

            return {
                userId: user.telegramId,
                username: displayName,
                firstName: user.firstName,
                lastName: user.lastName,
                nickname: user.nickname,
                score: user.stats.totalScore,
                rank: index + 1,
                userRank: user.rank,
                period,
                investigations: user.stats.investigations,
                accuracy: user.stats.accuracy,
                winStreak: user.stats.winStreak,
                lastGameDate: user.lastVisit,
                updatedAt: now
            };
        });

        // Вставляем новые записи пакетом
        if (leaderboardEntries.length > 0) {
            await this.insertMany(leaderboardEntries);
            
        }

        return leaderboardEntries.length;
    } catch (error) {
        console.error(`❌ Ошибка обновления рейтинга ${period}:`, error);
        throw error;
    }
};

/**
 * Обновление всех рейтингов
 */
leaderboardSchema.statics.updateAllLeaderboards = async function () {
    
    const periods = ['day', 'week', 'month', 'all'];
    const results = {};

    for (const period of periods) {
        try {
            const count = await this.updatePeriodLeaderboard(period);
            results[period] = { success: true, count };
        } catch (error) {
            console.error(`❌ Ошибка обновления рейтинга ${period}:`, error);
            results[period] = { success: false, error: error.message };
        }
    }

    return results;
};

/**
 * Получение рейтинга для периода
 */
leaderboardSchema.statics.getLeaderboard = async function (period = 'all', limit = 20) {
    try {
        const entries = await this.find({ period })
            .sort({ rank: 1 })
            .limit(limit)
            .lean();

        return entries;
    } catch (error) {
        console.error(`❌ Ошибка получения рейтинга ${period}:`, error);
        throw error;
    }
};

/**
 * Получение позиции пользователя в рейтинге
 */
leaderboardSchema.statics.getUserPosition = async function (userId, period = 'all') {
    try {
        const entry = await this.findOne({ userId, period }).lean();
        return entry;
    } catch (error) {
        console.error(`❌ Ошибка получения позиции пользователя ${userId} в рейтинге ${period}:`, error);
        throw error;
    }
};

/**
 * Очистка старых записей (старше 1 дня)
 */
leaderboardSchema.statics.cleanupOldEntries = async function () {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    try {
        const result = await this.deleteMany({
            updatedAt: { $lt: oneDayAgo }
        });

        if (result.deletedCount > 0) {
            
        }

        return result.deletedCount;
    } catch (error) {
        console.error('❌ Ошибка очистки старых записей рейтинга:', error);
        throw error;
    }
};

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard; 