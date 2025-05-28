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

    // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ВСЕХ СОХРАНЕННЫХ ДАННЫХ ПРИ ИНИЦИАЛИЗАЦИИ
    console.log('ПРИНУДИТЕЛЬНАЯ ОЧИСТКА: удаляем все сохраненные данные');
    localStorage.clear();
    sessionStorage.clear();

    // Сбрасываем состояние приложения
    if (window.GameState) {
        GameState.data.token = null;
        GameState.data.user = null;
        GameState.data.isTestMode = false;
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

        // Проверяем данные пользователя
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            console.log('Данные пользователя получены:', tg.initDataUnsafe.user.username);
            console.log('Полные данные пользователя:', tg.initDataUnsafe.user);
            console.log('initData:', tg.initData ? 'присутствует' : 'отсутствует');

            // Проходим процесс авторизации с реальными данными
            console.log('Начинаем процесс авторизации с реальными данными Telegram...');
            authorize();
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
        console.log('Начинаем авторизацию через Telegram WebApp...');

        // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ВСЕХ ГОСТЕВЫХ ТОКЕНОВ И ДАННЫХ
        console.log('Очистка всех потенциальных гостевых токенов...');
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.includes('guest_') || key.includes('test_token'))) {
                localStorage.removeItem(key);
                console.log('Удален гостевой ключ:', key);
            }
        }

        // Очищаем старые токены, если они есть
        const oldToken = localStorage.getItem('token');
        if (oldToken && (oldToken.includes('guest_') || oldToken.includes('test_'))) {
            console.log('Найден старый гостевой токен, очищаем localStorage:', oldToken);
            localStorage.removeItem('token');
            localStorage.removeItem('auth_token');
        }

        // Проверяем наличие данных Telegram WebApp
        if (!tg || !tg.initData || tg.initData.trim() === '') {
            console.error('Telegram WebApp initData отсутствует или пуст');
            console.log('tg объект:', tg);
            console.log('initData:', tg ? tg.initData : 'tg не определен');
            throw new Error('Отсутствуют данные Telegram WebApp');
        }

        // Получаем данные пользователя из Telegram
        const telegramUser = tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
        console.log('Данные пользователя из Telegram:', telegramUser);

        if (!telegramUser || !telegramUser.id) {
            console.error('Telegram WebApp не содержит данных пользователя');
            throw new Error('Отсутствуют данные пользователя Telegram');
        }

        // Отправляем запрос на авторизацию
        console.log('Отправляем запрос авторизации с initData длиной:', tg.initData.length);
        const response = await fetch('/api/auth/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                initData: tg.initData,
                telegramUser: telegramUser // Передаем данные пользователя отдельно для большей надежности
            })
        });

        if (!response.ok) {
            // Логируем детали ошибки
            const errorText = await response.text();
            console.error(`Ошибка авторизации: ${response.status} - ${errorText}`);
            throw new Error(`Ошибка авторизации: ${response.status}`);
        }

        const data = await response.json();
        console.log('Ответ сервера при авторизации:', data);

        if (data.status === 'success' || data.token) {
            // Сохраняем токен
            const token = data.token || data.data?.token;
            GameState.data.token = token;
            localStorage.setItem('token', token);
            localStorage.setItem('auth_token', token); // Дублируем для совместимости

            // Сохраняем данные пользователя в состоянии
            const userData = data.user || data.data?.user;
            if (userData) {
                GameState.data.user = {
                    telegramId: userData.telegramId,
                    name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    username: userData.username,
                    rank: userData.rank,
                    stats: userData.stats,
                    totalScore: userData.totalScore
                };
            }

            console.log('Пользователь авторизован:', GameState.data.user?.name || 'Неизвестно');

            // Отмечаем, что инициализация завершена
            isInitialized = true;

            // Прячем экран загрузки
            showContent();

            // Обновляем отображение информации о пользователе
            if (typeof updateUserInfo === 'function') {
                updateUserInfo();
            }
        } else {
            throw new Error(data.message || 'Неизвестная ошибка авторизации');
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);

        // НЕ СОЗДАЕМ ГОСТЕВЫХ ПОЛЬЗОВАТЕЛЕЙ - отключено для исправления проблемы с тестовыми данными
        console.log('Создание гостевых пользователей отключено. Переходим в тестовый режим.');
        handleTestMode();

        /* ЗАКОММЕНТИРОВАНО - НЕ СОЗДАЕМ ГОСТЕВЫХ ПОЛЬЗОВАТЕЛЕЙ
        // Проверка доступности сервера или сети
        try {
            const healthResponse = await fetch('/api/health');
            if (healthResponse.ok) {
                console.log('API сервер доступен, проблема с авторизацией Telegram');

                // Пробуем получить прямой доступ
                try {
                    const directResponse = await fetch('/api/auth/direct-access', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userAgent: navigator.userAgent,
                            timestamp: new Date().toISOString()
                        })
                    });

                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        if (directData.status === 'success' && directData.data?.token) {
                            console.log('Получен токен прямого доступа');
                            GameState.data.token = directData.data.token;
                            localStorage.setItem('token', directData.data.token);
                            isInitialized = true;
                            showContent();
                            return;
                        }
                    }
                } catch (directError) {
                    console.error('Ошибка прямого доступа:', directError);
                }
            }
        } catch (e) {
            console.error('API сервер недоступен:', e);
        }

        // Включаем тестовый режим в случае ошибки авторизации
        handleTestMode();
        */
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
        // Получаем данные для игры с сервера или создаем тестовые данные
        if (GameState.data.isTestMode) {
            console.log('Тестовый режим: генерируем тестовые данные для игры');

            // Создаем тестовую игру с 5 историями
            const testStories = [
                {
                    id: 'test-story-1',
                    title: 'Ограбление ювелирного магазина',
                    content: 'Преступник взломал заднюю дверь ювелирного магазина в 3 часа ночи. Он отключил камеры видеонаблюдения, но не заметил <span class="highlighted-text">скрытую камеру над сейфом</span>. На записи видно, как он <span class="highlighted-text">без перчаток</span> открывает витрины и собирает украшения в рюкзак. Перед уходом преступник воспользовался <span class="highlighted-text">раковиной в подсобке</span>, чтобы смыть кровь с пореза на руке.',
                    difficulty: 'medium',
                    date: '12.04.2024',
                    mistakes: [
                        {
                            id: 'mistake-1',
                            text: 'Неправильно отключил систему видеонаблюдения, не заметив скрытую камеру',
                            isCorrect: false
                        },
                        {
                            id: 'mistake-2',
                            text: 'Работал без перчаток, оставив отпечатки пальцев на витринах и украшениях',
                            isCorrect: false
                        },
                        {
                            id: 'mistake-3',
                            text: 'Оставил свои биологические следы, смыв кровь в раковине, что позволило получить его ДНК',
                            isCorrect: true
                        }
                    ]
                },
                // ... existing code ...
            ];

            GameState.setData('gameId', 'test-game-' + Date.now());
            GameState.setData('stories', testStories);
            GameState.setData('currentStoryIndex', 0);
            GameState.setData('currentStory', testStories[0]);
            GameState.setData('timerDuration', 15); // Продолжительность таймера в секундах

            // Переходим на игровой экран
            GameState.transition('startGame');

            // Запускаем таймер
            startTimer();

            // Автоматический запуск выбора, если указано в URL
            if (window.location.search.includes('autostart=true')) {
                setTimeout(() => {
                    // Выбираем случайный ответ через 5 секунд
                    const options = document.querySelectorAll('.answer-option');
                    if (options.length > 0) {
                        const randomIndex = Math.floor(Math.random() * options.length);
                        const mistakeId = options[randomIndex].dataset.mistakeId;
                        selectAnswer(mistakeId);
                    }
                }, 5000);
            }

            return;
        }

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
 * Запуск таймера для текущего вопроса
 */
