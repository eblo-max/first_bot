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
        secondsLeft: 60,
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
     * Обновление экрана результата
     */
    updateResultScreen() {
        const resultSection = document.getElementById('result-section');
        if (!resultSection || !this.data.result) return;

        const result = this.data.result;
        resultSection.className = result.correct ? 'results-section result-correct' : 'results-section result-incorrect';

        const resultHeader = document.getElementById('result-header');
        const resultBadge = document.getElementById('result-badge');
        const resultExplanation = document.getElementById('result-explanation');
        const resultPoints = document.getElementById('result-points');

        if (resultHeader) {
            resultHeader.textContent = result.correct ? 'Верно!' : 'Неверно!';
        }

        if (resultBadge) {
            resultBadge.textContent = result.correct ? 'ВЕРНО' : 'ОШИБКА';
        }

        if (resultExplanation) {
            resultExplanation.textContent = result.explanation || '';
        }

        if (resultPoints) {
            resultPoints.innerHTML = `<span class="points-value">${result.pointsEarned || 0}</span> ОЧКОВ`;
        }

        // Показываем раздел с результатом
        resultSection.style.display = 'block';
    },

    /**
     * Обновление экрана финиша
     */
    updateFinishScreen() {
        const finishScoreElement = document.getElementById('finish-score');
        if (finishScoreElement) {
            finishScoreElement.textContent = this.data.score;
        }

        const gameStats = this.data.gameResult || {
            totalQuestions: this.data.stories.length,
            correctAnswers: this.data.stories.filter(s => s.correct).length,
            averageTime: Math.round(this.data.stories.reduce((acc, s) => acc + s.timeSpent, 0) / this.data.stories.length)
        };

        const statsCorrect = document.getElementById('stats-correct');
        const statsAccuracy = document.getElementById('stats-accuracy');
        const statsAvgTime = document.getElementById('stats-avg-time');

        if (statsCorrect) {
            statsCorrect.textContent = `${gameStats.correctAnswers}/${gameStats.totalQuestions}`;
        }

        if (statsAccuracy) {
            const accuracy = Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100);
            statsAccuracy.textContent = `${accuracy}%`;
        }

        if (statsAvgTime) {
            statsAvgTime.textContent = `${gameStats.averageTime}сек`;
        }
    },

    /**
     * Инициализация State Machine
     */
    init() {
        // Устанавливаем начальный экран
        this.showScreen('start');

        // Предварительная загрузка темы из Telegram WebApp, если доступно
        if (window.Telegram?.WebApp?.colorScheme) {
            this.data.theme = window.Telegram.WebApp.colorScheme;
        }

        // Применяем тему к body
        document.body.setAttribute('data-theme', this.data.theme);

        // Проверка для тестового режима
        if (window.location.search.includes('test=true')) {
            this.data.isTestMode = true;
        }
    }
}; 