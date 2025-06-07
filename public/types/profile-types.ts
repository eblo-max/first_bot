/**
 * Типы для системы профилей и достижений Criminal Trust
 */

// =============================================================================
// ОСНОВНЫЕ ТИПЫ ПОЛЬЗОВАТЕЛЯ
// =============================================================================

export interface User {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    totalScore: number;
    gamesPlayed: number;
    correctAnswers: number;
    accuracy: number;
    winStreak: number;
    maxWinStreak: number;
    level: number;
    experience: number;
    lastSeen: Date;
    createdAt: Date;
    achievements: string[];
    stats: UserStats;
    avatar?: string;
}

export interface UserStats {
    totalGames: number;
    perfectGames: number;
    avgTimePerQuestion: number;
    fastestGame: number;
    slowestGame: number;
    totalTimeSpent: number;
    dailyStreakCurrent: number;
    gamesPerDay: Record<string, number>;
    accuracyByDifficulty: Record<string, number>;
    streakHistory: number[];
    crimeTypeMastery: Record<string, CrimeTypeMastery>;
    experienceMultipliers: ExperienceMultipliers;
    weeklyStats: WeeklyStats;
    monthlyStats: MonthlyStats;
}

export interface CrimeTypeMastery {
    name: string;
    icon: string;
    level: number;
    maxLevel: number;
    experience: number;
    totalSolved: number;
    accuracy: number;
}

export interface ExperienceMultipliers {
    perfect_game: number;
    speed_bonus: number;
    difficulty_master: number;
    consistency: number;
    streak_bonus: number;
    achievement_unlock: number;
    weekend_bonus: number;
    daily_first_game: number;
    same_hour_penalty: number;
    same_day_penalty: number;
}

export interface WeeklyStats {
    gamesPlayed: number;
    correctAnswers: number;
    totalScore: number;
    averageAccuracy: number;
    perfectGames: number;
    startDate: string;
    endDate: string;
}

export interface MonthlyStats {
    gamesPlayed: number;
    correctAnswers: number;
    totalScore: number;
    averageAccuracy: number;
    perfectGames: number;
    achievementsUnlocked: string[];
    month: number;
    year: number;
}

// =============================================================================
// СИСТЕМА УРОВНЕЙ И ОПЫТА
// =============================================================================

export interface LevelSystem {
    maxXP: number[];
    getRankByLevel: (level: number) => Rank;
    experienceMultipliers: ExperienceMultipliers;
    crimeTypeMastery: Record<string, CrimeTypeMasteryConfig>;
}

export interface Rank {
    name: string;
    color: string;
    icon: string;
}

export interface CrimeTypeMasteryConfig {
    name: string;
    icon: string;
    maxLevel: number;
}

// =============================================================================
// СИСТЕМА ДОСТИЖЕНИЙ
// =============================================================================

export interface Achievement {
    id: string;
    name: string;
    description: string;
    category: AchievementCategory;
    icon: string;
    requirement?: AchievementRequirement;
    rarity: AchievementRarity;
    sound?: AchievementSound;
    isUnlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    progressData?: { current: number; target: number };
    tips?: string;
}

export interface AchievementConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    experienceReward: number;
    titleReward?: string;
    requirements: Array<{
        type: RequirementType;
        target?: number;
        value?: string;
    }>;
}

export interface AchievementRequirement {
    type: RequirementType;
    value: number;
    minGames?: number;
    condition?: string;
    crimeType?: string;
    accuracy?: number;
    level?: number;
    averageTime?: number;
    startHour?: number;
    endHour?: number;
    days?: number;
    perfectGame?: boolean;
    speed?: number;
    consistency?: number;
    difficulty?: string;
    requirements?: AchievementRequirement[];
    hours?: number[];
}

export type RequirementType =
    | 'investigations'
    | 'correctAnswers'
    | 'solvedCases'
    | 'accuracy'
    | 'winStreak'
    | 'totalScore'
    | 'perfectGames'
    | 'fastestGame'
    | 'averageTime'
    | 'easyGames'
    | 'mediumGames'
    | 'hardGames'
    | 'expertGames'
    | 'reputation'
    | 'dailyStreak'
    | 'crimeType'
    | 'difficultyType'
    | 'combo'
    | 'achievementsInDay'
    | 'comebackAfterDays'
    | 'timeOfDay'
    | 'weekendGames'
    | 'achievementsCount'
    | 'crimeTypeMastery'
    | 'multipleMastery'
    | 'allMastery'
    | 'perfectReputation'
    | 'speedAccuracy'
    | 'firstDayGames'
    | 'comeback'
    | 'midnightGame'
    | 'perfectWeek'
    | 'encyclopedic'
    | 'fastGame'
    | 'timeRange'
    | 'consistency';

