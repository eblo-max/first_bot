const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { verifyTelegramWebAppData } = require('../middleware/auth');
const User = require('../models/User');

/**
 * @route   POST /api/auth/init
 * @desc    Инициализация и аутентификация через Telegram WebApp
 * @access  Public
 */
router.post('/init', verifyTelegramWebAppData, async (req, res) => {
    try {
        const telegramUser = req.telegramUser;
        if (!telegramUser || !telegramUser.id) {
            return res.status(400).json({ error: 'Не удалось получить данные пользователя' });
        }

        const telegramId = telegramUser.id.toString();

        // Ищем пользователя в базе или создаем нового
        let user = await User.findOne({ telegramId });
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            user = new User({
                telegramId,
                username: telegramUser.username || '',
                firstName: telegramUser.first_name || '',
                lastName: telegramUser.last_name || ''
            });
            await user.save();
        }

        // Создаем JWT токен
        const token = jwt.sign(
            {
                id: user.telegramId,
                username: user.username
            },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: '7d' }
        );

        // Отправляем токен и данные пользователя
        res.json({
            token,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isNew: isNewUser
            }
        });
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({ error: 'Ошибка сервера при аутентификации' });
    }
});

module.exports = router; 