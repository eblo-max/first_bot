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

        // ========== ВАЛИДАЦИЯ ВРЕМЕНИ ОТВЕТА ==========

        // Проверяем, что время ответа является числом
        if (typeof responseTime !== 'number' || isNaN(responseTime)) {
            return res.status(400).json({
                error: 'Некорректное время ответа: должно быть числом'
            });
        }

        // Проверяем минимальное время (защита от читерства)
        const MIN_RESPONSE_TIME = 500; // 0.5 секунды - минимально возможное время
        if (responseTime < MIN_RESPONSE_TIME) {
            console.warn(`⚠️ Подозрительно быстрый ответ от пользователя ${userId}: ${responseTime}ms`);
            return res.status(400).json({
                error: 'Слишком быстрый ответ. Пожалуйста, внимательно читайте вопрос.'
            });
        }

        // Проверяем максимальное время (защита от зависших сессий)
        const MAX_RESPONSE_TIME = 120000; // 2 минуты - максимальное разумное время
        if (responseTime > MAX_RESPONSE_TIME) {
            console.warn(`⚠️ Слишком медленный ответ от пользователя ${userId}: ${responseTime}ms`);
            return res.status(400).json({
                error: 'Превышено максимальное время ответа. Попробуйте ответить быстрее.'
            });
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

        // Считаем очки (с валидированным временем)
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

/**
 * Начало новой игры
 */
const startGame = async (req, res) => {
    try {
        // Создаем новую игру с уникальным ID
        const gameId = 'game_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

        return res.status(200).json({
            status: 'success',
            data: {
                gameId,
                message: 'Игра успешно начата'
            }
        });
    } catch (error) {
        console.error('Ошибка при начале игры:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Завершение игры и сохранение результатов
 */
const finishGame = async (req, res) => {
    try {
        const { gameId, totalScore, correctAnswers, totalQuestions } = req.body;
        const telegramId = req.user.telegramId;

        // Проверяем наличие всех необходимых параметров
        if (!gameId || typeof totalScore !== 'number' ||
            typeof correctAnswers !== 'number' || typeof totalQuestions !== 'number') {
            return res.status(400).json({
                status: 'error',
                message: 'Неверные параметры запроса'
            });
        }

        // Находим пользователя в базе данных
        const user = await User.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Формируем объект результата игры
        const gameResult = {
            gameId,
            totalScore,
            correctAnswers,
            totalQuestions
        };

        // Обновляем статистику пользователя
        await user.updateStatsAfterGame(gameResult);

        // Проверяем и выдаем новые достижения
        const newAchievements = await user.checkAchievements();

        return res.status(200).json({
            status: 'success',
            data: {
                message: 'Результаты игры успешно сохранены',
                currentScore: user.stats.totalScore,
                rank: user.rank,
                newAchievements: newAchievements
            }
        });
    } catch (error) {
        console.error('Ошибка при завершении игры:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Получение игровых данных (случайные истории)
 */
const getGameData = async (req, res) => {
    try {
        // Временные тестовые данные
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

        return res.status(200).json({
            status: 'success',
            data: {
                stories: testStories
            }
        });
    } catch (error) {
        console.error('Ошибка при получении данных игры:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

module.exports = {
    handleGameStart,
    handleGameSubmit,
    handleGameFinish,
    finishGame,
    getGameData,
    startGame
}; 