export type AchievementCategory =
    | 'investigation'
    | 'accuracy'
    | 'speed'
    | 'streak'
    | 'score'
    | 'specialization'
    | 'difficulty'
    | 'reputation'
    | 'consistency'
    | 'elite'
    | 'unique'
    | 'Начинающий'
    | 'Профессионал'
    | 'Мастерство'
    | 'Очки'
    | 'Скорость'
    | 'Постоянство'
    | 'Специальные';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type AchievementSound =
    | 'success-light'
    | 'success-medium'
    | 'success-heavy'
    | 'success-epic'
    | 'success-legendary';

// =============================================================================
// СИСТЕМА ЛИДЕРБОРДА
// =============================================================================

export interface LeaderboardData {
    period: LeaderboardPeriod;
    users: LeaderboardEntry[];
    userPosition?: number;
    totalUsers: number;
    lastUpdated: Date;
}

export interface LeaderboardEntry {
    position: number;
    user: User;
    score: number;
    gamesPlayed: number;
    accuracy: number;
    level: number;
    rank: Rank;
    change?: number; // изменение позиции
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

// =============================================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// =============================================================================

export interface ProfileState {
    user: User | null;
    achievements: any[];
    leaderboard: {
        current: LeaderboardPeriod;
        data: Record<LeaderboardPeriod, LeaderboardData>;
    };
    isLoading: boolean;
    criminalEffects: CriminalEffects;
}

export interface CriminalEffects {
    glitchActive: boolean;
    bloodParticles: BloodParticle[];
    scanEffect: boolean;
    atmosphericEffects: boolean;
}

export interface BloodParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
}

// =============================================================================
// КОНФИГУРАЦИИ
// =============================================================================

export interface ProfileConfig {
    levels: LevelSystem;
    achievements: Achievement[];
    ui: {
        theme: ProfileTheme;
        animations: AnimationConfig;
        effects: EffectConfig;
    };
}

export interface ProfileTheme {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    criminalRed: string;
    darkBlue: string;
}

export interface AnimationConfig {
    duration: {
        short: number;
        medium: number;
        long: number;
    };
    easing: {
        standard: string;
        dramatic: string;
        bounce: string;
    };
}

export interface EffectConfig {
    particles: {
        maxCount: number;
        lifetime: number;
        gravity: number;
    };
    glitch: {
        intensity: number;
        frequency: number;
    };
    scan: {
        speed: number;
        opacity: number;
    };
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface ApiResponse<T> {
    success?: boolean;
    status?: string;
    data?: T;
    error?: string;
    message?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
    expiresAt: string;
}

export interface GameResult {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    difficulty: string;
    crimeType: string;
    isPerfectGame: boolean;
    timestamp: Date;
}

// =============================================================================
// СОБЫТИЯ И CALLBACKS
// =============================================================================

export interface ProfileEvents {
    onUserUpdate: (user: User) => void;
    onAchievementUnlock: (achievement: Achievement) => void;
    onLevelUp: (newLevel: number, oldLevel: number) => void;
    onLoadingStart: () => void;
    onLoadingEnd: () => void;
    onError: (error: string) => void;
}

export interface AchievementEvents {
    onShow: (achievementId: string) => void;
    onHide: () => void;
    onProgress: (achievementId: string, progress: number) => void;
    onUnlock: (achievementId: string) => void;
}

// =============================================================================
// УТИЛИТЫ И ХЕЛПЕРЫ
// =============================================================================

export interface TimeRange {
    start: Date;
    end: Date;
}

export interface StatsPeriod {
    period: 'day' | 'week' | 'month' | 'year';
    date: Date;
}

export interface NotificationConfig {
    duration: number;
    position: 'top' | 'bottom' | 'center';
    sound: boolean;
    vibration: boolean;
}

// =============================================================================
// TELEGRAM WEBAPP ТИПЫ
// =============================================================================

export interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    BackButton: {
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
    };
    themeParams: Record<string, string>;
    initData: string;
    initDataUnsafe: {
        user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
        };
    };
    colorScheme: 'light' | 'dark';
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
} 