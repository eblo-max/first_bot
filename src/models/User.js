const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: String,
    firstName: String,
    lastName: String,
    nickname: String,
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastVisit: {
        type: Date,
        default: Date.now
    },

    // 🏆 ДЕТЕКТИВНЫЕ ЗВАНИЯ (основная прогрессия)
    rank: {
        type: String,
        enum: [
            'СТАЖЕР',           // 0-150 очков
            'СЛЕДОВАТЕЛЬ',      // 150-400 очков  
            'ДЕТЕКТИВ',         // 400-900 очков
            'СТАРШИЙ_ДЕТЕКТИВ', // 900-2000 очков
            'ИНСПЕКТОР',        // 2000-4500 очков
            'КОМИССАР',         // 4500-10000 очков
            'ГЛАВНЫЙ_ИНСПЕКТОР',// 10000-20000 очков
            'ШЕФ_ПОЛИЦИИ'      // 20000+ очков
        ],
        default: 'СТАЖЕР'
    },

    // ⭐ РЕПУТАЦИОННАЯ СИСТЕМА
    reputation: {
        // Общий уровень репутации (0-100)
        level: {
            type: Number,
            default: 50,
            min: 0,
            max: 100
        },

        // Категория репутации
        category: {
            type: String,
            enum: ['КРИТИКУЕМЫЙ', 'ОБЫЧНЫЙ', 'УВАЖАЕМЫЙ', 'ЭЛИТНЫЙ', 'ЛЕГЕНДАРНЫЙ'],
            default: 'ОБЫЧНЫЙ'
        },

        // Компоненты репутации
        accuracy: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        speed: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        consistency: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        difficulty: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    // 📊 РАСШИРЕННАЯ СТАТИСТИКА
    stats: {
        // Основные показатели
        investigations: {
            type: Number,
            default: 0
        },
        solvedCases: {
            type: Number,
            default: 0
        },
        totalQuestions: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        },

        // Серии и достижения
        winStreak: {
            type: Number,
            default: 0
        },
        maxWinStreak: {
            type: Number,
            default: 0
        },
        perfectGames: {
            type: Number,
            default: 0
        },

        // Точность и скорость
        accuracy: {
            type: Number,
            default: 0
        },
        averageTime: {
            type: Number,
            default: 0
        },
        fastestGame: {
            type: Number,
            default: 0
        },

        // Активность
        dailyStreakCurrent: {
            type: Number,
            default: 0
        },
        dailyStreakBest: {
            type: Number,
            default: 0
        },
        lastActiveDate: {
            type: Date,
            default: Date.now
        },

        // Сложность дел
        easyGames: { type: Number, default: 0 },
        mediumGames: { type: Number, default: 0 },
        hardGames: { type: Number, default: 0 },
        expertGames: { type: Number, default: 0 }
    },

    // 🎯 СИСТЕМА ДОСТИЖЕНИЙ
    achievements: [{
        id: String,
        name: String,
        description: String,
        category: {
            type: String,
            enum: ['ПРОГРЕСС', 'МАСТЕРСТВО', 'СКОРОСТЬ', 'СЕРИИ', 'ОСОБЫЕ']
        },
        rarity: {
            type: String,
            enum: ['ОБЫЧНОЕ', 'РЕДКОЕ', 'ЭПИЧЕСКОЕ', 'ЛЕГЕНДАРНОЕ']
        },
        unlockedAt: Date,
        progress: {
            current: { type: Number, default: 0 },
            target: { type: Number, default: 1 }
        }
    }],

    // 📈 ИСТОРИЯ ИГР С МЕТАДАННЫМИ
    gameHistory: [{
        gameId: String,
        date: {
            type: Date,
            default: Date.now
        },
        score: Number,
        correctAnswers: Number,
        totalQuestions: Number,
        timeSpent: Number,
        difficulty: {
            type: String,
            enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
            default: 'MEDIUM'
        },
        perfectGame: {
            type: Boolean,
            default: false
        },
        reputationGained: Number
    }],

    // 🎁 НАГРАДЫ И БОНУСЫ
    rewards: {
        experienceBonus: {
            type: Number,
            default: 1.0
        },
        reputationBonus: {
            type: Number,
            default: 1.0
        },
        nextRankProgress: {
            type: Number,
            default: 0
        }
    }
}, { timestamps: true });

