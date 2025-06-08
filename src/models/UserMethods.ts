/**
 * Методы для типизированной модели User
 */

import { IUser, IGameResult, IExperienceData, IStats, IAchievement } from './User';

// Тип для редкости достижений
type AchievementRarity = 'ОБЫЧНОЕ' | 'РЕДКОЕ' | 'ЭПИЧЕСКОЕ' | 'ЛЕГЕНДАРНОЕ';

/**
 * Виртуальное свойство для расчета точности ответов
 */
export function calculatedAccuracy(this: IUser): number {
    if (this.stats.totalQuestions === 0) return 0;
    return Math.round((this.stats.solvedCases / this.stats.totalQuestions) * 100);
}

/**
 * Обновление статистики после игры
 */
export async function updateStatsAfterGame(this: IUser, gameResult: IGameResult): Promise<IUser> {
    const prevStats = { ...this.stats };

    // Основная статистика
    this.stats.investigations += 1;
    this.stats.solvedCases += gameResult.correctAnswers;
    this.stats.totalQuestions += gameResult.totalQuestions;
    this.stats.totalScore += gameResult.totalScore;

    // Система опыта с множителями
    const experienceData = this.calculateAdvancedExperience(gameResult);
    this.stats.experience += experienceData.finalExperience;

    // Пересчет уровня
    this.stats.level = this.calculateLevelFromExperience(this.stats.experience);

    // Обновление счетчиков игр
    this.updateGameCounters();

    // Статистика по сложности
    const difficulty = gameResult.difficulty || 'MEDIUM';
    if (difficulty === 'EASY') this.stats.easyGames += 1;
    else if (difficulty === 'MEDIUM') this.stats.mediumGames += 1;
    else if (difficulty === 'HARD') this.stats.hardGames += 1;
    else if (difficulty === 'EXPERT') this.stats.expertGames += 1;

    // Мастерство по типу преступления
    const crimeType = gameResult.crimeType || 'murder';
    if (this.stats.crimeTypeMastery[crimeType]) {
        const typeXP = Math.round(experienceData.finalExperience * 0.3);
        this.stats.crimeTypeMastery[crimeType].experience += typeXP;
        const masteryLevel = Math.min(Math.floor(this.stats.crimeTypeMastery[crimeType].experience / 500) + 1, 10);
        this.stats.crimeTypeMastery[crimeType].level = masteryLevel;
    }

    // Идеальные игры и серии
    const isPerfectGame = gameResult.correctAnswers === gameResult.totalQuestions;
    if (isPerfectGame) {
        this.stats.perfectGames += 1;
        this.stats.winStreak += 1;
        if (this.stats.winStreak > this.stats.maxWinStreak) {
            this.stats.maxWinStreak = this.stats.winStreak;
        }
    } else {
        this.stats.winStreak = 0;
    }

    // Обновление времени
    if (gameResult.timeSpent) {
        if (this.stats.averageTime === 0) {
            this.stats.averageTime = gameResult.timeSpent;
        } else {
            this.stats.averageTime = Math.round(
                (this.stats.averageTime * (this.stats.investigations - 1) + gameResult.timeSpent) / this.stats.investigations
            );
        }

        if (this.stats.fastestGame === 0 || gameResult.timeSpent < this.stats.fastestGame) {
            this.stats.fastestGame = gameResult.timeSpent;
        }
    }

    // Ежедневная активность
    this.updateDailyStreak();

    // Пересчет точности
    this.stats.accuracy = this.calculatedAccuracy;

    // Обновление репутации
    this.updateReputation(gameResult, prevStats);

    // Обновление ранга
    this.updateRank();

    // Добавление в историю
    this.gameHistory.push({
        gameId: gameResult.gameId || `game_${Date.now()}`,
        date: new Date(),
        score: gameResult.totalScore,
        experience: experienceData.finalExperience,
        experienceBreakdown: experienceData,
        correctAnswers: gameResult.correctAnswers,
        totalQuestions: gameResult.totalQuestions,
        timeSpent: gameResult.timeSpent || 0,
        difficulty: difficulty,
        crimeType: crimeType,
        perfectGame: isPerfectGame,
        reputationGained: gameResult.reputationGained || 0
    });

    // Проверка достижений
    this.checkAchievements();

    this.lastVisit = new Date();
    this.stats.lastGameTime = new Date();

    return await this.save();
}

