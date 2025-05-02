// Инициализация Alpine.js приложения
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // Состояние приложения
        isLoading: true,
        isInitialized: false,
        token: null,
        currentScreen: 'start',
        theme: 'dark',

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
            // Получаем объект Telegram WebApp
            this.tg = window.Telegram.WebApp;

            // Применяем тему Telegram
            this.theme = this.tg.colorScheme || 'dark';

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

            // Если токен есть, проверяем его
            if (this.token) {
                // В полной реализации здесь был бы запрос для проверки токена
                this.isInitialized = true;
            }

            // В любом случае инициализируем приложение
            if (this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
                if (!this.token) {
                    // Проходим процесс авторизации
                    this.authorize();
                } else {
                    // Просто отображаем главный экран
                    this.isLoading = false;
                }
            } else {
                // Если данные пользователя отсутствуют, показываем заглушку для тестирования
                console.warn('Telegram WebApp: initDataUnsafe не содержит данных пользователя. Режим разработки.');
                this.isLoading = false;
                this.isInitialized = true;
            }

            // Сообщаем Telegram, что приложение готово
            this.tg.ready();
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
            } catch (error) {
                console.error('Ошибка авторизации:', error);
                alert('Не удалось авторизоваться. Попробуйте позже.');
                this.isLoading = false;
            }
        },

        // Начало игры
        async startGame() {
            if (!this.isInitialized) {
                alert('Приложение не инициализировано');
                return;
            }

            this.isLoading = true;

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

            // Запускаем таймер обратного отсчета
            this.timer = setInterval(() => {
                this.secondsLeft--;

                // Если время вышло, автоматически выбираем первый вариант
                if (this.secondsLeft <= 0) {
                    clearInterval(this.timer);
                    if (!this.isAnswering) {
                        this.timeExpired();
                    }
                }
            }, 1000);
        },

        // Время истекло
        timeExpired() {
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
                this.isAnswering = false;
                this.startTimer(); // Перезапускаем таймер
            }
        },

        // Переход к следующему вопросу
        nextQuestion() {
            // Переходим к следующему вопросу
            this.currentStoryIndex++;
            this.isAnswering = false;

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

                // Сохраняем результаты игры
                this.gameResult = data;

                // Переключаемся на экран результатов
                this.currentScreen = 'finish';

            } catch (error) {
                console.error('Ошибка завершения игры:', error);
                alert('Не удалось завершить игру. Результаты могут быть не сохранены.');
                this.goToMain();
            } finally {
                this.isLoading = false;
            }
        },

        // Прерывание игры
        async abandonGame() {
            this.isLoading = true;

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
            this.startGame();
        },

        // Вернуться на главный экран
        goToMain() {
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