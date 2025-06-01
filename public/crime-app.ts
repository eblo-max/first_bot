/**
 * 🎮 ОСНОВНОЕ ПРИЛОЖЕНИЕ "КРИМИНАЛЬНЫЙ БЛЕФ"
 * Модульная TypeScript версия
 */

import { AppGameData, selectAnswer, calculatePoints, setTelegramApp } from './game-core.js';
import { authorize, verifyExistingToken, initAppWithAuth } from './auth.js';
import {
    GameStory,
    TelegramWebAppData,
    AppTheme,
    GameFinishResult,
    GameResult
} from './types.js';

// =============== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===============

let telegramApp: TelegramWebAppData | null = null;

// =============== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===============

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function updateGameInterface(): void {
    const gameInterface = (window as any).GameInterface;
    if (gameInterface && typeof gameInterface.updateUI === 'function') {
        gameInterface.updateUI(AppGameData);
        console.log('🔄 Игровой интерфейс обновлен');
    }
}

// =============== ТЕСТОВЫЕ ДАННЫЕ ===============

function loadTestGameData(): void {
    console.log('🧪 Загрузка тестовых данных игры...');

    const testStories: GameStory[] = [
        {
            id: 'test-story-1',
            title: 'ОГРАБЛЕНИЕ ЮВЕЛИРНОГО МАГАЗИНА',
            content: 'Преступник взломал заднюю дверь ювелирного магазина в 3 часа ночи. Он отключил камеры видеонаблюдения, но не заметил <span class="highlighted-text">скрытую камеру над сейфом</span>. На записи видно, как он <span class="highlighted-text">без перчаток</span> открывает витрины и собирает украшения в рюкзак. Перед уходом преступник воспользовался <span class="highlighted-text">раковиной в подсобке</span>, чтобы смыть кровь с пореза на руке.',
            date: '12.04.2024',
            difficulty: 'medium',
            mistakes: [
                {
                    id: 'mistake-1',
                    text: 'Неправильно отключил систему видеонаблюдения, не заметив скрытую камеру',
                    isCorrect: false,
                    explanation: 'Хотя преступник допустил ошибку с камерой, это не является критической уликой.'
                },
                {
                    id: 'mistake-2',
                    text: 'Работал без перчаток, оставив отпечатки пальцев на витринах и украшениях',
                    isCorrect: false,
                    explanation: 'Отпечатки пальцев - серьезная улика, но современные преступники часто используют методы для их уничтожения.'
                },
                {
                    id: 'mistake-3',
                    text: 'Оставил свои биологические следы, смыв кровь в раковине, что позволило получить его ДНК',
                    isCorrect: true,
                    explanation: 'Преступник оставил биологический материал (кровь), который попал в слив раковины. Даже после смывания, следы ДНК остаются.'
                }
            ]
        },
        {
            id: 'test-story-2',
            title: 'КРАЖА В МУЗЕЕ ИСКУССТВ',
            content: 'Во время выставки импрессионистов в городском музее была украдена картина Клода Моне.',
            date: '23.05.2024',
            difficulty: 'hard',
            mistakes: [
                {
                    id: 'mistake-1',
                    text: 'Проникновение в рабочие часы - слишком много свидетелей',
                    isCorrect: false,
                    explanation: 'В толпе посетителей преступник может оставаться незамеченным.'
                },
                {
                    id: 'mistake-2',
                    text: 'Продажа украденного через интернет-аукцион',
                    isCorrect: true,
                    explanation: 'Попытка продать украденное произведение искусства через публичный интернет-аукцион - критическая ошибка.'
                },
                {
                    id: 'mistake-3',
                    text: 'Отключение сигнализации, которое фиксируется в журнале',
                    isCorrect: false,
                    explanation: 'Профессиональные воры часто используют методы, которые имитируют технический сбой.'
                }
            ]
        },
        {
            id: 'test-story-3',
            title: 'МОШЕННИЧЕСТВО СО СТРАХОВКОЙ',
            content: 'Бизнесмен заявил о краже дорогого автомобиля и подал заявление на страховую выплату в размере 180 000 евро. По его словам, автомобиль был украден с подземной парковки торгового центра. Полиция начала расследование и обнаружила, что владелец <span class="highlighted-text">недавно имел финансовые трудности</span> и <span class="highlighted-text">снял с машины дорогие детали перед предполагаемой кражей</span>. Также выяснилось, что он <span class="highlighted-text">сменил страховую компанию за месяц до инцидента</span>, увеличив страховую сумму.',
            date: '07.02.2024',
            difficulty: 'easy',
            mistakes: [
                {
                    id: 'mistake-1',
                    text: 'Смена страховой компании и увеличение страховой суммы незадолго до "кражи"',
                    isCorrect: true,
                    explanation: 'Смена страховой компании и повышение страховой суммы незадолго до инцидента - классический признак страхового мошенничества. Страховые компании помечают такие случаи как подозрительные и проводят особенно тщательное расследование.'
                },
                {
                    id: 'mistake-2',
                    text: 'Снятие дорогих деталей перед инсценировкой кражи',
                    isCorrect: false,
                    explanation: 'Хотя это подозрительно, доказать, что детали были сняты именно владельцем, а не настоящими ворами после кражи, довольно сложно без дополнительных доказательств.'
                },
                {
                    id: 'mistake-3',
                    text: 'Наличие финансовых трудностей как мотив для мошенничества',
                    isCorrect: false,
                    explanation: 'Финансовые трудности создают мотив, но сами по себе не являются доказательством мошенничества. Многие люди с финансовыми проблемами становятся жертвами настоящих преступлений.'
                }
            ]
        },
        {
            id: 'test-story-4',
            title: 'ИСЧЕЗНОВЕНИЕ В ГОРАХ',
            content: 'Опытный альпинист был объявлен пропавшим без вести во время одиночного восхождения. Спасательная операция продолжалась две недели, но тело так и не нашли. Через три месяца он был <span class="highlighted-text">замечен живым в другой стране</span> с новыми документами. Расследование выявило, что перед исчезновением он <span class="highlighted-text">оформил страховку жизни на 2 миллиона долларов</span> в пользу жены, а также <span class="highlighted-text">имел крупные долги</span> перед криминальными структурами.',
            date: '14.11.2023',
            difficulty: 'medium',
            mistakes: [
                {
                    id: 'mistake-1',
                    text: 'Оформление крупной страховки жизни незадолго до инсценировки смерти',
                    isCorrect: true,
                    explanation: 'Оформление крупной страховки жизни непосредственно перед "несчастным случаем" - явный признак мошенничества. Страховые компании всегда проверяют, как давно был оформлен полис в случаях с крупными выплатами.'
                },
                {
                    id: 'mistake-2',
                    text: 'Наличие крупных долгов как мотив для инсценировки смерти',
                    isCorrect: false,
                    explanation: 'Долги создают мотив, но не являются ошибкой в исполнении плана. К тому же, настоящие несчастные случаи также случаются с людьми, имеющими долги.'
                },
                {
                    id: 'mistake-3',
                    text: 'Появление на публике под новыми документами слишком рано после исчезновения',
                    isCorrect: false,
                    explanation: 'Хотя появление на публике рискованно, многие люди успешно начинают новую жизнь под новыми именами, особенно в странах с менее строгим контролем.'
                }
            ]
        },
        {
            id: 'test-story-5',
            title: 'ОТРАВЛЕНИЕ БИЗНЕСМЕНА',
            content: 'Известный бизнесмен был найден мертвым в своем доме. Первоначально причиной смерти считался сердечный приступ, но токсикологическая экспертиза выявила <span class="highlighted-text">редкий яд растительного происхождения</span>. Основной подозреваемой стала его вторая жена, которая <span class="highlighted-text">настаивала на кремации</span> до получения результатов вскрытия и являлась <span class="highlighted-text">единственной наследницей</span> по недавно измененному завещанию. В ее поисковой истории нашли запросы о методах отравления.',
            date: '30.03.2024',
            difficulty: 'hard',
            mistakes: [
                {
                    id: 'mistake-1',
                    text: 'Поиск информации об отравляющих веществах в интернете без использования анонимных сервисов',
                    isCorrect: true,
                    explanation: 'Поиск информации об отравляющих веществах с личного устройства - критическая ошибка. Цифровые следы крайне сложно уничтожить полностью, и правоохранительные органы имеют законные способы получить историю поисковых запросов.'
                },
                {
                    id: 'mistake-2',
                    text: 'Настаивание на кремации до получения результатов вскрытия, что вызвало подозрения',
                    isCorrect: false,
                    explanation: 'Хотя это подозрительно, многие люди настаивают на кремации по религиозным или личным убеждениям. К тому же, само по себе это не является преступлением или прямым доказательством.'
                },
                {
                    id: 'mistake-3',
                    text: 'Использование редкого яда, который можно обнаружить при тщательной токсикологической экспертизе',
                    isCorrect: false,
                    explanation: 'Использование яда рискованно, но многие отравления остаются незамеченными. В данном случае экспертиза была проведена только из-за других подозрительных обстоятельств.'
                }
            ]
        }
    ];

    const shuffledStories = shuffleArray([...testStories]);
    AppGameData.stories = shuffledStories;
    AppGameData.currentStoryIndex = 0;
    AppGameData.currentStory = shuffledStories[0] || null;
    AppGameData.score = 0;
    AppGameData.gameId = 'test-game-' + Date.now();
    AppGameData.isTestMode = true;

    updateGameInterface();

    setTimeout(() => {
        startTimer();
    }, 100);
}

