const mongoose = require('mongoose');

// Схема для ошибок
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
        default: false
    },
    explanation: {
        type: String,
        required: true
    }
});

// Основная схема истории
const storySchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['robbery', 'theft', 'fraud', 'murder', 'other'],
        required: true
    },
    mistakes: [mistakeSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    timesPlayed: {
        type: Number,
        default: 0
    }
});

// Виртуальное поле для получения правильного ответа
storySchema.virtual('correctAnswer').get(function () {
    const correctMistake = this.mistakes.find(mistake => mistake.isCorrect);
    return correctMistake ? correctMistake.id : null;
});

// Метод для получения случайных историй
storySchema.statics.getRandomStories = async function (count = 5) {
    return await this.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: count } }
    ]);
};

// Создаем индексы для быстрого поиска и фильтрации
storySchema.index({ difficulty: 1 });
storySchema.index({ category: 1 });
storySchema.index({ timesPlayed: 1 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story; 