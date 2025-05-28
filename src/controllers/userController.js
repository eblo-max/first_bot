const User = require('../models/User');

/**
 * Получение профиля пользователя
 */
exports.getProfile = async (req, res) => {
    try {
        const telegramId = req.user.telegramId;
        console.log(`Запрос профиля для пользователя с telegramId: ${telegramId}`);

        // Проверяем, что это не гостевой пользователь
        if (telegramId && telegramId.startsWith('guest_')) {
            console.log('Отклоняем запрос профиля для гостевого пользователя:', telegramId);
            return res.status(403).json({
                status: 'error',
                message: 'Профиль недоступен для гостевых пользователей. Требуется авторизация через Telegram.',
                code: 'GUEST_NOT_ALLOWED'
            });
        }

        // Находим пользователя в базе данных
        let user = await User.findOne({ telegramId });

        // Если пользователь не найден, но токен валидный с реальными данными Telegram - создаем пользователя
        if (!user && telegramId && !telegramId.startsWith('guest_')) {
            console.log(`Пользователь ${telegramId} не найден в БД, создаем нового пользователя из данных токена`);

            // Создаем нового пользователя из данных токена
            user = new User({
                telegramId: telegramId,
                username: req.user.username || null,
                firstName: req.user.firstName || null,
                lastName: req.user.lastName || null,
                registeredAt: new Date(),
                lastVisit: new Date()
            });

            await user.save();
            console.log(`Создан новый пользователь в БД: ${telegramId} (${req.user.firstName || 'без имени'})`);
        }

        // Если пользователь все еще не найден (что не должно происходить после создания)
        if (!user) {
            console.error(`Пользователь с telegramId ${telegramId} не найден в базе данных и не может быть создан`);
            return res.status(404).json({
                status: 'error',
                message: 'Пользователь не найден в базе данных',
                code: 'USER_NOT_FOUND'
            });
        }

        // Обновляем дату последнего визита
        user.lastVisit = new Date();
        await user.save();

        // Информация из JWT токена для подстраховки
        const firstName = req.user.firstName || user.firstName;
        const lastName = req.user.lastName || user.lastName;
        const username = req.user.username || user.username;

        // Если в БД не сохранены имя/фамилия, но они есть в токене, обновляем
        if (req.user.firstName && (!user.firstName || user.firstName !== req.user.firstName)) {
            user.firstName = req.user.firstName;
            console.log(`Обновлено имя пользователя из токена: ${req.user.firstName}`);
            await user.save();
        }

        if (req.user.lastName && (!user.lastName || user.lastName !== req.user.lastName)) {
            user.lastName = req.user.lastName;
            console.log(`Обновлена фамилия пользователя из токена: ${req.user.lastName}`);
            await user.save();
        }

        if (req.user.username && (!user.username || user.username !== req.user.username)) {
            user.username = req.user.username;
            console.log(`Обновлен username пользователя из токена: ${req.user.username}`);
            await user.save();
        }

        // Формируем отображаемое имя
        const displayName = firstName ?
            `${firstName} ${lastName || ''}`.trim() :
            (user.nickname || username || `Пользователь ${telegramId.substring(0, 8)}`);

        // Формируем ответ
        const profile = {
            telegramId: user.telegramId,
            name: displayName,
            firstName: firstName,
            lastName: lastName,
            username: username,
            nickname: user.nickname,
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
            lastVisit: user.lastVisit,
            isNewUser: user.stats.investigations === 0 // Пометка для новых пользователей
        };

        console.log(`Профиль успешно загружен для пользователя ${displayName} (${telegramId})`);

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