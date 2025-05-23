/**
 * Основной файл приложения "Криминальный Блеф"
 * Содержит логику игры, взаимодействие с API и обработку пользовательских действий
 */

// Объект Telegram WebApp для доступа к API Telegram Mini Apps
let tg = null;

// Данные игрового состояния
const GameData = {
    score: 0,
    gameId: null,
    currentStory: null,
    currentStoryIndex: 0,
    stories: [],
    secondsLeft: 15,
    timerDuration: 15,
    timer: null,
    startTime: null,
    result: null,
    gameResult: null,
    isAnswering: false,
    answerSelected: false,
    token: null,
    theme: 'dark',
    isTestMode: false
};

// Экспортируем GameData в глобальную область видимости
window.GameData = GameData;

/**
 * Инициализация приложения
 */
function initApp() {
    console.log('Инициализация приложения начата...');

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
        GameData.theme = theme;
        document.body.setAttribute('data-theme', theme);
        console.log('Применена тема:', theme);

        // Раскрываем приложение на весь экран
        tg.expand();

        // Настраиваем обработчик кнопки "Назад"
        tg.BackButton.onClick(() => handleBackButton());

        // Убеждаемся, что GameInterface инициализирован
        if (typeof GameInterface === 'undefined') {
            console.warn('GameInterface не определен, ожидаем загрузку DOM');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM загружен, запуск загрузки данных...');
                loadGameData();
            });
        } else {
            // Запускаем загрузку тестовых данных или обращаемся к серверу
            console.log('GameInterface уже определен, запуск загрузки данных...');
            loadGameData();
        }

    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        handleNoTelegramApi();
    }
}

/**
 * Обработка отсутствия Telegram WebApp API
 */
function handleNoTelegramApi() {
    console.warn('Запуск в режиме тестирования - Telegram WebApp API недоступен');
    GameData.isTestMode = true;

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
    loadGameData(true);
}

/**
 * Обработка кнопки назад Telegram
 */
function handleBackButton() {
    if (confirm('Вы уверены, что хотите прервать игру?')) {
        window.location.href = '/';
    }
}

/**
 * Загрузка данных для игры
 * @param {boolean} testMode - Флаг тестового режима
 */
async function loadGameData(testMode = false) {
    console.log('Загрузка данных для игры...');

    try {
        if (testMode || GameData.isTestMode) {
            console.log('Загрузка тестовых данных...');
            loadTestData();
            return;
        }

        // Здесь был бы запрос к серверу для получения реальных данных
        // Но поскольку мы интегрируем новый интерфейс с существующим бэкендом,
        // пока используем тестовые данные
        loadTestData();

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Произошла ошибка при загрузке данных. Игра продолжится в тестовом режиме.');
        loadTestData();
    }
}

/**
 * Загрузка тестовых данных для игры
 */
