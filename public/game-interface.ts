/**
 * 🎮 ИГРОВОЙ ИНТЕРФЕЙС "КРИМИНАЛЬНЫЙ БЛЕФ"
 * Типизированная версия управления игровым экраном
 * 
 * Основные возможности:
 * - Управление игровым UI
 * - Telegram WebApp интеграция
 * - Таймер и счетчики
 * - Варианты ответов
 */

// =============== ТИПЫ И ИНТЕРФЕЙСЫ ===============

type Difficulty = 'easy' | 'medium' | 'hard';

interface GameMistake {
    id: string;
    text: string;
}

interface GameStory {
    title: string;
    date: string;
    difficulty: Difficulty;
    content: string;
    mistakes: GameMistake[];
}

interface GameData {
    currentStoryIndex: number;
    stories: GameStory[];
    score: number;
    currentStory: GameStory;
    timerDuration: number;
    timer?: number | null;
    answerSelected?: boolean;
}

interface GameResult {
    correct: boolean;
    explanation: string;
    pointsEarned: number;
}

interface GameFinishResult {
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
}

interface GameInterfaceElements {
    questionProgress: HTMLElement | null;
    scoreDisplay: HTMLElement | null;
    timerValue: HTMLElement | null;
    timerBar: HTMLElement | null;
    storyTitle: HTMLElement | null;
    storyDate: HTMLElement | null;
    storyDifficulty: HTMLElement | null;
    storyContent: HTMLElement | null;
    storyEvidenceId: HTMLElement | null;
    answersContainer: HTMLElement | null;
    resultSection: HTMLElement | null;
    resultBadge: HTMLElement | null;
    resultHeader: HTMLElement | null;
    resultExplanation: HTMLElement | null;
    resultPoints: HTMLElement | null;
    actionButton: HTMLElement | null;
}

// Типы для Telegram WebApp (локальные для этого файла)
interface TelegramWebApp {
    ready(): void;
    expand(): void;
    BackButton: {
        show(): void;
        onClick(callback: () => void): void;
    };
    HapticFeedback?: {
        impactOccurred(type: 'light' | 'medium' | 'heavy'): void;
    };
}

// =============== ОСНОВНОЙ КЛАСС ИГРОВОГО ИНТЕРФЕЙСА ===============

class GameInterfaceClass {
    /**
     * Элементы интерфейса
     */
    public readonly elements: GameInterfaceElements;

    constructor() {
        this.elements = {
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
        };
    }

    /**
     * Инициализация интерфейса
     */
    public init(): void {
        console.log('🎮 Инициализация игрового интерфейса...');

        // Настраиваем обработчики событий
        this.setupEventListeners();

        // Инициализация Telegram WebApp
        this.initTelegramWebApp();

        console.log('✅ Игровой интерфейс инициализирован');
    }

    /**
     * Инициализация Telegram WebApp
     */
    private initTelegramWebApp(): void {
        const telegram = (window as any).Telegram;

        if (telegram?.WebApp) {
            console.log('📱 Настройка Telegram WebApp...');

            const webApp = telegram.WebApp as TelegramWebApp;

            // Расширяем WebApp
            webApp.expand();

            // Показываем кнопку "Назад" при запуске игры
            webApp.BackButton.show();

            // Настраиваем обработчик кнопки "Назад"
            webApp.BackButton.onClick(() => {
                const shouldExit = confirm('Вы уверены, что хотите прервать игру?');
                if (shouldExit) {
                    window.location.href = '/';
                }
            });

            // Сообщаем Telegram, что приложение готово
            webApp.ready();

            console.log('✅ Telegram WebApp настроен');
        } else {
            console.log('ℹ️ Telegram WebApp не доступен (возможно, запуск не в Telegram)');
        }
    }

    /**
     * Настройка обработчиков событий
     */
    private setupEventListeners(): void {
        // Делегирование событий для кнопок ответов
        document.addEventListener('click', this.handleButtonClick.bind(this));
    }

    /**
     * Обработчик кликов по кнопкам и элементам интерфейса
     */
    private handleButtonClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Находим ближайший элемент с атрибутом data-action
        const actionElement = target.closest('[data-action]') as HTMLElement;

