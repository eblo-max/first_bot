// Инициализация Alpine.js приложения
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // Состояние приложения
        isLoading: true,
        isInitialized: false,
        token: null,
        currentScreen: 'start',
        theme: 'dark',

        // Режим тестирования
        isTestMode: false,

        // Игровые данные
        gameId: null,
        stories: [],
        currentStoryIndex: 0,
        currentStory: null,
        secondsLeft: 15,
        timer: null,
        startTime: null,
        totalScore: 0,
        isAnswering: false,

        // Результаты
        result: null,
        gameResult: null,

        // Инициализация приложения
        initApp() {
            console.log('Инициализация приложения начата...');

            // Создаем глобальный объект для доступа к приложению из тестов
            window.CriminalBluffApp = {
                getData: () => this
            };

            // Проверяем наличие Telegram WebApp API
            if (!window.Telegram || !window.Telegram.WebApp) {
                console.error('Telegram WebApp API недоступен');
                this.handleNoTelegramApi();
                return;
            }

            try {
                // Получаем объект Telegram WebApp
                this.tg = window.Telegram.WebApp;
                console.log('Telegram WebApp API найден, инициализация...');

                // Применяем тему Telegram
                this.theme = this.tg.colorScheme || 'dark';
                console.log('Применена тема:', this.theme);

                // Раскрываем приложение на весь экран
                this.tg.expand();

                // Прячем кнопку "Назад"
                this.tg.BackButton.hide();

                // Настраиваем обработчик кнопки "Назад"
                this.tg.BackButton.onClick(() => {
                    // Если мы на экране с результатом вопроса, возвращаемся к игре
                    if (this.currentScreen === 'result') {
                        this.nextQuestion();
                        this.tg.BackButton.hide();
                    }
                    // Если мы на экране с результатами игры, возвращаемся в главное меню
                    else if (this.currentScreen === 'finish') {
                        this.goToMain();
                        this.tg.BackButton.hide();
                    }
                    // Если мы на игровом экране, показываем диалог подтверждения
                    else if (this.currentScreen === 'game') {
                        if (confirm('Вы уверены, что хотите прервать игру?')) {
                            this.abandonGame();
                        }
                    }
                });

                // Пытаемся получить токен из localStorage
                this.token = localStorage.getItem('token');
                console.log('Токен из localStorage:', this.token ? 'Найден' : 'Не найден');

                // Если токен есть, проверяем его
                if (this.token) {
                    // В полной реализации здесь был бы запрос для проверки токена
                    this.isInitialized = true;
                }

                // В любом случае инициализируем приложение
                if (this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
                    console.log('Данные пользователя получены:', this.tg.initDataUnsafe.user.username);
                    if (!this.token) {
                        // Проходим процесс авторизации
                        console.log('Начинаем процесс авторизации...');
                        this.authorize();
                    } else {
                        // Просто отображаем главный экран
                        console.log('Переход на главный экран...');
                        this.isLoading = false;
                    }
                } else {
                    // Если данные пользователя отсутствуют, показываем заглушку для тестирования
                    console.warn('Telegram WebApp: initDataUnsafe не содержит данных пользователя. Режим разработки.');
                    this.handleTestMode();
                }

                // Сообщаем Telegram, что приложение готово
                console.log('Отправка сигнала ready() в Telegram WebApp...');
                this.tg.ready();

                // Принудительно прекращаем загрузку через 5 секунд, если она ещё активна
                setTimeout(() => {
                    if (this.isLoading) {
                        console.warn('Загрузка принудительно прервана по таймауту безопасности');
                        this.isLoading = false;
                        this.isInitialized = true;
                    }
                }, 5000);

            } catch (error) {
                console.error('Ошибка инициализации приложения:', error);
                this.handleNoTelegramApi();
            }
        },

        // Обработка отсутствия Telegram WebApp API
        handleNoTelegramApi() {
            console.warn('Запуск в режиме тестирования - Telegram WebApp API недоступен');
            this.isTestMode = true;

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

            this.tg = window.Telegram.WebApp;
            this.handleTestMode();
        },

        // Обработка тестового режима
        handleTestMode() {
            console.log('Активация тестового режима...');
            this.isTestMode = true;
            this.isLoading = false;
            this.isInitialized = true;

            // Генерируем тестовый токен, если нет настоящего
            if (!this.token) {
                this.token = `test_token_${Date.now()}`;
                localStorage.setItem('token', this.token);
                console.log('Сгенерирован тестовый токен:', this.token);
            }

            console.log('Приложение запущено в тестовом режиме');

            // Создаем моковые данные для тестирования
            if (this.isTestMode && window.location.search.includes('autostory=true')) {
                setTimeout(() => {
                    console.log('Автоматическая загрузка тестовой истории...');
                    this.stories = [
                        {
                            id: 'test-story-1',
                            title: 'Тестовая история',
                            content: 'Это тестовая история для демонстрации работы приложения без бэкенда.',
                            mistakes: [
                                { id: 'mistake-1', text: 'Ошибка 1' },
                                { id: 'mistake-2', text: 'Ошибка 2' },
                                { id: 'mistake-3', text: 'Ошибка 3' }
                            ]
                        }
                    ];
                    this.currentStory = this.stories[0];
                    this.currentStoryIndex = 0;
                    this.currentScreen = 'game';
                    this.startTimer();
                }, 1000);
            }
        },

        // Авторизация
        async authorize() {
            try {
                // Отправляем запрос на авторизацию
                const response = await fetch('/api/auth/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ initData: this.tg.initData })
                });

                if (!response.ok) {
                    throw new Error('Ошибка авторизации');
                }

                const data = await response.json();

                // Сохраняем токен
                this.token = data.token;
                localStorage.setItem('token', this.token);

                // Отмечаем, что инициализация завершена
                this.isInitialized = true;

                // Прячем экран загрузки
                this.isLoading = false;
                console.log('Авторизация успешна, токен получен');
            } catch (error) {
                console.error('Ошибка авторизации:', error);
                alert('Не удалось авторизоваться. Попробуйте позже.');
                // Включаем тестовый режим в случае ошибки авторизации
                this.handleTestMode();
            }
        },

        // Начало игры
        async startGame() {
            if (!this.isInitialized) {
                alert('Приложение не инициализировано');
                return;
            }

            this.isLoading = true;
            console.log('Начало игры...');

            try {
                // Запрос на начало игры
                const response = await fetch('/api/game/start', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Ошибка начала игры');
                }

                const data = await response.json();
                console.log('Данные игры получены от сервера:', data);

                // Сохраняем данные игры
                this.gameId = data.gameId;
                this.stories = data.stories;
                this.currentStoryIndex = 0;
                this.currentStory = this.stories[0];
                this.totalScore = 0;

                // Переключаемся на игровой экран
                this.currentScreen = 'game';

                // Запускаем таймер
                this.startTimer();

                // Показываем кнопку "Назад" в Telegram
                this.tg.BackButton.show();

            } catch (error) {
                console.error('Ошибка начала игры:', error);
                alert('Не удалось начать игру. Попробуйте позже.');

                // В тестовом режиме создаем моковые данные
                if (this.isTestMode) {
                    console.log('Генерация тестовых данных для игры...');
                    this.gameId = `test-game-${Date.now()}`;
                    this.stories = [
                        {
                            id: 'test-story-1',
                            title: 'Ограбление музея',
                            content: 'Ночью в местном музее произошло ограбление. Преступник проник через окно на втором этаже, разбил витрину и похитил знаменитый алмаз "Звезда Востока". На следующий день он попытался продать его перекупщику, но был задержан полицией.',
                            mistakes: [
                                { id: 'mistake-1', text: 'Неправильно выбрал время' },
                                { id: 'mistake-2', text: 'Оставил отпечатки пальцев' },
                                { id: 'mistake-3', text: 'Слишком быстро пытался продать украденное' }
                            ]
                        }
                    ];
                    this.currentStoryIndex = 0;
                    this.currentStory = this.stories[0];
                    this.currentScreen = 'game';
                    this.startTimer();
                }
            } finally {
                this.isLoading = false;
            }
        },

        // Таймер обратного отсчета
        startTimer() {
            // Сбрасываем таймер
            clearInterval(this.timer);
            this.secondsLeft = 15;
            this.startTime = Date.now();
            console.log('Таймер запущен, 15 секунд...');

            // Запускаем таймер обратного отсчета
            this.timer = setInterval(() => {
                this.secondsLeft--;

                // Если время вышло, автоматически выбираем первый вариант
                if (this.secondsLeft <= 0) {
                    clearInterval(this.timer);
                    console.log('Время истекло!');
                    if (!this.isAnswering) {
                        this.timeExpired();
                    }
                }
            }, 1000);
        },

        // Время истекло
        timeExpired() {
            console.log('Выбор автоматического ответа...');
            // Выбираем первый вариант по умолчанию
            if (this.currentStory && this.currentStory.mistakes.length > 0) {
                this.selectAnswer(this.currentStory.mistakes[0].id);
            }
        },

        // Выбор ответа
        async selectAnswer(mistakeId) {
            if (this.isAnswering) return;

            // Останавливаем таймер
            clearInterval(this.timer);
            this.isAnswering = true;
            console.log('Выбран ответ:', mistakeId);

            // Вычисляем время ответа
            const responseTime = Date.now() - this.startTime;

            try {
                // Haptic feedback через Telegram WebApp
                this.provideFeedback('tap');

                // Отправляем ответ на сервер
                const response = await fetch('/api/game/submit', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        gameId: this.gameId,
                        storyId: this.currentStory.id,
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
                this.result = data;

                // Обновляем общий счет
                this.totalScore = data.totalScore;

                // Показываем тактильную обратную связь
                this.provideFeedback(data.correct ? 'correct' : 'incorrect');

                // Переключаемся на экран результата
                this.currentScreen = 'result';

            } catch (error) {
                console.error('Ошибка отправки ответа:', error);
                alert('Не удалось отправить ответ. Попробуйте еще раз.');

                // В тестовом режиме создаем моковый результат
                if (this.isTestMode) {
                    console.log('Генерация тестового результата...');
                    const isCorrect = Math.random() > 0.5;
                    this.result = {
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
                        totalScore: this.totalScore + (isCorrect ? 150 : 0)
                    };

                    if (isCorrect) {
                        this.totalScore += this.result.details.total;
                    }

                    this.currentScreen = 'result';
                }

                this.isAnswering = false;
            }
        },

        // Переход к следующему вопросу
        nextQuestion() {
            // Переходим к следующему вопросу
            this.currentStoryIndex++;
            this.isAnswering = false;
            console.log('Переход к следующему вопросу, индекс:', this.currentStoryIndex);

            // Если есть еще вопросы, показываем их
            if (this.currentStoryIndex < this.stories.length) {
                this.currentStory = this.stories[this.currentStoryIndex];
                this.currentScreen = 'game';
                this.startTimer();
            } else {
                // Завершаем игру
                this.finishGame();
            }
        },

        // Завершение игры
        async finishGame() {
            this.isLoading = true;
            console.log('Завершение игры...');

            try {
                // Отправляем запрос на завершение игры
                const response = await fetch('/api/game/finish', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        gameId: this.gameId
                    })
                });

                if (!response.ok) {
                    throw new Error('Ошибка завершения игры');
                }

                const data = await response.json();
                console.log('Получены результаты игры:', data);

                // Сохраняем результаты игры
                this.gameResult = data;

                // Переключаемся на экран результатов
                this.currentScreen = 'finish';

            } catch (error) {
                console.error('Ошибка завершения игры:', error);
                alert('Не удалось завершить игру. Результаты могут быть не сохранены.');

                // В тестовом режиме создаем моковые результаты
                if (this.isTestMode) {
                    console.log('Генерация тестовых результатов игры...');
                    const correctAnswers = Math.floor(Math.random() * 5) + 3; // 3-7 правильных ответов
                    const totalQuestions = 10;

                    this.gameResult = {
                        totalScore: this.totalScore,
                        correctAnswers: correctAnswers,
                        totalQuestions: totalQuestions,
                        accuracy: Math.floor((correctAnswers / totalQuestions) * 100),
                        stats: {
                            totalGames: 5,
                            totalScore: 1250,
                            maxStreak: 3
                        }
                    };

                    this.currentScreen = 'finish';
                } else {
                    this.goToMain();
                }
            } finally {
                this.isLoading = false;
            }
        },

        // Прерывание игры
        async abandonGame() {
            this.isLoading = true;
            console.log('Прерывание игры...');

            try {
                // Отправляем запрос на завершение игры с пометкой о прерывании
                await fetch('/api/game/finish', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        gameId: this.gameId
                    })
                });

                // Возвращаемся на главный экран
                this.goToMain();

            } catch (error) {
                console.error('Ошибка прерывания игры:', error);
                this.goToMain();
            } finally {
                this.isLoading = false;
            }
        },

        // Начать новую игру
        restartGame() {
            console.log('Запуск новой игры...');
            this.startGame();
        },

        // Вернуться на главный экран
        goToMain() {
            console.log('Переход на главный экран...');
            this.currentScreen = 'start';
            this.tg.BackButton.hide();

            // Очищаем игровые данные
            this.gameId = null;
            this.stories = [];
            this.currentStoryIndex = 0;
            this.currentStory = null;
            clearInterval(this.timer);
        },

        // Тактильная обратная связь через Telegram
        provideFeedback(type) {
            try {
                switch (type) {
                    case 'correct':
                        // Позитивная обратная связь
                        this.tg.HapticFeedback.notificationOccurred('success');
                        break;
                    case 'incorrect':
                        // Негативная обратная связь
                        this.tg.HapticFeedback.notificationOccurred('error');
                        break;
                    case 'tap':
                        // Легкая обратная связь при нажатии
                        this.tg.HapticFeedback.impactOccurred('light');
                        break;
                }
            } catch (error) {
                // Fallback для тестирования вне Telegram
                console.log('Haptic feedback не доступен:', error);
            }
        }
    }));
});

