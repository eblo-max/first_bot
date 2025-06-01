/**
 * Игровые утилиты с поддержкой TypeScript
 */

/**
 * Конфигурация системы очков
 */
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

type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Конфигурация очков по умолчанию
 */
const SCORE_CONFIG: ScoreConfig = {
    basePoints: 100,
    speedBonusMax: 75,
    difficultyMultiplier: {
        easy: 1,
        medium: 1.25,
        hard: 1.5
    },
    perfectGameBonus: 25
};

/**
 * Рассчитывает очки за ответ с учетом скорости и сложности
 */
function calculateScore(
    isCorrect: boolean,
    timeSpent: number,
    timeLimit: number,
    difficulty: Difficulty = 'medium',
    isPerfectGame: boolean = false
): number {
    if (!isCorrect) return 0;

    const difficultyMultiplier = SCORE_CONFIG.difficultyMultiplier[difficulty];
    let score = SCORE_CONFIG.basePoints * difficultyMultiplier;

    // Бонус за скорость (чем быстрее, тем больше бонус)
    const speedFactor = Math.max(0, 1 - (timeSpent / timeLimit));
    const speedBonus = Math.round(SCORE_CONFIG.speedBonusMax * speedFactor);
    score += speedBonus;

    // Бонус за идеальную игру
    if (isPerfectGame) {
        score += SCORE_CONFIG.perfectGameBonus;
    }

    return Math.round(score);
}

/**
 * Рассчитывает очки с детализированной информацией (для контроллера)
 * Адаптер который принимает время ответа вместо лимита времени
 */
function calculatePointsWithDetails(
    isCorrect: boolean,
    responseTime: number,
    difficulty: Difficulty = 'medium'
): { base: number; timeBonus: number; total: number } {
    if (!isCorrect) {
        return { base: 0, timeBonus: 0, total: 0 };
    }

    const difficultyMultiplier = SCORE_CONFIG.difficultyMultiplier[difficulty];
    const basePoints = Math.round(SCORE_CONFIG.basePoints * difficultyMultiplier);

    // Бонус за скорость (убывает с увеличением времени)
    const maxTimeForBonus = 30000; // 30 секунд
    const speedFactor = Math.max(0, 1 - (responseTime / maxTimeForBonus));
    const timeBonus = Math.round(SCORE_CONFIG.speedBonusMax * speedFactor);

    const total = basePoints + timeBonus;

    return { base: basePoints, timeBonus, total };
}

/**
 * Рассчитывает ранг пользователя на основе общего счета
 */
function calculateRank(totalScore: number): string {
    const ranks = [
        { threshold: 0, rank: 'suspect' },
        { threshold: 100, rank: 'trainee' },
        { threshold: 500, rank: 'detective' },
        { threshold: 1500, rank: 'senior_detective' },
        { threshold: 3000, rank: 'investigator' },
        { threshold: 5000, rank: 'chief_investigator' },
        { threshold: 8000, rank: 'inspector' },
        { threshold: 12000, rank: 'chief_inspector' },
        { threshold: 18000, rank: 'superintendent' },
        { threshold: 25000, rank: 'chief_superintendent' },
        { threshold: 35000, rank: 'assistant_commissioner' },
        { threshold: 50000, rank: 'deputy_commissioner' },
        { threshold: 70000, rank: 'commissioner' },
        { threshold: 100000, rank: 'captain' },
        { threshold: 140000, rank: 'major' },
        { threshold: 200000, rank: 'colonel' },
        { threshold: 280000, rank: 'general' },
        { threshold: 400000, rank: 'chief_of_police' },
        { threshold: 600000, rank: 'master_detective' },
        { threshold: 1000000, rank: 'legend' }
    ];

    let currentRank = 'suspect';
    for (const rankData of ranks) {
        if (totalScore >= rankData.threshold) {
            currentRank = rankData.rank;
        } else {
            break;
        }
    }

    return currentRank;
}

/**
 * Возвращает информацию о следующем ранге
 */
function getNextRankInfo(currentScore: number): { nextRank: string; pointsNeeded: number } | null {
    const ranks = [
        { threshold: 100, rank: 'trainee' },
        { threshold: 500, rank: 'detective' },
        { threshold: 1500, rank: 'senior_detective' },
        { threshold: 3000, rank: 'investigator' },
        { threshold: 5000, rank: 'chief_investigator' },
        { threshold: 8000, rank: 'inspector' },
        { threshold: 12000, rank: 'chief_inspector' },
        { threshold: 18000, rank: 'superintendent' },
        { threshold: 25000, rank: 'chief_superintendent' },
        { threshold: 35000, rank: 'assistant_commissioner' },
        { threshold: 50000, rank: 'deputy_commissioner' },
        { threshold: 70000, rank: 'commissioner' },
        { threshold: 100000, rank: 'captain' },
        { threshold: 140000, rank: 'major' },
        { threshold: 200000, rank: 'colonel' },
        { threshold: 280000, rank: 'general' },
        { threshold: 400000, rank: 'chief_of_police' },
        { threshold: 600000, rank: 'master_detective' },
        { threshold: 1000000, rank: 'legend' }
    ];

    for (const rankData of ranks) {
        if (currentScore < rankData.threshold) {
            return {
                nextRank: rankData.rank,
                pointsNeeded: rankData.threshold - currentScore
            };
        }
    }

    return null; // Максимальный ранг достигнут
}

/**
 * Форматирует время в читаемый формат
 */
function formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}м ${remainingSeconds}с`;
    }
    return `${remainingSeconds}с`;
}

/**
 * Генерирует случайное время ответа для имитации человеческого поведения
 */
function generateHumanTime(min: number = 2000, max: number = 8000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Проверяет, является ли время ответа подозрительно быстрым
 */
function isSuspiciousTime(timeSpent: number, questionComplexity: number = 1): boolean {
    const minReasonableTime = Math.max(1000, questionComplexity * 1500);
    return timeSpent < minReasonableTime;
}

/**
 * Генерирует уникальный ID для игровых объектов
 */
function generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Перемешивает массив (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

module.exports = {
    SCORE_CONFIG,
    calculateScore,
    calculateRank,
    getNextRankInfo,
    formatTime,
    generateHumanTime,
    isSuspiciousTime,
    generateId,
    shuffleArray,
    calculatePoints: calculatePointsWithDetails
};

// TypeScript экспорты
export {
    SCORE_CONFIG,
    calculateScore,
    calculateRank,
    getNextRankInfo,
    formatTime,
    generateHumanTime,
    isSuspiciousTime,
    generateId,
    shuffleArray,
    calculatePointsWithDetails
};

export type { Difficulty }; 