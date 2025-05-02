const mongoose = require('mongoose');

const mistakeSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    explanation: {
        type: String,
        required: true
    }
});

const storySchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },
    category: {
        type: String,
        enum: ['robbery', 'theft', 'fraud', 'murder', 'other'],
        required: true
    },
    mistakes: {
        type: [mistakeSchema],
        required: true,
        validate: [
            {
                validator: function (mistakes) {
                    return mistakes.length >= 3; // Минимум 3 варианта ответа
                },
                message: 'Должно быть минимум 3 варианта ответа'
            },
            {
                validator: function (mistakes) {
                    return mistakes.filter(m => m.isCorrect).length === 1; // Только один правильный ответ
                },
                message: 'Должен быть ровно один правильный ответ'
            }
        ]
    },
    timesPlayed: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Создаем индексы для быстрого поиска и фильтрации
storySchema.index({ difficulty: 1 });
storySchema.index({ category: 1 });
storySchema.index({ timesPlayed: 1 });

module.exports = mongoose.model('Story', storySchema); 