// Обеспечиваем глобальную инициализацию приложения для тестов
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM полностью загружен и разобран');

    // Проверяем, есть ли Alpine.js на странице
    if (window.Alpine) {
        console.log('Alpine.js загружен, приложение автоматически инициализируется');

        // Специальная проверка для тестов - обеспечиваем инициализацию приложения
        setTimeout(() => {
            const appElement = document.querySelector('[x-data="app"]');
            if (appElement && !appElement.__x) {
                console.log('Принудительная инициализация Alpine.js для тестов');
                if (typeof Alpine.initTree === 'function') {
                    Alpine.initTree(appElement);
                } else if (typeof Alpine.start === 'function') {
                    Alpine.start();
                }
            }
        }, 100);
    } else {
        console.warn('Alpine.js не обнаружен. Ожидаем загрузку Alpine.js...');
        // Устанавливаем интервал для проверки Alpine
        const alpineInitInterval = setInterval(() => {
            if (window.Alpine) {
                console.log('Alpine.js обнаружен, инициализируем приложение');
                clearInterval(alpineInitInterval);

                // Если Alpine уже инициализирован, но приложение не запущено, запускаем вручную
                const appElement = document.querySelector('[x-data="app"]');
                if (appElement && typeof Alpine.initTree === 'function') {
                    console.log('Инициализируем дерево Alpine.js');
                    Alpine.initTree(appElement);
                }
            }
        }, 100);

        // Останавливаем интервал через 10 секунд, если Alpine не загрузился
        setTimeout(() => {
            clearInterval(alpineInitInterval);
            console.error('Alpine.js не был загружен в течение 10 секунд');

            // Пытаемся скрыть индикатор загрузки, даже если Alpine не загружен
            const loadingContainer = document.querySelector('.loading-container');
            if (loadingContainer) {
                console.log('Принудительное скрытие индикатора загрузки');
                loadingContainer.style.display = 'none';

                // Показываем основной контент
                const mainContainer = document.querySelector('.container');
                if (mainContainer) {
                    mainContainer.style.display = 'block';
                }
            }
        }, 10000);
    }

    // Обеспечиваем запуск приложения в любом случае через 5 секунд
    setTimeout(() => {
        const appElement = document.querySelector('[x-data="app"]');
        if (appElement && (!appElement.__x || appElement.__x.data.isLoading)) {
            console.log('Принудительный запуск приложения по таймауту');

            // Пытаемся скрыть индикатор загрузки
            const loadingContainer = document.querySelector('.loading-container');
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }

            // Показываем основной контент
            const mainContainer = document.querySelector('.container');
            if (mainContainer) {
                mainContainer.style.display = 'block';
            }
        }
    }, 5000);
});