function loadTestData() {
    console.log('Загрузка тестовых данных для игры');

    // Создаем тестовые истории для игры
    const testStories = [
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
                    explanation: 'Хотя преступник допустил ошибку с камерой, это не является критической уликой. Многие современные камеры не фиксируют детали лица в темноте достаточно четко для идентификации.'
                },
                {
                    id: 'mistake-2',
                    text: 'Работал без перчаток, оставив отпечатки пальцев на витринах и украшениях',
                    isCorrect: false,
                    explanation: 'Отпечатки пальцев - серьезная улика, но современные преступники часто используют методы для их уничтожения или маскировки. Кроме того, для идентификации нужно, чтобы отпечатки преступника уже были в базе данных.'
                },
                {
                    id: 'mistake-3',
                    text: 'Оставил свои биологические следы, смыв кровь в раковине, что позволило получить его ДНК',
                    isCorrect: true,
                    explanation: 'Преступник оставил биологический материал (кровь), который попал в слив раковины. Даже после смывания, следы ДНК остаются на сантехнике и в трубах. Криминалисты легко извлекают такие образцы и используют для идентификации. Современные методы могут выделить ДНК-профиль даже из микроскопических следов крови.'
                }
            ]
        },
        {
            id: 'test-story-2',
            title: 'КРАЖА В МУЗЕЕ ИСКУССТВ',
            content: 'Во время выставки импрессионистов в городском музее была украдена картина Клода Моне. Преступник проник в здание <span class="highlighted-text">во время рабочих часов</span>, притворившись работником технической службы. В момент кражи он <span class="highlighted-text">отключил сигнализацию</span> на 5 минут, быстро срезал картину с рамы и спрятал её в <span class="highlighted-text">специальный тубус для чертежей</span>. На следующий день он разместил объявление о продаже редкого "принта Моне" на интернет-аукционе.',
            date: '23.05.2024',
            difficulty: 'hard',
            mistakes: [
                {
                    id: 'mistake-1',
                    text: 'Проникновение в рабочие часы - слишком много свидетелей могли его заметить',
                    isCorrect: false,
                    explanation: 'Хотя это рискованно, многие успешные кражи произведений искусства происходят именно в рабочее время. В толпе посетителей и сотрудников преступник может оставаться незамеченным, особенно в большом музее.'
                },
                {
                    id: 'mistake-2',
                    text: 'Продажа украденного через интернет-аукцион, что легко отслеживается правоохранительными органами',
                    isCorrect: true,
                    explanation: 'Попытка продать украденное произведение искусства через публичный интернет-аукцион - критическая ошибка. Правоохранительные органы регулярно мониторят онлайн-площадки на предмет похищенных ценностей. IP-адрес, данные аккаунта и платежная информация могут напрямую привести к преступнику.'
                },
                {
                    id: 'mistake-3',
                    text: 'Отключение сигнализации, которое фиксируется в журнале системы безопасности',
                    isCorrect: false,
                    explanation: 'Отключение сигнализации действительно фиксируется, но профессиональные воры часто используют методы, которые имитируют технический сбой или плановое обслуживание, что усложняет расследование.'
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
                    explanation: 'Смена страховой компании и повышение страховой суммы незадолго до инцидента - классический признак страхового мошенничества. Страховые компании помечают такие случаи как подозрительные и проводят особенно тщательное расследование. Это первое, на что обращают внимание страховые следователи.'
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
                    explanation: 'Оформление крупной страховки жизни непосредственно перед "несчастным случаем" - явный признак мошенничества. Страховые компании всегда проверяют, как давно был оформлен полис в случаях с крупными выплатами, и часто задерживают выплаты до полного расследования в подозрительных случаях.'
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
                    explanation: 'Хотя появление на публике рискованно, многие люди успешно начинают новую жизнь под новыми именами, особенно в странах с менее строгим контролем. Главная ошибка была в финансовой схеме, а не в этом аспекте.'
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
                    explanation: 'Поиск информации об отравляющих веществах с личного устройства - критическая ошибка. Цифровые следы крайне сложно уничтожить полностью, и правоохранительные органы имеют законные способы получить историю поисковых запросов. Многие преступники были пойманы именно благодаря их онлайн-активности перед преступлением.'
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
                    explanation: 'Использование яда рискованно, но многие отравления остаются незамеченными. В данном случае экспертиза была проведена только из-за других подозрительных обстоятельств. Главная ошибка была в цифровых следах, а не в выборе метода.'
                }
            ]
        }
    ];

    // Устанавливаем данные игры
    GameData.gameId = 'test-game-' + Date.now();
    GameData.stories = testStories;
    GameData.currentStoryIndex = 0;
    GameData.currentStory = testStories[0];
    GameData.isTestMode = true;

    // Сбрасываем все флаги состояния для первого вопроса
    GameData.isAnswering = false;
    GameData.answerSelected = false;
    GameData.result = null;

    // Останавливаем предыдущий таймер, если существует
    if (GameData.timer) {
        clearInterval(GameData.timer);
        GameData.timer = null;
    }

    // Обновляем интерфейс
    if (typeof GameInterface !== 'undefined') {
        GameInterface.updateUI(GameData);
    }

    // Запускаем таймер для первого вопроса с задержкой
    // (аналогично nextQuestion)
    setTimeout(() => {
        startTimer();
    }, 100);
}

/**
 * Запуск таймера для текущего вопроса
 */
