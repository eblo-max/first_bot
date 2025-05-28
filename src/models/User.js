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
    rank: {
        type: String,
        enum: ['НОВИЧОК', 'ДЕТЕКТИВ', 'ИНСПЕКТОР', 'СЛЕДОВАТЕЛЬ', 'ЭКСПЕРТ', 'КРИМИНАЛИСТ'],
        default: 'НОВИЧОК'
    },
    stats: {
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
        winStreak: {
            type: Number,
            default: 0
        },
        maxWinStreak: {
            type: Number,
            default: 0
        },
        accuracy: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        }
    },
    achievements: [{
        id: String,
        name: String,
        description: String,
        unlockedAt: Date
    }],
    gameHistory: [{
        gameId: String,
        date: {
            type: Date,
            default: Date.now
        },
        score: Number,
        correctAnswers: Number,
        totalQuestions: Number
    }]
}, { timestamps: true });

// Виртуальное свойство для расчета точности ответов
userSchema.virtual('calculatedAccuracy').get(function () {
    if (this.stats.totalQuestions === 0) return 0;
    return Math.round((this.stats.solvedCases / this.stats.totalQuestions) * 100);
});

// Обновление статистики после игры
userSchema.methods.updateStatsAfterGame = function (gameResult) {
    // Увеличиваем количество проведенных расследований (игр)
    this.stats.investigations += 1;

    // Увеличиваем количество правильно решенных дел (правильные ответы)
    this.stats.solvedCases += gameResult.correctAnswers;

    // Увеличиваем общее количество вопросов
    this.stats.totalQuestions += gameResult.totalQuestions;

    // Обновляем счет
    this.stats.totalScore += gameResult.totalScore;

    // Обновляем серию побед (только полностью правильные игры 5/5)
    if (gameResult.correctAnswers === gameResult.totalQuestions) {
        this.stats.winStreak += 1;

        // Обновляем максимальную серию побед
        if (this.stats.winStreak > this.stats.maxWinStreak) {
            this.stats.maxWinStreak = this.stats.winStreak;
        }
    } else {
        this.stats.winStreak = 0;
    }

    // Пересчитываем точность (процент правильных ответов от всех вопросов)
    this.stats.accuracy = this.calculatedAccuracy;

    // Обновляем ранг на основе счета
    this.updateRank();

    // Добавляем игру в историю
    this.gameHistory.push({
        gameId: gameResult.gameId,
        score: gameResult.totalScore,
        correctAnswers: gameResult.correctAnswers,
        totalQuestions: gameResult.totalQuestions
    });

    // Обновляем дату последнего визита
    this.lastVisit = new Date();

    return this.save();
};

// Обновление ранга пользователя
userSchema.methods.updateRank = function () {
    const score = this.stats.totalScore;

    if (score >= 10000) {
        this.rank = 'КРИМИНАЛИСТ';
    } else if (score >= 5000) {
        this.rank = 'ЭКСПЕРТ';
    } else if (score >= 2000) {
        this.rank = 'СЛЕДОВАТЕЛЬ';
    } else if (score >= 800) {
        this.rank = 'ИНСПЕКТОР';
    } else if (score >= 300) {
        this.rank = 'ДЕТЕКТИВ';
    } else {
        this.rank = 'НОВИЧОК';
    }
};

// Проверка и выдача достижений
userSchema.methods.checkAchievements = function () {
    const newAchievements = [];

    // Первое дело - за первую игру
    if (this.stats.investigations >= 1 && !this.hasAchievement('first_case')) {
        newAchievements.push({
            id: 'first_case',
            name: 'Первое дело',
            description: 'Проведено первое расследование',
            unlockedAt: new Date()
        });
    }

    // Новичок - за 5 игр
    if (this.stats.investigations >= 5 && !this.hasAchievement('rookie')) {
        newAchievements.push({
            id: 'rookie',
            name: 'Новичок',
            description: 'Проведено 5 расследований',
            unlockedAt: new Date()
        });
    }

    // Эксперт - за 50 игр
    if (this.stats.investigations >= 50 && !this.hasAchievement('expert')) {
        newAchievements.push({
            id: 'expert',
            name: 'Эксперт',
            description: 'Проведено 50 расследований',
            unlockedAt: new Date()
        });
    }

    // Меткий глаз - за 80% точности при минимум 10 играх
    if (this.stats.accuracy >= 80 && this.stats.investigations >= 10 && !this.hasAchievement('sharp_eye')) {
        newAchievements.push({
            id: 'sharp_eye',
            name: 'Меткий глаз',
            description: 'Достигнута точность 80% минимум в 10 играх',
            unlockedAt: new Date()
        });
    }

    // Серийный детектив - за серию из 5 идеальных игр подряд
    if (this.stats.winStreak >= 5 && !this.hasAchievement('serial_detective')) {
        newAchievements.push({
            id: 'serial_detective',
            name: 'Серийный детектив',
            description: '5 идеальных расследований подряд',
            unlockedAt: new Date()
        });
    }

    // Маньяк - за 1000 баллов
    if (this.stats.totalScore >= 1000 && !this.hasAchievement('maniac')) {
        newAchievements.push({
            id: 'maniac',
            name: 'Маньяк',
            description: 'Набрано 1000 очков',
            unlockedAt: new Date()
        });
    }

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

const User = mongoose.model('User', userSchema);

module.exports = User; 