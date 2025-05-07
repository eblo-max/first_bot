const User = require('../models/User');

/**
 * Получение профиля пользователя
 */
exports.getProfile = async (req, res) => {
    try {
        const telegramId = req.user.telegramId;

        // Находим пользователя в базе данных
        let user = await User.findOne({ telegramId });

        // Если пользователь не найден, возвращаем ошибку
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Обновляем дату последнего визита
        user.lastVisit = new Date();
        await user.save();

        // Формируем ответ
        const profile = {
            telegramId: user.telegramId,
            name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.nickname || user.username || 'Аноним'),
            rank: user.rank,
            stats: {
                investigations: user.stats.investigations,
                solvedCases: user.stats.solvedCases,
                winStreak: user.stats.winStreak,
                accuracy: user.stats.accuracy
            },
            totalScore: user.stats.totalScore,
            achievements: user.achievements.map(a => ({
                id: a.id,
                name: a.name,
                description: a.description,
                unlockedAt: a.unlockedAt
            })),
            registeredAt: user.registeredAt,
            lastVisit: user.lastVisit
        };

        return res.status(200).json({
            status: 'success',
            data: profile
        });

    } catch (error) {
        console.error('Ошибка при получении профиля:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Обновление имени пользователя (никнейма)
 */
exports.updateNickname = async (req, res) => {
    try {
        const { nickname } = req.body;
        const telegramId = req.user.telegramId;

        // Проверяем корректность ввода
        if (!nickname || nickname.length < 2 || nickname.length > 20) {
            return res.status(400).json({
                status: 'error',
                message: 'Никнейм должен содержать от 2 до 20 символов'
            });
        }

        // Обновляем никнейм пользователя
        const user = await User.findOneAndUpdate(
            { telegramId },
            { nickname },
            { new: true }
        );

        // Если пользователь не найден, возвращаем ошибку
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: { nickname: user.nickname }
        });

    } catch (error) {
        console.error('Ошибка при обновлении никнейма:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Получение статистики и достижений пользователя
 */
exports.getStats = async (req, res) => {
    try {
        const telegramId = req.user.telegramId;

        // Находим пользователя в базе данных
        const user = await User.findOne({ telegramId });

        // Если пользователь не найден, возвращаем ошибку
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                stats: user.stats,
                achievements: user.achievements,
                totalScore: user.stats.totalScore,
                rank: user.rank
            }
        });

    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Получение истории игр пользователя
 */
exports.getGameHistory = async (req, res) => {
    try {
        const telegramId = req.user.telegramId;

        // Находим пользователя в базе данных
        const user = await User.findOne({ telegramId });

        // Если пользователь не найден, возвращаем ошибку
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Сортируем историю игр по дате (от новых к старым)
        const gameHistory = user.gameHistory
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Ограничиваем 10 последними играми

        return res.status(200).json({
            status: 'success',
            data: gameHistory
        });

    } catch (error) {
        console.error('Ошибка при получении истории игр:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
};

/**
 * Получение таблицы лидеров
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const { period = 'all' } = req.query;
        const telegramId = req.user.telegramId;

        let dateFilter = {};
        const now = new Date();

        // Настраиваем фильтр по периоду
        if (period === 'day') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            dateFilter = { createdAt: { $gte: yesterday } };
        } else if (period === 'week') {
            const lastWeek = new Date(now);
            lastWeek.setDate(lastWeek.getDate() - 7);
            dateFilter = { createdAt: { $gte: lastWeek } };
        } else if (period === 'month') {
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateFilter = { createdAt: { $gte: lastMonth } };
        }

        // Получаем топ игроков и добавляем ранг к каждому
        const topUsers = await User.find(dateFilter)
            .sort({ 'stats.totalScore': -1 })
            .limit(20)
            .select('telegramId firstName lastName username nickname stats.totalScore rank')
            .lean(); // используем lean() для лучшей производительности

        // Форматируем результаты
        const leaderboard = topUsers.map((user, index) => {
            const displayName = user.nickname ||
                (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                    (user.username || `Игрок ${user.telegramId.slice(-4)}`));

            return {
                rank: index + 1,
                isCurrentUser: user.telegramId === telegramId,
                name: displayName,
                score: user.stats.totalScore,
                userRank: user.rank
            };
        });

        // Проверяем, вошел ли текущий пользователь в топ
        const currentUserInTop = leaderboard.some(entry => entry.isCurrentUser);

        // Если текущий пользователь не в топе, получаем его данные и позицию
        let currentUserData = null;
        if (!currentUserInTop) {
            const user = await User.findOne({ telegramId });

            if (user) {
                // Получаем количество пользователей с большим счетом
                const higherScoreCount = await User.countDocuments({
                    'stats.totalScore': { $gt: user.stats.totalScore },
                    ...dateFilter
                });

                const displayName = user.nickname ||
                    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                        (user.username || `Игрок ${user.telegramId.slice(-4)}`));

                currentUserData = {
                    rank: higherScoreCount + 1,
                    isCurrentUser: true,
                    name: displayName,
                    score: user.stats.totalScore,
                    userRank: user.rank
                };
            }
        }

        return res.status(200).json({
            status: 'success',
            data: {
                leaderboard,
                currentUser: currentUserData
            }
        });

    } catch (error) {
        console.error('Ошибка при получении таблицы лидеров:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Внутренняя ошибка сервера'
        });
    }
}; 