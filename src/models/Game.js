const mongoose = require('mongoose');

const gameStorySchema = new mongoose.Schema({
    storyId: {
        type: String,
        required: true
    },
    answered: {
        type: Boolean,
        default: false
    },
    correct: {
        type: Boolean,
        default: false
    },
    selectedMistakeId: {
        type: String,
        default: null
    },
    timeSpent: {
        type: Number,
        default: 0
    },
    pointsEarned: {
        type: Number,
        default: 0
    }
});

const gameSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    stories: {
        type: [gameStorySchema],
        default: []
    },
    totalScore: {
        type: Number,
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    finishedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active'
    }
});

// Создаем индексы для частых запросов
gameSchema.index({ userId: 1, status: 1 });
gameSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('Game', gameSchema); 