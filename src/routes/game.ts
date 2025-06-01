/**
 * Типизированные маршруты для игровой логики
 * Обрабатывает создание игр, отправку ответов и завершение игр
 */

import { Router } from 'express';
import GameController from '../controllers/gameController';
import { authMiddleware } from '../middleware/auth';
import userMiddleware from '../middleware/userMiddleware';

const router = Router();

// Маршрут без аутентификации для получения тестовых данных (в продакшене будет защищен)
router.get('/test-data', GameController.getGameData as any);

// Все остальные маршруты требуют аутентификации
router.use(authMiddleware as any);

// После аутентификации создаем или обновляем пользователя
router.use(userMiddleware.createOrUpdateUser as any);

// Основные игровые маршруты (новая система)
router.post('/game-start', GameController.handleGameStart as any);
router.post('/game-submit', GameController.handleGameSubmit as any);
router.post('/game-finish', GameController.handleGameFinish as any);

// Legacy маршруты (для обратной совместимости)
router.post('/start', GameController.startGame as any);
router.post('/finish', GameController.finishGame as any);
router.get('/data', GameController.getGameData as any);

export default router; 