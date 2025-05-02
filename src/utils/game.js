/**
 * Генерирует уникальный ID
 * @returns {string} Уникальный ID
 */
const generateId = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

/**
 * Расчет очков за ответ
 * @param {boolean} correct - Правильный ли ответ
 * @param {number} responseTime - Время ответа в миллисекундах
 * @param {string} difficulty - Сложность вопроса
 * @returns {object} - Объект с деталями начисления очков
 */
const calculatePoints = (correct, responseTime, difficulty) => {
    // Если ответ неверный, очки не начисляются
    if (!correct) {
        return { base: 0, timeBonus: 0, difficultyBonus: 0, total: 0 };
    }

    // Базовые очки за правильный ответ
    const BASE_POINTS = 100;

    // Бонус за скорость (максимум 50 очков)
    const MAX_TIME = 15000; // 15 секунд
    const timeBonus = Math.round(Math.max(0, 50 * (1 - responseTime / MAX_TIME)));

    // Бонус за сложность
    let difficultyBonus = 0;
    if (difficulty === 'medium') difficultyBonus = 25;
    if (difficulty === 'hard') difficultyBonus = 50;

    // Общий счет
    const total = BASE_POINTS + timeBonus + difficultyBonus;

    return {
        base: BASE_POINTS,
        timeBonus,
        difficultyBonus,
        total
    };
};

/**
 * Перемешивает массив
 * @param {Array} array - Исходный массив
 * @returns {Array} - Перемешанный массив
 */
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

module.exports = {
    generateId,
    calculatePoints,
    shuffleArray
}; 