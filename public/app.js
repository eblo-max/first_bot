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
function initApp() {
    console.log('Инициализация приложения начата...');

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
            console.warn('Telegram WebApp API недоступен, запуск в тестовом режиме');
            handleNoTelegramApi();
            return;
        }

        // Получаем объект Telegram WebApp
        tg = window.Telegram.WebApp;
        console.log('Telegram WebApp API найден, инициализация...');

        // Применяем тему Telegram
        const theme = tg.colorScheme || 'dark';
        GameState.data.theme = theme;
        document.body.setAttribute('data-theme', theme);
        console.log('Применена тема:', theme);

        // Раскрываем приложение на весь экран
        tg.expand();

        // Прячем кнопку "Назад"
        tg.BackButton.hide();

        // Настраиваем обработчик кнопки "Назад"
        tg.BackButton.onClick(() => handleBackButton());

        // Пытаемся получить токен из localStorage
        const token = localStorage.getItem('token');
        GameState.data.token = token;
        console.log('Токен из localStorage:', token ? 'Найден' : 'Не найден');

        // Если токен есть, отмечаем инициализацию
        if (token) {
            isInitialized = true;
        }

        // Проверяем данные пользователя
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            console.log('Данные пользователя получены:', tg.initDataUnsafe.user.username);
            if (!token) {
                // Проходим процесс авторизации
                console.log('Начинаем процесс авторизации...');
                authorize();
            } else {
                // Просто отображаем главный экран
                console.log('Переход на главный экран...');
                showContent();
            }
        } else {
            // Если данные пользователя отсутствуют, показываем заглушку для тестирования
            console.warn('Telegram WebApp: initDataUnsafe не содержит данных пользователя. Режим разработки.');
            handleTestMode();
        }

        // Сообщаем Telegram, что приложение готово
        console.log('Отправка сигнала ready() в Telegram WebApp...');
        tg.ready();
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        handleNoTelegramApi();
    }

    // Принудительно прекращаем загрузку через 2 секунды, если она ещё активна
    setTimeout(() => {
        if (document.querySelector('.loading-container').style.display !== 'none') {
            console.warn('Загрузка принудительно прервана по таймауту безопасности');
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
    console.warn('Запуск в режиме тестирования - Telegram WebApp API недоступен');
    GameState.data.isTestMode = true;

    // Создаем тестовую заглушку для Telegram WebApp API если её ещё нет
    if (!window.Telegram) {
        window.Telegram = {
            WebApp: {
                ready: () => { console.log('WebApp.ready() вызван в режиме тестирования'); },
                expand: () => { console.log('WebApp.expand() вызван в режиме тестирования'); },
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
                    show: () => { console.log('BackButton.show() вызван в режиме тестирования'); },
                    hide: () => { console.log('BackButton.hide() вызван в режиме тестирования'); },
                    onClick: (callback) => { console.log('BackButton.onClick() установлен в режиме тестирования'); }
                },
                colorScheme: "dark",
                HapticFeedback: {
                    impactOccurred: () => { console.log('HapticFeedback.impactOccurred вызван в режиме тестирования'); },
                    notificationOccurred: () => { console.log('HapticFeedback.notificationOccurred вызван в режиме тестирования'); }
                }
            }
        };
    }

    tg = window.Telegram.WebApp;
    handleTestMode();
}

/**
 * Обработка тестового режима
 */
function handleTestMode() {
    console.log('Активация тестового режима...');
    GameState.data.isTestMode = true;
    showContent();
    isInitialized = true;

    // Генерируем тестовый токен, если нет настоящего
    if (!GameState.data.token) {
        const testToken = `test_token_${Date.now()}`;
        GameState.data.token = testToken;
        localStorage.setItem('token', testToken);
        console.log('Сгенерирован тестовый токен:', testToken);
    }

    console.log('Приложение запущено в тестовом режиме');

    // Создаем моковые данные для тестирования
    if (GameState.data.isTestMode && window.location.search.includes('autostory=true')) {
        setTimeout(() => {
            console.log('Автоматическая загрузка тестовой истории...');
            const testStory = {
                id: 'test-story-1',
                title: 'Тестовая история',
                content: 'Это тестовая история для демонстрации работы приложения без бэкенда.',
                mistakes: [
                    { id: 'mistake-1', text: 'Ошибка 1' },
                    { id: 'mistake-2', text: 'Ошибка 2' },
                    { id: 'mistake-3', text: 'Ошибка 3' }
                ]
            };

            GameState.data.stories = [testStory];
            GameState.data.currentStory = testStory;
            GameState.data.currentStoryIndex = 0;
            GameState.transition('startGame');
            startTimer();
        }, 1000);
    }
}

/**
 * Авторизация
 */
async function authorize() {
    try {
        // Отправляем запрос на авторизацию
        const response = await fetch('/api/auth/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ initData: tg.initData })
        });

        if (!response.ok) {
            throw new Error(`Ошибка авторизации: ${response.status}`);
        }

        const data = await response.json();

        // Сохраняем токен
        GameState.data.token = data.token;
        localStorage.setItem('token', data.token);

        // Отмечаем, что инициализация завершена
        isInitialized = true;

        // Прячем экран загрузки
        showContent();
        console.log('Авторизация успешна, токен получен');
    } catch (error) {
        console.error('Ошибка авторизации:', error);

        // Проверка доступности сервера или сети
        try {
            await fetch('/api/health');
            console.log('API сервер доступен, проблема с авторизацией');
        } catch (e) {
            console.error('API сервер недоступен:', e);
        }

        // Включаем тестовый режим в случае ошибки авторизации
        handleTestMode();
    }
}

