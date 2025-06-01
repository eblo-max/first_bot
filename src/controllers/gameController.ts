/**
 * Типизированный контроллер игр (GameController)
 * Управляет созданием, проведением и завершением игр
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';

import Story from '../models/Story';
import Game from '../models/Game';
import User, { type IGameResult } from '../models/User';
import { calculateScore, calculatePointsWithDetails, formatTime, generateId, shuffleArray } from '../utils/game';

// Интерфейс для авторизованного запроса
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

// Интерфейс для запроса начала игры
interface GameStartRequest extends AuthenticatedRequest {
    query: {
        difficulty?: 'easy' | 'medium' | 'hard';
        category?: string;
    };
}

// Интерфейс для отправки ответа
interface GameSubmitRequest extends AuthenticatedRequest {
    body: {
        gameId: string;
        storyId: string;
        mistakeId: string;
        responseTime: number;
    };
}

// Интерфейс для завершения игры
interface GameFinishRequest extends AuthenticatedRequest {
    body: {
        gameId: string;
    };
}

// Интерфейс для данных об истории для клиента
interface ClientStoryData {
    id: string;
    title: string;
    content: string;
    difficulty: string;
    mistakes: Array<{
        id: string;
        text: string;
    }>;
}

// Интерфейс для ответа при начале игры
interface GameStartResponse {
    gameId: string;
    stories: ClientStoryData[];
}

// Интерфейс для ответа при отправке ответа
interface GameSubmitResponse {
    correct: boolean;
    explanation: string;
    points: {
        base: number;
        timeBonus: number;
        total: number;
    };
    currentScore: number;
    allAnswered: boolean;
}

// Интерфейс для ответа при завершении игры
interface GameFinishResponse {
    gameId: string;
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    timeSpent: number;
    experienceGained: number;
    leveledUp: boolean;
    newLevel?: number;
    achievementsUnlocked: Array<{
        id: string;
        name: string;
        description: string;
    }>;
    reputationChange: number;
    rank: string;
}

// Интерфейс для ошибки
interface GameErrorResponse {
    error: string;
    code?: string;
}

// Типы ответов
type GameResponse<T> = T | GameErrorResponse;

class GameController {
    /**
     * Начать новую игру
     */
    public static async handleGameStart(req: GameStartRequest, res: Response<GameResponse<GameStartResponse>>): Promise<void> {
        try {
            const userId = req.user.id;
            const { difficulty, category } = req.query;

            console.log(`🎮 Начало новой игры для пользователя ${userId} (сложность: ${difficulty || 'любая'}, категория: ${category || 'любая'})`);

            // Получаем ранее сыгранные истории пользователя
            const games = await Game.find({ userId })
                .select('stories.storyId')
                .lean();

            // Извлекаем ID сыгранных историй
            const playedStoryIds = games
                .flatMap(game => game.stories.map(s => s.storyId));

            // Формируем запрос
            const query: any = {};

            // Добавляем фильтр по сложности, если указан
            if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
                query.difficulty = difficulty;
            }

            // Добавляем фильтр по категории, если указан
            if (category && category.trim()) {
                query.category = category.trim();
            }

            // Сначала пытаемся найти новые истории
            let stories = await Story.find({
                ...query,
                id: { $nin: playedStoryIds }
            })
                .limit(5)
                .lean();

            console.log(`📚 Найдено ${stories.length} новых историй`);

            // Если новых историй недостаточно, добавляем уже сыгранные
            if (stories.length < 5) {
                const remainingCount = 5 - stories.length;
                console.log(`📚 Требуется еще ${remainingCount} историй, добавляем уже сыгранные`);

                const additionalStories = await Story.find({ ...query })
                    .sort({ timesPlayed: 1 }) // Наименее популярные
                    .limit(remainingCount)
                    .lean();

                stories = [...stories, ...additionalStories];
            }

            if (stories.length === 0) {
                res.status(404).json({
                    error: 'Не найдено историй для игры с указанными параметрами',
                    code: 'NO_STORIES_FOUND'
                });
                return;
            }

            // Перемешиваем истории
            stories = shuffleArray(stories);

            // Создаем новую игру
            const gameId = generateId();
            const game = new Game({
                id: gameId,
                userId,
                stories: stories.map(story => ({
                    storyId: story.id,
                    answered: false,
                    correct: false,
                    selectedMistakeId: null,
                    timeSpent: 0,
                    pointsEarned: 0
                })),
                totalScore: 0,
                startedAt: new Date(),
                status: 'active'
            });

            await game.save();
            console.log(`✅ Создана игра ${gameId} с ${stories.length} историями`);

            // Обновляем счетчики в историях
            await Promise.all(stories.map(story =>
                Story.updateOne({ id: story.id }, { $inc: { timesPlayed: 1 } })
            ));

            // Готовим ответ для клиента
            const responseData: GameStartResponse = {
                gameId,
                stories: stories.map(story => ({
                    id: story.id,
                    title: story.title,
                    content: story.content,
                    difficulty: story.difficulty,
                    mistakes: story.mistakes.map(mistake => ({
                        id: mistake.id,
                        text: mistake.text
                    }))
                }))
            };

            res.json(responseData);

        } catch (error) {
            console.error('❌ Ошибка при старте игры:', error);
            res.status(500).json({
                error: 'Не удалось начать игру',
                code: 'GAME_START_ERROR'
            });
        }
    }

    /**
     * Отправить ответ на вопрос
     */
    public static async handleGameSubmit(req: GameSubmitRequest, res: Response<GameResponse<GameSubmitResponse>>): Promise<void> {
        try {
            const userId = req.user.id;
            const { gameId, storyId, mistakeId, responseTime } = req.body;

            if (!gameId || !storyId || !mistakeId || responseTime === undefined) {
                res.status(400).json({
                    error: 'Отсутствуют необходимые параметры',
                    code: 'MISSING_PARAMETERS'
                });
                return;
            }

            // ========== ВАЛИДАЦИЯ ВРЕМЕНИ ОТВЕТА ==========
            console.log(`⏱️ Обработка ответа: игра ${gameId}, история ${storyId}, время ${responseTime}ms`);

            // Проверяем, что время ответа является числом
            if (typeof responseTime !== 'number' || isNaN(responseTime)) {
                res.status(400).json({
                    error: 'Некорректное время ответа: должно быть числом',
                    code: 'INVALID_RESPONSE_TIME'
                });
                return;
            }

            // Проверяем минимальное время (защита от читерства)
            const MIN_RESPONSE_TIME = 500; // 0.5 секунды - минимально возможное время
            if (responseTime < MIN_RESPONSE_TIME) {
                console.warn(`⚠️ Подозрительно быстрый ответ от пользователя ${userId}: ${responseTime}ms`);
                res.status(400).json({
                    error: 'Слишком быстрый ответ. Пожалуйста, внимательно читайте вопрос.',
                    code: 'RESPONSE_TOO_FAST'
                });
                return;
            }

            // Проверяем максимальное время (защита от зависших сессий)
            const MAX_RESPONSE_TIME = 120000; // 2 минуты - максимальное разумное время
            if (responseTime > MAX_RESPONSE_TIME) {
                console.warn(`⚠️ Слишком медленный ответ от пользователя ${userId}: ${responseTime}ms`);
                res.status(400).json({
                    error: 'Превышено максимальное время ответа. Попробуйте ответить быстрее.',
                    code: 'RESPONSE_TOO_SLOW'
                });
                return;
            }

            // Логируем валидные, но необычные времена для мониторинга
            if (responseTime < 2000) {
                console.log(`⚡ Очень быстрый ответ: ${responseTime}ms от пользователя ${userId}`);
            } else if (responseTime > 60000) {
                console.log(`🐌 Медленный ответ: ${responseTime}ms от пользователя ${userId}`);
            }
            // ========== КОНЕЦ ВАЛИДАЦИИ ==========

            // Ищем активную игру
            const game = await Game.findOne({ id: gameId, userId, status: 'active' });
            if (!game) {
                res.status(404).json({
                    error: 'Игра не найдена или уже завершена',
                    code: 'GAME_NOT_FOUND'
                });
                return;
            }

            // Ищем историю в игре
            const storyIndex = game.stories.findIndex(s => s.storyId === storyId);
            if (storyIndex === -1) {
                res.status(404).json({
                    error: 'История не найдена в этой игре',
                    code: 'STORY_NOT_FOUND'
                });
                return;
            }

            // Проверяем, не был ли уже дан ответ
            if (game.stories[storyIndex].answered) {
                res.status(400).json({
                    error: 'Ответ на этот вопрос уже был дан',
                    code: 'ALREADY_ANSWERED'
                });
                return;
            }

            // Получаем историю из БД для проверки правильного ответа
            const story = await Story.findOne({ id: storyId });
            if (!story) {
                res.status(404).json({
                    error: 'История не найдена',
                    code: 'STORY_NOT_IN_DB'
                });
                return;
            }

            // Находим выбранный вариант ответа
            const selectedMistake = story.mistakes.find(m => m.id === mistakeId);
            if (!selectedMistake) {
                res.status(404).json({
                    error: 'Вариант ответа не найден',
                    code: 'MISTAKE_NOT_FOUND'
                });
                return;
            }

            // Определяем, правильный ли ответ
            const isCorrect = selectedMistake.isCorrect;

            // Считаем очки (с валидированным временем)
            const points = calculatePointsWithDetails(isCorrect, responseTime, story.difficulty as any);

            console.log(`${isCorrect ? '✅' : '❌'} Ответ ${isCorrect ? 'правильный' : 'неправильный'}, очки: ${points.total}`);

            // Обновляем игру
            game.stories[storyIndex].answered = true;
            game.stories[storyIndex].correct = isCorrect;
            game.stories[storyIndex].selectedMistakeId = mistakeId;
            game.stories[storyIndex].timeSpent = responseTime;
            game.stories[storyIndex].pointsEarned = points.total;

            // Обновляем общий счет
            game.totalScore += points.total;

            await game.save();

            // Проверяем, все ли вопросы отвечены
            const allAnswered = game.stories.every(s => s.answered);

            const response: GameSubmitResponse = {
                correct: isCorrect,
                explanation: selectedMistake.explanation,
                points,
                currentScore: game.totalScore,
                allAnswered
            };

            res.json(response);

        } catch (error) {
            console.error('❌ Ошибка при отправке ответа:', error);
            res.status(500).json({
                error: 'Не удалось обработать ответ',
                code: 'SUBMIT_ERROR'
            });
        }
    }

    /**
     * Завершение игры и подсчет статистики
     */
    public static async handleGameFinish(req: GameFinishRequest, res: Response<GameResponse<GameFinishResponse>>): Promise<void> {
        try {
            const userId = req.user.id;
            const { gameId } = req.body;

            if (!gameId) {
                res.status(400).json({
                    error: 'Отсутствует ID игры',
                    code: 'MISSING_GAME_ID'
                });
                return;
            }

            console.log(`🏁 Завершение игры ${gameId} для пользователя ${userId}`);

            // Ищем активную игру
            const game = await Game.findOne({ id: gameId, userId, status: 'active' });
            if (!game) {
                res.status(404).json({
                    error: 'Игра не найдена или уже завершена',
                    code: 'GAME_NOT_FOUND'
                });
                return;
            }

            // Проверяем, все ли вопросы отвечены
            const allAnswered = game.stories.every(s => s.answered);

            // Обновляем игру
            game.status = allAnswered ? 'completed' : 'abandoned';
            game.finishedAt = new Date();

            await game.save();

            // Обновляем статистику пользователя
            const user = await User.findOne({ telegramId: userId });

            if (!user) {
                res.status(404).json({
                    error: 'Пользователь не найден',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            // Подсчитываем статистику текущей игры
            const correctAnswers = game.stories.filter(s => s.correct).length;
            const totalQuestions = game.stories.length;
            const totalTimeSpent = game.stories.reduce((sum, s) => sum + s.timeSpent, 0);

            // Обновляем статистику пользователя через новую систему
            const gameResult: IGameResult = {
                gameId,
                totalScore: game.totalScore,
                correctAnswers,
                totalQuestions,
                timeSpent: totalTimeSpent,
                averageTime: totalTimeSpent / totalQuestions
            };

            // Сохраняем предыдущие данные для расчета прогресса
            const prevLevel = user.stats.level;
            const prevRank = user.rank;

            // Обновляем статистику через метод модели
            await user.updateStatsAfterGame(gameResult);

            // Проверяем новые достижения
            const newAchievements = user.checkAchievements();

            // Проверяем, повысился ли уровень
            const leveledUp = user.stats.level > prevLevel;

            const response: GameFinishResponse = {
                gameId,
                totalScore: game.totalScore,
                correctAnswers,
                totalQuestions,
                accuracy: Math.round((correctAnswers / totalQuestions) * 100),
                timeSpent: totalTimeSpent,
                experienceGained: user.stats.experience,
                leveledUp,
                newLevel: leveledUp ? user.stats.level : undefined,
                achievementsUnlocked: newAchievements.map(a => ({
                    id: a.id,
                    name: a.name,
                    description: a.description
                })),
                reputationChange: user.reputation.level,
                rank: user.rank
            };

            console.log(`✅ Игра завершена: ${correctAnswers}/${totalQuestions} правильных ответов, очки: ${game.totalScore}`);

            res.json(response);

        } catch (error) {
            console.error('❌ Ошибка при завершении игры:', error);
            res.status(500).json({
                error: 'Не удалось завершить игру',
                code: 'FINISH_ERROR'
            });
        }
    }

    /**
     * Простое создание игры (legacy метод)
     */
    public static async startGame(req: AuthenticatedRequest, res: Response<GameResponse<{ gameId: string; message: string }>>): Promise<void> {
        try {
            console.log(`🎮 Legacy метод startGame для пользователя ${req.user.id}`);

            // Создаем новую игру с уникальным ID
            const gameId = 'game_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

            res.status(200).json({
                gameId,
                message: 'Игра успешно начата'
            });

        } catch (error) {
            console.error('❌ Ошибка при начале игры:', error);
            res.status(500).json({
                error: 'Внутренняя ошибка сервера',
                code: 'START_GAME_ERROR'
            });
        }
    }

    /**
     * Завершение игры и сохранение результатов (альтернативный метод)
     */
    public static async finishGame(req: GameFinishRequest & {
        body: {
            gameId: string;
            totalScore: number;
            correctAnswers: number;
            totalQuestions: number;
        }
    }, res: Response<GameResponse<{
        message: string;
        currentScore: number;
        rank: string;
        newAchievements: any[];
    }>>): Promise<void> {
        try {
            const { gameId, totalScore, correctAnswers, totalQuestions } = req.body;
            const telegramId = req.user.telegramId;

            console.log(`🎯 Альтернативное завершение игры ${gameId} для ${telegramId}`);

            // Проверяем наличие всех необходимых параметров
            if (!gameId || typeof totalScore !== 'number' ||
                typeof correctAnswers !== 'number' || typeof totalQuestions !== 'number') {
                res.status(400).json({
                    error: 'Неверные параметры запроса',
                    code: 'INVALID_PARAMETERS'
                });
                return;
            }

            // Находим пользователя в базе данных
            const user = await User.findOne({ telegramId });

            if (!user) {
                res.status(404).json({
                    error: 'Пользователь не найден',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            // Формируем объект результата игры
            const gameResult: IGameResult = {
                gameId,
                totalScore,
                correctAnswers,
                totalQuestions
            };

            // Обновляем статистику пользователя
            await user.updateStatsAfterGame(gameResult);

            // Проверяем и выдаем новые достижения
            const newAchievements = user.checkAchievements();

            res.status(200).json({
                message: 'Результаты игры успешно сохранены',
                currentScore: user.stats.totalScore,
                rank: user.rank,
                newAchievements: newAchievements
            });

        } catch (error) {
            console.error('❌ Ошибка при завершении игры:', error);
            res.status(500).json({
                error: 'Внутренняя ошибка сервера',
                code: 'FINISH_GAME_ERROR'
            });
        }
    }

    /**
     * Получение тестовых игровых данных (временный метод)
     */
    public static async getGameData(req: AuthenticatedRequest, res: Response<GameResponse<{ stories: any[] }>>): Promise<void> {
        try {
            console.log(`📚 Получение тестовых данных для пользователя ${req.user.id}`);

            // Временные тестовые данные (должны быть заменены на реальную выборку из БД)
            const testStories = [
                {
                    id: 'test-story-1',
                    title: 'ОГРАБЛЕНИЕ ЮВЕЛИРНОГО МАГАЗИНА',
                    content: 'Преступник взломал заднюю дверь ювелирного магазина в 3 часа ночи. Он отключил камеры видеонаблюдения, но не заметил скрытую камеру над сейфом. На записи видно, как он без перчаток открывает витрины и собирает украшения в рюкзак. Перед уходом преступник воспользовался раковиной в подсобке, чтобы смыть кровь с пореза на руке.',
                    date: '12.04.2024',
                    difficulty: 'medium',
                    mistakes: [
                        {
                            id: 'mistake-1',
                            text: 'Неправильно отключил систему видеонаблюдения, не заметив скрытую камеру',
                            isCorrect: false,
                            explanation: 'Хотя преступник допустил ошибку с камерой, это не является критической уликой. Многие современные камеры не фиксируют детали лица в темноте достаточно четко для идентификации.'
                        },
                        {
                            id: 'mistake-2',
                            text: 'Работал без перчаток, оставив отпечатки пальцев на витринах и украшениях',
                            isCorrect: false,
                            explanation: 'Отпечатки пальцев - серьезная улика, но современные преступники часто используют методы для их уничтожения или маскировки. Кроме того, для идентификации нужно, чтобы отпечатки преступника уже были в базе данных.'
                        },
                        {
                            id: 'mistake-3',
                            text: 'Оставил свои биологические следы, смыв кровь в раковине, что позволило получить его ДНК',
                            isCorrect: true,
                            explanation: 'Преступник оставил биологический материал (кровь), который попал в слив раковины. Даже после смывания, следы ДНК остаются на сантехнике и в трубах. Криминалисты легко извлекают такие образцы и используют для идентификации. Современные методы могут выделить ДНК-профиль даже из микроскопических следов крови.'
                        }
                    ]
                },
                {
                    id: 'test-story-2',
                    title: 'КРАЖА В МУЗЕЕ ИСКУССТВ',
                    content: 'Во время выставки импрессионистов в городском музее была украдена картина Клода Моне. Преступник проник в здание во время рабочих часов, притворившись работником технической службы. В момент кражи он отключил сигнализацию на 5 минут, быстро срезал картину с рамы и спрятал её в специальный тубус для чертежей. На следующий день он разместил объявление о продаже редкого "принта Моне" на интернет-аукционе.',
                    date: '23.05.2024',
                    difficulty: 'hard',
                    mistakes: [
                        {
                            id: 'mistake-1',
                            text: 'Проникновение в рабочие часы - слишком много свидетелей могли его заметить',
                            isCorrect: false,
                            explanation: 'Хотя это рискованно, многие успешные кражи произведений искусства происходят именно в рабочее время. В толпе посетителей и сотрудников преступник может оставаться незамеченным, особенно в большом музее.'
                        },
                        {
                            id: 'mistake-2',
                            text: 'Продажа украденного через интернет-аукцион, что легко отслеживается правоохранительными органами',
                            isCorrect: true,
                            explanation: 'Попытка продать украденное произведение искусства через публичный интернет-аукцион - критическая ошибка. Правоохранительные органы регулярно мониторят онлайн-площадки на предмет похищенных ценностей. IP-адрес, данные аккаунта и платежная информация могут напрямую привести к преступнику.'
                        },
                        {
                            id: 'mistake-3',
                            text: 'Отключение сигнализации, которое фиксируется в журнале системы безопасности',
                            isCorrect: false,
                            explanation: 'Отключение сигнализации действительно фиксируется, но профессиональные воры часто используют методы, которые имитируют технический сбой или плановое обслуживание, что усложняет расследование.'
                        }
                    ]
                }
            ];

            // В будущем здесь будет логика выборки случайных историй из базы данных
            console.log(`📖 Возвращено ${testStories.length} тестовых историй`);

            res.status(200).json({
                stories: testStories
            });

        } catch (error) {
            console.error('❌ Ошибка при получении данных игры:', error);
            res.status(500).json({
                error: 'Внутренняя ошибка сервера',
                code: 'GET_GAME_DATA_ERROR'
            });
        }
    }
}

// Экспорт методов для совместимости с CommonJS
export const handleGameStart = GameController.handleGameStart;
export const handleGameSubmit = GameController.handleGameSubmit;
export const handleGameFinish = GameController.handleGameFinish;
export const startGame = GameController.startGame;
export const finishGame = GameController.finishGame;
export const getGameData = GameController.getGameData;

export default GameController; 