function startTimer() {
    console.log('Запуск таймера...');

    // Сбрасываем состояние таймера
    clearInterval(GameData.timer);
    GameData.secondsLeft = GameData.timerDuration;
    GameData.startTime = Date.now();
    GameData.isAnswering = false;
    GameData.answerSelected = false; // Сбрасываем флаг при запуске нового таймера

    // Вызываем явный сброс визуального таймера через интерфейс
    if (typeof GameInterface !== 'undefined' && typeof GameInterface.resetTimer === 'function') {
        GameInterface.resetTimer(GameData.timerDuration);
    } else {
        // Обновляем отображение таймера стандартным способом, если resetTimer не доступен
        if (typeof GameInterface !== 'undefined') {
            GameInterface.updateTimer(GameData.secondsLeft, GameData.timerDuration);
        }
    }

    // Запускаем таймер
    GameData.timer = setInterval(() => {
        GameData.secondsLeft--;

        // Обновляем отображение таймера
        if (typeof GameInterface !== 'undefined') {
            GameInterface.updateTimer(GameData.secondsLeft, GameData.timerDuration);
        }

        // Тактильная обратная связь при малом времени
        if (GameData.secondsLeft <= 5 && tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('warning');
        }

        // Время истекло
        if (GameData.secondsLeft <= 0) {
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
    if (GameData.timer) {
        clearInterval(GameData.timer);
        GameData.timer = null;
        console.log('Таймер успешно остановлен при истечении времени');
    } else {
        console.warn('Таймер не был найден для остановки в timeExpired');
    }

    // Если ответ уже был выбран, пропускаем обработку истечения времени
    if (GameData.answerSelected) {
        console.log('Пропускаем обработку истечения времени, так как ответ уже выбран');
        return;
    }

    // Визуальная и тактильная обратная связь
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }

    // Если не в процессе выбора ответа
    if (!GameData.isAnswering) {
        GameData.isAnswering = true;

        // Блокируем варианты ответов
        if (typeof GameInterface !== 'undefined' && typeof GameInterface.disableAnswerOptions === 'function') {
            GameInterface.disableAnswerOptions();
        }

        // Находим правильный ответ
        const correctMistake = GameData.currentStory.mistakes.find(m => m.isCorrect);

        // Выделяем правильный ответ
        if (correctMistake) {
            setTimeout(() => {
                const correctOption = document.querySelector(`[data-mistake-id="${correctMistake.id}"]`);
                if (correctOption) {
                    correctOption.classList.add('correct-answer');
                }
            }, 500);
        }

        // Готовим данные результата
        const result = {
            correct: false,
            explanation: "Время истекло! " + (correctMistake ? correctMistake.explanation : "Важно принимать решения вовремя."),
            pointsEarned: 0,
            details: {
                base: 0,
                timeBonus: 0,
                difficultyBonus: 0,
                total: 0
            }
        };

        // Сохраняем результат
        GameData.result = result;

        // Показываем правильный ответ через интерфейс
        setTimeout(() => {
            if (typeof GameInterface !== 'undefined') {
                GameInterface.showResult(result);
            }
            GameData.isAnswering = false;
        }, 1000);
    }
}

/**
 * Обработка выбора ответа
 * @param {string} mistakeId - ID выбранной ошибки
 */
function selectAnswer(mistakeId) {
    // Если уже выбираем ответ, игнорируем повторные клики
    if (GameData.isAnswering) {
        console.log('Игнорируем повторный выбор ответа, так как уже в процессе выбора');
        return;
    }

    console.log('Выбран ответ:', mistakeId);
    GameData.isAnswering = true;
    GameData.answerSelected = true;

    // Останавливаем таймер - двойная проверка для надежности
    console.log('Остановка таймера в selectAnswer');
    if (GameData.timer) {
        console.log('Таймер найден, останавливаем...');
        clearInterval(GameData.timer);
        GameData.timer = null;
        console.log('Таймер успешно остановлен после выбора ответа');
    } else {
        console.warn('Таймер не был найден для остановки. GameData.secondsLeft =', GameData.secondsLeft);
        // Пытаемся остановить все интервалы, которые могут быть связаны с таймером
        const highestIntervalId = setInterval(() => { }, 100000);
        for (let i = 0; i < highestIntervalId; i++) {
            clearInterval(i);
        }
        console.log('Попытка остановить все возможные интервалы');
    }

    // Визуальная и тактильная обратная связь
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }

    // Вычисляем время ответа
    const timeSpent = GameData.timerDuration - GameData.secondsLeft;

    // Находим выбранный вариант ответа
    const selectedMistake = GameData.currentStory.mistakes.find(m => m.id === mistakeId);

    // Находим правильный ответ
    const correctMistake = GameData.currentStory.mistakes.find(m => m.isCorrect);

    // Проверяем правильность ответа
    const isCorrect = selectedMistake && selectedMistake.isCorrect;

    // Если ответ неправильный, выделяем правильный вариант
    if (!isCorrect && correctMistake) {
        setTimeout(() => {
            const correctOption = document.querySelector(`[data-mistake-id="${correctMistake.id}"]`);
            if (correctOption) {
                correctOption.classList.add('correct-answer');
            }
        }, 500);
    }

    // Рассчитываем очки
    const points = calculatePoints(isCorrect, timeSpent, GameData.currentStory.difficulty);

    // Обновляем общий счет
    if (isCorrect) {
        GameData.score += points.total;
    }

    // Создаем объект результата
    const result = {
        correct: isCorrect,
        explanation: isCorrect ? selectedMistake.explanation : correctMistake.explanation,
        pointsEarned: isCorrect ? points.total : 0,
        details: points
    };

    // Сохраняем результат
    GameData.result = result;

    // Задержка перед показом результата для лучшего UX
    setTimeout(() => {
        if (typeof GameInterface !== 'undefined') {
            GameInterface.showResult(result);
        }
        GameData.isAnswering = false;
    }, 1000);
}

/**
 * Расчет очков за ответ
 * @param {boolean} isCorrect - Флаг правильности ответа
 * @param {number} timeSpent - Затраченное время в секундах
 * @param {string} difficulty - Сложность вопроса
 * @returns {Object} Детали начисления очков
 */
function calculatePoints(isCorrect, timeSpent, difficulty) {
    if (!isCorrect) {
        return {
            base: 0,
            timeBonus: 0,
            difficultyBonus: 0,
            total: 0
        };
    }

    // Базовые очки за правильный ответ
    let basePoints = 100;

    // Бонус за скорость ответа
    const timeBonus = Math.max(0, Math.floor((GameData.timerDuration - timeSpent) * 3));

    // Бонус за сложность
    let difficultyBonus = 0;
    switch (difficulty) {
        case 'easy':
            difficultyBonus = 0;
            break;
        case 'medium':
            difficultyBonus = 20;
            break;
        case 'hard':
            difficultyBonus = 50;
            break;
    }

    // Общее количество очков
    const totalPoints = basePoints + timeBonus + difficultyBonus;

    return {
        base: basePoints,
        timeBonus: timeBonus,
        difficultyBonus: difficultyBonus,
        total: totalPoints
    };
}

/**
 * Переход к следующему вопросу
 */
function nextQuestion() {
    console.log('Переход к следующему вопросу');

    // Если это была последняя история, завершаем игру
    if (GameData.currentStoryIndex >= GameData.stories.length - 1) {
        console.log('Это был последний вопрос. Завершаем игру.');
        finishGame();
        return;
    }

    // Останавливаем текущий таймер, если он активен
    if (GameData.timer) {
        clearInterval(GameData.timer);
        GameData.timer = null;
    }

    // Увеличиваем индекс текущей истории
    GameData.currentStoryIndex++;
    GameData.currentStory = GameData.stories[GameData.currentStoryIndex];

    // Сбрасываем все флаги состояния
    GameData.isAnswering = false;
    GameData.answerSelected = false;
    GameData.result = null;

    // Сначала обновляем интерфейс
    if (typeof GameInterface !== 'undefined') {
        GameInterface.updateUI(GameData);
    }

    // Потом запускаем таймер для нового вопроса с небольшой задержкой
    // чтобы дать время на отрисовку интерфейса
    setTimeout(() => {
        startTimer();
    }, 100);
}

/**
 * Завершение игры
 */
async function finishGame() {
    console.log('Завершение игры...');

    // Создаем объект с результатами игры
    const gameResult = {
        totalScore: GameData.score,
        correctAnswers: GameData.stories.filter((_, index) => {
            // Предполагаем, что история была отвечена правильно, если в результате correct=true
            return index <= GameData.currentStoryIndex &&
                (index < GameData.currentStoryIndex ||
                    (GameData.result && GameData.result.correct));
        }).length,
        totalQuestions: GameData.stories.length
    };

    // Сохраняем результаты
    GameData.gameResult = gameResult;

    // Пытаемся отправить результаты на сервер
    try {
        // Проверяем наличие токена авторизации
        const token = localStorage.getItem('auth_token');

        if (token) {
            // Отправляем результаты на сервер
            const response = await fetch('/api/game/finish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gameId: GameData.gameId,
                    totalScore: gameResult.totalScore,
                    correctAnswers: gameResult.correctAnswers,
                    totalQuestions: gameResult.totalQuestions
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Результаты игры успешно сохранены на сервере:', data);

                // Обновляем информацию о новых достижениях, если они есть
                if (data.status === 'success' && data.data.newAchievements && data.data.newAchievements.length > 0) {
                    // Можно показать уведомление о новых достижениях
                    console.log('Получены новые достижения:', data.data.newAchievements);
                }
            } else {
                console.error('Ошибка при сохранении результатов на сервере:', await response.text());
            }
        } else {
            console.warn('Невозможно сохранить результаты игры - отсутствует токен авторизации');
        }
    } catch (error) {
        console.error('Ошибка при отправке результатов игры:', error);
    }

    // Показываем экран завершения
    if (typeof GameInterface !== 'undefined') {
        // Создаем диалог с результатами и кнопками для перехода
        const dialog = document.createElement('div');
        dialog.className = 'game-finish-dialog';
        dialog.innerHTML = `
            <div class="game-finish-content">
                <h2>Расследование завершено!</h2>
                <p>Ваш счет: <span class="highlight-score">${gameResult.totalScore}</span> очков</p>
                <p>Правильных ответов: ${gameResult.correctAnswers} из ${gameResult.totalQuestions}</p>
                <div class="game-finish-buttons">
                    <button id="btnGoHome" class="finish-button">ГЛАВНАЯ</button>
                    <button id="btnGoProfile" class="finish-button primary">ПРОФИЛЬ</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Обработчики для кнопок
        document.getElementById('btnGoHome').addEventListener('click', () => {
            window.location.href = '/';
        });

        document.getElementById('btnGoProfile').addEventListener('click', () => {
            window.location.href = '/profile.html';
        });

        // Добавляем стили для диалога, если их нет
        if (!document.getElementById('finish-dialog-styles')) {
            const style = document.createElement('style');
            style.id = 'finish-dialog-styles';
            style.textContent = `
                .game-finish-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.3s ease-out;
                }
                
                .game-finish-content {
                    background: var(--morgue-gray, #2C2C2C);
                    border: 2px solid var(--blood-red, #8B0000);
                    border-radius: 12px;
                    padding: 24px;
                    text-align: center;
                    width: 80%;
                    max-width: 400px;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                }
                
                .game-finish-content h2 {
                    margin-bottom: 16px;
                    color: var(--chalk-white, #E8E8E8);
                }
                
                .game-finish-content p {
                    margin-bottom: 12px;
                }
                
                .highlight-score {
                    color: var(--crime-scene-yellow, #FFD700);
                    font-weight: bold;
                    font-size: 1.2em;
                }
                
                .game-finish-buttons {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 24px;
                }
                
                .finish-button {
                    flex: 1;
                    margin: 0 8px;
                    padding: 12px;
                    border: 1px solid var(--dried-blood, #5C1010);
                    background: var(--darker-gray, #1E1E1E);
                    color: var(--chalk-white, #E8E8E8);
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .finish-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }
                
                .finish-button.primary {
                    background: var(--blood-red, #8B0000);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        alert(`Игра завершена! Ваш счет: ${gameResult.totalScore}`);
        window.location.href = '/';
    }
}

// Экспорт функций для использования из интерфейса
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    initApp();
}); 