/**
 * Начало игры
 */
async function startGame() {
    // Проверяем инициализацию или принудительно инициализируем
    if (!isInitialized) {
        console.warn('Приложение не инициализировано. Выполняем принудительную инициализацию.');
        // Пробуем инициализировать
        if (typeof initApp === 'function') {
            initApp();
            // Если всё равно не инициализировано, входим в тестовый режим
            if (!isInitialized) {
                console.warn('Инициализация не удалась. Включаем тестовый режим.');
                GameState.data.isTestMode = true;
                isInitialized = true;
            }
        } else {
            alert('Ошибка инициализации игры. Попробуйте обновить страницу.');
            return;
        }
    }

    document.querySelector('.loading-container').style.display = 'flex';
    console.log('Начало игры...');

    try {
        // Запрос на начало игры
        const response = await fetch('/api/game/start', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${GameState.data.token || 'test_token'}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка начала игры: ${response.status}`);
        }

        const data = await response.json();
        console.log('Данные игры получены от сервера:', data);

        // Сохраняем данные игры
        GameState.data.gameId = data.gameId;
        GameState.data.stories = data.stories;
        GameState.data.currentStoryIndex = 0;
        GameState.data.currentStory = data.stories[0];
        GameState.data.score = 0;

        // Переключаемся на игровой экран
        GameState.transition('startGame');

        // Запускаем таймер
        startTimer();

        // Показываем кнопку "Назад" в Telegram
        if (tg && tg.BackButton) {
            tg.BackButton.show();
        }

    } catch (error) {
        console.error('Ошибка начала игры:', error);

        // Проверка доступности сервера
        let serverDown = false;
        try {
            await fetch('/api/health');
        } catch (e) {
            serverDown = true;
        }

        if (serverDown) {
            alert('Сервер недоступен. Приложение работает в автономном режиме.');
        } else {
            alert('Не удалось начать игру. Проверьте подключение к интернету.');
        }

        // Автоматически переходим в тестовый режим при ошибке
        GameState.data.isTestMode = true;
        console.log('Генерация тестовых данных для игры...');
        const testStory = {
            id: 'test-story-1',
            title: 'Ограбление музея',
            content: 'Ночью в местном музее произошло ограбление. Преступник проник через окно на втором этаже, разбил витрину и похитил знаменитый алмаз "Звезда Востока". На следующий день он попытался продать его перекупщику, но был задержан полицией.',
            mistakes: [
                { id: 'mistake-1', text: 'Неправильно выбрал время' },
                { id: 'mistake-2', text: 'Оставил отпечатки пальцев' },
                { id: 'mistake-3', text: 'Слишком быстро пытался продать украденное' }
            ]
        };

        GameState.data.gameId = `test-game-${Date.now()}`;
        GameState.data.stories = [testStory];
        GameState.data.currentStoryIndex = 0;
        GameState.data.currentStory = testStory;

        GameState.transition('startGame');
        startTimer();
    } finally {
        document.querySelector('.loading-container').style.display = 'none';
    }
}

/**
 * Таймер обратного отсчета
 */
function startTimer() {
    // Сбрасываем таймер
    clearInterval(GameState.data.timer);
    GameState.data.secondsLeft = 15;
    GameState.data.startTime = Date.now();
    console.log('Таймер запущен, 15 секунд...');
    GameState.updateUI();

    // Запускаем таймер обратного отсчета
    GameState.data.timer = setInterval(() => {
        GameState.data.secondsLeft--;
        GameState.updateUI();

        // Если время вышло, автоматически выбираем первый вариант
        if (GameState.data.secondsLeft <= 0) {
            clearInterval(GameState.data.timer);
            console.log('Время истекло!');
            if (!GameState.data.isAnswering) {
                timeExpired();
            }
        }
    }, 1000);
}

/**
 * Время истекло
 */
function timeExpired() {
    console.log('Выбор автоматического ответа...');
    // Выбираем первый вариант по умолчанию
    if (GameState.data.currentStory && GameState.data.currentStory.mistakes.length > 0) {
        selectAnswer(GameState.data.currentStory.mistakes[0].id);
    }
}

/**
 * Выбор ответа
 * @param {string} mistakeId - ID ошибки
 */
async function selectAnswer(mistakeId) {
    if (GameState.data.isAnswering) return;

    // Останавливаем таймер
    clearInterval(GameState.data.timer);
    GameState.data.isAnswering = true;
    console.log('Выбран ответ:', mistakeId);

    // Вычисляем время ответа
    const responseTime = Date.now() - GameState.data.startTime;

    try {
        // Haptic feedback через Telegram WebApp
        provideFeedback('tap');

        // Отправляем ответ на сервер
        const response = await fetch('/api/game/submit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: GameState.data.gameId,
                storyId: GameState.data.currentStory.id,
                mistakeId,
                responseTime
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка отправки ответа');
        }

        const data = await response.json();
        console.log('Получен результат от сервера:', data);

        // Запоминаем результат ответа
        GameState.data.result = data;

        // Обновляем общий счет
        GameState.data.score = data.totalScore;

        // Показываем тактильную обратную связь
        provideFeedback(data.correct ? 'correct' : 'incorrect');

        // Переключаемся на экран результата
        GameState.transition('showResult');

    } catch (error) {
        console.error('Ошибка отправки ответа:', error);
        alert('Не удалось отправить ответ. Попробуйте еще раз.');

        // В тестовом режиме создаем моковый результат
        if (GameState.data.isTestMode) {
            console.log('Генерация тестового результата...');
            const isCorrect = Math.random() > 0.5;

            GameState.data.result = {
                correct: isCorrect,
                explanation: isCorrect
                    ? 'Правильно! Преступник совершил ошибку, пытаясь слишком быстро продать украденное. Это привлекло внимание полиции.'
                    : 'Неправильно. Основная ошибка преступника была в том, что он слишком быстро попытался продать украденное, не выждав достаточно времени.',
                details: {
                    base: 100,
                    timeBonus: Math.floor(responseTime / 1000) * 10,
                    difficultyBonus: 20,
                    total: 100 + Math.floor(responseTime / 1000) * 10 + 20
                },
                totalScore: GameState.data.score + (isCorrect ? 150 : 0)
            };

            if (isCorrect) {
                GameState.data.score += GameState.data.result.details.total;
            }

            GameState.transition('showResult');
        }

        GameState.data.isAnswering = false;
    }
}

/**
 * Переход к следующему вопросу
 */
function nextQuestion() {
    // Переходим к следующему вопросу
    GameState.data.currentStoryIndex++;
    GameState.data.isAnswering = false;
    console.log('Переход к следующему вопросу, индекс:', GameState.data.currentStoryIndex);

    // Если есть еще вопросы, показываем их
    if (GameState.data.currentStoryIndex < GameState.data.stories.length) {
        GameState.data.currentStory = GameState.data.stories[GameState.data.currentStoryIndex];
        GameState.transition('nextQuestion');
        startTimer();
    } else {
        // Завершаем игру
        finishGame();
    }
}

/**
 * Завершение игры
 */
async function finishGame() {
    document.querySelector('.loading-container').style.display = 'flex';
    console.log('Завершение игры...');

    try {
        // Отправляем запрос на завершение игры
        const response = await fetch('/api/game/finish', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: GameState.data.gameId
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка завершения игры');
        }

        const data = await response.json();
        console.log('Получены результаты игры:', data);

        // Сохраняем результаты игры
        GameState.data.gameResult = data;

        // Переключаемся на экран результатов
        GameState.transition('finish');

    } catch (error) {
        console.error('Ошибка завершения игры:', error);
        alert('Не удалось завершить игру. Результаты могут быть не сохранены.');

        // В тестовом режиме создаем моковые результаты
        if (GameState.data.isTestMode) {
            console.log('Генерация тестовых результатов игры...');
            const correctAnswers = Math.floor(Math.random() * 5) + 3; // 3-7 правильных ответов
            const totalQuestions = 10;

            GameState.data.gameResult = {
                totalScore: GameState.data.score,
                correctAnswers: correctAnswers,
                totalQuestions: totalQuestions,
                accuracy: Math.floor((correctAnswers / totalQuestions) * 100),
                stats: {
                    totalGames: 5,
                    totalScore: 1250,
                    maxStreak: 3
                }
            };

            GameState.transition('finish');
        } else {
            goToMain();
        }
    } finally {
        document.querySelector('.loading-container').style.display = 'none';
    }
}

/**
 * Прерывание игры
 */
async function abandonGame() {
    document.querySelector('.loading-container').style.display = 'flex';
    console.log('Прерывание игры...');

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
    console.log('Запуск новой игры...');
    startGame();
}

/**
 * Вернуться на главный экран
 */
function goToMain() {
    console.log('Переход на главный экран...');
    GameState.transition('goToMain');

    if (tg) {
        tg.BackButton.hide();
    }

    // Очищаем игровые данные
    GameState.data.gameId = null;
    GameState.data.stories = [];
    GameState.data.currentStoryIndex = 0;
    GameState.data.currentStory = null;
    clearInterval(GameState.data.timer);
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
        console.log('Haptic feedback не доступен:', error);
    }
}

/**
 * Обработчик клика на кнопку
 * @param {Event} event - Событие клика
 */
function handleButtonClick(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    if (!action) return;

    // Обрабатываем нажатие по кнопке
    switch (action) {
        case 'startGame':
            startGame();
            break;

        case 'selectAnswer':
            selectAnswer(button.dataset.mistakeId);
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
    }
}

/**
 * Инициализация обработчиков событий
 */
function setupEventListeners() {
    // Глобальный обработчик кликов по кнопкам
    document.addEventListener('click', handleButtonClick);

    // Глобальный обработчик тестового интерфейса
    window.CriminalBluffTestInterface = {
        startGame,
        selectAnswer,
        nextQuestion,
        goToMain,
        restartGame,
        getState: () => ({
            currentScreen: GameState.current,
            score: GameState.data.score,
            stories: GameState.data.stories.length,
            currentIndex: GameState.data.currentStoryIndex,
            isTestMode: GameState.data.isTestMode
        })
    };
}

/**
 * Инициализация приложения при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем State Machine
    GameState.init();

    // Настраиваем обработчики событий
    setupEventListeners();

    // Инициализируем приложение
    initApp();
}); 