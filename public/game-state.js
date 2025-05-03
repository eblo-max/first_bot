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
        // Получаем доступ к экранам
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen'),
            finish: document.getElementById('finish-screen')
        };

        // Показываем начальный экран
        this.showScreen('start');

        // Восстанавливаем токен из localStorage
        this.data.token = localStorage.getItem('token');

        // Проверяем тему
        if (window.Telegram?.WebApp) {
            this.data.theme = window.Telegram.WebApp.colorScheme || 'dark';
            document.body.setAttribute('data-theme', this.data.theme);
        }

        console.log('GameState инициализирован');
    }
}; 