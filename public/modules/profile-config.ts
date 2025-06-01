/**
 * Конфигурация системы профилей Criminal Trust
 * Содержит все настройки уровней, рангов и опыта
 */

import type { LevelSystem, Achievement, ProfileConfig, Rank, CrimeTypeMasteryConfig } from '../types/profile-types.js';

// =============================================================================
// СИСТЕМА УРОВНЕЙ И РАНГОВ
// =============================================================================

const LEVEL_XP_REQUIREMENTS: number[] = [
    // Первые уровни (новички) - медленная прогрессия
    500,     // 1: ~10 игр
    1200,    // 2: ~14 игр  
    2500,    // 3: ~26 игр
    4500,    // 4: ~40 игр
    7500,    // 5: ~60 игр

    // Средние уровни (детективы) - нормальная прогрессия  
    12000,   // 6: ~84 игры
    18000,   // 7: ~120 игр
    26000,   // 8: ~160 игр
    36000,   // 9: ~200 игр
    50000,   // 10: ~250 игр

    // Высокие уровни (эксперты) - замедление
    70000,   // 11: ~320 игр
    95000,   // 12: ~420 игр
    130000,  // 13: ~550 игр
    175000,  // 14: ~700 игр
    235000,  // 15: ~900 игр

    // Мастерские уровни (легенды) - очень медленно
    315000,  // 16: ~1200 игр
    420000,  // 17: ~1600 игр
    560000,  // 18: ~2100 игр
    750000,  // 19: ~2800 игр
    1000000  // 20: ~3700 игр (максимум)
];

const RANKS: Rank[] = [
    // Новички (1-5)
    { name: 'ПОДОЗРЕВАЕМЫЙ', color: '#666666', icon: '🔰' },
    { name: 'СТАЖЕР', color: '#888888', icon: '👮‍♂️' },
    { name: 'ПАТРУЛЬНЫЙ', color: '#999999', icon: '🚔' },
    { name: 'СЕРЖАНТ', color: '#AAAAAA', icon: '⭐' },
    { name: 'ДЕТЕКТИВ', color: '#4169E1', icon: '🕵️' },

    // Средние (6-10) 
    { name: 'СТ.ДЕТЕКТИВ', color: '#1E90FF', icon: '🕵️‍♂️' },
    { name: 'ИНСПЕКТОР', color: '#00BFFF', icon: '👨‍💼' },
    { name: 'СТ.ИНСПЕКТОР', color: '#87CEEB', icon: '👨‍💼' },
    { name: 'ЛЕЙТЕНАНТ', color: '#FFD700', icon: '🎖️' },
    { name: 'КАПИТАН', color: '#FFA500', icon: '👑' },

    // Высокие (11-15)
    { name: 'МАЙОР', color: '#FF6347', icon: '🔥' },
    { name: 'ПОДПОЛКОВНИК', color: '#FF4500', icon: '💫' },
    { name: 'ПОЛКОВНИК', color: '#DC143C', icon: '⚡' },
    { name: 'ГЕНЕРАЛ', color: '#B22222', icon: '💎' },
    { name: 'ШЕФ ПОЛИЦИИ', color: '#8B0000', icon: '👨‍⚖️' },

    // Легендарные (16-20)
    { name: 'КОМИССАР', color: '#800080', icon: '🌟' },
    { name: 'СУП.КОМИССАР', color: '#9400D3', icon: '✨' },
    { name: 'МАСТЕР-ДЕТЕКТИВ', color: '#4B0082', icon: '🏆' },
    { name: 'ГРАНД-МАСТЕР', color: '#191970', icon: '💫' },
    { name: 'ЛЕГЕНДА', color: '#000080', icon: '👑' }
];

// =============================================================================
// ФУНКЦИИ СИСТЕМЫ УРОВНЕЙ
// =============================================================================

export const getRankByLevel = (level: number): Rank => {
    const index = Math.min(Math.max(level - 1, 0), RANKS.length - 1);
    return RANKS[index];
};

export const getMaxXPForLevel = (level: number): number => {
    const index = Math.min(Math.max(level - 1, 0), LEVEL_XP_REQUIREMENTS.length - 1);
    return LEVEL_XP_REQUIREMENTS[index];
};

export const calculateLevel = (totalScore: number): number => {
    let level = 1;
    for (let i = 0; i < LEVEL_XP_REQUIREMENTS.length; i++) {
        if (totalScore >= LEVEL_XP_REQUIREMENTS[i]) {
            level = i + 2; // +1 for array index, +1 for next level
        } else {
            break;
        }
    }
    return Math.min(level, LEVEL_XP_REQUIREMENTS.length + 1);
};

export const calculateXP = (totalScore: number, level: number): number => {
    const currentLevelXP = level > 1 ? LEVEL_XP_REQUIREMENTS[level - 2] : 0;
    return totalScore - currentLevelXP;
};