// Виртуальное свойство для расчета точности ответов
userSchema.virtual('calculatedAccuracy').get(function () {
    if (this.stats.totalQuestions === 0) return 0;
    return Math.round((this.stats.solvedCases / this.stats.totalQuestions) * 100);
});

// 🎯 УЛУЧШЕННОЕ ОБНОВЛЕНИЕ СТАТИСТИКИ ПОСЛЕ ИГРЫ
userSchema.methods.updateStatsAfterGame = function (gameResult) {
    const prevStats = { ...this.stats };

    // Основная статистика
    this.stats.investigations += 1;
    this.stats.solvedCases += gameResult.correctAnswers;
    this.stats.totalQuestions += gameResult.totalQuestions;
    this.stats.totalScore += gameResult.totalScore;

    // Обновляем статистику по сложности
    const difficulty = gameResult.difficulty || 'MEDIUM';
    if (difficulty === 'EASY') this.stats.easyGames += 1;
    else if (difficulty === 'MEDIUM') this.stats.mediumGames += 1;
    else if (difficulty === 'HARD') this.stats.hardGames += 1;
    else if (difficulty === 'EXPERT') this.stats.expertGames += 1;

    // Подсчет идеальных игр и серий
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

    // Обновление ежедневной активности
    this.updateDailyStreak();

    // Пересчет точности
    this.stats.accuracy = this.calculatedAccuracy;

    // Обновление репутации
    this.updateReputation(gameResult, prevStats);

    // Обновление ранга
    this.updateRank();

    // Добавление в историю с метаданными
    this.gameHistory.push({
        gameId: gameResult.gameId || `game_${Date.now()}`,
        score: gameResult.totalScore,
        correctAnswers: gameResult.correctAnswers,
        totalQuestions: gameResult.totalQuestions,
        timeSpent: gameResult.timeSpent || 0,
        difficulty: difficulty,
        perfectGame: isPerfectGame,
        reputationGained: gameResult.reputationGained || 0
    });

    // Проверка достижений
    this.checkAchievements();

    this.lastVisit = new Date();
    return this.save();
};

// ⭐ СИСТЕМА РАСЧЕТА РЕПУТАЦИИ
userSchema.methods.updateReputation = function (gameResult, prevStats) {
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
    gameResult.reputationGained = Math.round(totalReputation - (prevStats.reputation?.level || 50));
};

// 📅 ОБНОВЛЕНИЕ ЕЖЕДНЕВНОЙ АКТИВНОСТИ
userSchema.methods.updateDailyStreak = function () {
    const today = new Date();
    const lastActive = new Date(this.stats.lastActiveDate);

    // Проверяем, играл ли пользователь вчера
    const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

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
};