function startTimer() {
    console.log('Запуск таймера...');
    const timerBar = document.getElementById('timer-bar');
    const timerValue = document.getElementById('timer-value');

    // Устанавливаем начальное значение
    GameState.data.secondsLeft = 15;
    timerValue.textContent = GameState.data.secondsLeft;
    timerBar.style.width = '100%';

    // Запоминаем время начала для вычисления бонуса за скорость
    GameState.data.startTime = Date.now();

    // Запускаем таймер
    GameState.data.timer = setInterval(() => {
        GameState.data.secondsLeft--;

        // Обновляем отображение
        timerValue.textContent = GameState.data.secondsLeft;

        // Обновляем полосу таймера
        const percentage = (GameState.data.secondsLeft / 15) * 100;
        timerBar.style.width = `${percentage}%`;

        // Меняем класс для предупреждения, когда мало времени
        if (GameState.data.secondsLeft <= 5) {
            document.querySelector('.timer-container').classList.add('urgent');

            // Добавляем тактильный отклик каждую секунду, когда мало времени
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning');
            }
        }

        // Время истекло
        if (GameState.data.secondsLeft <= 0) {
            timeExpired();
        }
    }, 1000);
}

/**
 * Обработка истечения времени
 */
function timeExpired() {
    console.log('Время на ответ истекло');

    // Останавливаем таймер
    clearInterval(GameState.data.timer);

    // Визуальная и тактильная обратная связь
    document.querySelector('.timer-container').classList.add('expired');
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }

    // Если не в процессе выбора ответа
    if (!GameState.data.isAnswering) {
        GameState.data.isAnswering = true;

        // В тестовом режиме создаем моковый отрицательный результат
        if (GameState.data.isTestMode) {
            GameState.data.result = {
                correct: false,
                explanation: "Время истекло! Важное качество детектива - принимать решения в ограниченное время. Не торопитесь, но и не медлите слишком долго.",
                score: 0,
                details: {
                    base: 0,
                    timeBonus: 0,
                    difficultyBonus: 0,
                    streak: 0,
                    total: 0
                }
            };

            // Показываем правильный ответ
            const correctMistakeId = GameState.data.currentStory.mistakes[0].id;
            const correctOption = document.querySelector(`.answer-option[data-mistake-id="${correctMistakeId}"]`);
            if (correctOption) {
                correctOption.classList.add('selected');
            }

            setTimeout(() => {
                GameState.transition('showResult');
                GameState.data.isAnswering = false;
            }, 1500);

        } else {
            // В реальном режиме отправляем запрос на сервер
            fetch('/api/game/timeout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GameState.data.token}`
                },
                body: JSON.stringify({
                    gameId: GameState.data.gameId,
                    storyId: GameState.data.currentStory.id
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.ok) {
                        GameState.data.result = data.data;

                        // Показываем правильный ответ
                        if (data.data.correctMistakeId) {
                            const correctOption = document.querySelector(`.answer-option[data-mistake-id="${data.data.correctMistakeId}"]`);
                            if (correctOption) {
                                correctOption.classList.add('selected');
                            }
                        }

                        setTimeout(() => {
                            GameState.transition('showResult');
                            GameState.data.isAnswering = false;
                        }, 1500);
                    } else {
                        console.error('Ошибка при обработке истечения времени:', data.error);
                        alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
                        GameState.data.isAnswering = false;
                    }
                })
                .catch(error => {
                    console.error('Ошибка при обработке истечения времени:', error);
                    alert('Произошла ошибка при соединении с сервером.');
                    GameState.data.isAnswering = false;
                });
        }
    }
}

