const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { authMiddleware } = require('../middleware/auth');
const userMiddleware = require('../middleware/userMiddleware');

// Маршрут без аутентификации для получения тестовых данных (в продакшене будет защищен)
router.get('/test-data', gameController.getGameData);

// Все остальные маршруты требуют аутентификации
router.use(authMiddleware);

// После аутентификации создаем или обновляем пользователя
router.use(userMiddleware.createOrUpdateUser);

// Начало новой игры
router.post('/start', gameController.startGame);

// Завершение игры и сохранение результатов
router.post('/finish', gameController.finishGame);

// Получение данных для игры (истории)
router.get('/data', gameController.getGameData);

// Существующие маршруты
router.post('/game-start', gameController.handleGameStart);
router.post('/game-submit', gameController.handleGameSubmit);
router.post('/game-finish', gameController.handleGameFinish);

module.exports = router; 