export const getXPProgress = (totalScore: number, level: number): number => {
    const currentXP = calculateXP(totalScore, level);
    const maxXP = getMaxXPForLevel(level);
    const currentLevelXP = level > 1 ? LEVEL_XP_REQUIREMENTS[level - 2] : 0;
    const nextLevelXP = LEVEL_XP_REQUIREMENTS[level - 1] || LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];

    const xpInCurrentLevel = totalScore - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;

    return Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);
};

// =============================================================================
// МАСТЕРСТВО ТИПОВ ПРЕСТУПЛЕНИЙ
// =============================================================================

export const CRIME_TYPE_MASTERY: Record<string, CrimeTypeMasteryConfig> = {
    murder: { name: 'Убийства', icon: '🔪', maxLevel: 10 },
    robbery: { name: 'Ограбления', icon: '💰', maxLevel: 10 },
    fraud: { name: 'Мошенничество', icon: '💳', maxLevel: 10 },
    theft: { name: 'Кражи', icon: '🏃‍♂️', maxLevel: 10 },
    cybercrime: { name: 'Киберпреступления', icon: '💻', maxLevel: 10 }
};

// =============================================================================
// МНОЖИТЕЛИ ОПЫТА
// =============================================================================

export const EXPERIENCE_MULTIPLIERS = {
    // Базовые множители по типам активности
    perfect_game: 1.5,        // +50% за идеальную игру (5/5)
    speed_bonus: 1.3,         // +30% за быстрые ответы
    difficulty_master: 1.4,   // +40% за сложные дела
    consistency: 1.2,         // +20% за ежедневную игру
    streak_bonus: 1.6,        // +60% за серии побед

    // Достижения
    achievement_unlock: 2.0,  // +100% при разблокировке достижения

    // Сезонные события
    weekend_bonus: 1.1,       // +10% в выходные
    daily_first_game: 1.25,   // +25% за первую игру дня

    // Штрафы за "фарм"
    same_hour_penalty: 0.8,   // -20% за >3 игр в час
    same_day_penalty: 0.9     // -10% за >10 игр в день
};

// =============================================================================
// ОСНОВНЫЕ ДОСТИЖЕНИЯ
// =============================================================================

export const ACHIEVEMENTS_CONFIG: Achievement[] = [
    {
        id: 'first_blood',
        name: 'Первая улика',
        icon: '🔍',
        description: 'Решили первое криминальное дело',
        category: 'Начинающий',
        requirement: { type: 'investigations', value: 1 },
        rarity: 'common',
        sound: 'success-light',
        isUnlocked: false
    },
    {
        id: 'rookie_investigator',
        name: 'Начинающий следователь',
        icon: '🕵️',
        description: 'Решили 10 дел',
        category: 'Начинающий',
        requirement: { type: 'investigations', value: 10 },
        rarity: 'common',
        sound: 'success-medium',
        isUnlocked: false
    },
    {
        id: 'case_closer',
        name: 'Закрыватель дел',
        icon: '📝',
        description: 'Решили 50 дел',
        category: 'Профессионал',
        requirement: { type: 'investigations', value: 50 },
        rarity: 'rare',
        sound: 'success-medium',
        isUnlocked: false
    },
    {
        id: 'crime_solver',
        name: 'Раскрыватель преступлений',
        icon: '⚖️',
        description: 'Решили 100 дел правильно',
        category: 'Профессионал',
        requirement: { type: 'investigations', value: 100 },
        rarity: 'rare',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'detective_veteran',
        name: 'Ветеран детектив',
        icon: '🎖️',
        description: 'Решили 250 дел',
        category: 'Профессионал',
        requirement: { type: 'investigations', value: 250 },
        rarity: 'epic',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'sharp_shooter',
        name: 'Меткий стрелок',
        icon: '🎯',
        description: 'Точность 70% в 50+ делах',
        category: 'Мастерство',
        requirement: { type: 'accuracy', value: 70, minGames: 50 },
        rarity: 'epic',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'eagle_eye',
        name: 'Орлиный глаз',
        icon: '👁️',
        description: 'Точность 80% в 100+ делах',
        category: 'Мастерство',
        requirement: { type: 'accuracy', value: 80, minGames: 100 },
        rarity: 'epic',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'master_detective',
        name: 'Мастер-детектив',
        icon: '🏆',
        description: 'Точность 90% в 200+ делах',
        category: 'Мастерство',
        requirement: { type: 'accuracy', value: 90, minGames: 200 },
        rarity: 'legendary',
        sound: 'success-legendary',
        isUnlocked: false
    },
    {
        id: 'sherlock',
        name: 'Шерлок Холмс',
        icon: '🎩',
        description: 'Точность 95% в 300+ делах',
        category: 'Мастерство',
        requirement: { type: 'accuracy', value: 95, minGames: 300 },
        rarity: 'legendary',
        sound: 'success-legendary',
        isUnlocked: false
    },
    {
        id: 'perfectionist',
        name: 'Перфекционист',
        icon: '💎',
        description: '10 сессий подряд без ошибок',
        category: 'Мастерство',
        requirement: { type: 'winStreak', value: 10 },
        rarity: 'legendary',
        sound: 'success-legendary',
        isUnlocked: false
    },
    {
        id: 'quick_draw',
        name: 'Быстрая реакция',
        icon: '⚡',
        description: '50 ответов за 15 секунд',
        category: 'Скорость',
        requirement: { type: 'fastGame', value: 15, minGames: 50 },
        rarity: 'rare',
        sound: 'success-medium',
        isUnlocked: false
    },
    {
        id: 'speed_demon',
        name: 'Демон скорости',
        icon: '💨',
        description: '100 ответов за 10 секунд',
        category: 'Скорость',
        requirement: { type: 'fastGame', value: 10, minGames: 100 },
        rarity: 'epic',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'hot_streak',
        name: 'Горячая серия',
        icon: '🔥',
        description: '10 правильных ответов подряд',
        category: 'Мастерство',
        requirement: { type: 'winStreak', value: 10 },
        rarity: 'rare',
        sound: 'success-medium',
        isUnlocked: false
    },
    {
        id: 'unstoppable',
        name: 'Неудержимый',
        icon: '💪',
        description: '25 правильных ответов подряд',
        category: 'Мастерство',
        requirement: { type: 'winStreak', value: 25 },
        rarity: 'epic',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'legend_streak',
        name: 'Легендарная серия',
        icon: '👑',
        description: '50 правильных ответов подряд',
        category: 'Мастерство',
        requirement: { type: 'winStreak', value: 50 },
        rarity: 'legendary',
        sound: 'success-legendary',
        isUnlocked: false
    },
    {
        id: 'score_hunter',
        name: 'Охотник за очками',
        icon: '💰',
        description: '100,000 очков набрано',
        category: 'Очки',
        requirement: { type: 'totalScore', value: 100000 },
        rarity: 'epic',
        sound: 'success-heavy',
        isUnlocked: false
    },
    {
        id: 'point_legend',
        name: 'Легенда очков',
        icon: '🏆',
        description: '1,000,000 очков набрано',
        category: 'Очки',
        requirement: { type: 'totalScore', value: 1000000 },
        rarity: 'legendary',
        sound: 'success-legendary',
        isUnlocked: false
    }
];

