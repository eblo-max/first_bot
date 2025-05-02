const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: false
    },
    firstName: {
        type: String,
        required: false
    },
    lastName: {
        type: String,
        required: false
    },
    stats: {
        totalGames: {
            type: Number,
            default: 0
        },
        correctAnswers: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        },
        maxStreak: {
            type: Number,
            default: 0
        }
    },
    achievements: {
        type: [String],
        default: []
    },
    lastPlayed: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Создаем индекс для быстрого поиска по telegramId
userSchema.index({ telegramId: 1 });

module.exports = mongoose.model('User', userSchema); 