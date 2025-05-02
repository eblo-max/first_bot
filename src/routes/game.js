const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
    handleGameStart,
    handleGameSubmit,
    handleGameFinish
} = require('../controllers/gameController');

/**
 * @route   GET /api/game/start
 * @desc    Начать новую игру
 * @access  Private
 */
router.get('/start', authMiddleware, handleGameStart);

/**
 * @route   POST /api/game/submit
 * @desc    Отправить ответ на вопрос
 * @access  Private
 */
router.post('/submit', authMiddleware, handleGameSubmit);

/**
 * @route   POST /api/game/finish
 * @desc    Завершить игру
 * @access  Private
 */
router.post('/finish', authMiddleware, handleGameFinish);

module.exports = router; 