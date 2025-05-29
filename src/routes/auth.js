const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { verifyTelegramWebAppData } = require('../middleware/auth');
const User = require('../models/User');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/init
 * @desc    Инициализация и аутентификация через Telegram WebApp
 * @access  Public
 */
router.post('/init', verifyTelegramWebAppData, async (req, res) => {
    try {
        console.log('Запрос на /api/auth/init получен');
        console.log('Данные telegramUser из middleware:', req.telegramUser);

        const telegramUser = req.telegramUser;
        if (!telegramUser || !telegramUser.telegramId) {
            console.error('Не удалось получить telegramId из middleware');
            return res.status(400).json({
                status: 'error',
                message: 'Не удалось получить данные пользователя'
            });
        }

        const telegramId = telegramUser.telegramId;
        console.log('Поиск пользователя с telegramId:', telegramId);

        // Ищем пользователя в базе или создаем нового
        let user = await User.findOne({ telegramId });
        let isNewUser = false;

        if (!user) {
            console.log('Пользователь не найден, создаем нового');
            isNewUser = true;
            user = new User({
                telegramId,
                username: telegramUser.username || null,
                firstName: telegramUser.firstName || null,
                lastName: telegramUser.lastName || null,
                registeredAt: new Date(),
                lastVisit: new Date()
            });
            await user.save();
            console.log('Новый пользователь создан:', telegramId);
        } else {
            console.log('Найден существующий пользователь:', telegramId);
            // Обновляем дату последнего визита
            user.lastVisit = new Date();
            await user.save();
        }

        // Создаем JWT токен с правильной структурой
        const token = jwt.sign(
            {
                telegramId: user.telegramId, // Используем telegramId вместо id
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName
            },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: '7d' }
        );

        console.log('JWT токен создан для пользователя:', telegramId);

        // Формируем имя пользователя для отображения
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : (user.username || 'Аноним');

        // Отправляем токен и данные пользователя в формате совместимом с authController
        res.json({
            status: 'success',
            data: {
                token,
                user: {
                    telegramId: user.telegramId,
                    name: displayName,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    rank: user.rank,
                    stats: user.stats,
                    totalScore: user.stats.totalScore,
                    isNew: isNewUser
                }
            }
        });
    } catch (error) {
        console.error('Ошибка аутентификации в /api/auth/init:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка сервера при аутентификации'
        });
    }
});

/**
 * @route   POST /api/auth/telegram
 * @desc    Альтернативная точка входа через Telegram WebApp (использует authController)
 * @access  Public
 */
router.post('/telegram', authController.authenticateTelegram);

/**
 * @route   POST /api/auth/direct-access
 * @desc    Прямой доступ для пользователей, которые не через Telegram (отключён)
 * @access  Public
 */
router.post('/direct-access', authController.directAccess);

/**
 * @route   POST /api/auth/guest
 * @desc    Гостевая аутентификация (отключена, требуется Telegram авторизация)
 * @access  Public
 */
router.post('/guest', authController.directAccess);

/**
 * @route   GET /api/auth/verify
 * @desc    Проверка действительности JWT токена
 * @access  Private
 */
router.get('/verify', authMiddleware, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Токен действителен',
        data: {
            user: req.user
        }
    });
});

module.exports = router; 