// 🏆 ОБНОВЛЕНИЕ РАНГА ПОЛЬЗОВАТЕЛЯ
userSchema.methods.updateRank = function () {
    const score = this.stats.totalScore;
    const prevRank = this.rank;

    if (score >= 20000) {
        this.rank = 'ШЕФ_ПОЛИЦИИ';
    } else if (score >= 10000) {
        this.rank = 'ГЛАВНЫЙ_ИНСПЕКТОР';
    } else if (score >= 4500) {
        this.rank = 'КОМИССАР';
    } else if (score >= 2000) {
        this.rank = 'ИНСПЕКТОР';
    } else if (score >= 900) {
        this.rank = 'СТАРШИЙ_ДЕТЕКТИВ';
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
};

// 🎖️ ПОЛУЧЕНИЕ ОТОБРАЖАЕМОГО НАЗВАНИЯ РАНГА
userSchema.methods.getRankDisplayName = function () {
    const rankNames = {
        'СТАЖЕР': 'Стажер',
        'СЛЕДОВАТЕЛЬ': 'Следователь',
        'ДЕТЕКТИВ': 'Детектив',
        'СТАРШИЙ_ДЕТЕКТИВ': 'Старший детектив',
        'ИНСПЕКТОР': 'Инспектор',
        'КОМИССАР': 'Комиссар',
        'ГЛАВНЫЙ_ИНСПЕКТОР': 'Главный инспектор',
        'ШЕФ_ПОЛИЦИИ': 'Шеф полиции'
    };
    return rankNames[this.rank] || this.rank;
};

// 🌟 ПОЛУЧЕНИЕ РЕДКОСТИ РАНГА
userSchema.methods.getRankRarity = function () {
    const rankRarities = {
        'СТАЖЕР': 'ОБЫЧНОЕ',
        'СЛЕДОВАТЕЛЬ': 'ОБЫЧНОЕ',
        'ДЕТЕКТИВ': 'ОБЫЧНОЕ',
        'СТАРШИЙ_ДЕТЕКТИВ': 'РЕДКОЕ',
        'ИНСПЕКТОР': 'РЕДКОЕ',
        'КОМИССАР': 'ЭПИЧЕСКОЕ',
        'ГЛАВНЫЙ_ИНСПЕКТОР': 'ЭПИЧЕСКОЕ',
        'ШЕФ_ПОЛИЦИИ': 'ЛЕГЕНДАРНОЕ'
    };
    return rankRarities[this.rank] || 'ОБЫЧНОЕ';
};

// 🏅 ПРОДВИНУТАЯ СИСТЕМА ДОСТИЖЕНИЙ
userSchema.methods.checkAchievements = function () {
    const newAchievements = [];

    // === ДОСТИЖЕНИЯ ПРОГРЕССА ===

    // Первое дело
    if (this.stats.investigations >= 1 && !this.hasAchievement('first_case')) {
        newAchievements.push({
            id: 'first_case',
            name: 'Первое дело',
            description: 'Провели первое расследование',
            category: 'ПРОГРЕСС',
            rarity: 'ОБЫЧНОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Серия расследований
    const investigationMilestones = [
        { count: 5, id: 'detective_rookie', name: 'Начинающий детектив', rarity: 'ОБЫЧНОЕ' },
        { count: 25, id: 'detective_experienced', name: 'Опытный детектив', rarity: 'ОБЫЧНОЕ' },
        { count: 50, id: 'detective_veteran', name: 'Ветеран розыска', rarity: 'РЕДКОЕ' },
        { count: 100, id: 'detective_master', name: 'Мастер следствия', rarity: 'РЕДКОЕ' },
        { count: 250, id: 'detective_legend', name: 'Легенда криминалистики', rarity: 'ЭПИЧЕСКОЕ' },
        { count: 500, id: 'detective_immortal', name: 'Бессмертный сыщик', rarity: 'ЛЕГЕНДАРНОЕ' }
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

    // Точность
    if (this.stats.accuracy >= 95 && this.stats.investigations >= 20 && !this.hasAchievement('perfectionist')) {
        newAchievements.push({
            id: 'perfectionist',
            name: 'Перфекционист',
            description: 'Точность 95%+ в 20+ играх',
            category: 'МАСТЕРСТВО',
            rarity: 'ЭПИЧЕСКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    if (this.stats.accuracy >= 90 && this.stats.investigations >= 50 && !this.hasAchievement('master_detective')) {
        newAchievements.push({
            id: 'master_detective',
            name: 'Мастер-детектив',
            description: 'Точность 90%+ в 50+ играх',
            category: 'МАСТЕРСТВО',
            rarity: 'РЕДКОЕ',
            unlockedAt: new Date(),
            progress: { current: 1, target: 1 }
        });
    }

    // Идеальные игры
    const perfectGameMilestones = [
        { count: 5, id: 'perfect_5', name: 'Снайпер', rarity: 'ОБЫЧНОЕ' },
        { count: 15, id: 'perfect_15', name: 'Безошибочный', rarity: 'РЕДКОЕ' },
        { count: 50, id: 'perfect_50', name: 'Гений дедукции', rarity: 'ЭПИЧЕСКОЕ' },
        { count: 100, id: 'perfect_100', name: 'Шерлок Холмс', rarity: 'ЛЕГЕНДАРНОЕ' }
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

    // Быстрое решение (если время игры меньше 30 секунд)
    if (this.stats.fastestGame > 0 && this.stats.fastestGame <= 30 && !this.hasAchievement('speed_demon')) {
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

    // Молниеносное решение (если время игры меньше 15 секунд)
    if (this.stats.fastestGame > 0 && this.stats.fastestGame <= 15 && !this.hasAchievement('lightning_fast')) {
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
        { count: 3, id: 'streak_3', name: 'Удачная серия', rarity: 'ОБЫЧНОЕ' },
        { count: 5, id: 'streak_5', name: 'Горячая рука', rarity: 'РЕДКОЕ' },
        { count: 10, id: 'streak_10', name: 'Неостановимый', rarity: 'ЭПИЧЕСКОЕ' },
        { count: 20, id: 'streak_20', name: 'Машина правосудия', rarity: 'ЛЕГЕНДАРНОЕ' }
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
        { count: 3, id: 'daily_3', name: 'Постоянство', rarity: 'ОБЫЧНОЕ' },
        { count: 7, id: 'daily_7', name: 'Еженедельник', rarity: 'РЕДКОЕ' },
        { count: 30, id: 'daily_30', name: 'Месячная преданность', rarity: 'ЭПИЧЕСКОЕ' },
        { count: 100, id: 'daily_100', name: 'Одержимый работой', rarity: 'ЛЕГЕНДАРНОЕ' }
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

    // Разносторонний детектив (играл во все уровни сложности)
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
        { score: 1000, id: 'score_1k', name: 'Первая тысяча', rarity: 'ОБЫЧНОЕ' },
        { score: 5000, id: 'score_5k', name: 'Пять тысяч очков', rarity: 'РЕДКОЕ' },
        { score: 10000, id: 'score_10k', name: 'Десять тысяч очков', rarity: 'ЭПИЧЕСКОЕ' },
        { score: 25000, id: 'score_25k', name: 'Четверть сотни тысяч', rarity: 'ЛЕГЕНДАРНОЕ' }
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
        this.achievements.push(...newAchievements);
        this.save();
    }

    return newAchievements;
};

// Проверка наличия достижения
userSchema.methods.hasAchievement = function (achievementId) {
    return this.achievements.some(achievement => achievement.id === achievementId);
};

// 📊 ПОЛУЧЕНИЕ СТАТИСТИКИ РЕПУТАЦИИ
userSchema.methods.getReputationBreakdown = function () {
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
};

// 🎯 ПОЛУЧЕНИЕ ПРОГРЕССА ДОСТИЖЕНИЙ
userSchema.methods.getAchievementsProgress = function () {
    const categories = ['ПРОГРЕСС', 'МАСТЕРСТВО', 'СКОРОСТЬ', 'СЕРИИ', 'ОСОБЫЕ'];
    const rarities = ['ОБЫЧНОЕ', 'РЕДКОЕ', 'ЭПИЧЕСКОЕ', 'ЛЕГЕНДАРНОЕ'];

    const progress = {
        total: this.achievements.length,
        byCategory: {},
        byRarity: {},
        recent: this.achievements
            .filter(a => a.unlockedAt)
            .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
            .slice(0, 5)
    };

    categories.forEach(category => {
        progress.byCategory[category] = this.achievements.filter(a => a.category === category).length;
    });

    rarities.forEach(rarity => {
        progress.byRarity[rarity] = this.achievements.filter(a => a.rarity === rarity).length;
    });

    return progress;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 