/**
 * Обработка выбора ответа
 * @param {string} mistakeId - ID выбранной ошибки
 */
async function selectAnswer(mistakeId) {
    // Если уже выбираем ответ, игнорируем повторные клики
    if (GameState.data.isAnswering) return;

    console.log('Выбран ответ:', mistakeId);
    GameState.data.isAnswering = true;

    // Находим выбранный элемент
    const selectedOption = document.querySelector(`.answer-option[data-mistake-id="${mistakeId}"]`);
    if (selectedOption) {
        // Добавляем класс для визуального выделения
        selectedOption.classList.add('selected');

        // Визуальная и тактильная обратная связь
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    // Останавливаем таймер
    clearInterval(GameState.data.timer);

    try {
        // Вычисляем, сколько времени затрачено на ответ
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - GameState.data.startTime) / 1000);
        const timeLeft = GameState.data.secondsLeft;

        console.log(`Затрачено времени: ${timeTaken}с, осталось: ${timeLeft}с`);

        // Подготавливаем данные для отправки на сервер
        const data = {
            gameId: GameState.data.gameId,
            storyId: GameState.data.currentStory.id,
            mistakeId: mistakeId,
            timeLeft: timeLeft
        };

        // Отправляем ответ на сервер
        const token = GameState.data.token;
        let response;

        // В тестовом режиме генерируем моковый ответ
        if (GameState.data.isTestMode) {
            console.log('Тестовый режим: генерируем моковый ответ');

            // Находим правильный ответ
            const correctMistake = GameState.data.currentStory.mistakes.find(m => m.isCorrect);
            const isCorrect = correctMistake && correctMistake.id === mistakeId;

            response = {
                ok: true,
                data: {
                    correct: isCorrect,
                    correctMistakeId: correctMistake ? correctMistake.id : null,
                    explanation: isCorrect
                        ? "Правильно! Преступник оставил биологический материал (кровь), который попал в слив раковины. Даже после смывания, следы ДНК остаются на сантехнике и в трубах. Криминалисты легко извлекают такие образцы и используют для идентификации."
                        : "Неправильно. Преступник оставил биологический материал (кровь), который попал в слив раковины. Даже после смывания, следы ДНК остаются на сантехнике и в трубах. Криминалисты легко извлекают такие образцы и используют для идентификации.",
                    pointsEarned: isCorrect ? 120 : 0,
                    details: {
                        base: isCorrect ? 100 : 0,
                        timeBonus: isCorrect ? Math.floor(timeLeft * 5) : 0,
                        difficultyBonus: isCorrect ? 20 : 0,
                        total: isCorrect ? 120 : 0
                    }
                }
            };

            // Добавляем задержку для имитации запроса к серверу
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            // Реальный запрос к серверу
            response = await fetch('/api/game/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gameId: GameState.data.gameId,
                    storyId: GameState.data.currentStory.id,
                    mistakeId: mistakeId,
                    responseTime: timeLeft
                })
            }).then(res => res.json());
        }

        // Обработка ответа от сервера
        if (response.ok) {
            const result = response.data;

            // Обновляем счет
            GameState.setData('score', GameState.data.score + (result.pointsEarned || 0));

            // Сохраняем результат ответа в текущую историю
            const currentIndex = GameState.data.currentStoryIndex;
            if (GameState.data.stories && GameState.data.stories[currentIndex]) {
                GameState.data.stories[currentIndex].correct = result.correct;
                GameState.data.stories[currentIndex].answered = true;
                GameState.data.stories[currentIndex].selectedMistakeId = mistakeId;
                console.log(`Обновлена история ${currentIndex}:`, {
                    correct: result.correct,
                    answered: true,
                    selectedMistakeId: mistakeId
                });
            }

            // Сохраняем результат ответа
            GameState.setData('result', result);

            // Находим и выделяем правильный ответ, если ответ неверный
            if (!result.correct && result.correctMistakeId) {
                const correctOption = document.querySelector(`.answer-option[data-mistake-id="${result.correctMistakeId}"]`);
                if (correctOption) {
                    // Даем немного времени для отображения выбранного варианта
                    setTimeout(() => {
                        selectedOption.classList.remove('selected');
                        correctOption.classList.add('selected');
                    }, 1000);
                }
            }

            // Переходим к экрану результата через небольшую задержку
            setTimeout(() => {
                GameState.transition('showResult');
                GameState.data.isAnswering = false;
            }, 1500);

        } else {
            console.error('Ошибка при отправке ответа:', response.error);
            alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
            GameState.data.isAnswering = false;
        }
    } catch (error) {
        console.error('Ошибка при отправке ответа:', error);
        alert('Произошла ошибка при соединении с сервером.');
        GameState.data.isAnswering = false;
    }
}