// =============== ОСНОВНЫЕ ФУНКЦИИ ===============

function initApp(): void {
    console.log('🚀 Инициализация приложения...');

    try {
        if (!(window as any).Telegram?.WebApp) {
            console.warn('⚠️ Telegram WebApp API не найдено, переходим в тестовый режим');
            handleNoTelegramApi();
            return;
        }

        telegramApp = (window as any).Telegram.WebApp;
        if (telegramApp) {
            setTelegramApp(telegramApp);
        }

        const theme = telegramApp?.colorScheme || 'dark';
        AppGameData.theme = theme;
        document.body.setAttribute('data-theme', theme);

        telegramApp?.expand();
        telegramApp?.BackButton.onClick(() => handleBackButton());

        loadGameData();
        console.log('✅ Приложение инициализировано успешно');

    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        handleNoTelegramApi();
    }
}

function handleNoTelegramApi(): void {
    console.log('🧪 Переход в тестовый режим...');
    AppGameData.isTestMode = true;

    if (!(window as any).Telegram) {
        (window as any).Telegram = {
            WebApp: {
                ready: () => console.log('📱 WebApp.ready() в тестовом режиме'),
                expand: () => console.log('📱 WebApp.expand() в тестовом режиме'),
                initData: "test_mode_data",
                initDataUnsafe: { user: { id: 12345678, first_name: "Test", username: "testuser" } },
                BackButton: {
                    show: () => console.log('🔙 BackButton.show()'),
                    hide: () => console.log('🔙 BackButton.hide()'),
                    onClick: (callback: () => void) => {
                        document.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape') callback();
                        });
                    }
                },
                colorScheme: "dark" as AppTheme,
                HapticFeedback: {
                    impactOccurred: (type?: string) => console.log(`📳 HapticFeedback.impactOccurred(${type})`),
                    notificationOccurred: (type?: string) => console.log(`📳 HapticFeedback.notificationOccurred(${type})`)
                }
            }
        };
    }

    telegramApp = (window as any).Telegram.WebApp;
    if (telegramApp) {
        setTelegramApp(telegramApp);
    }
    loadGameData(true);
}

