const Story = require('../models/Story');
const Game = require('../models/Game');
const User = require('../models/User');
const { generateId, calculatePoints, shuffleArray } = require('../utils/game');

/**
 * Начать новую игру
 * @param {Request} req - Express запрос
 * @param {Response} res - Express ответ
 */
const handleGameStart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { difficulty, category } = req.query;

        // Получаем ранее сыгранные истории пользователя
        const games = await Game.find({ userId })
            .select('stories.storyId')
            .lean();

        // Извлекаем ID сыгранных историй
        const playedStoryIds = games
            .flatMap(game => game.stories.map(s => s.storyId));

        // Формируем запрос
        const query = {};

        // Добавляем фильтр по сложности, если указан
        if (difficulty) {
            query.difficulty = difficulty;
        }

        // Добавляем фильтр по категории, если указан
        if (category) {
            query.category = category;
        }

        // Сначала пытаемся найти новые истории
        let stories = await Story.find({
            ...query,
            id: { $nin: playedStoryIds }
        })
            .limit(5)
            .lean();

        // Если новых историй недостаточно, добавляем уже сыгранные
        if (stories.length < 5) {
            const remainingCount = 5 - stories.length;

            const additionalStories = await Story.find({ ...query })
                .sort({ timesPlayed: 1 }) // Наименее популярные
                .limit(remainingCount)
                .lean();

            stories = [...stories, ...additionalStories];
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

        // Обновляем счетчики в историях
        await Promise.all(stories.map(story =>
            Story.updateOne({ id: story.id }, { $inc: { timesPlayed: 1 } })
        ));

        // Готовим ответ для клиента
        const responseData = {
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
        console.error('Ошибка при старте игры:', error);
        res.status(500).json({ error: 'Не удалось начать игру' });
    }
};

/**
 * Отправить ответ на вопрос
 * @param {Request} req - Express запрос
 * @param {Response} res - Express ответ
 */
const handleGameSubmit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId, storyId, mistakeId, responseTime } = req.body;

        if (!gameId || !storyId || !mistakeId || responseTime === undefined) {
            return res.status(400).json({ error: 'Отсутствуют необходимые параметры' });
        }

        // Ищем активную игру
        const game = await Game.findOne({ id: gameId, userId, status: 'active' });
        if (!game) {
            return res.status(404).json({ error: 'Игра не найдена или уже завершена' });
        }

        // Ищем историю в игре
        const storyIndex = game.stories.findIndex(s => s.storyId === storyId);
        if (storyIndex === -1) {
            return res.status(404).json({ error: 'История не найдена в этой игре' });
        }

        // Проверяем, не был ли уже дан ответ
        if (game.stories[storyIndex].answered) {
            return res.status(400).json({ error: 'Ответ на этот вопрос уже был дан' });
        }

        // Получаем историю из БД для проверки правильного ответа
        const story = await Story.findOne({ id: storyId });
        if (!story) {
            return res.status(404).json({ error: 'История не найдена' });
        }

        // Находим выбранный вариант ответа
        const selectedMistake = story.mistakes.find(m => m.id === mistakeId);
        if (!selectedMistake) {
            return res.status(404).json({ error: 'Вариант ответа не найден' });
        }

        // Определяем, правильный ли ответ
        const isCorrect = selectedMistake.isCorrect;

        // Считаем очки
        const points = calculatePoints(isCorrect, responseTime, story.difficulty);

        // Обновляем игру
        game.stories[storyIndex].answered = true;
        game.stories[storyIndex].correct = isCorrect;
        game.stories[storyIndex].selectedMistakeId = mistakeId;
        game.stories[storyIndex].timeSpent = responseTime;
        game.stories[storyIndex].pointsEarned = points.total;

        // Обновляем общий счет
        game.totalScore += points.total;

        await game.save();

        // Находим правильный ответ для объяснения
        const correctMistake = story.mistakes.find(m => m.isCorrect);

        // Формируем ответ
        const response = {
            correct: isCorrect,
            explanation: isCorrect ? selectedMistake.explanation : correctMistake.explanation,
            pointsEarned: points.total,
            details: points,
            totalScore: game.totalScore
        };

        res.json(response);
    } catch (error) {
        console.error('Ошибка при отправке ответа:', error);
        res.status(500).json({ error: 'Не удалось обработать ответ' });
    }
};

/**
 * Завершить игру
 * @param {Request} req - Express запрос
 * @param {Response} res - Express ответ
 */
const handleGameFinish = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId } = req.body;

        if (!gameId) {
            return res.status(400).json({ error: 'Отсутствует ID игры' });
        }

        // Ищем активную игру
        const game = await Game.findOne({ id: gameId, userId, status: 'active' });
        if (!game) {
            return res.status(404).json({ error: 'Игра не найдена или уже завершена' });
        }

        // Проверяем, все ли вопросы отвечены
        const allAnswered = game.stories.every(s => s.answered);

        // Обновляем игру
        game.status = allAnswered ? 'completed' : 'abandoned';
        game.finishedAt = new Date();

        await game.save();

        // Обновляем статистику пользователя
        const user = await User.findOne({ telegramId: userId });

        if (user) {
            // Подсчитываем статистику текущей игры
            const correctAnswers = game.stories.filter(s => s.correct).length;
            const totalQuestions = game.stories.length;

            // Обновляем статистику пользователя
            user.stats.totalGames += 1;
            user.stats.correctAnswers += correctAnswers;
            user.stats.totalScore += game.totalScore;

            // Вычисляем текущую серию правильных ответов
            let currentStreak = 0;
            for (const story of game.stories) {
                if (story.correct) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // Обновляем максимальную серию, если текущая больше
            if (currentStreak > user.stats.maxStreak) {
                user.stats.maxStreak = currentStreak;
            }

            user.lastPlayed = new Date();

            await user.save();

            // Формируем ответ
            const response = {
                totalScore: game.totalScore,
                correctAnswers,
                totalQuestions,
                accuracy: Math.round((correctAnswers / totalQuestions) * 100),
                stats: {
                    totalGames: user.stats.totalGames,
                    totalScore: user.stats.totalScore,
                    maxStreak: user.stats.maxStreak
                }
            };

            // Добавим позицию в лидерборде в будущих версиях

            res.json(response);
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка при завершении игры:', error);
        res.status(500).json({ error: 'Не удалось завершить игру' });
    }
};

module.exports = {
    handleGameStart,
    handleGameSubmit,
    handleGameFinish
}; 