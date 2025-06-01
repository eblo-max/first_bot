/**
 * Типизированная модель истории (Story) для MongoDB с Mongoose
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// Типы из глобальных определений
type Difficulty = 'easy' | 'medium' | 'hard';
type CrimeCategory = 'robbery' | 'theft' | 'fraud' | 'murder' | 'cybercrime' | 'other';

// Интерфейс для ошибки в истории
export interface IMistake {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
}

// Интерфейс для документа истории
export interface IStory extends Document {
    id: string;
    title: string;
    content: string;
    date: string;
    difficulty: Difficulty;
    category: CrimeCategory;
    mistakes: IMistake[];
    createdAt: Date;
    isActive: boolean;
    timesPlayed: number;

    // Виртуальные свойства
    correctAnswer: string | null;
}

// Интерфейс для статических методов модели
export interface IStoryModel extends Model<IStory> {
    getRandomStories(count?: number): Promise<IStory[]>;
}

// Схема для ошибок
const mistakeSchema = new Schema<IMistake>({
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
const storySchema = new Schema<IStory, IStoryModel>({
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
        enum: ['easy', 'medium', 'hard'] as const,
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['robbery', 'theft', 'fraud', 'murder', 'cybercrime', 'other'] as const,
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
storySchema.virtual('correctAnswer').get(function (this: IStory): string | null {
    const correctMistake = this.mistakes.find(mistake => mistake.isCorrect);
    return correctMistake ? correctMistake.id : null;
});

// Статический метод для получения случайных историй
storySchema.statics.getRandomStories = async function (
    this: IStoryModel,
    count: number = 5
): Promise<IStory[]> {
    return await this.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: count } }
    ]);
};

// Создаем индексы для быстрого поиска и фильтрации
storySchema.index({ difficulty: 1 });
storySchema.index({ category: 1 });
storySchema.index({ timesPlayed: 1 });
storySchema.index({ isActive: 1, difficulty: 1 });
storySchema.index({ isActive: 1, category: 1 });

// Создание и экспорт модели
const Story = mongoose.model<IStory, IStoryModel>('Story', storySchema);

export default Story;
module.exports = Story; 