const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Все маршруты требуют авторизации
router.use(authMiddleware);

// Получение профиля пользователя
router.get('/profile', userController.getProfile);

// Обновление имени пользователя (никнейма)
router.put('/profile/nickname', userController.updateNickname);

// Получение статистики и достижений пользователя
router.get('/stats', userController.getStats);

// Получение истории игр пользователя
router.get('/history', userController.getGameHistory);

// Получение таблицы лидеров
router.get('/leaderboard', userController.getLeaderboard);

module.exports = router; 