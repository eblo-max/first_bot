/**
 * Типизированные middleware для работы с пользователями
 * Обрабатывает создание и обновление пользователей после аутентификации
 */

import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// Интерфейс для аутентифицированного запроса
interface AuthenticatedRequest extends Request {
    user?: {
        telegramId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

/**
 * Middleware для создания или обновления пользователя после успешной аутентификации
 */
export const createOrUpdateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.telegramId) {
            next();
            return;
        }

        const { telegramId, username, firstName, lastName } = req.user;
        console.log(`👤 Обработка пользователя: ${telegramId}`);

        // Ищем пользователя по telegram ID
        let user = await User.findOne({ telegramId });

        // Если пользователь не найден, создаем нового
        if (!user) {
            console.log(`🆕 Создание нового пользователя: ${telegramId}`);

            user = new User({
                telegramId,
                username,
                firstName,
                lastName,
                registeredAt: new Date(),
                lastVisit: new Date()
            });

            await user.save();
            console.log(`✅ Пользователь создан: ${telegramId}`);
        } else {
            // Обновляем данные пользователя при необходимости
            if (username !== user.username ||
                firstName !== user.firstName ||
                lastName !== user.lastName) {

                console.log(`🔄 Обновление данных пользователя: ${telegramId}`);

                user.username = username || user.username;
                user.firstName = firstName || user.firstName;
                user.lastName = lastName || user.lastName;
                user.lastVisit = new Date();

                await user.save();
                console.log(`✅ Данные пользователя обновлены: ${telegramId}`);
            } else {
                // Просто обновляем время последнего визита
                user.lastVisit = new Date();
                await user.save();
            }
        }

        next();
    } catch (error) {
        console.error('❌ Ошибка при создании/обновлении пользователя:', error);
        next(); // Продолжаем выполнение даже при ошибке
    }
};

// Экспорт по умолчанию для совместимости
const userMiddleware = {
    createOrUpdateUser
};

export default userMiddleware; 