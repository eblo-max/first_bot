const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyTelegramWebAppData } = require('../middleware/auth');

/**
 * Маршрут для инициализации аутентификации через Telegram WebApp
 */
router.post('/init', verifyTelegramWebAppData, authController.authenticateTelegram);

/**
 * Маршрут для проверки валидности токена
 */
router.get('/verify', authController.verifyToken);

/**
 * Маршрут для прямого доступа без Telegram авторизации
 */
router.post('/direct-access', authController.directAccess);

/**
 * Маршрут для прямого доступа без Telegram авторизации через /api/auth/direct-access
 */
router.post('/api/auth/direct-access', authController.directAccess);

/**
 * Маршрут для гостевой аутентификации (если требуется)
 */
router.post('/guest', authController.directAccess); // используем тот же контроллер

module.exports = router; 