/**
 * Типизированная модель игры (Game) для MongoDB с Mongoose
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// Типы для статуса игры
type GameStatus = 'active' | 'completed' | 'abandoned';

// Интерфейс для истории в игре
export interface IGameStory {
    storyId: string;
    answered: boolean;
    correct: boolean;
    selectedMistakeId: string | null;
    timeSpent: number;
    pointsEarned: number;
}

// Интерфейс для документа игры
export interface IGame extends Document {
    id: string;
    userId: string;
    stories: IGameStory[];
    totalScore: number;
    startedAt: Date;
    finishedAt: Date | null;
    status: GameStatus;

    // Методы экземпляра
    calculateTotalScore(): number;
    markAsCompleted(): Promise<IGame>;
    addStoryResult(storyId: string, result: Partial<IGameStory>): Promise<IGame>;
}

// Интерфейс для статических методов модели
export interface IGameModel extends Model<IGame> {
    findActiveGameByUser(userId: string): Promise<IGame | null>;
    getCompletedGamesStats(userId: string): Promise<{
        totalGames: number;
        totalScore: number;
        averageScore: number;
        accuracy: number;
    }>;
    cleanupAbandonedGames(olderThanHours?: number): Promise<number>;
}

// Схема для истории в игре
const gameStorySchema = new Schema<IGameStory>({
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
        default: 0,
        min: 0
    },
    pointsEarned: {
        type: Number,
        default: 0,
        min: 0
    }
});

// Основная схема игры
const gameSchema = new Schema<IGame, IGameModel>({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    stories: {
        type: [gameStorySchema],
        default: [],
        validate: {
            validator: function (stories: IGameStory[]) {
                return stories.length <= 10; // Максимум 10 историй в игре
            },
            message: 'Игра не может содержать более 10 историй'
        }
    },
    totalScore: {
        type: Number,
        default: 0,
        min: 0
    },
    startedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    finishedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'] as const,
        default: 'active',
        index: true
    }
});

// Методы экземпляра

// Пересчет общего счета
gameSchema.methods.calculateTotalScore = function (this: IGame): number {
    return this.stories.reduce((total, story) => total + story.pointsEarned, 0);
};

// Завершение игры
gameSchema.methods.markAsCompleted = async function (this: IGame): Promise<IGame> {
    this.status = 'completed';
    this.finishedAt = new Date();
    this.totalScore = this.calculateTotalScore();
    return await this.save();
};

// Добавление результата истории
gameSchema.methods.addStoryResult = async function (
    this: IGame,
    storyId: string,
    result: Partial<IGameStory>
): Promise<IGame> {
    const storyIndex = this.stories.findIndex(story => story.storyId === storyId);

    if (storyIndex === -1) {
        throw new Error(`История с ID ${storyId} не найдена в игре`);
    }

    // Обновляем результат истории
    Object.assign(this.stories[storyIndex], result);

    // Пересчитываем общий счет
    this.totalScore = this.calculateTotalScore();

    return await this.save();
};

// Статические методы

// Поиск активной игры пользователя
gameSchema.statics.findActiveGameByUser = async function (
    this: IGameModel,
    userId: string
): Promise<IGame | null> {
    return await this.findOne({
        userId,
        status: 'active'
    }).sort({ startedAt: -1 });
};

// Статистика завершенных игр пользователя
gameSchema.statics.getCompletedGamesStats = async function (
    this: IGameModel,
    userId: string
): Promise<{
    totalGames: number;
    totalScore: number;
    averageScore: number;
    accuracy: number;
}> {
    const games = await this.find({
        userId,
        status: 'completed'
    }).lean();

    if (games.length === 0) {
        return {
            totalGames: 0,
            totalScore: 0,
            averageScore: 0,
            accuracy: 0
        };
    }

    const totalScore = games.reduce((sum, game) => sum + game.totalScore, 0);
    const allStories = games.flatMap(game => game.stories);
    const answeredStories = allStories.filter(story => story.answered);
    const correctAnswers = answeredStories.filter(story => story.correct);

    return {
        totalGames: games.length,
        totalScore,
        averageScore: Math.round(totalScore / games.length),
        accuracy: answeredStories.length > 0
            ? Math.round((correctAnswers.length / answeredStories.length) * 100)
            : 0
    };
};

// Очистка заброшенных игр
gameSchema.statics.cleanupAbandonedGames = async function (
    this: IGameModel,
    olderThanHours: number = 24
): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await this.updateMany(
        {
            status: 'active',
            startedAt: { $lt: cutoffDate }
        },
        {
            $set: {
                status: 'abandoned',
                finishedAt: new Date()
            }
        }
    );

    return result.modifiedCount;
};

// Индексы для оптимизации запросов
gameSchema.index({ userId: 1, status: 1 });
gameSchema.index({ status: 1, startedAt: -1 });
gameSchema.index({ userId: 1, finishedAt: -1 });
gameSchema.index({ status: 1, startedAt: 1 }); // Для очистки старых игр

// Middleware для автоматического пересчета счета перед сохранением
gameSchema.pre('save', function (this: IGame, next) {
    if (this.isModified('stories')) {
        this.totalScore = this.calculateTotalScore();
    }
    next();
});

// Создание и экспорт модели
const Game = mongoose.model<IGame, IGameModel>('Game', gameSchema);

export default Game;
module.exports = Game; 