function handleBackButton(): void {
    console.log('🔙 Нажата кнопка "Назад"');
    const shouldExit = confirm('Вы уверены, что хотите прервать игру?');
    if (shouldExit) {
        window.location.href = '/';
    }
}

async function loadGameData(testMode: boolean = false): Promise<void> {
    console.log('📊 Загрузка данных игры...', { testMode });

    try {
        if (testMode || AppGameData.isTestMode) {
            loadTestGameData();
            return;
        }
        // В будущем - запрос к серверу
        loadTestGameData();
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        loadTestGameData();
    }
}

function startTimer(): void {
    console.log('⏱️ Запуск таймера для вопроса');

    if (AppGameData.timer !== null) {
        clearInterval(AppGameData.timer);
    }

    AppGameData.secondsLeft = AppGameData.timerDuration;
    AppGameData.startTime = new Date();
    AppGameData.isAnswering = false;
    AppGameData.answerSelected = false;

    const gameInterface = (window as any).GameInterface;
    if (gameInterface?.resetTimer) {
        gameInterface.resetTimer(AppGameData.timerDuration);
    }

    AppGameData.timer = window.setInterval(() => {
        AppGameData.secondsLeft--;

        if (gameInterface?.updateTimer) {
            gameInterface.updateTimer(AppGameData.secondsLeft, AppGameData.timerDuration);
        }

        if (AppGameData.secondsLeft <= 0) {
            timeExpired();
        }
    }, 1000);
}

