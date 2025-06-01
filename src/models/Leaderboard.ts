/**
 * Типизированная модель лидерборда (Leaderboard) для MongoDB с Mongoose
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// Типы для периодов лидерборда
type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

// Типы для рангов пользователей (из оригинальной модели)
type UserRank =
    | 'СТАЖЕР'
    | 'СЛЕДОВАТЕЛЬ'
    | 'ДЕТЕКТИВ'
    | 'СТАРШИЙ ДЕТЕКТИВ'
    | 'ИНСПЕКТОР'
    | 'КОМИССАР'
    | 'ГЛАВНЫЙ ИНСПЕКТОР'
    | 'ШЕФ ПОЛИЦИИ';

// Интерфейс для результата обновления периода
export interface UpdatePeriodResult {
    success: boolean;
    count?: number;
    error?: string;
}

// Интерфейс для результата обновления всех рейтингов
export interface UpdateAllResults {
    [period: string]: UpdatePeriodResult;
}

// Интерфейс для документа лидерборда
export interface ILeaderboard extends Document {
    userId: string;
    username: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    score: number;
    rank: number;
    userRank: UserRank;
    period: LeaderboardPeriod;
    investigations: number;
    accuracy: number;
    winStreak: number;
    lastGameDate?: Date;
    updatedAt: Date;
    createdAt: Date;
}

// Интерфейс для статических методов модели
export interface ILeaderboardModel extends Model<ILeaderboard> {
    updatePeriodLeaderboard(period: LeaderboardPeriod): Promise<number>;
    updateAllLeaderboards(): Promise<UpdateAllResults>;
    getLeaderboard(period?: LeaderboardPeriod, limit?: number): Promise<ILeaderboard[]>;
    getUserPosition(userId: string, period?: LeaderboardPeriod): Promise<ILeaderboard | null>;
    cleanupOldEntries(): Promise<number>;
}

// Схема лидерборда
const leaderboardSchema = new Schema<ILeaderboard, ILeaderboardModel>({
    userId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: false
    },
    lastName: {
        type: String,
        required: false
    },
    nickname: {
        type: String,
        required: false
    },
    score: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    rank: {
        type: Number,
        required: true,
        min: 1
    },
    userRank: {
        type: String,
        enum: [
            'СТАЖЕР',
            'СЛЕДОВАТЕЛЬ',
            'ДЕТЕКТИВ',
            'СТАРШИЙ ДЕТЕКТИВ',
            'ИНСПЕКТОР',
            'КОМИССАР',
            'ГЛАВНЫЙ ИНСПЕКТОР',
            'ШЕФ ПОЛИЦИИ'
        ] as const,
        default: 'СТАЖЕР'
    },
    period: {
        type: String,
        enum: ['day', 'week', 'month', 'all'] as const,
        required: true,
        index: true
    },
    investigations: {
        type: Number,
        default: 0,
        min: 0
    },
    accuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    winStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    lastGameDate: {
        type: Date,
        required: false
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    collection: 'leaderboard'
});

// Составные индексы для оптимизации запросов
leaderboardSchema.index({ period: 1, score: -1, rank: 1 });
leaderboardSchema.index({ period: 1, userId: 1 });
leaderboardSchema.index({ updatedAt: 1 });

// Статические методы

/**
 * Обновление рейтинга для конкретного периода
 */
leaderboardSchema.statics.updatePeriodLeaderboard = async function (
    this: ILeaderboardModel,
    period: LeaderboardPeriod
): Promise<number> {
    const User = mongoose.model('User');
    let dateFilter: Record<string, any> = {};
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
        const leaderboardEntries = users.map((user: any, index: number) => {
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
                userRank: user.rank || 'СТАЖЕР',
                period,
                investigations: user.stats?.investigations || 0,
                accuracy: user.stats?.accuracy || 0,
                winStreak: user.stats?.winStreak || 0,
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
leaderboardSchema.statics.updateAllLeaderboards = async function (
    this: ILeaderboardModel
): Promise<UpdateAllResults> {
    const periods: LeaderboardPeriod[] = ['day', 'week', 'month', 'all'];
    const results: UpdateAllResults = {};

    for (const period of periods) {
        try {
            const count = await this.updatePeriodLeaderboard(period);
            results[period] = { success: true, count };
        } catch (error: any) {
            console.error(`❌ Ошибка обновления рейтинга ${period}:`, error);
            results[period] = { success: false, error: error.message };
        }
    }

    return results;
};

/**
 * Получение рейтинга для периода
 */
leaderboardSchema.statics.getLeaderboard = async function (
    this: ILeaderboardModel,
    period: LeaderboardPeriod = 'all',
    limit: number = 20
): Promise<ILeaderboard[]> {
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
leaderboardSchema.statics.getUserPosition = async function (
    this: ILeaderboardModel,
    userId: string,
    period: LeaderboardPeriod = 'all'
): Promise<ILeaderboard | null> {
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
leaderboardSchema.statics.cleanupOldEntries = async function (
    this: ILeaderboardModel
): Promise<number> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    try {
        const result = await this.deleteMany({
            updatedAt: { $lt: oneDayAgo }
        });

        return result.deletedCount;
    } catch (error) {
        console.error('❌ Ошибка очистки старых записей рейтинга:', error);
        throw error;
    }
};

// Создание и экспорт модели
const Leaderboard = mongoose.model<ILeaderboard, ILeaderboardModel>('Leaderboard', leaderboardSchema);

export default Leaderboard;
module.exports = Leaderboard; 