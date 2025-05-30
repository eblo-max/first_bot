/**
 * Основной файл приложения "Криминальный Блеф"
 * Содержит логику игры, взаимодействие с API и обработку пользовательских действий
 */

// Объект Telegram WebApp для доступа к API Telegram Mini Apps
let tg = null;

// Флаг отслеживания инициализации приложения
let isInitialized = false;

/**
 * Инициализация приложения
 */
async function initApp() {
    // НЕ ОЧИЩАЕМ ВЕСЬ localStorage - только сбрасываем игровое состояние
    // Сохраняем токены авторизации перед сбросом
    const savedToken = localStorage.getItem('token');
    const savedAuthToken = localStorage.getItem('auth_token');
    const savedInitData = localStorage.getItem('initData');

    // Очищаем только sessionStorage и игровые данные
    sessionStorage.clear();

    // Удаляем только игровые ключи из localStorage, сохраняя авторизацию
    const keysToKeep = ['token', 'auth_token', 'initData'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });

    // Восстанавливаем токены если они были
    if (savedToken) localStorage.setItem('token', savedToken);
    if (savedAuthToken) localStorage.setItem('auth_token', savedAuthToken);
    if (savedInitData) localStorage.setItem('initData', savedInitData);

    if (window.GameState) {
        GameState.data.token = null;
        GameState.data.user = null;
        GameState.data.isTestMode = false;

        // Восстанавливаем токен в GameState если он есть в localStorage
        const existingToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
        // БОЛЕЕ СТРОГАЯ ПРОВЕРКА: только если токен НАЧИНАЕТСЯ с префиксов
        if (existingToken && !existingToken.startsWith('test_token_') && !existingToken.startsWith('guest_')) {
            GameState.data.token = existingToken;
            Logger?.debug('Восстановлен токен в GameState из localStorage');
        }

        // Восстанавливаем данные пользователя если они есть
        const existingUser = localStorage.getItem('user');
        if (existingUser) {
            try {
                GameState.data.user = JSON.parse(existingUser);
                Logger?.debug('Восстановлены данные пользователя в GameState');
            } catch (e) {
                Logger?.warn('Ошибка парсинга данных пользователя:', e);
            }
        }
    }
    isInitialized = false;

    // Создаем глобальный объект для доступа к приложению из тестов
    window.CriminalBluffApp = {
        getData: () => GameState.data,
        isReady: () => isInitialized,
        getState: () => ({
            currentScreen: GameState.current,
            isLoading: document.querySelector('.loading-container').style.display !== 'none',
            totalScore: GameState.data.score,
            currentStoryIndex: GameState.data.currentStoryIndex,
            storiesCount: GameState.data.stories.length
        })
    };

    try {
        // Проверяем наличие Telegram WebApp API
        if (!window.Telegram || !window.Telegram.WebApp) {
            Logger?.warn('Telegram WebApp API недоступен, запуск в тестовом режиме');
            handleNoTelegramApi();
            return;
        }

        // Получаем объект Telegram WebApp
        tg = window.Telegram.WebApp;

        // Применяем тему Telegram
        const theme = tg.colorScheme || 'dark';
        GameState.data.theme = theme;
        document.body.setAttribute('data-theme', theme);

        // Раскрываем приложение на весь экран
        tg.expand();
        tg.BackButton.hide();
        tg.BackButton.onClick(() => handleBackButton());

        // НОВАЯ ЛОГИКА: Сначала проверяем существующие токены
        const existingToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
        console.log('🔑 Проверка существующих токенов:', existingToken ? `${existingToken.substring(0, 20)}...` : 'НЕТ');

        // БОЛЕЕ СТРОГАЯ ПРОВЕРКА: только если токен НАЧИНАЕТСЯ с префиксов
        if (existingToken && !existingToken.startsWith('test_token_') && !existingToken.startsWith('guest_')) {
            // Есть валидный токен - проверяем его на сервере
            Logger?.debug('✅ Найден сохраненный токен, проверяем валидность');
            await verifyExistingToken(existingToken);
            return;
        }

        // Нет валидного токена - проверяем данные Telegram для новой авторизации
        await checkTelegramAuth();

        // Сообщаем Telegram, что приложение готово
        tg.ready();
    } catch (error) {
        Logger?.error('Ошибка инициализации приложения:', error);
        handleNoTelegramApi();
    }

    // Принудительно прекращаем загрузку через 2 секунды, если она ещё активна
    setTimeout(() => {
        if (document.querySelector('.loading-container').style.display !== 'none') {
            Logger?.warn('Загрузка принудительно прервана по таймауту безопасности');
            showContent();
            isInitialized = true;
        }
    }, 2000);
}

/**
 * Скрывает экран загрузки и показывает контент
 */
function showContent() {
    document.querySelector('.loading-container').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
}

/**
 * Обработка кнопки назад Telegram
 */
