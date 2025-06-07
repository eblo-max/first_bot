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
// НОВАЯ СИСТЕМА ДОСТИЖЕНИЙ "КРИМИНАЛЬНЫЙ БЛЕФ" 
// 50 ДОСТИЖЕНИЙ ОСНОВАННЫХ НА РЕАЛЬНОЙ ИГРОВОЙ МЕХАНИКЕ
// =============================================================================

export const ACHIEVEMENTS_CONFIG: Achievement[] = [
    // =========================================================================
    // 🔍 КАТЕГОРИЯ: СЛЕДОВАТЕЛЬ (Базовые достижения для начинающих)
    // =========================================================================
    {
        id: 'first_investigation',
        name: 'Первое расследование',
        description: 'Завершите ваше первое криминальное расследование',
        category: 'investigation',
        icon: '🔍',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'investigations',
            value: 1
        }
    },
    {
        id: 'truth_seeker',
        name: 'Искатель истины',
        description: 'Правильно определите ошибку преступника в первый раз',
        category: 'investigation',
        icon: '🎯',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'correctAnswers',
            value: 1
        }
    },
    {
        id: 'rookie_detective',
        name: 'Детектив-новичок',
        description: 'Проведите 5 расследований',
        category: 'investigation',
        icon: '🕵️',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'investigations',
            value: 5
        }
    },
    {
        id: 'crime_solver',
        name: 'Раскрыватель преступлений',
        description: 'Раскройте 10 криминальных дел',
        category: 'investigation',
        icon: '⚖️',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'solvedCases',
            value: 10
        }
    },
    {
        id: 'experienced_investigator',
        name: 'Опытный следователь',
        description: 'Проведите 25 расследований',
        category: 'investigation',
        icon: '🎖️',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'investigations',
            value: 25
        }
    },
    {
        id: 'senior_detective',
        name: 'Старший детектив',
        description: 'Проведите 50 расследований',
        category: 'investigation',
        icon: '👨‍💼',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'investigations',
            value: 50
        }
    },
    {
        id: 'veteran_investigator',
        name: 'Ветеран следствия',
        description: 'Проведите 100 расследований',
        category: 'investigation',
        icon: '🏅',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'investigations',
            value: 100
        }
    },
    {
        id: 'master_detective',
        name: 'Мастер-детектив',
        description: 'Проведите 250 расследований',
        category: 'investigation',
        icon: '🏆',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'investigations',
            value: 250
        }
    },

    // =========================================================================
    // 🎯 КАТЕГОРИЯ: ТОЧНОСТЬ (Достижения за правильные ответы)
    // =========================================================================
    {
        id: 'sharp_eye',
        name: 'Острый глаз',
        description: 'Достигните точности 60% в 10+ расследованиях',
        category: 'accuracy',
        icon: '👁️',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'accuracy',
            value: 60,
            minGames: 10
        }
    },
    {
        id: 'keen_observer',
        name: 'Внимательный наблюдатель',
        description: 'Достигните точности 75% в 20+ расследованиях',
        category: 'accuracy',
        icon: '🔍',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'accuracy',
            value: 75,
            minGames: 20
        }
    },
    {
        id: 'master_analyst',
        name: 'Мастер анализа',
        description: 'Достигните точности 85% в 50+ расследованиях',
        category: 'accuracy',
        icon: '📊',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'accuracy',
            value: 85,
            minGames: 50
        }
    },
    {
        id: 'sherlock_holmes',
        name: 'Шерлок Холмс',
        description: 'Достигните точности 95% в 100+ расследованиях',
        category: 'accuracy',
        icon: '🎩',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'accuracy',
            value: 95,
            minGames: 100
        }
    },

    // =========================================================================
    // ⚡ КАТЕГОРИЯ: СКОРОСТЬ (Достижения за быструю реакцию)
    // =========================================================================
    {
        id: 'quick_thinker',
        name: 'Быстрый ум',
        description: 'Решите дело за 10 секунд или быстрее',
        category: 'speed',
        icon: '⚡',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'fastestGame',
            value: 10000
        }
    },
    {
        id: 'lightning_detective',
        name: 'Молниеносный детектив',
        description: 'Решите дело за 5 секунд или быстрее',
        category: 'speed',
        icon: '⚡',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'fastestGame',
            value: 5000
        }
    },
    {
        id: 'instant_deduction',
        name: 'Мгновенная дедукция',
        description: 'Решите дело за 2 секунды или быстрее',
        category: 'speed',
        icon: '💨',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'fastestGame',
            value: 2000
        }
    },
    {
        id: 'speed_demon',
        name: 'Демон скорости',
        description: 'Поддерживайте среднее время решения менее 15 секунд в 50+ играх',
        category: 'speed',
        icon: '🏃‍♂️',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'averageTime',
            value: 15000,
            minGames: 50
        }
    },

    // =========================================================================
    // 🔥 КАТЕГОРИЯ: СЕРИИ (Достижения за последовательные успехи)
    // =========================================================================
    {
        id: 'perfect_start',
        name: 'Идеальное начало',
        description: 'Сыграйте одну идеальную игру (5/5 правильных ответов)',
        category: 'streak',
        icon: '🌟',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'perfectGames',
            value: 1
        }
    },
    {
        id: 'winning_streak_3',
        name: 'Тройная серия',
        description: 'Выиграйте 3 идеальные игры подряд',
        category: 'streak',
        icon: '🔥',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'winStreak',
            value: 3
        }
    },
    {
        id: 'winning_streak_5',
        name: 'Горячая серия',
        description: 'Выиграйте 5 идеальных игр подряд',
        category: 'streak',
        icon: '🔥',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'winStreak',
            value: 5
        }
    },
    {
        id: 'winning_streak_10',
        name: 'Неостановимый',
        description: 'Выиграйте 10 идеальных игр подряд',
        category: 'streak',
        icon: '💪',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'winStreak',
            value: 10
        }
    },
    {
        id: 'perfectionist',
        name: 'Перфекционист',
        description: 'Сыграйте 10 идеальных игр',
        category: 'streak',
        icon: '💎',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'perfectGames',
            value: 10
        }
    },
    {
        id: 'flawless_master',
        name: 'Безупречный мастер',
        description: 'Сыграйте 50 идеальных игр',
        category: 'streak',
        icon: '👑',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'perfectGames',
            value: 50
        }
    },

    // =========================================================================
    // 💰 КАТЕГОРИЯ: ОЧКИ (Достижения за набранные очки)
    // =========================================================================
    {
        id: 'first_thousand',
        name: 'Первая тысяча',
        description: 'Наберите 1,000 очков',
        category: 'score',
        icon: '💰',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'totalScore',
            value: 1000
        }
    },
    {
        id: 'five_thousand_points',
        name: 'Пять тысяч очков',
        description: 'Наберите 5,000 очков',
        category: 'score',
        icon: '💰',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'totalScore',
            value: 5000
        }
    },
    {
        id: 'ten_thousand_elite',
        name: 'Элита десяти тысяч',
        description: 'Наберите 10,000 очков',
        category: 'score',
        icon: '💰',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'totalScore',
            value: 10000
        }
    },
    {
        id: 'legendary_scorer',
        name: 'Легендарный счетчик',
        description: 'Наберите 25,000 очков',
        category: 'score',
        icon: '🏆',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'totalScore',
            value: 25000
        }
    },

    // =========================================================================
    // 🏆 КАТЕГОРИЯ: СПЕЦИАЛИЗАЦИЯ (Достижения по типам преступлений)
    // =========================================================================
    {
        id: 'murder_specialist',
        name: 'Специалист по убийствам',
        description: 'Решите 20 дел об убийствах с точностью 80%+',
        category: 'specialization',
        icon: '🔪',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'crimeTypeMastery',
            crimeType: 'murder',
            value: 20,
            accuracy: 80
        }
    },
    {
        id: 'robbery_expert',
        name: 'Эксперт по ограблениям',
        description: 'Решите 20 дел об ограблениях с точностью 80%+',
        category: 'specialization',
        icon: '💰',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'crimeTypeMastery',
            crimeType: 'robbery',
            value: 20,
            accuracy: 80
        }
    },
    {
        id: 'fraud_hunter',
        name: 'Охотник за мошенниками',
        description: 'Решите 20 дел о мошенничестве с точностью 80%+',
        category: 'specialization',
        icon: '💳',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'crimeTypeMastery',
            crimeType: 'fraud',
            value: 20,
            accuracy: 80
        }
    },
    {
        id: 'theft_tracker',
        name: 'Выследитель воров',
        description: 'Решите 20 дел о кражах с точностью 80%+',
        category: 'specialization',
        icon: '🏠',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'crimeTypeMastery',
            crimeType: 'theft',
            value: 20,
            accuracy: 80
        }
    },
    {
        id: 'cyber_investigator',
        name: 'Кибер-следователь',
        description: 'Решите 20 киберпреступлений с точностью 80%+',
        category: 'specialization',
        icon: '💻',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'crimeTypeMastery',
            crimeType: 'cybercrime',
            value: 20,
            accuracy: 80
        }
    },

    // =========================================================================
    // 📈 КАТЕГОРИЯ: СЛОЖНОСТЬ (Достижения за уровни сложности)
    // =========================================================================
    {
        id: 'easy_master',
        name: 'Мастер простых дел',
        description: 'Решите 50 дел легкого уровня',
        category: 'difficulty',
        icon: '🟢',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'easyGames',
            value: 50
        }
    },
    {
        id: 'medium_expert',
        name: 'Эксперт средних дел',
        description: 'Решите 50 дел среднего уровня',
        category: 'difficulty',
        icon: '🟡',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'mediumGames',
            value: 50
        }
    },
    {
        id: 'hard_challenger',
        name: 'Покоритель сложных дел',
        description: 'Решите 25 дел сложного уровня',
        category: 'difficulty',
        icon: '🔴',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'hardGames',
            value: 25
        }
    },
    {
        id: 'expert_legend',
        name: 'Легенда экспертного уровня',
        description: 'Решите 10 дел экспертного уровня',
        category: 'difficulty',
        icon: '💀',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'expertGames',
            value: 10
        }
    },

    // =========================================================================
    // 🌟 КАТЕГОРИЯ: РЕПУТАЦИЯ (Достижения за репутационную систему)
    // =========================================================================
    {
        id: 'rising_reputation',
        name: 'Растущая репутация',
        description: 'Достигните репутации 60+',
        category: 'reputation',
        icon: '📈',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'reputation',
            value: 60
        }
    },
    {
        id: 'respected_detective',
        name: 'Уважаемый детектив',
        description: 'Достигните репутации 75+',
        category: 'reputation',
        icon: '⭐',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'reputation',
            value: 75
        }
    },
    {
        id: 'elite_investigator',
        name: 'Элитный следователь',
        description: 'Достигните репутации 90+',
        category: 'reputation',
        icon: '🌟',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'reputation',
            value: 90
        }
    },
    {
        id: 'legendary_reputation',
        name: 'Легендарная репутация',
        description: 'Достигните максимальной репутации 100',
        category: 'reputation',
        icon: '💫',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'reputation',
            value: 100
        }
    },

    // =========================================================================
    // 📅 КАТЕГОРИЯ: ПОСТОЯНСТВО (Достижения за ежедневную активность)
    // =========================================================================
    {
        id: 'daily_dedication',
        name: 'Ежедневная преданность',
        description: 'Играйте 3 дня подряд',
        category: 'consistency',
        icon: '📅',
        rarity: 'common',
        isUnlocked: false,
        requirement: {
            type: 'dailyStreak',
            value: 3
        }
    },
    {
        id: 'weekly_warrior',
        name: 'Недельный воин',
        description: 'Играйте 7 дней подряд',
        category: 'consistency',
        icon: '📅',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'dailyStreak',
            value: 7
        }
    },
    {
        id: 'monthly_master',
        name: 'Месячный мастер',
        description: 'Играйте 30 дней подряд',
        category: 'consistency',
        icon: '🗓️',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'dailyStreak',
            value: 30
        }
    },
    {
        id: 'eternal_detective',
        name: 'Вечный детектив',
        description: 'Играйте 100 дней подряд',
        category: 'consistency',
        icon: '♾️',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'dailyStreak',
            value: 100
        }
    },

    // =========================================================================
    // 🎖️ КАТЕГОРИЯ: ЭЛИТНЫЕ (Особые комбинированные достижения)
    // =========================================================================
    {
        id: 'triple_threat',
        name: 'Тройная угроза',
        description: 'Достигните 10 уровня мастерства в 3 типах преступлений',
        category: 'elite',
        icon: '🎖️',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'multipleMastery',
            value: 3,
            level: 10
        }
    },
    {
        id: 'master_of_all',
        name: 'Мастер всех ремесел',
        description: 'Достигните 10 уровня мастерства во всех типах преступлений',
        category: 'elite',
        icon: '🏅',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'allMastery',
            value: 0, // Не используется для allMastery
            level: 10
        }
    },
    {
        id: 'perfect_balance',
        name: 'Идеальный баланс',
        description: 'Достигните 90+ репутации во всех 4 компонентах одновременно',
        category: 'elite',
        icon: '⚖️',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'perfectReputation',
            value: 0, // Не используется
            accuracy: 90,
            speed: 90,
            consistency: 90,
            difficulty: 'hard'
        }
    },
    {
        id: 'speed_and_accuracy',
        name: 'Скорость и точность',
        description: 'Достигните 90% точности и среднего времени менее 10 секунд',
        category: 'elite',
        icon: '🎯',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'speedAccuracy',
            value: 0, // Не используется
            accuracy: 90,
            averageTime: 10000,
            minGames: 50
        }
    },

    // =========================================================================
    // 💎 КАТЕГОРИЯ: УНИКАЛЬНЫЕ (Особые достижения за редкие события)
    // =========================================================================
    {
        id: 'first_day_hero',
        name: 'Герой первого дня',
        description: 'Решите 10 дел в первый день игры',
        category: 'unique',
        icon: '🏃‍♂️',
        rarity: 'epic',
        isUnlocked: false,
        requirement: {
            type: 'firstDayGames',
            value: 10
        }
    },
    {
        id: 'comeback_king',
        name: 'Король возвращений',
        description: 'Вернитесь в игру после перерыва в 30+ дней и сыграйте идеально',
        category: 'unique',
        icon: '👑',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'comeback',
            value: 0, // Не используется
            days: 30,
            perfectGame: true
        }
    },
    {
        id: 'midnight_detective',
        name: 'Полночный детектив',
        description: 'Решите дело в период с 00:00 до 02:00',
        category: 'unique',
        icon: '🌙',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'midnightGame',
            value: 0, // Не используется
            startHour: 0,
            endHour: 2
        }
    },
    {
        id: 'weekend_warrior',
        name: 'Воин выходных',
        description: 'Решите 50 дел в выходные дни',
        category: 'unique',
        icon: '🗓️',
        rarity: 'rare',
        isUnlocked: false,
        requirement: {
            type: 'weekendGames',
            value: 50
        }
    },
    {
        id: 'perfect_week',
        name: 'Идеальная неделя',
        description: 'Играйте идеально (5/5) каждый день в течение недели',
        category: 'unique',
        icon: '📅',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'perfectWeek',
            value: 0, // Не используется
            days: 7
        }
    },
    {
        id: 'crime_encyclopedia',
        name: 'Криминальная энциклопедия',
        description: 'Решите по 100 дел каждого типа преступления',
        category: 'unique',
        icon: '📚',
        rarity: 'legendary',
        isUnlocked: false,
        requirement: {
            type: 'encyclopedic',
            value: 100
        }
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
// МАТЕМАТИЧЕСКАЯ СИСТЕМА РАСЧЕТА ПРОГРЕССА ДОСТИЖЕНИЙ
// =============================================================================

/**
 * Расчет прогресса достижения с учетом сложной математики
 */
export function calculateAchievementProgress(
    achievement: Achievement,
    userStats: any
): { current: number; target: number; percentage: number; isCompleted: boolean } {
    const req = achievement.requirement;
    if (!req) {
        return { current: 0, target: 1, percentage: 0, isCompleted: false };
    }

    let current = 0;
    let target = req.value || 1;
    let isCompleted = false;

    switch (req.type) {
        case 'investigations':
            current = userStats.investigations || 0;
            break;

        case 'correctAnswers':
            current = userStats.solvedCases || 0;
            break;

        case 'solvedCases':
            current = userStats.solvedCases || 0;
            break;

        case 'accuracy':
            if ((userStats.investigations || 0) >= (req.minGames || 0)) {
                current = Math.round(userStats.accuracy || 0);
                isCompleted = current >= req.value;
            }
            break;

        case 'fastestGame':
            // Для достижений скорости: меньше = лучше
            const fastestTime = userStats.fastestGame || 0;
            if (fastestTime > 0 && fastestTime <= req.value) {
                current = target;
                isCompleted = true;
            } else {
                current = fastestTime > 0 ? Math.min(req.value, fastestTime) : 0;
            }
            break;

        case 'averageTime':
            // Проверяем минимальное количество игр и среднее время
            if ((userStats.investigations || 0) >= (req.minGames || 0)) {
                const avgTime = userStats.averageTime || 0;
                if (avgTime > 0 && avgTime <= req.value) {
                    current = target;
                    isCompleted = true;
                } else {
                    current = avgTime > 0 ? Math.min(req.value, avgTime) : 0;
                }
            }
            break;

        case 'winStreak':
            current = userStats.maxWinStreak || 0;
            break;

        case 'perfectGames':
            current = userStats.perfectGames || 0;
            break;

        case 'totalScore':
            current = userStats.totalScore || 0;
            break;

        case 'easyGames':
            current = userStats.easyGames || 0;
            break;

        case 'mediumGames':
            current = userStats.mediumGames || 0;
            break;

        case 'hardGames':
            current = userStats.hardGames || 0;
            break;

        case 'expertGames':
            current = userStats.expertGames || 0;
            break;

        case 'reputation':
            current = userStats.reputation?.level || 0;
            break;

        case 'dailyStreak':
            current = userStats.dailyStreakCurrent || 0;
            break;

        case 'crimeTypeMastery':
            if (req.crimeType && userStats.crimeTypeMastery) {
                const mastery = userStats.crimeTypeMastery[req.crimeType];
                if (mastery) {
                    const solved = mastery.solved || 0;
                    const accuracy = mastery.accuracy || 0;

                    if (solved >= req.value && accuracy >= (req.accuracy || 0)) {
                        current = target;
                        isCompleted = true;
                    } else {
                        current = solved;
                    }
                }
            }
            break;

        case 'multipleMastery':
            // Считаем сколько типов преступлений достигли нужного уровня
            if (userStats.crimeTypeMastery && req.level) {
                let masteredTypes = 0;
                Object.values(userStats.crimeTypeMastery).forEach((mastery: any) => {
                    if (mastery.level >= req.level!) {
                        masteredTypes++;
                    }
                });
                current = masteredTypes;
            }
            break;

        case 'allMastery':
            // Проверяем все ли типы достигли нужного уровня
            if (userStats.crimeTypeMastery && req.level) {
                const requiredTypes = ['murder', 'robbery', 'fraud', 'theft', 'cybercrime'];
                let masteredTypes = 0;

                requiredTypes.forEach(type => {
                    const mastery = userStats.crimeTypeMastery[type];
                    if (mastery && mastery.level >= req.level!) {
                        masteredTypes++;
                    }
                });

                current = masteredTypes;
                target = requiredTypes.length;
                isCompleted = masteredTypes === target;
            }
            break;

        case 'perfectReputation':
            // Проверяем все компоненты репутации
            if (userStats.reputation && req.accuracy && req.speed && req.consistency && req.difficulty) {
                const rep = userStats.reputation;
                const checks = [
                    rep.accuracy >= req.accuracy,
                    rep.speed >= req.speed,
                    rep.consistency >= req.consistency,
                    rep.difficulty >= req.difficulty
                ];

                current = checks.filter(Boolean).length;
                target = 4;
                isCompleted = current === target;
            }
            break;

        case 'speedAccuracy':
            // Комбинированное достижение скорости и точности
            if ((userStats.investigations || 0) >= (req.minGames || 0) && req.accuracy && req.averageTime) {
                const accuracyOk = (userStats.accuracy || 0) >= req.accuracy;
                const speedOk = (userStats.averageTime || 0) <= req.averageTime && userStats.averageTime > 0;

                if (accuracyOk && speedOk) {
                    current = target;
                    isCompleted = true;
                } else {
                    current = (accuracyOk ? 0.5 : 0) + (speedOk ? 0.5 : 0);
                }
            }
            break;

        // Для уникальных достижений пока базовая логика
        default:
            current = 0;
            target = 1;
            break;
    }

    // Если не установлено явно, проверяем через базовое сравнение
    if (!isCompleted && req.type !== 'fastestGame' && req.type !== 'averageTime') {
        isCompleted = current >= target;
    }

    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    return {
        current,
        target,
        percentage: Math.round(percentage),
        isCompleted
    };
}

// =============================================================================
// ЭКСПОРТ ВСЕХ ФУНКЦИЙ И КОНСТАНТ
// =============================================================================

export {
    LEVEL_XP_REQUIREMENTS,
    RANKS
}; 