/**
 * Расчет опыта с множителями
 */
export function calculateAdvancedExperience(this: IUser, gameResult: IGameResult): IExperienceData {
    let baseExperience = gameResult.totalScore || 0;
    let multiplier = 1.0;
    let bonusReasons: string[] = [];

    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // Бонус за идеальную игру
    if (gameResult.correctAnswers === gameResult.totalQuestions) {
        multiplier *= 1.5;
        bonusReasons.push('Идеальная игра: +50%');
    }

    // Бонус за скорость
    const timeSpent = gameResult.timeSpent || 0;
    const avgTime = gameResult.averageTime || (timeSpent > 0 ? timeSpent / gameResult.totalQuestions : 0);
    if (avgTime > 0 && avgTime < 30000) {
        multiplier *= 1.3;
        bonusReasons.push('Быстрая реакция: +30%');
    }

    // Бонус за сложность
    if (gameResult.difficulty === 'HARD') {
        multiplier *= 1.4;
        bonusReasons.push('Мастер сложности: +40%');
    } else if (gameResult.difficulty === 'EXPERT') {
        multiplier *= 1.6;
        bonusReasons.push('Эксперт уровень: +60%');
    }

    // Бонус за серию побед
    if (this.stats.winStreak >= 3) {
        const streakMultiplier = Math.min(1 + (this.stats.winStreak * 0.1), 2.0);
        multiplier *= streakMultiplier;
        bonusReasons.push(`Серия побед x${this.stats.winStreak}: +${Math.round((streakMultiplier - 1) * 100)}%`);
    }

    // Сезонные бонусы
    if (isWeekend) {
        multiplier *= 1.1;
        bonusReasons.push('Выходные: +10%');
    }

    // Бонус за первую игру дня
    const today = now.toDateString();
    const lastPlayDate = this.stats.lastActiveDate ? new Date(this.stats.lastActiveDate).toDateString() : null;
    if (lastPlayDate !== today) {
        multiplier *= 1.25;
        bonusReasons.push('Первая игра дня: +25%');
    }

    // Штрафы за чрезмерную игру
    if (this.stats.gamesThisHour > 3) {
        multiplier *= 0.8;
        bonusReasons.push('Слишком много игр в час: -20%');
    }

    if (this.stats.gamesToday > 10) {
        multiplier *= 0.9;
        bonusReasons.push('Слишком много игр за день: -10%');
    }

    // Финальный расчет
    const finalExperience = Math.round(baseExperience * multiplier);
    const bonusExperience = finalExperience - baseExperience;

    return {
        baseExperience,
        multiplier,
        bonusExperience,
        finalExperience,
        bonusReasons
    };
}

/**
 * Расчет уровня на основе опыта
 */
export function calculateLevelFromExperience(this: IUser, experience: number): number {
    const levelThresholds = [
        500, 1200, 2500, 4500, 7500,           // 1-5
        12000, 18000, 26000, 36000, 50000,     // 6-10
        70000, 95000, 130000, 175000, 235000,  // 11-15
        315000, 420000, 560000, 750000, 1000000 // 16-20
    ];

    for (let i = 0; i < levelThresholds.length; i++) {
        if (experience < levelThresholds[i]) {
            return i + 1;
        }
    }
    return levelThresholds.length; // Максимальный уровень
}

/**
 * Обновление счетчиков игр
 */
export function updateGameCounters(this: IUser): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Сброс счетчиков если прошло время
    if (!this.stats.lastGameTime || this.stats.lastGameTime < oneHourAgo) {
        this.stats.gamesThisHour = 0;
    }

    if (!this.stats.lastGameTime || this.stats.lastGameTime < startOfDay) {
        this.stats.gamesToday = 0;
    }

    // Увеличение счетчиков
    this.stats.gamesThisHour += 1;
    this.stats.gamesToday += 1;
}

/**
 * Система расчета репутации
 */
