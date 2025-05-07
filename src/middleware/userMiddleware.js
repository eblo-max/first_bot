const User = require('../models/User');

/**
 * Middleware для создания или обновления пользователя после успешной аутентификации
 */
exports.createOrUpdateUser = async (req, res, next) => {
    try {
        if (!req.user || !req.user.telegramId) {
            return next();
        }

        const { telegramId, username, firstName, lastName } = req.user;

        // Ищем пользователя по telegram ID
        let user = await User.findOne({ telegramId });

        // Если пользователь не найден, создаем нового
        if (!user) {
            user = new User({
                telegramId,
                username,
                firstName,
                lastName,
                registeredAt: new Date(),
                lastVisit: new Date()
            });

            await user.save();
        } else {
            // Обновляем данные пользователя при необходимости
            if (username !== user.username ||
                firstName !== user.firstName ||
                lastName !== user.lastName) {

                user.username = username || user.username;
                user.firstName = firstName || user.firstName;
                user.lastName = lastName || user.lastName;
                user.lastVisit = new Date();

                await user.save();
            }
        }

        next();
    } catch (error) {
        console.error('Ошибка при создании/обновлении пользователя:', error);
        next();
    }
}; 