function timeExpired(): void {
    console.log('⏰ Время истекло!');

    if (AppGameData.timer !== null) {
        clearInterval(AppGameData.timer);
        AppGameData.timer = null;
    }

    if (AppGameData.answerSelected) return;

    AppGameData.isAnswering = true;

    const correctMistake = AppGameData.currentStory?.mistakes.find(m => m.isCorrect);

    const result: GameResult = {
        correct: false,
        explanation: "Время истекло! " + (correctMistake?.explanation || "Важно принимать решения вовремя."),
        pointsEarned: 0,
        timeSpent: AppGameData.timerDuration
    };

    AppGameData.result = result;

    setTimeout(() => {
        const gameInterface = (window as any).GameInterface;
        if (gameInterface?.showResult) {
            gameInterface.showResult(result);
        }
        AppGameData.isAnswering = false;
    }, 1000);
}

function nextQuestion(): void {
    console.log(`➡️ Переход к следующему вопросу. Индекс: ${AppGameData.currentStoryIndex}`);

    if (AppGameData.currentStoryIndex >= AppGameData.stories.length - 1) {
        finishGame();
        return;
    }

    if (AppGameData.timer !== null) {
        clearInterval(AppGameData.timer);
        AppGameData.timer = null;
    }

    AppGameData.currentStoryIndex++;
    AppGameData.currentStory = AppGameData.stories[AppGameData.currentStoryIndex];
    AppGameData.isAnswering = false;
    AppGameData.answerSelected = false;
    AppGameData.result = null;

    updateGameInterface();

    setTimeout(() => {
        startTimer();
    }, 100);
}