        if (!actionElement) return;

        // Получаем действие из атрибута
        const action = actionElement.getAttribute('data-action');

        // Тактильная обратная связь при нажатии
        this.triggerHapticFeedback();

        // Обрабатываем действие
        switch (action) {
            case 'selectAnswer':
                this.handleSelectAnswer(actionElement);
                break;

            case 'nextQuestion':
                this.handleNextQuestion();
                break;

            case 'goToMain':
                this.handleGoToMain();
                break;

            default:
                console.warn(`⚠️ Неизвестное действие: ${action}`);
        }
    }

    /**
     * Тактильная обратная связь
     */
    private triggerHapticFeedback(): void {
        const telegram = (window as any).Telegram;

        if (telegram?.WebApp?.HapticFeedback) {
            telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    /**
     * Обработка выбора ответа
     */
    private handleSelectAnswer(actionElement: HTMLElement): void {
        const mistakeId = actionElement.getAttribute('data-mistake-id');

        if (!mistakeId) {
            console.error('❌ Отсутствует data-mistake-id у элемента ответа');
            return;
        }

        // Явная остановка таймера через обращение к GameData
        const gameData = (window as any).GameData as GameData | undefined;

        if (gameData?.timer) {
            clearInterval(gameData.timer);
            gameData.timer = null;
            gameData.answerSelected = true;
        }

        // После выбора ответа блокируем все варианты
        this.disableAnswerOptions();

        // Выделяем выбранный вариант
        actionElement.classList.add('selected');

        // Вызываем функцию выбора ответа
        const selectAnswer = (window as any).selectAnswer;

        if (typeof selectAnswer === 'function') {
            selectAnswer(mistakeId);
        } else {
            console.error('❌ Функция selectAnswer не найдена в window');
        }
    }

    /**
     * Обработка перехода к следующему вопросу
     */
    private handleNextQuestion(): void {
        const nextQuestion = (window as any).nextQuestion;

        if (typeof nextQuestion === 'function') {
            nextQuestion();
        } else {
            console.error('❌ Функция nextQuestion не найдена в window');
        }
    }

    /**
     * Обработка перехода на главную страницу
     */
    private handleGoToMain(): void {
        window.location.href = '/';
    }

    /**
     * Блокировка вариантов ответов после выбора
     */
    public disableAnswerOptions(): void {
        const answerOptions = document.querySelectorAll('.answer-option');
        answerOptions.forEach((option) => {
            const element = option as HTMLElement;
            // Удаляем атрибут data-action, чтобы предотвратить клики
            element.removeAttribute('data-action');
            // Добавляем класс, указывающий на то, что выбор сделан
            element.classList.add('disabled');
        });
    }

    /**
     * Обновление игрового интерфейса на основе текущей истории
     */
    public updateUI(gameData: GameData): void {
        console.log('🔄 Обновление игрового интерфейса...');

        // Обновляем счетчик вопросов
        if (this.elements.questionProgress) {
            this.elements.questionProgress.textContent =
                `${gameData.currentStoryIndex + 1}/${gameData.stories.length}`;
        }

        // Обновляем счет
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = gameData.score.toString();
        }

        // Обновляем информацию об истории
        if (gameData.currentStory) {
            this.updateStoryInfo(gameData.currentStory, gameData.currentStoryIndex);
        }

        // Сбрасываем таймер
        this.resetTimer(gameData.timerDuration);

        // Сбрасываем отображение результата
        this.hideResult();
    }

    /**
     * Обновление информации об истории
     */
    private updateStoryInfo(story: GameStory, storyIndex: number): void {
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
            const difficultyText: Record<Difficulty, string> = {
                'easy': 'СЛОЖНОСТЬ: ЛЕГКАЯ',
                'medium': 'СЛОЖНОСТЬ: СРЕДНЯЯ',
                'hard': 'СЛОЖНОСТЬ: ВЫСОКАЯ'
            };
            this.elements.storyDifficulty.textContent =
                difficultyText[story.difficulty] || 'СЛОЖНОСТЬ: СРЕДНЯЯ';
        }

        // Устанавливаем содержание истории
        if (this.elements.storyContent) {
            this.elements.storyContent.innerHTML = story.content || 'Описание истории не указано';
        }

        // Устанавливаем номер улики
        if (this.elements.storyEvidenceId) {
            const evidenceId = String(storyIndex + 1).padStart(2, '0');
            this.elements.storyEvidenceId.textContent = evidenceId;
        }

        // Обновляем варианты ответов
        this.updateAnswers(story.mistakes);
    }

    /**
     * Обновление вариантов ответов
     */
    private updateAnswers(mistakes: GameMistake[]): void {
        if (!this.elements.answersContainer) {
            console.error('❌ Контейнер ответов не найден');
            return;
        }

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

            // Проверяем, что контейнер все еще существует перед добавлением
            if (this.elements.answersContainer) {
                this.elements.answersContainer.appendChild(answerOption);
            }
        });
    }

    /**
     * Обновление таймера
     */
    public updateTimer(secondsLeft: number, totalTime: number): void {
        if (!this.elements.timerValue || !this.elements.timerBar) return;

        // Обновляем текстовое значение таймера
        this.elements.timerValue.textContent = secondsLeft.toString();

        // Обновляем полосу прогресса таймера
        const percentage = (secondsLeft / totalTime) * 100;
        this.elements.timerBar.style.width = `${percentage}%`;

        // Добавляем класс для предупреждения, когда мало времени
        const timerContainer = document.querySelector('.timer-container') as HTMLElement | null;
        if (timerContainer) {
            if (secondsLeft <= 5) {
                timerContainer.classList.add('urgent');
            } else {
                timerContainer.classList.remove('urgent');
            }
        }
    }

    /**
     * Показ результата ответа
     */
    public showResult(result: GameResult): void {
        if (!this.elements.resultSection) {
            console.error('❌ Секция результата не найдена');
            return;
        }

        console.log('📊 Показ результата:', result);

        // Блокируем варианты ответов, если они еще не заблокированы
        this.disableAnswerOptions();

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
            this.elements.resultPoints.innerHTML =
                `<span class="points-value">${result.pointsEarned || 0}</span> ОЧКОВ`;
        }

        // Показываем раздел результата
        this.elements.resultSection.style.display = 'block';

        // Обновляем кнопку действия
        if (this.elements.actionButton) {
            this.elements.actionButton.textContent = 'СЛЕДУЮЩЕЕ ДЕЛО';
            this.elements.actionButton.setAttribute('data-action', 'nextQuestion');
        }
    }

    /**
     * Скрытие результата
     */
    public hideResult(): void {
        if (this.elements.resultSection) {
            this.elements.resultSection.style.display = 'none';
        }
    }

    /**
     * Показать экран завершения игры
     */
    public showGameFinish(gameResult: GameFinishResult): void {
        console.log('🏁 Завершение игры:', gameResult);

        // В текущей версии просто перенаправляем на главную страницу
        // В полной реализации здесь должен быть код для отображения экрана с результатами
        window.location.href = '/';
    }

    /**
     * Сбросить состояние таймера
     */
    public resetTimer(totalTime: number): void {
        if (!this.elements.timerValue || !this.elements.timerBar) return;

        // Сбрасываем текстовое значение таймера
        this.elements.timerValue.textContent = totalTime.toString();

        // Сбрасываем полосу прогресса таймера на 100%
        this.elements.timerBar.style.width = '100%';

        // Удаляем класс для предупреждения
        const timerContainer = document.querySelector('.timer-container') as HTMLElement | null;
        if (timerContainer) {
            timerContainer.classList.remove('urgent');
        }
    }
}

// =============== ИНИЦИАЛИЗАЦИЯ ===============

// Создаем экземпляр интерфейса (переименовываем для избежания конфликта)
const GameInterfaceInstance = new GameInterfaceClass();

// Инициализация интерфейса при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    GameInterfaceInstance.init();
});

// Экспортируем для использования в других модулях (сохраняем обратную совместимость)
if (typeof window !== 'undefined') {
    (window as any).GameInterface = GameInterfaceInstance;
} 