/**
 * Переход к следующему вопросу
 */
function nextQuestion() {
    console.log('Переход к следующему вопросу');

    // Если это была последняя история, переходим к экрану результатов
    if (GameState.data.currentStoryIndex >= GameState.data.stories.length - 1) {
        console.log('Это был последний вопрос. Переход к финальному экрану');
        finishGame();
        return;
    }

    // Увеличиваем индекс текущей истории
    const newIndex = GameState.data.currentStoryIndex + 1;
    GameState.setData('currentStoryIndex', newIndex);
    GameState.setData('currentStory', GameState.data.stories[newIndex]);

    // Переходим обратно на игровой экран
    GameState.transition('nextQuestion');

    // Сбрасываем таймер
    GameState.setData('secondsLeft', GameState.data.timerDuration || 15);
    GameState.setData('startTime', Date.now());
    GameState.setData('isAnswering', false);

    // Запускаем таймер
    startTimer();
}

/**
 * Завершение игры
 */
async function finishGame() {
    document.querySelector('.loading-container').style.display = 'flex';
    console.log('Завершение игры...');

    try {
        // Подсчитываем статистику игры
        const correctAnswers = GameState.data.stories ? GameState.data.stories.filter(story => story.correct).length : 0;
        const totalQuestions = GameState.data.stories ? GameState.data.stories.length : 5;
        const totalScore = GameState.data.score || 0;

        // Детальный лог для отладки
        console.log('Детальная статистика историй:');
        if (GameState.data.stories) {
            GameState.data.stories.forEach((story, index) => {
                console.log(`История ${index}:`, {
                    id: story.id,
                    answered: story.answered,
                    correct: story.correct,
                    selectedMistakeId: story.selectedMistakeId
                });
            });
        }

        console.log('Статистика игры:', {
            gameId: GameState.data.gameId,
            totalScore,
            correctAnswers,
            totalQuestions
        });

        // Отправляем запрос на завершение игры с полной статистикой
        const response = await fetch('/api/game/finish', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GameState.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: GameState.data.gameId,
                totalScore,
                correctAnswers,
                totalQuestions
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка завершения игры');
        }

        const data = await response.json();
        console.log('Получены результаты игры:', data);

        // Сохраняем результаты игры
        GameState.data.gameResult = {
            totalScore,
            correctAnswers,
            totalQuestions,
            accuracy: Math.round((correctAnswers / totalQuestions) * 100),
            serverResponse: data
        };

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
 * Обработка кликов по кнопкам и элементам интерфейса
 * @param {Event} event - DOM событие клика
 */
function handleButtonClick(event) {
    // Находим ближайший элемент с атрибутом data-action
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;

    // Получаем название действия
    const action = actionElement.getAttribute('data-action');
    console.log('Клик по действию:', action);

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
            console.warn('Неизвестное действие:', action);
    }
}

/**
 * Устанавливает слушатели событий для элементов интерфейса
 */
function setupEventListeners() {
    console.log('Настройка обработчиков событий');

    // Обработка кликов по всему документу с делегированием событий
    document.addEventListener('click', handleButtonClick);

    // Обработка изменения темы в TG WebApp
    if (tg && tg.colorScheme) {
        const onThemeChanged = () => {
            const newTheme = tg.colorScheme;
            console.log('Изменение темы Telegram:', newTheme);
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
                clearInterval(GameState.data.timer);
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
    console.log('DOM загружен. Инициализируем GameState');
    GameState.init();

    console.log('Настраиваем обработчики событий');
    setupEventListeners();

    // Проверяем параметры URL для тестирования
    if (window.location.search.includes('test=true')) {
        console.log('Тестовый режим активирован через URL параметр');
        GameState.data.isTestMode = true;
    }

    // Автоматический запуск игры, если указано в URL
    if (window.location.search.includes('autostart=true')) {
        console.log('Автозапуск активирован через URL параметр');
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

        // Проверяем, содержит ли контент уже HTML-разметку
        if (!content.includes('<span class="highlighted-text">')) {
            // Заменяем ключевые фразы с выделением
            content = content
                .replace(/скрытую камеру над сейфом/gi, '<span class="highlighted-text">скрытую камеру над сейфом</span>')
                .replace(/без перчаток/gi, '<span class="highlighted-text">без перчаток</span>')
                .replace(/раковиной в подсобке/gi, '<span class="highlighted-text">раковиной в подсобке</span>');
        }

        storyContent.innerHTML = content;

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
    container.innerHTML = '';

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
    console.log('Очистка кэша приложения...');

    // Очищаем localStorage полностью
    console.log('Очистка localStorage...');
    localStorage.clear();

    // Также проверяем и удаляем специфичные ключи
    const keysToRemove = ['token', 'auth_token', 'gameData', 'userData', 'initData'];
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log('Удален ключ:', key);
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

    console.log('Кэш очищен полностью. Перезапуск приложения...');

    // Перезапускаем приложение
    location.reload();
}

// Делаем функцию доступной глобально
window.clearAppCache = clearAppCache;
window.CriminalBluffApp = window.CriminalBluffApp || {};
window.CriminalBluffApp.clearCache = clearAppCache; 