export function updateReputation(this: IUser, gameResult: IGameResult, prevStats: IStats): void {
    const weights = {
        accuracy: 0.35,
        speed: 0.25,
        consistency: 0.25,
        difficulty: 0.15
    };

    // Расчет компонентов репутации

    // 1. Точность (0-100)
    const accuracyScore = Math.min(100, this.stats.accuracy * 1.2);
    this.reputation.accuracy = Math.round(accuracyScore);

    // 2. Скорость (на основе среднего времени и текущего времени)
    let speedScore = 0;
    if (gameResult.timeSpent && this.stats.averageTime > 0) {
        const speedRatio = this.stats.averageTime / gameResult.timeSpent;
        speedScore = Math.min(100, speedRatio * 50);
    }
    this.reputation.speed = Math.round(
        (this.reputation.speed * 0.8) + (speedScore * 0.2)
    );

    // 3. Постоянство (на основе серий и регулярности игр)
    const consistencyBase = Math.min(this.stats.winStreak * 8, 60);
    const streakBonus = Math.min(this.stats.dailyStreakCurrent * 3, 30);
    const gamesPlayed = Math.min(this.stats.investigations * 0.5, 10);
    const consistencyScore = consistencyBase + streakBonus + gamesPlayed;
    this.reputation.consistency = Math.round(Math.min(100, consistencyScore));

    // 4. Сложность (на основе типов решаемых дел)
    const totalGames = this.stats.investigations;
    if (totalGames > 0) {
        const difficultyScore = (
            (this.stats.easyGames * 10) +
            (this.stats.mediumGames * 25) +
            (this.stats.hardGames * 50) +
            (this.stats.expertGames * 100)
        ) / totalGames;
        this.reputation.difficulty = Math.round(Math.min(100, difficultyScore));
    }

    // Общий расчет репутации
    const totalReputation = (
        this.reputation.accuracy * weights.accuracy +
        this.reputation.speed * weights.speed +
        this.reputation.consistency * weights.consistency +
        this.reputation.difficulty * weights.difficulty
    );

    this.reputation.level = Math.round(Math.max(0, Math.min(100, totalReputation)));

    // Определение категории репутации
    if (this.reputation.level >= 90) this.reputation.category = 'ЛЕГЕНДАРНЫЙ';
    else if (this.reputation.level >= 75) this.reputation.category = 'ЭЛИТНЫЙ';
    else if (this.reputation.level >= 60) this.reputation.category = 'УВАЖАЕМЫЙ';
    else if (this.reputation.level >= 30) this.reputation.category = 'ОБЫЧНЫЙ';
    else this.reputation.category = 'КРИТИКУЕМЫЙ';

    // Сохраняем полученную репутацию для истории
    gameResult.reputationGained = Math.round(totalReputation - (this.reputation?.level || 50));
}

/**
 * Обновление ежедневной активности
 */
export function updateDailyStreak(this: IUser): void {
    const today = new Date();
    const lastActive = new Date(this.stats.lastActiveDate);

    // Проверяем, играл ли пользователь вчера
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
        // Играет сегодня - серия продолжается
        return;
    } else if (daysDiff === 1) {
        // Играл вчера - увеличиваем серию
        this.stats.dailyStreakCurrent += 1;
        if (this.stats.dailyStreakCurrent > this.stats.dailyStreakBest) {
            this.stats.dailyStreakBest = this.stats.dailyStreakCurrent;
        }
    } else {
        // Пропустил дни - обнуляем серию
        this.stats.dailyStreakCurrent = 1;
    }

    this.stats.lastActiveDate = today;
}

/**
 * Обновление ранга пользователя
 */