function handleBackButton() {
    // Если мы на экране с результатом вопроса, возвращаемся к игре
    if (GameState.current === 'result') {
        nextQuestion();
        tg.BackButton.hide();
    }
    // Если мы на экране с результатами игры, возвращаемся в главное меню
    else if (GameState.current === 'finish') {
        goToMain();
        tg.BackButton.hide();
    }
    // Если мы на игровом экране, показываем диалог подтверждения
    else if (GameState.current === 'game') {
        if (confirm('Вы уверены, что хотите прервать игру?')) {
            abandonGame();
        }
    }
}

/**
 * Обработка отсутствия Telegram WebApp API
 */
function handleNoTelegramApi() {
    GameState.data.isTestMode = true;

    // Создаем тестовую заглушку для Telegram WebApp API если её ещё нет
    if (!window.Telegram) {
        window.Telegram = {
            WebApp: {
                ready: () => { Logger?.debug('WebApp.ready() вызван в режиме тестирования'); },
                expand: () => { Logger?.debug('WebApp.expand() вызван в режиме тестирования'); },
                initData: "test_mode_data",
                initDataUnsafe: {
                    user: {
                        id: 12345678,
                        first_name: "Test",
                        last_name: "User",
                        username: "testuser"
                    }
                },
                BackButton: {
                    show: () => { Logger?.debug('BackButton.show() вызван в режиме тестирования'); },
                    hide: () => { Logger?.debug('BackButton.hide() вызван в режиме тестирования'); },
                    onClick: (callback) => { Logger?.debug('BackButton.onClick() установлен в режиме тестирования'); }
                },
                colorScheme: "dark",
                HapticFeedback: {
                    impactOccurred: () => { Logger?.debug('HapticFeedback.impactOccurred вызван в режиме тестирования'); },
                    notificationOccurred: () => { Logger?.debug('HapticFeedback.notificationOccurred вызван в режиме тестирования'); }
                }
            }
        };
    }

    tg = window.Telegram.WebApp;
    handleTestMode();
}

/**
 * Обработка тестового режима (ТОЛЬКО для реального тестирования с test_mode_data)
 */
function handleTestMode() {
    Logger?.debug('🧪 Включен режим тестирования с test_mode_data');
    GameState.data.isTestMode = true;
    showContent();
    isInitialized = true;

    // ВАЖНО: НЕ создаем токены автоматически!
    // Токены создаются только при явной авторизации

    // Создаем моковые данные ТОЛЬКО если есть специальный параметр для автотестов
    if (GameState.data.isTestMode && window.location.search.includes('autostory=true')) {
        // Создаем тестовый токен ТОЛЬКО для автотестов
        const testToken = `test_token_${Date.now()}`;
        GameState.data.token = testToken;
        localStorage.setItem('token', testToken);

        setTimeout(() => {
            const testStory = {
                id: 'test-story-1',
                title: 'Тестовая история',
                content: 'Это тестовая история для демонстрации работы приложения без бэкенда.',
                difficulty: 'easy',
                mistakes: [
                    { id: 'mistake-1', text: 'Вариант ответа 1', isCorrect: true, explanation: 'Правильный ответ' },
                    { id: 'mistake-2', text: 'Вариант ответа 2', isCorrect: false, explanation: 'Неправильный ответ' },
                    { id: 'mistake-3', text: 'Вариант ответа 3', isCorrect: false, explanation: 'Неправильный ответ' }
                ]
            };

            GameState.data.stories = [testStory];
            GameState.data.currentStoryIndex = 0;
            GameState.data.score = 0;
            GameState.showScreen('game');
            GameState.updateGameScreen();
        }, 1000);
    } else {
        // Обычный тестовый режим без токенов - деактивируем профиль
        setTimeout(() => {
            const profileButton = document.getElementById('goToProfile');
            if (profileButton) {
                profileButton.style.opacity = '0.5';
                profileButton.style.pointerEvents = 'none';
                profileButton.title = 'Профиль недоступен в тестовом режиме';
            }
        }, 100);
    }
}

/**
 * Авторизация пользователя через Telegram WebApp
 */