// =============================================================================
// ОСНОВНАЯ КОНФИГУРАЦИЯ СИСТЕМЫ УРОВНЕЙ
// =============================================================================

export const LEVEL_SYSTEM: LevelSystem = {
    maxXP: LEVEL_XP_REQUIREMENTS,
    getRankByLevel,
    experienceMultipliers: EXPERIENCE_MULTIPLIERS,
    crimeTypeMastery: CRIME_TYPE_MASTERY
};

// =============================================================================
// ПОЛНАЯ КОНФИГУРАЦИЯ ПРОФИЛЯ
// =============================================================================

export const PROFILE_CONFIG: ProfileConfig = {
    levels: LEVEL_SYSTEM,
    achievements: ACHIEVEMENTS_CONFIG,
    ui: {
        theme: {
            primary: '#1a1a1a',
            secondary: '#2d2d2d',
            accent: '#ff4757',
            background: '#000000',
            text: '#ffffff',
            criminalRed: '#ff3838',
            darkBlue: '#1e3a8a'
        },
        animations: {
            duration: {
                short: 200,
                medium: 500,
                long: 1000
            },
            easing: {
                standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                dramatic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }
        },
        effects: {
            particles: {
                maxCount: 50,
                lifetime: 3000,
                gravity: 0.5
            },
            glitch: {
                intensity: 10,
                frequency: 100
            },
            scan: {
                speed: 2000,
                opacity: 0.3
            }
        }
    }
};

// =============================================================================
// УТИЛИТЫ ДЛЯ РАСЧЕТА ПРОГРЕССА ДОСТИЖЕНИЙ
// =============================================================================

export const calculateAchievementProgress = (
    achievementId: string,
    userStats: any
): number => {
    const achievement = ACHIEVEMENTS_CONFIG.find(a => a.id === achievementId);
    if (!achievement || achievement.isUnlocked) return 100;

    const { requirement } = achievement;
    let currentValue = 0;

    switch (requirement.type) {
        case 'investigations':
            currentValue = userStats.gamesPlayed || 0;
            break;
        case 'accuracy':
            if ((userStats.gamesPlayed || 0) >= (requirement.minGames || 0)) {
                currentValue = userStats.accuracy || 0;
            }
            break;
        case 'winStreak':
            currentValue = userStats.maxWinStreak || 0;
            break;
        case 'totalScore':
            currentValue = userStats.totalScore || 0;
            break;
        case 'perfectGames':
            currentValue = userStats.perfectGames || 0;
            break;
        case 'fastGame':
            // Логика для быстрых игр требует более сложных данных
            currentValue = 0;
            break;
        default:
            currentValue = 0;
    }

    return Math.min((currentValue / requirement.value) * 100, 100);
};

// =============================================================================
// ЭКСПОРТ ВСЕХ ФУНКЦИЙ И КОНСТАНТ
// =============================================================================

export {
    LEVEL_XP_REQUIREMENTS,
    RANKS
}; 