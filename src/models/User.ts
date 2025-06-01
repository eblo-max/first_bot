/**
 * Типизированная модель пользователя (User) для MongoDB с Mongoose
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import * as UserMethods from './UserMethods';

// Типы для рангов пользователей
export type UserRank =
    | 'СТАЖЕР'
    | 'СЛЕДОВАТЕЛЬ'
    | 'ДЕТЕКТИВ'
    | 'СТАРШИЙ ДЕТЕКТИВ'
    | 'ИНСПЕКТОР'
    | 'КОМИССАР'
    | 'ГЛАВНЫЙ ИНСПЕКТОР'
    | 'ШЕФ ПОЛИЦИИ';

// Типы для категорий репутации
type ReputationCategory = 'КРИТИКУЕМЫЙ' | 'ОБЫЧНЫЙ' | 'УВАЖАЕМЫЙ' | 'ЭЛИТНЫЙ' | 'ЛЕГЕНДАРНЫЙ';

// Типы для категорий достижений
type AchievementCategory = 'ПРОГРЕСС' | 'МАСТЕРСТВО' | 'СКОРОСТЬ' | 'СЕРИИ' | 'ОСОБЫЕ';

// Типы для редкости достижений
type AchievementRarity = 'ОБЫЧНОЕ' | 'РЕДКОЕ' | 'ЭПИЧЕСКОЕ' | 'ЛЕГЕНДАРНОЕ';

// Типы для уровней сложности
type GameDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

// Типы для типов преступлений
type CrimeType = 'murder' | 'robbery' | 'fraud' | 'theft' | 'cybercrime';

// Интерфейс для мастерства по типу преступления
export interface ICrimeTypeMastery {
    level: number;
    experience: number;
}

// Интерфейс для репутации
export interface IReputation {
    level: number;
    category: ReputationCategory;
    accuracy: number;
    speed: number;
    consistency: number;
    difficulty: number;
}

// Интерфейс для статистики
export interface IStats {
    investigations: number;
    solvedCases: number;
    totalQuestions: number;
    accuracy: number;
    experience: number;
    level: number;
    totalScore: number;
    winStreak: number;
    maxWinStreak: number;
    perfectGames: number;
    averageTime: number;
    fastestGame: number;
    dailyStreakCurrent: number;
    dailyStreakBest: number;
    lastActiveDate: Date;
    crimeTypeMastery: {
        murder: ICrimeTypeMastery;
        robbery: ICrimeTypeMastery;
        fraud: ICrimeTypeMastery;
        theft: ICrimeTypeMastery;
        cybercrime: ICrimeTypeMastery;
    };
    gamesThisHour: number;
    gamesToday: number;
    lastGameTime?: Date;
    experienceMultiplier: number;
    easyGames: number;
    mediumGames: number;
    hardGames: number;
    expertGames: number;
}

// Интерфейс для достижений
export interface IAchievement {
    id: string;
    name: string;
    description: string;
    category: AchievementCategory;
    rarity: AchievementRarity;
    unlockedAt?: Date;
    progress: {
        current: number;
        target: number;
    };
}

// Интерфейс для истории игр
export interface IGameHistory {
    gameId: string;
    date: Date;
    score: number;
    experience: number;
    experienceBreakdown: any;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    difficulty: GameDifficulty;
    crimeType: string;
    perfectGame: boolean;
    reputationGained: number;
}

// Интерфейс для наград
export interface IRewards {
    experienceBonus: number;
    reputationBonus: number;
    nextRankProgress: number;
}

// Интерфейс для результата игры
export interface IGameResult {
    gameId?: string;
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent?: number;
    difficulty?: GameDifficulty;
    crimeType?: CrimeType;
    averageTime?: number;
    reputationGained?: number;
}

// Интерфейс для данных опыта
export interface IExperienceData {
    baseExperience: number;
    multiplier: number;
    bonusExperience: number;
    finalExperience: number;
    bonusReasons: string[];
}

// Интерфейс для документа пользователя
export interface IUser extends Document {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    registeredAt: Date;
    lastVisit: Date;
    rank: UserRank;
    reputation: IReputation;
    stats: IStats;
    achievements: IAchievement[];
    gameHistory: IGameHistory[];
    rewards: IRewards;

    // Виртуальные свойства
    calculatedAccuracy: number;

    // Методы экземпляра
    updateStatsAfterGame(gameResult: IGameResult): Promise<IUser>;
    calculateAdvancedExperience(gameResult: IGameResult): IExperienceData;
    calculateLevelFromExperience(experience: number): number;
    updateGameCounters(): void;
    updateReputation(gameResult: IGameResult, prevStats: IStats): void;
    updateDailyStreak(): void;
    updateRank(): void;
    getRankDisplayName(): string;
    getRankRarity(): AchievementRarity;
    checkAchievements(): IAchievement[];
    hasAchievement(achievementId: string): boolean;
    getReputationBreakdown(): any;
    getAchievementsProgress(): any;
}

// Схема мастерства по типу преступления
const crimeTypeMasterySchema = new Schema<ICrimeTypeMastery>({
    level: { type: Number, default: 0 },
    experience: { type: Number, default: 0 }
});

// Основная схема пользователя
const userSchema = new Schema<IUser>({
    telegramId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    nickname: { type: String },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastVisit: {
        type: Date,
        default: Date.now
    },

    // Детективные звания
    rank: {
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

    // Репутационная система
    reputation: {
        level: { type: Number, default: 50, min: 0, max: 100 },
        category: {
            type: String,
            enum: ['КРИТИКУЕМЫЙ', 'ОБЫЧНЫЙ', 'УВАЖАЕМЫЙ', 'ЭЛИТНЫЙ', 'ЛЕГЕНДАРНЫЙ'] as const,
            default: 'ОБЫЧНЫЙ'
        },
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
        speed: { type: Number, default: 0, min: 0, max: 100 },
        consistency: { type: Number, default: 0, min: 0, max: 100 },
        difficulty: { type: Number, default: 0, min: 0, max: 100 }
    },

    // Статистика пользователя
    stats: {
        investigations: { type: Number, default: 0 },
        solvedCases: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        experience: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        totalScore: { type: Number, default: 0 },
        winStreak: { type: Number, default: 0 },
        maxWinStreak: { type: Number, default: 0 },
        perfectGames: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
        fastestGame: { type: Number, default: 0 },
        dailyStreakCurrent: { type: Number, default: 0 },
        dailyStreakBest: { type: Number, default: 0 },
        lastActiveDate: { type: Date, default: Date.now },
        crimeTypeMastery: {
            murder: crimeTypeMasterySchema,
            robbery: crimeTypeMasterySchema,
            fraud: crimeTypeMasterySchema,
            theft: crimeTypeMasterySchema,
            cybercrime: crimeTypeMasterySchema
        },
        gamesThisHour: { type: Number, default: 0 },
        gamesToday: { type: Number, default: 0 },
        lastGameTime: { type: Date },
        experienceMultiplier: { type: Number, default: 1.0 },
        easyGames: { type: Number, default: 0 },
        mediumGames: { type: Number, default: 0 },
        hardGames: { type: Number, default: 0 },
        expertGames: { type: Number, default: 0 }
    },

    // Система достижений
    achievements: [{
        id: String,
        name: String,
        description: String,
        category: {
            type: String,
            enum: ['ПРОГРЕСС', 'МАСТЕРСТВО', 'СКОРОСТЬ', 'СЕРИИ', 'ОСОБЫЕ'] as const
        },
        rarity: {
            type: String,
            enum: ['ОБЫЧНОЕ', 'РЕДКОЕ', 'ЭПИЧЕСКОЕ', 'ЛЕГЕНДАРНОЕ'] as const
        },
        unlockedAt: Date,
        progress: {
            current: { type: Number, default: 0 },
            target: { type: Number, default: 1 }
        }
    }],

    // История игр
    gameHistory: [{
        gameId: String,
        date: { type: Date, default: Date.now },
        score: Number,
        experience: Number,
        experienceBreakdown: Object,
        correctAnswers: Number,
        totalQuestions: Number,
        timeSpent: Number,
        difficulty: {
            type: String,
            enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const,
            default: 'MEDIUM'
        },
        crimeType: String,
        perfectGame: { type: Boolean, default: false },
        reputationGained: Number
    }],

    // Награды и бонусы
    rewards: {
        experienceBonus: { type: Number, default: 1.0 },
        reputationBonus: { type: Number, default: 1.0 },
        nextRankProgress: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Подключение методов экземпляра
userSchema.methods.updateStatsAfterGame = UserMethods.updateStatsAfterGame;
userSchema.methods.calculateAdvancedExperience = UserMethods.calculateAdvancedExperience;
userSchema.methods.calculateLevelFromExperience = UserMethods.calculateLevelFromExperience;
userSchema.methods.updateGameCounters = UserMethods.updateGameCounters;
userSchema.methods.updateReputation = UserMethods.updateReputation;
userSchema.methods.updateDailyStreak = UserMethods.updateDailyStreak;
userSchema.methods.updateRank = UserMethods.updateRank;
userSchema.methods.getRankDisplayName = UserMethods.getRankDisplayName;
userSchema.methods.getRankRarity = UserMethods.getRankRarity;
userSchema.methods.hasAchievement = UserMethods.hasAchievement;
userSchema.methods.checkAchievements = UserMethods.checkAchievements;
userSchema.methods.getReputationBreakdown = UserMethods.getReputationBreakdown;
userSchema.methods.getAchievementsProgress = UserMethods.getAchievementsProgress;

// Виртуальное свойство для расчета точности
userSchema.virtual('calculatedAccuracy').get(UserMethods.calculatedAccuracy);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
module.exports = User; 