// Создаем глобальный интерфейс для тестов
window.AlpineTestInterface = {
    isAlpineInitialized() {
        return !!window.Alpine;
    },
    getAppData() {
        try {
            const appElement = document.querySelector('[x-data="app"]');
            if (appElement && appElement.__x && appElement.__x.data) {
                return appElement.__x.data;
            } else if (window.CriminalBluffApp && window.CriminalBluffApp.getData) {
                return window.CriminalBluffApp.getData();
            }
            return null;
        } catch (e) {
            console.error('Ошибка доступа к данным приложения:', e);
            return null;
        }
    },
    forceInitialize() {
        const appElement = document.querySelector('[x-data="app"]');
        if (appElement && window.Alpine) {
            console.log('Принудительная инициализация Alpine.js');
            if (typeof Alpine.initTree === 'function') {
                Alpine.initTree(appElement);
                return true;
            } else if (typeof Alpine.start === 'function') {
                Alpine.start();
                return true;
            }
        }
        return false;
    },
    // Метод для отладки приложения
    debug() {
        const appData = this.getAppData();
        return {
            alpineLoaded: this.isAlpineInitialized(),
            appInitialized: appData ? true : false,
            appState: appData ? {
                screen: appData.currentScreen,
                loading: appData.isLoading,
                initialized: appData.isInitialized,
                testMode: appData.isTestMode
            } : null,
            dom: {
                appElement: !!document.querySelector('[x-data="app"]'),
                loadingVisible: document.querySelector('.loading-container')?.style.display !== 'none',
                mainContainer: !!document.querySelector('.container')
            }
        };
    }
}; 