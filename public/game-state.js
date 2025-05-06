/**
 * Game State Machine - управление состоянием приложения "Криминальный Блеф"
 */
const GameState = {
    // Текущий экран приложения
    current: 'start',

    // Данные игры
    data: {
        score: 0,
        gameId: null,
        currentStory: null,
        currentStoryIndex: 0,
        stories: [],
        secondsLeft: 15,
        timer: null,
        startTime: null,
        result: null,
        gameResult: null,
        isAnswering: false,
        token: null,
        theme: 'dark',
        isTestMode: false
    },

    // Элементы экранов для управления отображением
    screens: {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen'),
        finish: document.getElementById('finish-screen')
    },

    /**
     * Показать экран по имени
     * @param {string} screenName - Имя экрана для отображения
     */
    showScreen(screenName) {
        // Скрываем все экраны
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Показываем нужный экран
        this.screens[screenName].classList.add('active');

        // Обновляем текущий экран
        this.current = screenName;
    },

    /**
     * Логика переходов между экранами
     * @param {string} action - Действие для перехода
     */
    transition(action) {
        // Определяем следующий экран на основе текущего экрана и действия
        let nextScreen = null;

        switch (this.current) {
            case 'start':
                if (action === 'startGame') nextScreen = 'game';
                break;

            case 'game':
                if (action === 'showResult') nextScreen = 'result';
                else if (action === 'abandon') nextScreen = 'start';
                break;

            case 'result':
                if (action === 'nextQuestion') {
                    // Проверяем, есть ли еще вопросы
                    if (this.data.currentStoryIndex < this.data.stories.length - 1) {
                        nextScreen = 'game';
                    } else {
                        nextScreen = 'finish';
                    }
                }
                break;

            case 'finish':
                if (action === 'restartGame') nextScreen = 'game';
                else if (action === 'goToMain') nextScreen = 'start';
                break;
        }

        // Если определили следующий экран, показываем его
        if (nextScreen) {
            this.showScreen(nextScreen);
            return true;
        }

        return false;
    },

    /**
     * Установка данных игры
     * @param {string} key - Ключ в объекте data
     * @param {*} value - Значение для установки
     */
    setData(key, value) {
        this.data[key] = value;
        this.updateUI();
    },

    /**
     * Обновление данных на UI
     */
    updateUI() {
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
            document.getElementById('timer-bar').style.width = `${(this.data.secondsLeft / 15) * 100}%`;
        }

        // Обновляем информацию о текущей истории
        if (this.data.currentStory) {
            document.getElementById('story-title').textContent = this.data.currentStory.title;
            document.getElementById('story-content').textContent = this.data.currentStory.content;

            // Обновляем варианты ответов
            this.updateAnswers();
        }

        // Обновляем экран результата
        if (this.data.result && this.current === 'result') {
            this.updateResultScreen();
        }

        // Обновляем экран финиша
        if (this.data.gameResult && this.current === 'finish') {
            this.updateFinishScreen();
        }
    },

    /**
     * Обновление вариантов ответов
     */
    updateAnswers() {
        const container = document.getElementById('answers-container');
        if (!container || !this.data.currentStory || !this.data.currentStory.mistakes) return;

        // Очищаем контейнер
        container.innerHTML = '';

        // Добавляем варианты ответов
        this.data.currentStory.mistakes.forEach(mistake => {
            const button = document.createElement('button');
            button.className = 'answer-button';
            button.textContent = mistake.text;
            button.dataset.mistakeId = mistake.id;
            button.dataset.action = 'selectAnswer';

            if (this.data.isAnswering) {
                button.disabled = true;
            }

            container.appendChild(button);
        });
    },

    /**
     * Обновление экрана результата
     */
    updateResultScreen() {
        const result = this.data.result;
        const container = document.getElementById('result-container');

        // Устанавливаем класс в зависимости от правильности ответа
        container.className = result.correct ? 'result-correct' : 'result-incorrect';

        // Заголовок
        document.getElementById('result-title').textContent = result.correct ? 'Правильно!' : 'Неправильно!';

        // Объяснение
        document.getElementById('result-explanation').textContent = result.explanation;

        // Детали очков
        const pointsDetails = document.getElementById('points-details');
        pointsDetails.innerHTML = '';

        if (result.correct && result.details) {
            const detailsDiv = document.createElement('div');

            const basePoints = document.createElement('p');
            basePoints.className = 'points-line';
            basePoints.innerHTML = `Базовые очки: <span>${result.details.base}</span>`;
            detailsDiv.appendChild(basePoints);

            const timeBonus = document.createElement('p');
            timeBonus.className = 'points-line';
            timeBonus.innerHTML = `За скорость: <span>+${result.details.timeBonus}</span>`;
            detailsDiv.appendChild(timeBonus);

            const difficultyBonus = document.createElement('p');
            difficultyBonus.className = 'points-line';
            difficultyBonus.innerHTML = `За сложность: <span>+${result.details.difficultyBonus}</span>`;
            detailsDiv.appendChild(difficultyBonus);

            const totalPoints = document.createElement('p');
            totalPoints.className = 'points-total';
            totalPoints.innerHTML = `Всего: <span>+${result.details.total}</span>`;
            detailsDiv.appendChild(totalPoints);

            pointsDetails.appendChild(detailsDiv);
        } else {
            const noPoints = document.createElement('p');
            noPoints.className = 'points-total';
            noPoints.textContent = 'Очки не начислены';
            pointsDetails.appendChild(noPoints);
        }
    },

    /**
     * Обновление экрана финиша
     */
    updateFinishScreen() {
        const result = this.data.gameResult;

        if (!result) return;

        document.getElementById('final-score').textContent = result.totalScore;
        document.getElementById('correct-answers').textContent = `${result.correctAnswers}/${result.totalQuestions}`;
        document.getElementById('accuracy').textContent = `${result.accuracy}%`;

        document.getElementById('total-games').textContent = result.stats.totalGames;
        document.getElementById('total-score').textContent = result.stats.totalScore;
        document.getElementById('max-streak').textContent = result.stats.maxStreak;
    },

    /**
     * Инициализация State Machine
     */
    init() {
        console.log('Инициализация GameState...');

        try {
            // Получаем доступ к экранам - проверяем их наличие
            const startScreen = document.getElementById('start-screen');
            const gameScreen = document.getElementById('game-screen');
            const resultScreen = document.getElementById('result-screen');
            const finishScreen = document.getElementById('finish-screen');

            // Если не все экраны найдены, создаем их для совместимости
            if (!startScreen || !gameScreen || !resultScreen || !finishScreen) {
                console.warn('Некоторые игровые экраны не найдены - создаем временные для совместимости');

                // Создаем контейнер для игровых экранов если он не существует
                let container = document.querySelector('.container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'container';
                    document.body.appendChild(container);
                }

                // Создаем отсутствующие экраны
                if (!startScreen) {
                    const screen = document.createElement('div');
                    screen.id = 'start-screen';
                    screen.className = 'screen';
                    container.appendChild(screen);
                }

                if (!gameScreen) {
                    const screen = document.createElement('div');
                    screen.id = 'game-screen';
                    screen.className = 'screen';
                    screen.innerHTML = `
                        <div class="game-header">
                            <div class="score">Счет: <span id="score-display">0</span></div>
                            <div class="progress">Дело: <span id="question-progress">1/5</span></div>
                            <div class="timer">
                                <span id="timer-value">15</span>с
                                <div class="timer-bar" id="timer-bar"></div>
                            </div>
                        </div>
                        <div class="story-card">
                            <h3 class="story-title" id="story-title"></h3>
                            <p class="story-content" id="story-content"></p>
                            <p class="story-question">Где ошибка преступника?</p>
                            <div class="answers-container" id="answers-container"></div>
                        </div>
                    `;
                    container.appendChild(screen);
                }

                if (!resultScreen) {
                    const screen = document.createElement('div');
                    screen.id = 'result-screen';
                    screen.className = 'screen';
                    screen.innerHTML = `
                        <div id="result-container">
                            <h3 id="result-title"></h3>
                            <p id="result-explanation"></p>
                            <div class="points-details" id="points-details"></div>
                            <button data-action="nextQuestion" class="primary-button">СЛЕДУЮЩЕЕ ДЕЛО</button>
                        </div>
                    `;
                    container.appendChild(screen);
                }

                if (!finishScreen) {
                    const screen = document.createElement('div');
                    screen.id = 'finish-screen';
                    screen.className = 'screen';
                    screen.innerHTML = `
                        <div class="game-results">
                            <h2>Расследование завершено</h2>
                            <div class="results-details">
                                <p class="results-line">Итоговый счет: <span id="final-score">0</span></p>
                                <p class="results-line">Раскрыто дел: <span id="correct-answers">0/0</span></p>
                                <p class="results-line">Эффективность: <span id="accuracy">0%</span></p>
                            </div>
                            <div class="results-stats">
                                <h3>Досье детектива</h3>
                                <p class="stats-line">Всего расследований: <span id="total-games">0</span></p>
                                <p class="stats-line">Общий рейтинг: <span id="total-score">0</span></p>
                                <p class="stats-line">Серия успешных дел: <span id="max-streak">0</span></p>
                            </div>
                            <div class="action-buttons">
                                <button data-action="restartGame" class="primary-button">НОВОЕ РАССЛЕДОВАНИЕ</button>
                                <button data-action="goToMain" class="secondary-button">В ШТАБ-КВАРТИРУ</button>
                            </div>
                        </div>
                    `;
                    container.appendChild(screen);
                }
            }

            // Обновляем ссылки на экраны
            this.screens = {
                start: document.getElementById('start-screen'),
                game: document.getElementById('game-screen'),
                result: document.getElementById('result-screen'),
                finish: document.getElementById('finish-screen')
            };

            // Проверка успешности инициализации
            const allScreensInitialized = Object.values(this.screens).every(screen => screen !== null);
            if (!allScreensInitialized) {
                console.error('Не удалось инициализировать все экраны GameState');
            } else {
                console.log('GameState инициализирован успешно');
            }

        } catch (error) {
            console.error('Ошибка инициализации GameState:', error);
        }
    }
}; 