/**
 * Управление игровым интерфейсом "Криминальный Блеф"
 * Этот файл отвечает за отображение и обновление игрового экрана
 */

const GameInterface = {
    /**
     * Элементы интерфейса
     */
    elements: {
        questionProgress: document.getElementById('question-progress'),
        scoreDisplay: document.getElementById('score-display'),
        timerValue: document.getElementById('timer-value'),
        timerBar: document.getElementById('timer-bar'),
        storyTitle: document.getElementById('story-title'),
        storyDate: document.getElementById('story-date'),
        storyDifficulty: document.getElementById('story-difficulty'),
        storyContent: document.getElementById('story-content'),
        storyEvidenceId: document.getElementById('story-evidence-id'),
        answersContainer: document.getElementById('answers-container'),
        resultSection: document.getElementById('result-section'),
        resultBadge: document.getElementById('result-badge'),
        resultHeader: document.getElementById('result-header'),
        resultExplanation: document.getElementById('result-explanation'),
        resultPoints: document.getElementById('result-points'),
        actionButton: document.getElementById('action-button')
    },

    /**
     * Инициализация интерфейса
     */
    init() {
        // Настраиваем обработчики событий
        this.setupEventListeners();

        // Инициализация Telegram WebApp
        if (window.Telegram?.WebApp) {
            // Расширяем WebApp
            window.Telegram.WebApp.expand();

            // Показываем кнопку "Назад" при запуске игры
            window.Telegram.WebApp.BackButton.show();

            // Настраиваем обработчик кнопки "Назад"
            window.Telegram.WebApp.BackButton.onClick(() => {
                if (confirm('Вы уверены, что хотите прервать игру?')) {
                    window.location.href = '/';
                }
            });

            // Сообщаем Telegram, что приложение готово
            window.Telegram.WebApp.ready();
        }
    },

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Делегирование событий для кнопок ответов
        document.addEventListener('click', this.handleButtonClick.bind(this));
    },

    /**
     * Обработчик кликов по кнопкам и элементам интерфейса
     * @param {Event} event - DOM событие клика
     */
    handleButtonClick(event) {
        // Находим ближайший элемент с атрибутом data-action
        const actionElement = event.target.closest('[data-action]');

        if (!actionElement) return;

        // Получаем действие из атрибута
        const action = actionElement.getAttribute('data-action');

        // Тактильная обратная связь при нажатии
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }

        // Обрабатываем действие
        switch (action) {
            case 'selectAnswer':
                const mistakeId = actionElement.getAttribute('data-mistake-id');
                if (mistakeId && typeof window.selectAnswer === 'function') {
                    window.selectAnswer(mistakeId);
                }
                break;

            case 'nextQuestion':
                if (typeof window.nextQuestion === 'function') {
                    window.nextQuestion();
                }
                break;

            case 'goToMain':
                window.location.href = '/';
                break;
        }
    },

    /**
     * Обновление игрового интерфейса на основе текущей истории
     * @param {Object} gameData - Данные игры
     */
    updateUI(gameData) {
        // Обновляем счетчик вопросов
        if (this.elements.questionProgress) {
            this.elements.questionProgress.textContent = `${gameData.currentStoryIndex + 1}/${gameData.stories.length}`;
        }

        // Обновляем счет
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = gameData.score;
        }

        // Обновляем информацию об истории
        if (gameData.currentStory) {
            const story = gameData.currentStory;

            // Устанавливаем заголовок
            if (this.elements.storyTitle) {
                this.elements.storyTitle.textContent = story.title || 'Название истории не указано';
            }

            // Устанавливаем дату
            if (this.elements.storyDate) {
                this.elements.storyDate.textContent = story.date || '01.01.2024';
            }

            // Устанавливаем сложность
            if (this.elements.storyDifficulty) {
                const difficultyText = {
                    'easy': 'СЛОЖНОСТЬ: ЛЕГКАЯ',
                    'medium': 'СЛОЖНОСТЬ: СРЕДНЯЯ',
                    'hard': 'СЛОЖНОСТЬ: ВЫСОКАЯ'
                };
                this.elements.storyDifficulty.textContent = difficultyText[story.difficulty] || 'СЛОЖНОСТЬ: СРЕДНЯЯ';
            }

            // Устанавливаем содержание истории
            if (this.elements.storyContent) {
                this.elements.storyContent.innerHTML = story.content || 'Описание истории не указано';
            }

            // Устанавливаем номер улики
            if (this.elements.storyEvidenceId) {
                const evidenceId = String(gameData.currentStoryIndex + 1).padStart(2, '0');
                this.elements.storyEvidenceId.textContent = evidenceId;
            }

            // Обновляем варианты ответов
            this.updateAnswers(story.mistakes);
        }

        // Сбрасываем отображение результата
        this.hideResult();
    },

    /**
     * Обновление вариантов ответов
     * @param {Array} mistakes - Массив ошибок/вариантов ответов
     */
    updateAnswers(mistakes) {
        if (!this.elements.answersContainer) return;

        // Очищаем контейнер
        this.elements.answersContainer.innerHTML = '';

        // Создаем варианты ответов
        const markers = ['A', 'B', 'C', 'D', 'E'];

        mistakes.forEach((mistake, index) => {
            const marker = markers[index] || String(index + 1);

            const answerOption = document.createElement('div');
            answerOption.className = 'answer-option';
            answerOption.setAttribute('data-mistake-id', mistake.id);
            answerOption.setAttribute('data-action', 'selectAnswer');

            answerOption.innerHTML = `
                <div class="answer-marker">${marker}</div>
                <div class="answer-text">${mistake.text}</div>
            `;

            this.elements.answersContainer.appendChild(answerOption);
        });
    },

    /**
     * Обновление таймера
     * @param {number} secondsLeft - Оставшееся время в секундах
     * @param {number} totalTime - Общее время таймера
     */
    updateTimer(secondsLeft, totalTime) {
        if (!this.elements.timerValue || !this.elements.timerBar) return;

        // Обновляем текстовое значение таймера
        this.elements.timerValue.textContent = secondsLeft;

        // Обновляем полосу прогресса таймера
        const percentage = (secondsLeft / totalTime) * 100;
        this.elements.timerBar.style.width = `${percentage}%`;

        // Добавляем класс для предупреждения, когда мало времени
        const timerContainer = document.querySelector('.timer-container');
        if (timerContainer) {
            if (secondsLeft <= 5) {
                timerContainer.classList.add('urgent');
            } else {
                timerContainer.classList.remove('urgent');
            }
        }
    },

    /**
     * Показ результата ответа
     * @param {Object} result - Данные о результате ответа
     */
    showResult(result) {
        if (!this.elements.resultSection) return;

        // Устанавливаем класс результата
        this.elements.resultSection.className = result.correct ?
            'results-section result-correct' :
            'results-section result-incorrect';

        // Обновляем значок результата
        if (this.elements.resultBadge) {
            this.elements.resultBadge.textContent = result.correct ? 'ВЕРНО' : 'ОШИБКА';
        }

        // Обновляем заголовок результата
        if (this.elements.resultHeader) {
            this.elements.resultHeader.textContent = result.correct ? 'Правильно!' : 'Неправильно!';
        }

        // Обновляем объяснение
        if (this.elements.resultExplanation) {
            this.elements.resultExplanation.textContent = result.explanation || '';
        }

        // Обновляем очки
        if (this.elements.resultPoints) {
            this.elements.resultPoints.innerHTML = `<span class="points-value">${result.pointsEarned || 0}</span> ОЧКОВ`;
        }

        // Показываем раздел результата
        this.elements.resultSection.style.display = 'block';

        // Обновляем кнопку действия
        if (this.elements.actionButton) {
            this.elements.actionButton.textContent = 'СЛЕДУЮЩЕЕ ДЕЛО';
            this.elements.actionButton.setAttribute('data-action', 'nextQuestion');
        }
    },

    /**
     * Скрытие результата
     */
    hideResult() {
        if (this.elements.resultSection) {
            this.elements.resultSection.style.display = 'none';
        }
    },

    /**
     * Показать экран завершения игры
     * @param {Object} gameResult - Результаты игры
     */
    showGameFinish(gameResult) {
        // В текущей версии просто перенаправляем на главную страницу
        // В полной реализации здесь должен быть код для отображения экрана с результатами
        alert(`Игра завершена! Ваш счет: ${gameResult.totalScore || 0} очков`);
        window.location.href = '/';
    }
};

// Инициализация интерфейса при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    GameInterface.init();
}); 