async function finishGame(): Promise<void> {
    console.log('🏁 Завершение игры...');

    let correctAnswers = 0;
    const totalQuestions = AppGameData.stories.length;

    AppGameData.stories.forEach((story) => {
        if ((story as any).correct === true) correctAnswers++;
    });

    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    const totalScore = AppGameData.score || 0;

    const gameResult: GameFinishResult = {
        gameId: AppGameData.gameId || 'unknown',
        totalScore: totalScore,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        accuracy: accuracy,
        timeSpent: 0,
        experienceGained: Math.round(totalScore * 0.1),
        leveledUp: false,
        achievementsUnlocked: [],
        reputationChange: correctAnswers * 10,
        rank: accuracy >= 80 ? 'Detective' : accuracy >= 60 ? 'Inspector' : 'Rookie'
    };

    AppGameData.gameResult = gameResult;
    showGameFinishDialog(gameResult);

    // Отправляем результаты на сервер
    try {
        // Проверяем наличие токена авторизации
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

        if (token) {
            console.log('🔐 Отправляем результаты на сервер с авторизацией...');

            // Отправляем результаты на сервер
            const response = await fetch('/api/game/finish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gameId: AppGameData.gameId,
                    totalScore: totalScore,
                    correctAnswers: correctAnswers,
                    totalQuestions: totalQuestions
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Результаты сохранены на сервере');

                // Обновляем информацию о новых достижениях, если они есть
                if (data.status === 'success' && data.data.newAchievements && data.data.newAchievements.length > 0) {
                    console.log('🏆 Получены новые достижения:', data.data.newAchievements);

                    // Используем новую систему достижений для показа уведомлений
                    if ((window as any).AchievementSystem) {
                        // Обновляем статистику пользователя для корректного отображения прогресса
                        if (data.data.user && data.data.user.stats) {
                            (window as any).AchievementSystem.updateUserStats({
                                investigations: data.data.user.stats.totalGames || 0,
                                accuracy: data.data.user.stats.accuracy || 0,
                                totalScore: data.data.user.stats.totalScore || 0,
                                winStreak: data.data.user.stats.maxStreak || 0,
                                perfectGames: data.data.user.stats.perfectGames || 0,
                                fastestGame: data.data.user.stats.fastestGame || 999
                            });
                        }

                        // Показываем уведомления о новых достижениях
                        (window as any).AchievementSystem.handleNewAchievements(data.data.newAchievements);
                    } else {
                        console.log('⚠️ AchievementSystem не найдена, используем fallback');
                        // Fallback: показываем простое уведомление
                        data.data.newAchievements.forEach((achievement: any) => {
                            if ((window as any).Telegram?.WebApp?.showAlert) {
                                (window as any).Telegram.WebApp.showAlert(`🏆 Новое достижение: ${achievement.name}`);
                            } else {
                                console.log(`🏆 Новое достижение: ${achievement.name}`);
                            }
                        });
                    }
                }
            } else {
                console.error('❌ Ошибка при сохранении результатов на сервере:', await response.text());
            }
        } else {
            console.log('⚠️ Токен авторизации отсутствует, пропускаем отправку на сервер');
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке результатов на сервер:', error);
    }
}

function showGameFinishDialog(gameResult: GameFinishResult): void {
    const existingDialog = document.querySelector('.game-finish-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = document.createElement('div');
    dialog.className = 'game-finish-dialog';
    dialog.innerHTML = `
        <div class="game-finish-content">
            <h2>🔍 Расследование завершено!</h2>
            <div class="stats-summary">
                <p>Ваш счет: <span class="highlight-score">${gameResult.totalScore}</span> очков</p>
                <p>Правильных ответов: <strong>${gameResult.correctAnswers}</strong> из <strong>${gameResult.totalQuestions}</strong></p>
                <p>Точность: <span class="accuracy">${gameResult.accuracy}%</span></p>
                <p>Звание: <span class="rank">${gameResult.rank}</span></p>
            </div>
            <div class="game-finish-buttons">
                <button id="btnGoHome" class="finish-button">🏠 ГЛАВНАЯ</button>
                <button id="btnGoProfile" class="finish-button primary">👤 ПРОФИЛЬ</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('btnGoHome')?.addEventListener('click', () => {
        window.location.href = '/';
    });

    document.getElementById('btnGoProfile')?.addEventListener('click', () => {
        window.location.href = '/profile.html';
    });

    // Добавляем CSS стили если их нет
    if (!document.getElementById('finish-dialog-styles')) {
        const style = document.createElement('style');
        style.id = 'finish-dialog-styles';
        style.textContent = `
            .game-finish-dialog {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.8); display: flex; align-items: center;
                justify-content: center; z-index: 1000;
            }
            .game-finish-content {
                background: #2C2C2C; border: 2px solid #8B0000;
                border-radius: 12px; padding: 24px; text-align: center;
                width: 90%; max-width: 400px;
            }
            .finish-button {
                flex: 1; padding: 14px 20px; border: 1px solid #5C1010;
                background: #1E1E1E; color: #E8E8E8; border-radius: 8px;
                font-weight: bold; cursor: pointer; margin: 5px;
            }
            .finish-button.primary {
                background: #8B0000; border-color: #8B0000;
            }
        `;
        document.head.appendChild(style);
    }
}

function clearAppCache(): void {
    console.log('🧹 Очищаем кэш приложения...');
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

function provideFeedback(type: 'correct' | 'incorrect' | 'tap'): void {
    try {
        if (!telegramApp?.HapticFeedback) return;

        switch (type) {
            case 'correct':
                telegramApp.HapticFeedback.notificationOccurred('success');
                break;
            case 'incorrect':
                telegramApp.HapticFeedback.notificationOccurred('error');
                break;
            case 'tap':
                telegramApp.HapticFeedback.impactOccurred('light');
                break;
        }
    } catch (error) {
        console.log(`🎮 Feedback: ${type}`);
    }
}

// =============== ИНИЦИАЛИЗАЦИЯ И ЭКСПОРТ ===============

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Используем расширенную инициализацию если доступен Telegram WebApp
            const tg = (window as any).Telegram?.WebApp;
            if (tg && tg.initData && !tg.initData.includes('test_mode_data')) {
                initAppWithAuth(initApp, tg);
            } else {
                initApp();
            }
        });
    } else {
        // Используем расширенную инициализацию если доступен Telegram WebApp
        const tg = (window as any).Telegram?.WebApp;
        if (tg && tg.initData && !tg.initData.includes('test_mode_data')) {
            initAppWithAuth(initApp, tg);
        } else {
            initApp();
        }
    }

    // Экспорт функций в window
    (window as any).selectAnswer = selectAnswer;
    (window as any).nextQuestion = nextQuestion;
    (window as any).startTimer = startTimer;
    (window as any).finishGame = finishGame;
    (window as any).clearAppCache = clearAppCache;
    (window as any).provideFeedback = provideFeedback;
    (window as any).authorize = authorize;
    (window as any).verifyExistingToken = verifyExistingToken;
    (window as any).initAppWithAuth = initAppWithAuth;

    // Создаем глобальный объект для приложения
    (window as any).CriminalBluffApp = (window as any).CriminalBluffApp || {};
    (window as any).CriminalBluffApp.clearCache = clearAppCache;
    (window as any).CriminalBluffApp.authorize = authorize;
    (window as any).CriminalBluffApp.provideFeedback = provideFeedback;

    console.log('✅ Криминальный Блеф TypeScript загружен (модульная версия)!');
} 