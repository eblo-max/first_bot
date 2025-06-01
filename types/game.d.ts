// ============= ТИПЫ ДЛЯ ИГРОВОЙ СИСТЕМЫ =============

declare namespace CriminalBluff {
    // Базовые типы пользователя
    interface User {
        id: string;
        telegramId: number;
        username?: string;
        firstName: string;
        lastName?: string;
        totalScore: number;
        gamesPlayed: number;
        correctAnswers: number;
        averageTime: number;
        rank: UserRank;
        level: number;
        experience: number;
        achievements: Achievement[];
        specializations: Specialization[];
        createdAt: Date;
        updatedAt: Date;
    }

    // Ранги пользователей
    type UserRank =
        | 'suspect'
        | 'trainee'
        | 'detective'
        | 'senior_detective'
        | 'investigator'
        | 'chief_investigator'
        | 'inspector'
        | 'chief_inspector'
        | 'superintendent'
        | 'chief_superintendent'
        | 'assistant_commissioner'
        | 'deputy_commissioner'
        | 'commissioner'
        | 'captain'
        | 'major'
        | 'colonel'
        | 'general'
        | 'chief_of_police'
        | 'master_detective'
        | 'legend';

    // Типы дел и специализации
    type CrimeType = 'murder' | 'robbery' | 'fraud' | 'theft' | 'cybercrime';

    interface Specialization {
        type: CrimeType;
        level: number;
        experience: number;
        solved: number;
    }

    // Игровые данные
    interface Game {
        id: string;
        userId: string;
        storyId: string;
        userAnswers: number[];
        score: number;
        timeSpent: number;
        completed: boolean;
        correctAnswers: number;
        totalQuestions: number;
        difficulty: Difficulty;
        bonusPoints: number;
        createdAt: Date;
        completedAt?: Date;
    }

    type Difficulty = 'easy' | 'medium' | 'hard';

    // Структура истории
    interface Story {
        id: string;
        title: string;
        description: string;
        difficulty: Difficulty;
        crimeType: CrimeType;
        questions: Question[];
        baseScore: number;
        timeLimit: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }

    interface Question {
        id: string;
        text: string;
        options: string[];
        correctAnswer: number;
        explanation?: string;
        points: number;
        timeBonus: boolean;
    }

    // Достижения
    interface Achievement {
        id: string;
        name: string;
        description: string;
        icon: string;
        type: AchievementType;
        requirement: number;
        unlocked: boolean;
        unlockedAt?: Date;
    }

    type AchievementType =
        | 'games_played'
        | 'perfect_games'
        | 'total_score'
        | 'speed_demon'
        | 'crime_specialist'
        | 'streak_master';

    // Система лидерборда
    interface LeaderboardEntry {
        userId: string;
        username: string;
        firstName: string;
        totalScore: number;
        gamesPlayed: number;
        rank: UserRank;
        averageScore: number;
        position: number;
    }

    // API ответы
    interface ApiResponse<T = any> {
        success: boolean;
        message?: string;
        data?: T;
        error?: string;
    }

    interface GameStartResponse extends ApiResponse {
        data: {
            gameId: string;
            story: Story;
            timeLimit: number;
        };
    }

    interface GameSubmitResponse extends ApiResponse {
        data: {
            score: number;
            correctAnswers: number;
            totalQuestions: number;
            bonusPoints: number;
            newRank?: UserRank;
            achievements?: Achievement[];
            rankUp?: boolean;
        };
    }

    // Статистика
    interface UserStats {
        totalGames: number;
        totalScore: number;
        averageScore: number;
        accuracyRate: number;
        averageTime: number;
        bestStreak: number;
        currentStreak: number;
        favoriteSpecialization: CrimeType;
        recentGames: Game[];
    }

    // Конфигурация очков
    interface ScoreConfig {
        basePoints: number;
        speedBonusMax: number;
        difficultyMultiplier: {
            easy: number;
            medium: number;
            hard: number;
        };
        perfectGameBonus: number;
    }

    // События WebApp Telegram
    interface TelegramWebApp {
        initData: string;
        initDataUnsafe: {
            user?: {
                id: number;
                first_name: string;
                last_name?: string;
                username?: string;
                language_code?: string;
                is_premium?: boolean;
            };
            auth_date: number;
            hash: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
            bg_color?: string;
            text_color?: string;
            hint_color?: string;
            link_color?: string;
            button_color?: string;
            button_text_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        showPopup: (params: {
            title?: string;
            message: string;
            buttons?: Array<{
                id?: string;
                type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
                text: string;
            }>;
        }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        showScanQrPopup: (params: {
            text?: string;
        }, callback?: (text: string) => void) => void;
        closeScanQrPopup: () => void;
        readTextFromClipboard: (callback?: (text: string) => void) => void;
        requestWriteAccess: (callback?: (granted: boolean) => void) => void;
        requestContact: (callback?: (granted: boolean) => void) => void;
        requestLocation: (callback?: (granted: boolean) => void) => void;
        shareToStory: (media_url: string, params?: {
            text?: string;
            widget_link?: {
                url: string;
                name?: string;
            };
        }) => void;
        HapticFeedback: {
            impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
            notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
            selectionChanged: () => void;
        };
        BackButton: {
            isVisible: boolean;
            onClick: (callback: () => void) => void;
            offClick: (callback: () => void) => void;
            show: () => void;
            hide: () => void;
        };
        MainButton: {
            text: string;
            color: string;
            textColor: string;
            isVisible: boolean;
            isActive: boolean;
            isProgressVisible: boolean;
            setText: (text: string) => void;
            onClick: (callback: () => void) => void;
            offClick: (callback: () => void) => void;
            show: () => void;
            hide: () => void;
            enable: () => void;
            disable: () => void;
            showProgress: (leaveActive?: boolean) => void;
            hideProgress: () => void;
            setParams: (params: {
                text?: string;
                color?: string;
                text_color?: string;
                is_active?: boolean;
                is_visible?: boolean;
            }) => void;
        };
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
    }

    // События клиентской части
    interface GameEvents {
        onGameStart: (callback: (gameData: GameStartResponse['data']) => void) => void;
        onQuestionAnswer: (callback: (answerData: { questionId: string; answer: number; timeSpent: number }) => void) => void;
        onGameComplete: (callback: (result: GameSubmitResponse['data']) => void) => void;
        onRankUp: (callback: (newRank: UserRank) => void) => void;
        onAchievementUnlock: (callback: (achievement: Achievement) => void) => void;
    }

    // Расширение глобального объекта window
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
        CriminalBluff?: {
            game: GameEvents;
            user: User;
            config: ScoreConfig;
        };
    }
}

// Экспорт в глобальную область
export { };

declare global {
    interface Window extends CriminalBluff.Window { }
    var Telegram: { WebApp: CriminalBluff.TelegramWebApp } | undefined;
} 