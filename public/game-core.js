/**
 * 🎮 ОСНОВНАЯ ЛОГИКА ИГРЫ
 */
// Глобальные переменные
let telegramApp = null;
export const AppGameData = {
    score: 0,
    gameId: null,
    currentStory: null,
    currentStoryIndex: 0,
    stories: [],
    secondsLeft: 60,
    timerDuration: 60,
    timer: null,
    startTime: null,
    result: null,
    gameResult: null,
    isAnswering: false,
    answerSelected: false,
    token: null,
    theme: 'dark',
    isTestMode: false
};
// Экспорт в window
if (typeof window !== 'undefined') {
    window.GameData = AppGameData;
}
/**
 * Обработка выбора ответа
 */
export function selectAnswer(mistakeId) {
    console.log(`🎯 Выбран ответ: ${mistakeId}`);
    if (AppGameData.isAnswering) {
        console.log('⚠️ Уже обрабатывается ответ, игнорируем клик');
        return;
    }
    AppGameData.isAnswering = true;
    AppGameData.answerSelected = true;
    // Останавливаем таймер
    if (AppGameData.timer !== null) {
        clearInterval(AppGameData.timer);
        AppGameData.timer = null;
    }
    // Тактильная обратная связь
    if (telegramApp?.HapticFeedback) {
        telegramApp.HapticFeedback.impactOccurred('medium');
    }
    // Вычисляем время ответа
    const timeSpent = AppGameData.timerDuration - AppGameData.secondsLeft;
    // Находим варианты ответов
    const selectedMistake = AppGameData.currentStory?.mistakes.find(m => m.id === mistakeId);
    const correctMistake = AppGameData.currentStory?.mistakes.find(m => m.isCorrect);
    // Проверяем правильность
    const isCorrect = selectedMistake ? selectedMistake.isCorrect : false;
    // Сохраняем результат в текущую историю
    const currentIndex = AppGameData.currentStoryIndex;
    if (AppGameData.stories && AppGameData.stories[currentIndex]) {
        AppGameData.stories[currentIndex].correct = isCorrect;
        AppGameData.stories[currentIndex].answered = true;
        AppGameData.stories[currentIndex].selectedMistakeId = mistakeId;
    }
    // Рассчитываем очки
    const points = calculatePoints(isCorrect, timeSpent, AppGameData.currentStory?.difficulty || 'medium');
    // Обновляем общий счет
    if (isCorrect) {
        AppGameData.score += points.total;
        console.log(`🎯 Начислено очков: ${points.total}, общий счет: ${AppGameData.score}`);
    }
    // Создаем объект результата
    const result = {
        correct: isCorrect,
        explanation: isCorrect
            ? (selectedMistake?.explanation || 'Верно!')
            : (correctMistake?.explanation || 'Неверно!'),
        pointsEarned: isCorrect ? points.total : 0,
        timeSpent: timeSpent
    };
    AppGameData.result = result;
    // Показываем результат
    setTimeout(() => {
        const gameInterface = window.GameInterface;
        if (gameInterface?.showResult) {
            gameInterface.showResult(result);
        }
        AppGameData.isAnswering = false;
    }, 1000);
}
/**
 * Расчет очков за ответ
 */
export function calculatePoints(isCorrect, timeSpent, difficulty) {
    if (!isCorrect) {
        return { base: 0, timeBonus: 0, difficultyBonus: 0, perfectionBonus: 0, total: 0 };
    }
    const BASE_POINTS = 100;
    const MAX_TIME = 15000;
    // Бонус за скорость
    let timeBonus = 0;
    if (timeSpent <= MAX_TIME) {
        const timeRatio = timeSpent / MAX_TIME;
        const speedMultiplier = Math.pow(1 - timeRatio, 1.5);
        timeBonus = Math.round(50 * speedMultiplier);
        if (timeSpent < 3000)
            timeBonus += 10;
        if (timeSpent < 1500)
            timeBonus += 15;
    }
    // Бонус за сложность
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
    }
    // Бонус за совершенство
    let perfectionBonus = 0;
    if (difficulty === 'hard' && timeSpent < 5000)
        perfectionBonus = 25;
    else if (difficulty === 'medium' && timeSpent < 3000)
        perfectionBonus = 15;
    else if (difficulty === 'easy' && timeSpent < 2000)
        perfectionBonus = 10;
    const totalPoints = BASE_POINTS + timeBonus + difficultyBonus + perfectionBonus;
    return {
        base: BASE_POINTS,
        timeBonus: timeBonus,
        difficultyBonus: difficultyBonus,
        perfectionBonus: perfectionBonus,
        total: totalPoints
    };
}
/**
 * Установка Telegram App
 */
export function setTelegramApp(app) {
    telegramApp = app;
}