async function authorize() {
    try {
        // Очищаем старые токены, если они есть
        const oldToken = localStorage.getItem('token');
        if (oldToken && oldToken.includes('guest_')) {
            localStorage.removeItem('token');
            Logger?.debug('Найден старый гостевой токен, очищаем localStorage');
        }

        // Проверяем наличие initData от Telegram
        if (!tg.initData || tg.initData.trim() === '') {
            Logger?.error('Telegram WebApp initData отсутствует или пуст');
            throw new Error('Отсутствуют данные авторизации Telegram');
        }

        // Проверяем данные пользователя только если они есть
        const telegramUser = tg.initDataUnsafe?.user;
        if (telegramUser) {
            Logger?.debug('Найден пользователь Telegram:', telegramUser.id || telegramUser.first_name || 'неизвестно');
        } else {
            Logger?.debug('initDataUnsafe.user отсутствует, но initData есть - продолжаем авторизацию');
        }

        // Отправляем запрос авторизации
        const response = await fetch('/api/auth/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                initData: tg.initData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            Logger?.error(`Ошибка авторизации: ${response.status} - ${errorText}`);
            throw new Error(`Ошибка авторизации: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !data.data.token) {
            throw new Error('Сервер не вернул токен авторизации');
        }

        // Сохраняем токен и данные пользователя
        GameState.data.token = data.data.token;
        GameState.data.user = data.data.user;

        localStorage.setItem('token', data.data.token);
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // Сохраняем initData для будущих использований
        if (tg.initData) {
            localStorage.setItem('initData', tg.initData);
        }

        Logger?.info('Пользователь авторизован:', data.data.user?.name || 'Неизвестно');

        // Показываем контент и завершаем инициализацию
        showContent();
        isInitialized = true;

    } catch (error) {
        Logger?.error('Ошибка авторизации:', error);

        // Fallback для случаев когда основная авторизация не работает
        Logger?.debug('Создание гостевых пользователей отключено. Переходим в тестовый режим.');

        try {
            // Проверяем доступность API сервера
            const healthResponse = await fetch('/api/health');
            if (healthResponse.ok) {
                Logger?.debug('API сервер доступен, проблема с авторизацией Telegram');
            }
        } catch (e) {
            Logger?.error('API сервер недоступен:', e);
        }

        // Переходим в тестовый режим
        handleTestMode();
    }
}

/**
 * Начало новой игры
 */
async function startGame() {
    try {
        // Проверяем инициализацию приложения
        if (!isInitialized) {
            Logger?.warn('Приложение не инициализировано. Выполняем принудительную инициализацию.');
            await initApp();

            setTimeout(() => {
                if (!isInitialized) {
                    Logger?.warn('Инициализация не удалась. Включаем тестовый режим.');
                    handleTestMode();
                }
            }, 1000);
            return;
        }

        // Сбрасываем состояние игры
        GameState.data.score = 0;
        GameState.data.currentStoryIndex = 0;
        GameState.data.stories = [];
        GameState.data.gameStartTime = Date.now();

        // Тестовый режим
        if (GameState.data.isTestMode) {
            const testStories = generateTestStories();
            GameState.data.stories = testStories;
            GameState.data.currentStory = testStories[0];
            GameState.showScreen('game');
            GameState.updateGameScreen();
            startTimer();
            return;
        }

        // Запрос данных игры с сервера
        const response = await fetch('/api/game/start', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.gameId || !data.stories || data.stories.length === 0) {
            throw new Error('Неверные данные игры от сервера');
        }

        // Сохраняем данные игры
        GameState.data.gameId = data.gameId;
        GameState.data.stories = data.stories;
        GameState.data.currentStory = data.stories[0];

        // Переходим к игровому экрану
        GameState.showScreen('game');
        GameState.updateGameScreen();
        startTimer();

    } catch (error) {
        Logger?.error('Ошибка начала игры:', error);

        // Fallback - генерируем тестовые данные
        GameState.data.isTestMode = true;
        const testStories = generateTestStories();
        GameState.data.stories = testStories;
        GameState.data.currentStory = testStories[0];
        GameState.showScreen('game');
        GameState.updateGameScreen();
        startTimer();
    }
}

/**
 * Генерация тестовых историй
 */
function generateTestStories() {
    return [
        {
            id: 'test-1',
            title: 'Ограбление ювелирного магазина',
            content: 'Вор проник в ювелирный магазин ночью, отключил сигнализацию, вскрыл сейф и украл драгоценности. Однако он оставил отпечатки пальцев на витрине.',
            difficulty: 'easy',
            mistakes: [
                { id: 'm1', text: 'Оставил отпечатки пальцев', isCorrect: true, explanation: 'Правильно! Это классическая ошибка преступников.' },
                { id: 'm2', text: 'Отключил сигнализацию', isCorrect: false, explanation: 'Это не ошибка, а часть плана.' },
                { id: 'm3', text: 'Действовал ночью', isCorrect: false, explanation: 'Ночное время - логичный выбор для кражи.' }
            ]
        },
        {
            id: 'test-2',
            title: 'Кража в офисе',
            content: 'Сотрудник украл деньги из кассы и попытался скрыть это, подделав документы. Но он забыл, что в офисе установлены камеры видеонаблюдения.',
            difficulty: 'medium',
            mistakes: [
                { id: 'm1', text: 'Подделал документы', isCorrect: false, explanation: 'Это попытка скрыть преступление, не ошибка.' },
                { id: 'm2', text: 'Забыл про камеры', isCorrect: true, explanation: 'Именно! Не учел систему видеонаблюдения.' },
                { id: 'm3', text: 'Украл из кассы', isCorrect: false, explanation: 'Это само преступление, а не ошибка в его совершении.' }
            ]
        }
    ];
}

/**
 * Запуск таймера для текущего вопроса
 */
function startTimer() {
    // Останавливаем предыдущий таймер, если он есть
    if (GameState.data.timerId) {
        clearInterval(GameState.data.timerId);
    }

    const timerDuration = 60; // секунд
    GameState.data.secondsLeft = timerDuration;
    GameState.data.isAnswering = true;

    const timerDisplay = document.getElementById('timer-display');
    const timerFill = document.getElementById('timer-fill');

    // Обновляем отображение
    if (timerDisplay) timerDisplay.textContent = GameState.data.secondsLeft;
    if (timerFill) timerFill.style.strokeDashoffset = '0';

    GameState.data.timerId = setInterval(() => {
        GameState.data.secondsLeft--;

        // Обновляем отображение
        if (timerDisplay) timerDisplay.textContent = GameState.data.secondsLeft;

        // Обновляем кольцо таймера
        if (timerFill) {
            const progress = GameState.data.secondsLeft / timerDuration;
            const circumference = 2 * Math.PI * 45; // радиус = 45
            const offset = circumference * (1 - progress);
            timerFill.style.strokeDashoffset = offset;
        }

        // Проверяем, не истекло ли время
        if (GameState.data.secondsLeft <= 0) {
            timeExpired();
        }
    }, 1000);
}

/**
 * Обработка истечения времени
 */
function timeExpired() {
    // Останавливаем таймер
    if (GameState.data.timerId) {
        clearInterval(GameState.data.timerId);
        GameState.data.timerId = null;
    }

    GameState.data.isAnswering = false;

    // Если уже выбран ответ, не обрабатываем истечение времени
    if (GameState.data.result) return;

    // Обрабатываем как неправильный ответ
    const currentStory = GameState.data.currentStory;
    if (!currentStory || !currentStory.mistakes) {
        Logger?.error('Текущая история или варианты ответов отсутствуют');
        return;
    }

    // Обновляем историю в состоянии игры
    const currentIndex = GameState.data.currentStoryIndex;
    if (GameState.data.stories[currentIndex]) {
        GameState.data.stories[currentIndex] = {
            ...GameState.data.stories[currentIndex],
            answered: true,
            correct: false,
            timeExpired: true,
            selectedMistakeId: null,
            pointsEarned: 0
        };
    }

    // Показываем результат
    GameState.data.result = {
        correct: false,
        explanation: 'Время истекло! Правильный ответ: ' +
            (currentStory.mistakes.find(m => m.isCorrect)?.text || 'не найден'),
        pointsEarned: 0,
        timeExpired: true
    };

    // В тестовом режиме сразу показываем результат
    if (GameState.data.isTestMode) {
        GameState.showScreen('result');
        GameState.updateResultScreen();

        // Автоматический переход к следующему вопросу через 3 секунды
        setTimeout(() => {
            nextQuestion();
        }, 3000);

        return;
    }

    // В обычном режиме отправляем на сервер
    try {
        fetch('/api/game/submit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: GameState.data.gameId,
                storyId: currentStory.id,
                mistakeId: null,
                timeExpired: true,
                responseTime: 60000
            })
        });
    } catch (error) {
        Logger?.warn('Не удалось отправить результат истечения времени на сервер');
    }

    // Показываем результат
    GameState.showScreen('result');
    GameState.updateResultScreen();
}

/**
 * Выбор ответа пользователем
 */
async function selectAnswer(mistakeId) {
    // Проверяем, можно ли выбирать ответ
    if (!GameState.data.isAnswering || GameState.data.result) {
        return; // Ответ уже выбран или время истекло
    }

    // Останавливаем таймер
    if (GameState.data.timerId) {
        clearInterval(GameState.data.timerId);
        GameState.data.timerId = null;
    }

    GameState.data.isAnswering = false;

    const currentStory = GameState.data.currentStory;
    if (!currentStory) {
        Logger?.error('Текущая история не найдена');
        return;
    }

    // Рассчитываем затраченное время
    const timeTaken = 60 - GameState.data.secondsLeft;
    const timeLeft = GameState.data.secondsLeft;

    // Находим выбранный вариант
    const selectedMistake = currentStory.mistakes.find(m => m.id === mistakeId);
    if (!selectedMistake) {
        Logger?.error('Выбранный вариант ответа не найден');
        return;
    }

    const isCorrect = selectedMistake.isCorrect;

    // В тестовом режиме обрабатываем локально
    if (GameState.data.isTestMode) {
        const pointsDetails = calculateTestPoints(isCorrect, timeTaken, currentStory.difficulty);

        // Обновляем общий счет
        GameState.data.score += pointsDetails.total;

        // Обновляем историю в массиве
        const currentIndex = GameState.data.currentStoryIndex;
        GameState.data.stories[currentIndex] = {
            ...GameState.data.stories[currentIndex],
            answered: true,
            correct: isCorrect,
            selectedMistakeId: mistakeId,
            timeSpent: timeTaken,
            pointsEarned: pointsDetails.total
        };

        // Формируем результат
        GameState.data.result = {
            correct: isCorrect,
            explanation: selectedMistake.explanation,
            pointsEarned: pointsDetails.total,
            details: pointsDetails
        };

        // Показываем результат
        GameState.showScreen('result');
        GameState.updateResultScreen();
        return;
    }

    // Отправляем ответ на сервер
    try {
        const response = await fetch('/api/game/submit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: GameState.data.gameId,
                storyId: currentStory.id,
                mistakeId: mistakeId,
                responseTime: timeTaken * 1000
            })
        });

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'error') {
            Logger?.error('Ошибка при отправке ответа:', data.message);
            return;
        }

        // Обновляем состояние игры
        GameState.data.score = data.data.totalScore;
        GameState.data.result = {
            correct: data.data.correct,
            explanation: data.data.explanation,
            pointsEarned: data.data.pointsEarned
        };

        // Показываем результат
        GameState.showScreen('result');
        GameState.updateResultScreen();

    } catch (error) {
        Logger?.error('Ошибка при отправке ответа:', error);

        // Fallback - обрабатываем локально
        const pointsDetails = calculateTestPoints(isCorrect, timeTaken, currentStory.difficulty);
        GameState.data.score += pointsDetails.total;
        GameState.data.result = {
            correct: isCorrect,
            explanation: selectedMistake.explanation,
            pointsEarned: pointsDetails.total
        };

        GameState.showScreen('result');
        GameState.updateResultScreen();
    }
}

/**
 * Расчет очков в тестовом режиме
 */
function calculateTestPoints(isCorrect, timeSpent, difficulty = 'medium') {
    if (!isCorrect) {
        return { base: 0, timeBonus: 0, difficultyBonus: 0, total: 0 };
    }

    const basePoints = 100;
    const maxTimeBonus = 50;
    const timeBonus = Math.max(0, Math.round(maxTimeBonus * (1 - timeSpent / 60)));

    let difficultyBonus = 0;
    switch (difficulty) {
        case 'easy': difficultyBonus = 10; break;
        case 'medium': difficultyBonus = 25; break;
        case 'hard': difficultyBonus = 50; break;
    }

    const total = basePoints + timeBonus + difficultyBonus;
    return { base: basePoints, timeBonus, difficultyBonus, total };
}

/**
 * Переход к следующему вопросу
 */
function nextQuestion() {
    // Сбрасываем результат
    GameState.data.result = null;

    // Увеличиваем индекс текущей истории
    GameState.data.currentStoryIndex++;

    // Проверяем, есть ли еще истории
    if (GameState.data.currentStoryIndex >= GameState.data.stories.length) {
        // Игра завершена
        finishGame();
        return;
    }

    // Устанавливаем следующую историю
    GameState.data.currentStory = GameState.data.stories[GameState.data.currentStoryIndex];

    // Переходим к игровому экрану
    GameState.showScreen('game');
    GameState.updateGameScreen();

    // Запускаем таймер для новой истории
    startTimer();
}

/**
 * Завершение игры
 */
async function finishGame() {
    document.querySelector('.loading-container').style.display = 'flex';

    try {
        // ========== МАТЕМАТИЧЕСКИ ТОЧНЫЙ РАСЧЕТ СТАТИСТИКИ ==========

        // 1. ПОДСЧЕТ ПРАВИЛЬНЫХ ОТВЕТОВ (только из реальных данных)
        let actualCorrectAnswers = 0;
        const totalQuestions = 5; // Всегда 5 вопросов в игре

        if (GameState.data.stories && GameState.data.stories.length > 0) {
            GameState.data.stories.forEach((story, index) => {
                const isCorrect = story.correct === true;
                if (isCorrect) {
                    actualCorrectAnswers++;
                }

            });
        }

        // 2. МАТЕМАТИЧЕСКИЕ ФОРМУЛЫ ДЛЯ РАСЧЕТА
        const totalScore = GameState.data.score || 0;

        // Формула точности: (Правильные ответы / Общее количество вопросов) × 100%
        const accuracy = Math.round((actualCorrectAnswers / totalQuestions) * 100);

        // 3. ОТПРАВКА НА СЕРВЕР
        const gameStatistics = {
            gameId: GameState.data.gameId,
            totalScore: totalScore,
            correctAnswers: actualCorrectAnswers,
            totalQuestions: totalQuestions
        };

        // Отправляем запрос на завершение игры с точной статистикой
        const response = await fetch('/api/game/finish', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameStatistics)
        });

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const serverData = await response.json();

        // 4. СОХРАНЕНИЕ РЕЗУЛЬТАТОВ (ТОЛЬКО РЕАЛЬНЫХ ДАННЫХ)
        GameState.data.gameResult = {
            totalScore: totalScore,
            correctAnswers: actualCorrectAnswers,
            totalQuestions: totalQuestions,
            accuracy: accuracy,
            serverResponse: serverData
        };

        // Переключаемся на экран результатов
        GameState.transition('finish');

    } catch (error) {
        console.error('❌ Ошибка завершения игры:', error);

        // ДАЖЕ В СЛУЧАЕ ОШИБКИ - ИСПОЛЬЗУЕМ ТОЛЬКО РЕАЛЬНЫЕ ДАННЫЕ
        let failsafeCorrectAnswers = 0;
        if (GameState.data.stories) {
            failsafeCorrectAnswers = GameState.data.stories.filter(story => story.correct === true).length;
        }

        // Создаем результаты на основе РЕАЛЬНЫХ данных (без рандома)
        GameState.data.gameResult = {
            totalScore: GameState.data.score || 0,
            correctAnswers: failsafeCorrectAnswers,
            totalQuestions: 5,
            accuracy: Math.round((failsafeCorrectAnswers / 5) * 100),
            serverResponse: null,
            isOffline: true
        };

        // Показываем предупреждение, но продолжаем с локальными данными

        // Переходим к экрану результатов с локальными данными
        GameState.transition('finish');
    } finally {
        document.querySelector('.loading-container').style.display = 'none';
    }
}

/**
 * Прерывание игры
 */
async function abandonGame() {
    document.querySelector('.loading-container').style.display = 'flex';

    try {
        // Отправляем запрос на завершение игры с пометкой о прерывании
        await fetch('/api/game/finish', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: GameState.data.gameId
            })
        });

        // Возвращаемся на главный экран
        goToMain();

    } catch (error) {
        console.error('Ошибка прерывания игры:', error);
        goToMain();
    } finally {
        document.querySelector('.loading-container').style.display = 'none';
    }
}

/**
 * Начать новую игру
 */
function restartGame() {

    startGame();
}

/**
 * Вернуться на главный экран
 */
function goToMain() {

    GameState.transition('goToMain');

    if (tg) {
        tg.BackButton.hide();
    }

    // Очищаем игровые данные
    GameState.data.gameId = null;
    GameState.data.stories = [];
    GameState.data.currentStoryIndex = 0;
    GameState.data.currentStory = null;
    clearInterval(GameState.data.timerId);
}

/**
 * Тактильная обратная связь через Telegram
 * @param {string} type - Тип обратной связи
 */
function provideFeedback(type) {
    try {
        if (!tg || !tg.HapticFeedback) return;

        switch (type) {
            case 'correct':
                // Позитивная обратная связь
                tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'incorrect':
                // Негативная обратная связь
                tg.HapticFeedback.notificationOccurred('error');
                break;
            case 'tap':
                // Легкая обратная связь при нажатии
                tg.HapticFeedback.impactOccurred('light');
                break;
        }
    } catch (error) {
        // Fallback для тестирования вне Telegram

    }
}

/**
 * Обработка кликов по кнопкам и элементам интерфейса
 * @param {Event} event - DOM событие клика
 */
function handleButtonClick(event) {
    // Находим ближайший элемент с атрибутом data-action
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;

    // Получаем название действия
    const action = actionElement.getAttribute('data-action');

    // Тактильный отклик
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }

    // Обрабатываем различные действия
    switch (action) {
        case 'startGame':
            startGame();
            break;
        case 'selectAnswer':
            const mistakeId = actionElement.getAttribute('data-mistake-id');
            if (mistakeId) selectAnswer(mistakeId);
            break;
        case 'nextQuestion':
            nextQuestion();
            break;
        case 'restartGame':
            restartGame();
            break;
        case 'goToMain':
            goToMain();
            break;
        case 'feedback':
            const feedbackType = actionElement.getAttribute('data-feedback-type');
            if (feedbackType) provideFeedback(feedbackType);
            break;
        default:

    }
}

/**
 * Устанавливает слушатели событий для элементов интерфейса
 */
function setupEventListeners() {

    // Обработка кликов по всему документу с делегированием событий
    document.addEventListener('click', handleButtonClick);

    // Обработка изменения темы в TG WebApp
    if (tg && tg.colorScheme) {
        const onThemeChanged = () => {
            const newTheme = tg.colorScheme;

            GameState.data.theme = newTheme;
            document.body.setAttribute('data-theme', newTheme);
        };

        // Слушаем событие изменения темы
        tg.onEvent('themeChanged', onThemeChanged);
    }

    // Обработчик нажатия клавиш
    document.addEventListener('keydown', (event) => {
        // Обработка нажатия цифровых клавиш для быстрого выбора ответа
        if (GameState.current === 'game' && !GameState.data.isAnswering) {
            const keyToIndex = {
                '1': 0, '2': 1, '3': 2, '4': 3, // Цифры
                'a': 0, 'b': 1, 'c': 2, 'd': 3  // Буквы
            };

            const key = event.key.toLowerCase();
            if (key in keyToIndex) {
                const index = keyToIndex[key];
                const answers = GameState.data.currentStory?.mistakes || [];

                if (index < answers.length) {
                    selectAnswer(answers[index].id);
                }
            }
        }

        // Обработка нажатия Enter для перехода к следующему вопросу
        if (event.key === 'Enter' && GameState.current === 'result') {
            nextQuestion();
        }
    });

    // Обработчик видимости страницы для паузы/возобновления таймера
    document.addEventListener('visibilitychange', () => {
        if (GameState.current === 'game' && !GameState.data.isAnswering) {
            if (document.hidden) {
                // Страница скрыта - приостанавливаем таймер
                clearInterval(GameState.data.timerId);
                console.log('Таймер приостановлен (страница скрыта)');
            } else {
                // Страница снова видима - возобновляем таймер
                startTimer();
                console.log('Таймер возобновлен (страница снова видима)');
            }
        }
    });
}

/**
 * Инициализация приложения при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', function () {

    GameState.init();

    setupEventListeners();

    // Проверяем параметры URL для тестирования
    if (window.location.search.includes('test=true')) {

        GameState.data.isTestMode = true;
    }

    // Автоматический запуск игры, если указано в URL
    if (window.location.search.includes('autostart=true')) {

        setTimeout(() => {
            startGame();
        }, 500);
    }

    // Инициализируем приложение
    initApp();
});

/**
 * Обновление интерфейса при изменении данных
 */
GameState.updateUI = function () {
    // Обновляем счетчик очков
    document.getElementById('score-display').textContent = this.data.score;

    // Обновляем прогресс вопросов, если есть истории
    if (this.data.stories.length > 0) {
        document.getElementById('question-progress').textContent =
            `${this.data.currentStoryIndex + 1}/${this.data.stories.length}`;
    }

    // Обновляем таймер
    if (this.current === 'game') {
        document.getElementById('timer-value').textContent = this.data.secondsLeft;
        document.getElementById('timer-bar').style.width = `${(this.data.secondsLeft / this.data.timerDuration) * 100}%`;
    }

    // Обновляем информацию о текущей истории
    if (this.data.currentStory) {
        document.getElementById('story-title').textContent = this.data.currentStory.title;

        // Обновляем текстовый контент с выделением ключевых фраз
        const storyContent = document.getElementById('story-content');
        let content = this.data.currentStory.content || '';

        // БЕЗОПАСНОЕ обновление контента без innerHTML
        if (!content.includes('<span class="highlighted-text">')) {
            // Создаем безопасную разметку с выделением
            const fragments = content.split(/(\скрытую камеру над сейфом|\без перчаток|\раковиной в подсобке)/gi);

            // Очищаем контейнер безопасно
            while (storyContent.firstChild) {
                storyContent.removeChild(storyContent.firstChild);
            }

            fragments.forEach(fragment => {
                if (fragment.match(/скрытую камеру над сейфом|без перчаток|раковиной в подсобке/gi)) {
                    const span = document.createElement('span');
                    span.className = 'highlighted-text';
                    span.textContent = fragment;
                    storyContent.appendChild(span);
                } else if (fragment) {
                    const textNode = document.createTextNode(fragment);
                    storyContent.appendChild(textNode);
                }
            });
        } else {
            // Если контент уже содержит разметку, безопасно отображаем только текст
            storyContent.textContent = content.replace(/<[^>]*>/g, '');
        }

        // Обновляем метаданные истории
        if (document.getElementById('story-date')) {
            document.getElementById('story-date').textContent = this.data.currentStory.date || '';
        }
        if (document.getElementById('story-difficulty')) {
            document.getElementById('story-difficulty').textContent = this.data.currentStory.difficulty || '';
        }

        // Обновляем варианты ответов
        this.updateAnswers();

        // Обновляем текст кнопки действия
        if (document.getElementById('action-button')) {
            if (this.data.isAnswering) {
                document.getElementById('action-button').textContent = 'ПОДТВЕРДИТЬ ОТВЕТ';
            } else {
                document.getElementById('action-button').textContent = 'СЛЕДУЮЩЕЕ ДЕЛО';
            }
        }
    }

    // Обновляем экран результата
    if (this.data.result && this.current === 'result') {
        this.updateResultScreen();
    }

    // Обновляем экран финиша
    if (this.data.gameResult && this.current === 'finish') {
        this.updateFinishScreen();
    }
};

/**
 * Обновление вариантов ответов
 */
GameState.updateAnswers = function () {
    const container = document.getElementById('answers-container');
    if (!container || !this.data.currentStory || !this.data.currentStory.mistakes) return;

    // Очищаем контейнер
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Добавляем варианты ответов
    const letters = ['A', 'B', 'C', 'D'];
    this.data.currentStory.mistakes.forEach((mistake, index) => {
        const answerOption = document.createElement('div');
        answerOption.className = 'answer-option';
        answerOption.dataset.mistakeId = mistake.id;
        answerOption.dataset.action = 'selectAnswer';

        if (this.data.isAnswering) {
            answerOption.classList.add('disabled');
        }

        // Создаем маркер с буквой ответа
        const marker = document.createElement('div');
        marker.className = 'answer-marker';
        marker.textContent = letters[index];

        // Создаем текст ответа
        const text = document.createElement('div');
        text.className = 'answer-text';
        text.textContent = mistake.text;

        // Добавляем элементы в вариант ответа
        answerOption.appendChild(marker);
        answerOption.appendChild(text);

        // Добавляем вариант ответа в контейнер
        container.appendChild(answerOption);
    });
};

/**
 * Очистка всех сохраненных данных и перезапуск приложения
 * Можно вызвать из консоли браузера: window.clearAppCache()
 */
function clearAppCache() {

    // Очищаем localStorage полностью

    localStorage.clear();

    // Также проверяем и удаляем специфичные ключи
    const keysToRemove = ['token', 'auth_token', 'gameData', 'userData', 'initData'];
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);

    });

    // Очищаем sessionStorage
    sessionStorage.clear();

    // Сбрасываем состояние приложения
    if (window.GameState) {
        GameState.data.token = null;
        GameState.data.user = null;
        GameState.data.isTestMode = false;
    }
    isInitialized = false;

    // Перезапускаем приложение
    location.reload();
}

// Делаем функцию доступной глобально
window.clearAppCache = clearAppCache;
window.CriminalBluffApp = window.CriminalBluffApp || {};
window.CriminalBluffApp.clearCache = clearAppCache;

/**
 * Обработка отсутствия валидной авторизации Telegram
 */
function handleNoValidAuth() {
    Logger?.warn('⚠️ Нет валидных данных авторизации от Telegram');

    // НЕ создаем тестовые токены - просто показываем контент
    // В этом случае приложение работает, но кнопка профиля будет недоступна

    GameState.data.isTestMode = false; // Это НЕ тестовый режим
    GameState.data.token = null; // Нет токена
    GameState.data.user = null; // Нет пользователя

    // Показываем контент
    showContent();
    isInitialized = true;

    // Деактивируем кнопку профиля, так как нет авторизации
    setTimeout(() => {
        const profileButton = document.getElementById('goToProfile');
        if (profileButton) {
            profileButton.style.opacity = '0.5';
            profileButton.style.pointerEvents = 'none';
            profileButton.title = 'Профиль недоступен без авторизации Telegram';

            // Заменяем обработчик клика на предупреждение
            profileButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (window.Telegram?.WebApp?.showAlert) {
                    window.Telegram.WebApp.showAlert('Для доступа к профилю необходима авторизация через Telegram');
                } else {
                    alert('Для доступа к профилю необходима авторизация через Telegram');
                }
            });
        }
    }, 100);
}

/**
 * Проверка существующего токена на сервере
 */
async function verifyExistingToken(token) {
    try {
        console.log('🔍 Проверяем токен на сервере...');

        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Токен валиден - обновляем состояние
            GameState.data.token = token;
            GameState.data.user = data.user || JSON.parse(localStorage.getItem('user') || '{}');
            GameState.data.isAuthenticated = true;

            Logger?.info('✅ Токен валиден, пользователь авторизован:', data.user?.name || 'Неизвестно');

            // Показываем контент
            showContent();
            isInitialized = true;

        } else {
            console.warn('⚠️ Токен недействителен, требуется новая авторизация');

            // Токен недействителен - очищаем и требуем новую авторизацию
            localStorage.removeItem('token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');

            GameState.data.token = null;
            GameState.data.user = null;
            GameState.data.isAuthenticated = false;

            // Проверяем возможность новой авторизации через Telegram
            await checkTelegramAuth();
        }

    } catch (error) {
        Logger?.error('❌ Ошибка проверки токена:', error);

        // В случае ошибки сети - показываем контент с существующим токеном
        // (возможно сервер недоступен, но токен может быть валидным)
        GameState.data.token = token;
        GameState.data.user = JSON.parse(localStorage.getItem('user') || '{}');

        Logger?.warn('⚠️ Сервер недоступен, используем оффлайн режим');

        showContent();
        isInitialized = true;
    }
}

/**
 * Проверка возможности авторизации через Telegram
 */
async function checkTelegramAuth() {
    // Проверяем данные Telegram для новой авторизации
    if (tg.initData && tg.initData.trim() !== '' && !tg.initData.includes('test_mode_data')) {
        // Проверяем, есть ли корректные данные пользователя в initData
        try {
            // Декодируем initData для проверки наличия пользователя
            const initDataParams = new URLSearchParams(tg.initData);
            const userParam = initDataParams.get('user');

            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData && userData.id) {
                    Logger?.debug('✅ Найдены корректные данные пользователя в initData:', userData.id);
                    await authorize();
                    return;
                }
            }

            Logger?.debug('⚠️ initData присутствует, но не содержит данных пользователя');
            handleNoValidAuth();

        } catch (error) {
            Logger?.warn('Ошибка парсинга initData:', error);
            handleNoValidAuth();
        }
    } else {
        Logger?.debug('❌ Отсутствуют валидные данные Telegram initData');
        handleNoValidAuth();
    }
} 