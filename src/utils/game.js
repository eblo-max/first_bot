/**
 * Генерирует уникальный ID
 * @returns {string} Уникальный ID
 */
const generateId = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

/**
 * Расчет очков за ответ (УЛУЧШЕННАЯ ПРОГРЕССИВНАЯ ФОРМУЛА)
 * @param {boolean} correct - Правильный ли ответ
 * @param {number} responseTime - Время ответа в миллисекундах
 * @param {string} difficulty - Сложность вопроса ('easy', 'medium', 'hard')
 * @returns {object} - Объект с деталями начисления очков
 */
const calculatePoints = (correct, responseTime, difficulty) => {
    // Если ответ неверный, очки не начисляются
    if (!correct) {
        return {
            base: 0,
            timeBonus: 0,
            difficultyBonus: 0,
            perfectionBonus: 0,
            total: 0
        };
    }

    // Базовые очки за правильный ответ
    const BASE_POINTS = 100;

    // ========== УЛУЧШЕННЫЙ БОНУС ЗА СКОРОСТЬ ==========
    const MAX_TIME = 15000; // 15 секунд

    // Прогрессивная формула с ускорением для очень быстрых ответов
    let timeBonus = 0;
    if (responseTime <= MAX_TIME) {
        const timeRatio = responseTime / MAX_TIME;

        // Квадратичная формула для более высоких бонусов за скорость
        const speedMultiplier = Math.pow(1 - timeRatio, 1.5);
        timeBonus = Math.round(50 * speedMultiplier);

        // Дополнительный бонус за исключительную скорость
        if (responseTime < 3000) { // Менее 3 секунд
            timeBonus += 10; // Дополнительные 10 очков
        }
        if (responseTime < 1500) { // Менее 1.5 секунд  
            timeBonus += 15; // Еще 15 очков (итого +25)
        }
    }

    // ========== БОНУС ЗА СЛОЖНОСТЬ ==========
    let difficultyBonus = 0;
    switch (difficulty) {
        case 'easy':
            difficultyBonus = 0;
            break;
        case 'medium':
            difficultyBonus = 25;
            break;
        case 'hard':
            difficultyBonus = 50;
            break;
        default:
            difficultyBonus = 0;
    }

    // ========== БОНУС ЗА СОВЕРШЕНСТВО ==========
    // Дополнительный бонус для сочетания скорости и сложности
    let perfectionBonus = 0;

    if (difficulty === 'hard' && responseTime < 5000) {
        perfectionBonus = 25; // Бонус за быстрое решение сложной задачи
    } else if (difficulty === 'medium' && responseTime < 3000) {
        perfectionBonus = 15; // Бонус за очень быстрое решение средней задачи  
    } else if (difficulty === 'easy' && responseTime < 2000) {
        perfectionBonus = 10; // Небольшой бонус за мгновенное решение легкой задачи
    }

    // Общий счет
    const total = BASE_POINTS + timeBonus + difficultyBonus + perfectionBonus;

    return {
        base: BASE_POINTS,
        timeBonus,
        difficultyBonus,
        perfectionBonus,
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