export function updateRank(this: IUser): void {
    const score = this.stats.totalScore;
    const prevRank = this.rank;

    if (score >= 20000) {
        this.rank = 'ШЕФ ПОЛИЦИИ';
    } else if (score >= 10000) {
        this.rank = 'ГЛАВНЫЙ ИНСПЕКТОР';
    } else if (score >= 4500) {
        this.rank = 'КОМИССАР';
    } else if (score >= 2000) {
        this.rank = 'ИНСПЕКТОР';
    } else if (score >= 900) {
        this.rank = 'СТАРШИЙ ДЕТЕКТИВ';
    } else if (score >= 400) {
        this.rank = 'ДЕТЕКТИВ';
    } else if (score >= 150) {
        this.rank = 'СЛЕДОВАТЕЛЬ';
    } else {
        this.rank = 'СТАЖЕР';
    }

    // Расчет прогресса до следующего ранга
    const rankThresholds = [0, 150, 400, 900, 2000, 4500, 10000, 20000, Infinity];
    const currentRankIndex = rankThresholds.findIndex(threshold => score < threshold) - 1;

    if (currentRankIndex >= 0 && currentRankIndex < rankThresholds.length - 2) {
        const currentThreshold = rankThresholds[currentRankIndex];
        const nextThreshold = rankThresholds[currentRankIndex + 1];
        this.rewards.nextRankProgress = Math.round(
            ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100
        );
    } else {
        this.rewards.nextRankProgress = 100;
    }

    // Если ранг повысился, добавляем достижение
    if (prevRank !== this.rank) {
        this.achievements.push({
            id: `rank_${this.rank.toLowerCase()}`,
            name: `Звание: ${this.getRankDisplayName()}`,
            description: `Получено звание ${this.getRankDisplayName()}`,
            category: 'ПРОГРЕСС',
            rarity: this.getRankRarity(),
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }
}

/**
 * Получение отображаемого названия ранга
 */
export function getRankDisplayName(this: IUser): string {
    const rankNames: Record<string, string> = {
        'СТАЖЕР': 'Стажер',
        'СЛЕДОВАТЕЛЬ': 'Следователь',
        'ДЕТЕКТИВ': 'Детектив',
        'СТАРШИЙ ДЕТЕКТИВ': 'Старший детектив',
        'ИНСПЕКТОР': 'Инспектор',
        'КОМИССАР': 'Комиссар',
        'ГЛАВНЫЙ ИНСПЕКТОР': 'Главный инспектор',
        'ШЕФ ПОЛИЦИИ': 'Шеф полиции'
    };
    return rankNames[this.rank] || this.rank;
}

/**
 * Получение редкости ранга
 */
export function getRankRarity(this: IUser): AchievementRarity {
    const rankRarities: Record<string, AchievementRarity> = {
        'СТАЖЕР': 'ОБЫЧНОЕ',
        'СЛЕДОВАТЕЛЬ': 'ОБЫЧНОЕ',
        'ДЕТЕКТИВ': 'ОБЫЧНОЕ',
        'СТАРШИЙ ДЕТЕКТИВ': 'РЕДКОЕ',
        'ИНСПЕКТОР': 'РЕДКОЕ',
        'КОМИССАР': 'ЭПИЧЕСКОЕ',
        'ГЛАВНЫЙ ИНСПЕКТОР': 'ЭПИЧЕСКОЕ',
        'ШЕФ ПОЛИЦИИ': 'ЛЕГЕНДАРНОЕ'
    };
    return rankRarities[this.rank] || 'ОБЫЧНОЕ';
}

/**
 * Проверка наличия достижения
 */
export function hasAchievement(this: IUser, achievementId: string): boolean {
    return this.achievements.some(achievement => achievement.id === achievementId);
}

/**
 * Продвинутая система достижений
 */
export function checkAchievements(this: IUser): IAchievement[] {
    const newAchievements: IAchievement[] = [];

    console.log(`🔍 Проверяю достижения для пользователя ${this.telegramId}:`);
    console.log(`📊 Статистика: расследований=${this.stats.investigations}, очков=${this.stats.totalScore}, точность=${this.stats.accuracy}%, серия=${this.stats.maxWinStreak}`);
    console.log(`🏆 Текущие достижения: ${this.achievements.length} шт., ID: [${this.achievements.map(a => a.id).join(', ')}]`);

    // === ДОСТИЖЕНИЯ ПРОГРЕССА ===

    // Первое дело
    if (this.stats.investigations >= 1 && !this.hasAchievement('first_investigation')) {
        newAchievements.push({
            id: 'first_investigation',
            name: 'Первое расследование',
            description: 'Провели первое расследование',
            category: 'ПРОГРЕСС',
            rarity: 'ОБЫЧНОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Искатель истины - базовое достижение для всех
    if (this.stats.investigations >= 1 && !this.hasAchievement('truth_seeker')) {
        newAchievements.push({
            id: 'truth_seeker',
            name: 'Искатель истины',
            description: 'Начали путь детектива',
            category: 'ПРОГРЕСС',
            rarity: 'ОБЫЧНОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Серия расследований
    const investigationMilestones = [
        { count: 5, id: 'rookie_detective', name: 'Детектив-новичок', rarity: 'ОБЫЧНОЕ' as AchievementRarity },
        { count: 25, id: 'senior_detective', name: 'Старший детектив', rarity: 'ОБЫЧНОЕ' as AchievementRarity },
        { count: 50, id: 'veteran_investigator', name: 'Ветеран следствия', rarity: 'РЕДКОЕ' as AchievementRarity },
        { count: 100, id: 'master_detective', name: 'Мастер-детектив', rarity: 'РЕДКОЕ' as AchievementRarity },
        { count: 250, id: 'detective_legend', name: 'Легенда криминалистики', rarity: 'ЭПИЧЕСКОЕ' as AchievementRarity },
        { count: 500, id: 'detective_immortal', name: 'Бессмертный сыщик', rarity: 'ЛЕГЕНДАРНОЕ' as AchievementRarity }
    ];

    investigationMilestones.forEach(milestone => {
        if (this.stats.investigations >= milestone.count && !this.hasAchievement(milestone.id)) {
            newAchievements.push({
                id: milestone.id,
                name: milestone.name,
                description: `Проведено ${milestone.count} расследований`,
                category: 'ПРОГРЕСС',
                rarity: milestone.rarity,
                unlockedAt: new Date(),
                progress: { current: milestone.count, target: milestone.count }
            });
        }
    });

    // === ДОСТИЖЕНИЯ МАСТЕРСТВА ===

    // Точность - базовые достижения
    if (this.stats.accuracy >= 60 && this.stats.investigations >= 10 && !this.hasAchievement('sharp_eye')) {
        newAchievements.push({
            id: 'sharp_eye',
            name: 'Острый глаз',
            description: 'Точность 60%+ в 10+ играх',
            category: 'МАСТЕРСТВО',
            rarity: 'ОБЫЧНОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    if (this.stats.accuracy >= 75 && this.stats.investigations >= 20 && !this.hasAchievement('keen_observer')) {
        newAchievements.push({
            id: 'keen_observer',
            name: 'Внимательный наблюдатель',
            description: 'Точность 75%+ в 20+ играх',
            category: 'МАСТЕРСТВО',
            rarity: 'РЕДКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    if (this.stats.accuracy >= 90 && this.stats.investigations >= 50 && !this.hasAchievement('master_analyst')) {
        newAchievements.push({
            id: 'master_analyst',
            name: 'Мастер-аналитик',
            description: 'Точность 90%+ в 50+ играх',
            category: 'МАСТЕРСТВО',
            rarity: 'ЭПИЧЕСКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    if (this.stats.accuracy >= 95 && this.stats.investigations >= 20 && !this.hasAchievement('perfectionist')) {
        newAchievements.push({
            id: 'perfectionist',
            name: 'Перфекционист',
            description: 'Точность 95%+ в 20+ играх',
            category: 'МАСТЕРСТВО',
            rarity: 'ЛЕГЕНДАРНОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Идеальные игры
    const perfectGameMilestones = [
        { count: 1, id: 'perfect_start', name: 'Идеальный старт', rarity: 'ОБЫЧНОЕ' as AchievementRarity },
        { count: 5, id: 'perfect_five', name: 'Пять идеальных', rarity: 'РЕДКОЕ' as AchievementRarity },
        { count: 15, id: 'perfect_fifteen', name: 'Безошибочный', rarity: 'ЭПИЧЕСКОЕ' as AchievementRarity },
        { count: 50, id: 'perfect_fifty', name: 'Гений дедукции', rarity: 'ЛЕГЕНДАРНОЕ' as AchievementRarity }
    ];

    perfectGameMilestones.forEach(milestone => {
        if (this.stats.perfectGames >= milestone.count && !this.hasAchievement(milestone.id)) {
            newAchievements.push({
                id: milestone.id,
                name: milestone.name,
                description: `${milestone.count} идеальных игр`,
                category: 'МАСТЕРСТВО',
                rarity: milestone.rarity,
                unlockedAt: new Date(),
                progress: { current: milestone.count, target: milestone.count }
            });
        }
    });

    // === ДОСТИЖЕНИЯ СКОРОСТИ ===

    // Быстрое решение
    if (this.stats.fastestGame > 0 && this.stats.fastestGame <= 30000 && !this.hasAchievement('speed_demon')) {
        newAchievements.push({
            id: 'speed_demon',
            name: 'Демон скорости',
            description: 'Решили дело за 30 секунд',
            category: 'СКОРОСТЬ',
            rarity: 'РЕДКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Молниеносное решение
    if (this.stats.fastestGame > 0 && this.stats.fastestGame <= 15000 && !this.hasAchievement('lightning_fast')) {
        newAchievements.push({
            id: 'lightning_fast',
            name: 'Молниеносный',
            description: 'Решили дело за 15 секунд',
            category: 'СКОРОСТЬ',
            rarity: 'ЭПИЧЕСКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // === ДОСТИЖЕНИЯ СЕРИЙ ===

    // Серии идеальных игр
    const streakMilestones = [
        { count: 3, id: 'triple_success', name: 'Тройной успех', rarity: 'ОБЫЧНОЕ' as AchievementRarity },
        { count: 5, id: 'five_streak', name: 'Пятикратный успех', rarity: 'РЕДКОЕ' as AchievementRarity },
        { count: 10, id: 'ten_streak', name: 'Неостановимый', rarity: 'ЭПИЧЕСКОЕ' as AchievementRarity },
        { count: 20, id: 'twenty_streak', name: 'Машина правосудия', rarity: 'ЛЕГЕНДАРНОЕ' as AchievementRarity }
    ];

    streakMilestones.forEach(milestone => {
        if (this.stats.maxWinStreak >= milestone.count && !this.hasAchievement(milestone.id)) {
            newAchievements.push({
                id: milestone.id,
                name: milestone.name,
                description: `Серия из ${milestone.count} идеальных игр`,
                category: 'СЕРИИ',
                rarity: milestone.rarity,
                unlockedAt: new Date(),
                progress: { current: milestone.count, target: milestone.count }
            });
        }
    });

    // Ежедневные серии
    const dailyStreakMilestones = [
        { count: 3, id: 'daily_3', name: 'Постоянство', rarity: 'ОБЫЧНОЕ' as AchievementRarity },
        { count: 7, id: 'daily_7', name: 'Еженедельник', rarity: 'РЕДКОЕ' as AchievementRarity },
        { count: 30, id: 'daily_30', name: 'Месячная преданность', rarity: 'ЭПИЧЕСКОЕ' as AchievementRarity },
        { count: 100, id: 'daily_100', name: 'Одержимый работой', rarity: 'ЛЕГЕНДАРНОЕ' as AchievementRarity }
    ];

    dailyStreakMilestones.forEach(milestone => {
        if (this.stats.dailyStreakBest >= milestone.count && !this.hasAchievement(milestone.id)) {
            newAchievements.push({
                id: milestone.id,
                name: milestone.name,
                description: `${milestone.count} дней подряд`,
                category: 'СЕРИИ',
                rarity: milestone.rarity,
                unlockedAt: new Date(),
                progress: { current: milestone.count, target: milestone.count }
            });
        }
    });

    // === ОСОБЫЕ ДОСТИЖЕНИЯ ===

    // Эксперт по сложности
    if (this.stats.expertGames >= 10 && !this.hasAchievement('expert_specialist')) {
        newAchievements.push({
            id: 'expert_specialist',
            name: 'Специалист экспертного уровня',
            description: 'Решили 10 дел экспертного уровня',
            category: 'ОСОБЫЕ',
            rarity: 'ЭПИЧЕСКОЕ',
            unlockedAt: new Date(),
            progress: { current: 10, target: 10 }
        });
    }

    // Высокая репутация
    if (this.reputation.level >= 90 && !this.hasAchievement('legendary_reputation')) {
        newAchievements.push({
            id: 'legendary_reputation',
            name: 'Легендарная репутация',
            description: 'Достигли 90+ репутации',
            category: 'ОСОБЫЕ',
            rarity: 'ЛЕГЕНДАРНОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Разносторонний детектив
    if (this.stats.easyGames > 0 && this.stats.mediumGames > 0 &&
        this.stats.hardGames > 0 && this.stats.expertGames > 0 &&
        !this.hasAchievement('versatile_detective')) {
        newAchievements.push({
            id: 'versatile_detective',
            name: 'Разносторонний детектив',
            description: 'Решали дела всех уровней сложности',
            category: 'ОСОБЫЕ',
            rarity: 'РЕДКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Мильные достижения по очкам
    const scoreMilestones = [
        { score: 1000, id: 'first_thousand', name: 'Первая тысяча', rarity: 'ОБЫЧНОЕ' as AchievementRarity },
        { score: 5000, id: 'five_thousand', name: 'Пять тысяч очков', rarity: 'РЕДКОЕ' as AchievementRarity },
        { score: 10000, id: 'ten_thousand', name: 'Десять тысяч очков', rarity: 'ЭПИЧЕСКОЕ' as AchievementRarity },
        { score: 25000, id: 'quarter_hundred', name: 'Четверть сотни тысяч', rarity: 'ЛЕГЕНДАРНОЕ' as AchievementRarity }
    ];

    scoreMilestones.forEach(milestone => {
        if (this.stats.totalScore >= milestone.score && !this.hasAchievement(milestone.id)) {
            newAchievements.push({
                id: milestone.id,
                name: milestone.name,
                description: `Набрано ${milestone.score} очков`,
                category: 'ПРОГРЕСС',
                rarity: milestone.rarity,
                unlockedAt: new Date(),
                progress: { current: milestone.score, target: milestone.score }
            });
        }
    });

    // Добавляем новые достижения
    if (newAchievements.length > 0) {
        console.log(`🎉 Добавляю ${newAchievements.length} новых достижений:`, newAchievements.map(a => `${a.id}: ${a.name}`));
        this.achievements.push(...newAchievements);
        console.log(`📊 Общее количество достижений у пользователя: ${this.achievements.length}`);
    } else {
        console.log('ℹ️ Новых достижений не обнаружено');
    }

    return newAchievements;
}

/**
 * Получение статистики репутации
 */
export function getReputationBreakdown(this: IUser): any {
    return {
        level: this.reputation.level,
        category: this.reputation.category,
        components: {
            accuracy: {
                value: this.reputation.accuracy,
                label: 'Точность',
                description: 'Процент правильных ответов'
            },
            speed: {
                value: this.reputation.speed,
                label: 'Скорость',
                description: 'Быстрота решения дел'
            },
            consistency: {
                value: this.reputation.consistency,
                label: 'Постоянство',
                description: 'Регулярность и серии'
            },
            difficulty: {
                value: this.reputation.difficulty,
                label: 'Сложность',
                description: 'Уровень решаемых дел'
            }
        }
    };
}

/**
 * Получение прогресса достижений
 */
export function getAchievementsProgress(this: IUser): any {
    const categories = ['ПРОГРЕСС', 'МАСТЕРСТВО', 'СКОРОСТЬ', 'СЕРИИ', 'ОСОБЫЕ'];
    const rarities = ['ОБЫЧНОЕ', 'РЕДКОЕ', 'ЭПИЧЕСКОЕ', 'ЛЕГЕНДАРНОЕ'];

    const progress: any = {
        total: this.achievements.length,
        byCategory: {},
        byRarity: {},
        recent: this.achievements
            .filter(a => a.unlockedAt)
            .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
            .slice(0, 5)
    };

    categories.forEach(category => {
        progress.byCategory[category] = this.achievements.filter(a => a.category === category).length;
    });

    rarities.forEach(rarity => {
        progress.byRarity[rarity] = this.achievements.filter(a => a.rarity === rarity).length;
    });

    return progress;
} 