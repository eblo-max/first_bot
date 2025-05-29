const User = require('../models/User');

/**
 * Получение профиля пользователя
 */
exports.getProfile = async (req, res) => {
    try {
        const telegramId = req.user.telegramId;
        
        // Проверяем, что это не гостевой пользователь
        if (telegramId && telegramId.startsWith('guest_')) {
            
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
            
            await user.save();
        }

        if (req.user.lastName && (!user.lastName || user.lastName !== req.user.lastName)) {
            user.lastName = req.user.lastName;
            
            await user.save();
        }

        if (req.user.username && (!user.username || user.username !== req.user.username)) {
            user.username = req.user.username;
            
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
 * Получение таблицы лидеров (оптимизированная версия с кэшированием)
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const { period = 'all', limit = 20 } = req.query;
        const telegramId = req.user.telegramId;

        // Используем новую службу рейтингов
        const leaderboardService = require('../services/leaderboardService');
        const result = await leaderboardService.getLeaderboard(period, parseInt(limit), telegramId);

        return res.status(200).json({
            status: 'success',
            data: {
                leaderboard: result.leaderboard,
                currentUser: result.currentUser,
                pagination: {
                    page: 1,
                    limit: parseInt(limit),
                    total: result.leaderboard.length
                },
                meta: {
                    cached: result.cached,
                    fallback: result.fallback,
                    updatedAt: result.updatedAt
                }
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