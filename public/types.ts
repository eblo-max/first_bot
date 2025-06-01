/**
 * 🎯 ТИПЫ И ИНТЕРФЕЙСЫ ДЛЯ КРИМИНАЛЬНОГО БЛЕФА
 */

export type AppTheme = 'dark' | 'light';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameMistake {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
}

export interface GameStory {
    id: string;
    title: string;
    content: string;
    date: string;
    difficulty: Difficulty;
    mistakes: GameMistake[];
}

export interface GameResult {
    correct: boolean;
    explanation: string;
    pointsEarned: number;
    timeSpent: number;
}

export interface GameFinishResult {
    gameId: string;
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    timeSpent: number;
    experienceGained: number;
    leveledUp: boolean;
    newLevel?: number;
    achievementsUnlocked: Array<{
        id: string;
        name: string;
        description: string;
    }>;
    reputationChange: number;
    rank: string;
}

export interface TelegramUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface TelegramWebAppData {
    ready(): void;
    expand(): void;
    initData: string;
    initDataUnsafe: {
        user?: TelegramUser;
        [key: string]: any;
    };
    BackButton: {
        show(): void;
        hide(): void;
        onClick(callback: () => void): void;
    };
    colorScheme: AppTheme;
    HapticFeedback?: {
        impactOccurred(type?: string): void;
        notificationOccurred(type?: string): void;
    };
    showAlert?: (message: string) => void;
}

export interface TelegramGlobal {
    WebApp: TelegramWebAppData;
}

export interface GameDataInterface {
    score: number;
    gameId: string | null;
    currentStory: GameStory | null;
    currentStoryIndex: number;
    stories: GameStory[];
    secondsLeft: number;
    timerDuration: number;
    timer: number | null;
    startTime: Date | null;
    result: GameResult | null;
    gameResult: GameFinishResult | null;
    isAnswering: boolean;
    answerSelected: boolean;
    token: string | null;
    theme: AppTheme;
    isTestMode: boolean;
}

export interface PointsCalculation {
    base: number;
    timeBonus: number;
    difficultyBonus: number;
    perfectionBonus: number;
    total: number;
} 