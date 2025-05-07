/**
 * Управление функциональностью профиля "Криминальный Блеф"
 * Этот файл отвечает за отображение и взаимодействие с данными профиля пользователя
 */

// Константа для режима отладки (true - только для локальной разработки)
const DEBUG_MODE = true;

// Объект Telegram WebApp для доступа к API Telegram Mini Apps
let tg = null;

/**
 * Объект для работы с профилем пользователя
 */
const ProfileManager = {
    /**
     * Элементы интерфейса
     */
    elements: {
        profileName: document.querySelector('.profile-name'),
        profileBadge: document.querySelector('.profile-badge'),
        profileId: document.querySelector('.profile-id span'),

        // Статистика
        investigationsCount: document.querySelector('.stat-card[data-tag="ОПЫТ"] .stat-value'),
        solvedCases: document.querySelector('.stat-card[data-tag="УСПЕХ"] .stat-value'),
        winStreak: document.querySelector('.stat-card[data-tag="СЕРИЯ"] .stat-value'),
        accuracy: document.querySelector('.stat-card[data-tag="ТОЧНОСТЬ"] .stat-value'),

        // Лидерборд
        leaderboardRows: document.querySelectorAll('.leaderboard-row'),
        leaderboardTabs: document.querySelectorAll('.tab-button'),

        // Кнопки навигации
        mainButton: document.querySelector('.nav-button:not(.primary)'),
        newGameButton: document.querySelector('.nav-button.primary'),

        // Достижения
        achievements: document.querySelectorAll('.achievement')
    },

    /**
     * Данные профиля
     */
    profileData: null,

    /**
     * Состояние приложения
     */
    state: {
        token: null,
        isLoading: false,
        currentLeaderboardPeriod: 'week',
        isAuthenticated: false,
        error: null
    },

    /**
     * Инициализация управления профилем
     */
    init() {
        console.log('Инициализация страницы профиля...');

        this.loadingStart('Загрузка профиля...');

        // Проверяем наличие Telegram WebApp API
        // Telegram может предоставить API в трех вариантах:
        // 1. window.Telegram.WebApp (основной вариант)
        // 2. window.TelegramWebApp (альтернативный вариант)
        // 3. По параметрам в URL (fallback)
        // 4. По наличию WebView в user agent
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            console.log('Telegram WebApp API найден в window.Telegram.WebApp');
        } else if (window.TelegramWebApp) {
            tg = window.TelegramWebApp;
            console.log('Telegram WebApp API найден в window.TelegramWebApp');
        } else if (this.checkTelegramUrlParams()) {
            // Создаем минимальный объект для работы с Telegram WebApp
            console.log('Используем параметры URL для работы с Telegram');
            tg = this.createMinimalTelegramWebApp();
        } else if (this.checkTelegramUserAgent()) {
            // Создаем минимальный объект для WebView в Telegram
            console.log('Обнаружен WebView Telegram клиента, используем минимальный API');
            tg = this.createMinimalTelegramWebApp();
        }

        if (tg) {
            console.log('Telegram WebApp API инициализирован успешно');

            // Расширяем WebApp на весь экран
            if (tg.expand) {
                tg.expand();
            }

            // Показываем кнопку "Назад" при открытии профиля
            if (tg.BackButton && tg.BackButton.show) {
                tg.BackButton.show();

                // Настраиваем обработчик кнопки "Назад"
                tg.BackButton.onClick(() => {
                    window.location.href = '/';
                });
            }

            // Применяем тему Telegram
            document.body.setAttribute('data-theme', tg.colorScheme || 'dark');

            // Сообщаем Telegram, что приложение готово
            if (tg.ready) {
                tg.ready();
            }

            // Получаем и проверяем токен из localStorage
            this.checkAuthentication();
        } else {
            console.warn('Telegram WebApp API недоступен');

            // В режиме отладки загружаем тестовые данные
            if (DEBUG_MODE) {
                console.log('Режим отладки активирован, загружаем тестовые данные');
                this.loadTestData();
                return;
            }

            this.loadingEnd();

            // Показываем специальное сообщение вместо загрузки тестовых данных
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                // Создаем элемент с сообщением
                const telegramMessage = document.createElement('div');
                telegramMessage.className = 'telegram-warning';
                telegramMessage.innerHTML = `
                    <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h3>Требуется Telegram</h3>
                    <p>Эта страница доступна только через Telegram Mini App.</p>
                    <p>Пожалуйста, откройте ссылку в приложении Telegram.</p>
                `;

                // Добавляем стили для сообщения
                const style = document.createElement('style');
                style.textContent = `
                    .telegram-warning {
                        background: var(--morgue-gray);
                        padding: 20px;
                        border-radius: var(--radius-md);
                        text-align: center;
                        border: 2px solid var(--dried-blood);
                        margin: 40px auto;
                        max-width: 320px;
                    }
                    .warning-icon {
                        width: 48px;
                        height: 48px;
                        color: var(--blood-red);
                        margin-bottom: 15px;
                    }
                    .telegram-warning h3 {
                        color: var(--blood-red);
                        margin-bottom: 10px;
                        font-size: 18px;
                    }
                    .telegram-warning p {
                        margin-bottom: 8px;
                        font-size: 14px;
                        opacity: 0.9;
                    }
                `;
                document.head.appendChild(style);

                // Очищаем контейнер и добавляем сообщение
                appContainer.innerHTML = '';
                appContainer.appendChild(telegramMessage);
            }

            // Пытаемся перенаправить на телеграм
            setTimeout(() => {
                const telegramDeepLink = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`;
                window.location.href = telegramDeepLink;
            }, 3000);
        }

        // Настраиваем обработчики событий
        this.setupEventListeners();
    },

    /**
     * Проверка наличия параметров Telegram в URL
     */
    checkTelegramUrlParams() {
        // Проверяем, есть ли в URL параметры Telegram WebApp
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('tgWebAppData') ||
            urlParams.has('tgWebAppStartParam') ||
            urlParams.has('tgWebAppVersion');
    },

    /**
     * Проверка Telegram WebView в User Agent
     */
    checkTelegramUserAgent() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('telegram') ||
            userAgent.includes('webview') ||
            userAgent.includes('tgweb') ||
            document.referrer.includes('telegram') ||
            window.parent !== window;
    },

    /**
     * Создание минимального объекта Telegram WebApp для работы
     */
    createMinimalTelegramWebApp() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            initData: urlParams.get('tgWebAppData') || '',
            colorScheme: urlParams.get('tgWebAppTheme') === 'dark' ? 'dark' : 'light',
            version: urlParams.get('tgWebAppVersion') || '1.0',
            ready: function () { console.log('Minimal Telegram WebApp ready'); },
            expand: function () { console.log('Minimal Telegram WebApp expand'); },
            BackButton: {
                show: function () { console.log('BackButton show'); },
                onClick: function (callback) {
                    if (callback) {
                        document.addEventListener('backbutton', callback);
                    }
                }
            },
            HapticFeedback: {
                impactOccurred: function () { /* No-op */ }
            }
        };
    },

    /**
     * Проверка аутентификации
     */
    async checkAuthentication() {
        try {
            // Получаем токен из localStorage
            const token = localStorage.getItem('auth_token');

            if (!token) {
                console.log('Токен не найден, перенаправляем на авторизацию');
                this.authenticateTelegram();
                return;
            }

            this.state.token = token;

            // Проверяем валидность токена
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Если токен недействителен, запрашиваем новый
                console.log('Токен недействителен, запрашиваем новый');
                this.authenticateTelegram();
                return;
            }

            // Если токен действителен, загружаем данные профиля
            this.state.isAuthenticated = true;
            this.loadProfileData();

        } catch (error) {
            console.error('Ошибка при проверке аутентификации:', error);
            this.authenticateTelegram();
        }
    },

    /**
     * Аутентификация через Telegram WebApp
     */
    async authenticateTelegram() {
        try {
            if (!tg) {
                console.error('Telegram WebApp API недоступен');

                // В режиме отладки используем тестовые данные
                if (DEBUG_MODE) {
                    console.log('Режим отладки активирован, загружаем тестовые данные вместо аутентификации');
                    this.loadTestData();
                    return;
                }

                this.showError('Ошибка аутентификации: Telegram WebApp API недоступен');
                return;
            }

            const initData = tg.initData;

            if (!initData) {
                console.warn('Данные инициализации Telegram WebApp отсутствуют или пусты');

                // Проверяем наличие тестового токена (временное решение для запуска без initData)
                const storedToken = localStorage.getItem('auth_token');
                if (storedToken) {
                    console.log('Используем сохраненный токен без проверки аутентификации через Telegram');
                    this.state.token = storedToken;
                    this.state.isAuthenticated = true;

                    // Загружаем данные профиля
                    await this.loadProfileData();
                    return;
                }

                // В режиме отладки используем тестовые данные
                if (DEBUG_MODE) {
                    console.log('Режим отладки активирован, загружаем тестовые данные вместо аутентификации');
                    this.loadTestData();
                    return;
                }

                this.showError('Ошибка аутентификации: Данные инициализации отсутствуют');

                // Создаем тестовый токен для отладки
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.warn('Работаем на localhost: создаем тестовый токен');
                    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWxlZ3JhbUlkIjoiOTk5OTk5OTk5IiwiaWF0IjoxNjE2MTYxNjE2fQ.signature';
                    localStorage.setItem('auth_token', testToken);
                    this.state.token = testToken;
                    this.state.isAuthenticated = true;
                    await this.loadProfileData();
                }

                return;
            }

            // Запрос на аутентификацию
            const response = await fetch('/api/auth/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ initData })
            });

            if (!response.ok) {
                throw new Error('Ошибка аутентификации');
            }

            const data = await response.json();

            if (data.status !== 'success') {
                throw new Error(data.message || 'Ошибка аутентификации');
            }

            // Сохраняем токен
            const token = data.data.token;
            localStorage.setItem('auth_token', token);
            this.state.token = token;
            this.state.isAuthenticated = true;

            // Загружаем данные профиля
            await this.loadProfileData();

        } catch (error) {
            console.error('Ошибка при аутентификации:', error);

            // В режиме отладки используем тестовые данные
            if (DEBUG_MODE) {
                console.log('Режим отладки активирован, загружаем тестовые данные после ошибки аутентификации');
                this.loadTestData();
                return;
            }

            this.loadingEnd();
            this.showError('Ошибка аутентификации: ' + error.message);

            // Добавляем подробную информацию об ошибке в консоль для отладки
            console.debug('Детали ошибки аутентификации:', error);

            // Показываем сообщение о необходимости перезапустить приложение
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                const authErrorMessage = document.createElement('div');
                authErrorMessage.className = 'auth-error';
                authErrorMessage.innerHTML = `
                    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h3>Ошибка авторизации</h3>
                    <p>Не удалось авторизоваться через Telegram.</p>
                    <p>Пожалуйста, закройте и заново откройте мини-приложение.</p>
                    <button class="retry-button">Попробовать снова</button>
                `;

                // Добавляем стили для сообщения об ошибке
                const style = document.createElement('style');
                style.textContent = `
                    .auth-error {
                        background: var(--morgue-gray);
                        padding: 20px;
                        border-radius: var(--radius-md);
                        text-align: center;
                        border: 2px solid var(--dried-blood);
                        margin: 40px auto;
                        max-width: 320px;
                    }
                    .error-icon {
                        width: 48px;
                        height: 48px;
                        color: var(--blood-red);
                        margin-bottom: 15px;
                    }
                    .auth-error h3 {
                        color: var(--blood-red);
                        margin-bottom: 10px;
                        font-size: 18px;
                    }
                    .auth-error p {
                        margin-bottom: 8px;
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .retry-button {
                        background: var(--blood-red);
                        color: var(--chalk-white);
                        border: none;
                        padding: 8px 16px;
                        border-radius: var(--radius-sm);
                        margin-top: 10px;
                        cursor: pointer;
                        font-weight: bold;
                    }
                    .retry-button:hover {
                        background: var(--fresh-blood);
                    }
                `;
                document.head.appendChild(style);

                // Очищаем содержимое контейнера и добавляем сообщение об ошибке
                appContainer.innerHTML = '';
                appContainer.appendChild(authErrorMessage);

                // Добавляем обработчик для кнопки повторной попытки
                const retryButton = document.querySelector('.retry-button');
                if (retryButton) {
                    retryButton.addEventListener('click', () => {
                        window.location.reload();
                    });
                }
            }
        }
    },

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработчики для табов лидерборда
        this.elements.leaderboardTabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                // Удаляем класс active у всех табов
                this.elements.leaderboardTabs.forEach(t => t.classList.remove('active'));
                // Добавляем класс active к выбранному табу
                tab.classList.add('active');

                // Получаем период из атрибута data-period или из текста кнопки
                const period = tab.dataset.period || tab.textContent.trim().toLowerCase();
                this.state.currentLeaderboardPeriod = period;

                // Загружаем данные лидерборда для выбранного периода
                this.loadLeaderboard(period);

                // Тактильная обратная связь в Telegram
                if (tg && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
            });
        });

        // Обработчик для кнопки возврата на главную
        if (this.elements.mainButton) {
            this.elements.mainButton.addEventListener('click', () => {
                if (tg && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
                window.location.href = '/';
            });
        }

        // Обработчик для кнопки новой игры
        if (this.elements.newGameButton) {
            this.elements.newGameButton.addEventListener('click', () => {
                if (tg && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
                window.location.href = '/game';
            });
        }
    },

    /**
     * Начало загрузки данных
     */
    loadingStart(message = 'Загрузка...') {
        this.state.isLoading = true;

        // Создаем элемент загрузки, если его еще нет
        if (!document.querySelector('.loading-overlay')) {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(loadingOverlay);

            // Добавляем стили для анимации загрузки
            const style = document.createElement('style');
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid rgba(139, 0, 0, 0.3);
                    border-top-color: #8B0000;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .loading-message {
                    margin-top: 20px;
                    color: #E8E8E8;
                    font-size: 16px;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        } else {
            // Обновляем сообщение, если оверлей уже существует
            document.querySelector('.loading-message').textContent = message;
        }
    },

    /**
     * Окончание загрузки данных
     */
    loadingEnd() {
        this.state.isLoading = false;
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    },

    /**
     * Отображение ошибки
     */
    showError(message) {
        this.state.error = message;

        // Создаем элемент ошибки, если его еще нет
        if (!document.querySelector('.error-message')) {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = message;

            // Добавляем стили для элемента ошибки
            const style = document.createElement('style');
            style.textContent = `
                .error-message {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(139, 0, 0, 0.9);
                    color: #E8E8E8;
                    padding: 12px 20px;
                    border-radius: 8px;
                    z-index: 1001;
                    max-width: 80%;
                    text-align: center;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    animation: fadeInOut 5s forwards;
                }
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -20px); }
                    10% { opacity: 1; transform: translate(-50%, 0); }
                    90% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
            `;
            document.head.appendChild(style);

            document.body.appendChild(errorElement);

            // Удаляем элемент ошибки через 5 секунд
            setTimeout(() => {
                errorElement.remove();
                this.state.error = null;
            }, 5000);
        }
    },

    /**
     * Загрузка данных профиля с сервера
     */
    async loadProfileData() {
        try {
            this.loadingStart('Загрузка профиля...');

            if (!this.state.token) {
                throw new Error('Токен авторизации отсутствует');
            }

            // Запрашиваем данные профиля
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки данных профиля');
            }

            const data = await response.json();

            if (data.status !== 'success') {
                throw new Error(data.message || 'Ошибка загрузки данных профиля');
            }

            this.profileData = data.data;
            console.log('Данные профиля получены:', this.profileData);

            // Обновляем UI с полученными данными
            this.updateProfileUI(this.profileData);

            // Загружаем данные лидерборда
            await this.loadLeaderboard(this.state.currentLeaderboardPeriod);

            this.loadingEnd();

        } catch (error) {
            console.error('Ошибка при загрузке данных профиля:', error);

            // В режиме отладки используем тестовые данные
            if (DEBUG_MODE) {
                console.log('Режим отладки активирован, загружаем тестовые данные профиля');
                this.loadTestData();
                return;
            }

            this.loadingEnd();
            this.showError('Ошибка загрузки профиля: ' + error.message);

            // Добавляем подробный вывод в консоль для отладки
            console.debug('Полные данные ошибки:', error);
            console.debug('Токен авторизации присутствует:', !!this.state.token);
        }
    },

    /**
     * Загрузка данных таблицы лидеров
     */
    async loadLeaderboard(period = 'week') {
        try {
            if (!this.state.token) {
                throw new Error('Токен авторизации отсутствует');
            }

            // Запрашиваем данные лидерборда
            const response = await fetch(`/api/user/leaderboard?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки таблицы лидеров');
            }

            const data = await response.json();

            if (data.status !== 'success') {
                throw new Error(data.message || 'Ошибка загрузки таблицы лидеров');
            }

            console.log('Данные лидерборда получены:', data.data);

            // Обновляем UI с данными лидерборда
            this.updateLeaderboardUI(data.data);

        } catch (error) {
            console.error('Ошибка при загрузке таблицы лидеров:', error);

            // В режиме отладки используем тестовые данные
            if (DEBUG_MODE) {
                console.log('Режим отладки активирован, загружаем тестовые данные лидерборда');
                this.loadTestLeaderboard();
                return;
            }

            this.showError('Ошибка загрузки таблицы лидеров: ' + error.message);

            // Добавляем подробный вывод в консоль для отладки
            console.debug('Полные данные ошибки лидерборда:', error);
            console.debug('Запрошенный период:', period);

            // Очищаем таблицу лидеров при ошибке вместо показа тестовых данных
            const tableContainer = document.querySelector('.leaderboard-table');
            if (tableContainer) {
                const headerRow = tableContainer.querySelector('.leaderboard-header');
                tableContainer.innerHTML = '';
                if (headerRow) {
                    tableContainer.appendChild(headerRow);
                }

                // Добавляем сообщение об ошибке в таблицу
                const errorRow = document.createElement('div');
                errorRow.className = 'leaderboard-row';
                errorRow.innerHTML = `
                    <div class="rank-cell">-</div>
                    <div class="user-cell" style="color: var(--blood-red);">Ошибка загрузки данных</div>
                    <div class="score-cell">-</div>
                `;
                tableContainer.appendChild(errorRow);
            }
        }
    },

    /**
     * Загрузка тестовых данных (для отладки или при отсутствии API)
     */
    loadTestData() {
        console.log('Загрузка тестовых данных профиля');

        // Тестовые данные профиля
        this.profileData = {
            name: "Александр К.",
            rank: "ДЕТЕКТИВ",
            telegramId: "9273551428",
            stats: {
                investigations: 47,
                solvedCases: 32,
                winStreak: 5,
                accuracy: 68
            },
            achievements: [
                {
                    id: "first_case",
                    name: "Первое дело",
                    description: "Проведено первое расследование",
                    unlockedAt: new Date()
                },
                {
                    id: "rookie",
                    name: "Новичок",
                    description: "Проведено 5 расследований",
                    unlockedAt: new Date()
                },
                {
                    id: "expert",
                    name: "Эксперт",
                    description: "Проведено 50 расследований",
                    unlockedAt: new Date()
                }
            ]
        };

        // Обновляем UI
        this.updateProfileUI(this.profileData);

        // Загружаем тестовые данные для лидерборда
        this.loadTestLeaderboard();

        this.loadingEnd();
    },

    /**
     * Загрузка тестовых данных таблицы лидеров
     */
    loadTestLeaderboard() {
        console.log('Загрузка тестовых данных лидерборда');

        // Тестовые данные лидерборда
        const leaderboardData = {
            leaderboard: [
                {
                    rank: 1,
                    name: "Марина С.",
                    score: 8450,
                    userRank: "ЭКСПЕРТ",
                    isCurrentUser: false
                },
                {
                    rank: 2,
                    name: "Виктор П.",
                    score: 7820,
                    userRank: "СЛЕДОВАТЕЛЬ",
                    isCurrentUser: false
                },
                {
                    rank: 3,
                    name: "Александр К.",
                    score: 6250,
                    userRank: "ДЕТЕКТИВ",
                    isCurrentUser: true
                },
                {
                    rank: 4,
                    name: "Дмитрий Н.",
                    score: 5890,
                    userRank: "ИНСПЕКТОР",
                    isCurrentUser: false
                },
                {
                    rank: 5,
                    name: "Анна О.",
                    score: 4120,
                    userRank: "ДЕТЕКТИВ",
                    isCurrentUser: false
                }
            ],
            currentUser: null // Текущий пользователь уже в списке топ-5
        };

        // Обновляем UI с тестовыми данными
        this.updateLeaderboardUI(leaderboardData);
    },

    /**
     * Обновление интерфейса профиля на основе данных
     * @param {Object} data - Данные профиля
     */
    updateProfileUI(data) {
        if (!data) return;

        console.log('Обновление UI с данными:', data);

        // Обновляем информацию о профиле
        if (this.elements.profileName) {
            this.elements.profileName.textContent = data.name;
        }

        if (this.elements.profileBadge) {
            this.elements.profileBadge.textContent = data.rank;
        }

        if (this.elements.profileId) {
            this.elements.profileId.textContent = data.telegramId;
        }

        // Обновляем статистику
        if (this.elements.investigationsCount && data.stats) {
            this.elements.investigationsCount.textContent = data.stats.investigations || 0;
        }

        if (this.elements.solvedCases && data.stats) {
            this.elements.solvedCases.textContent = data.stats.solvedCases || 0;
        }

        if (this.elements.winStreak && data.stats) {
            this.elements.winStreak.textContent = data.stats.winStreak || 0;
        }

        if (this.elements.accuracy && data.stats) {
            this.elements.accuracy.textContent = data.stats.accuracy ? `${data.stats.accuracy}%` : '0%';
        }

        // Обновляем достижения
        if (data.achievements) {
            this.updateAchievementsUI(data.achievements);
        }
    },

    /**
     * Обновление раздела достижений
     * @param {Array} achievements - Массив с данными достижений
     */
    updateAchievementsUI(achievements) {
        if (!achievements || !this.elements.achievements) return;

        // Определяем известные достижения и их иконки
        const achievementIcons = {
            "first_case": '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />',
            "rookie": '<circle cx="12" cy="8" r="7" /><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />',
            "expert": '<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />',
            "sharp_eye": '<circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" />',
            "serial_detective": '<path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />',
            "maniac": '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />'
        };

        // Находим все элементы достижений
        const achievementElements = Array.from(this.elements.achievements);

        // Для каждого элемента достижения проверяем, разблокировано ли оно
        achievementElements.forEach((element, index) => {
            // Если у нас есть достижение с соответствующим индексом
            if (achievements[index]) {
                const achievement = achievements[index];

                // Удаляем класс locked, если он есть
                element.classList.remove('locked');

                // Обновляем иконку и название достижения
                const iconElement = element.querySelector('.achievement-icon');
                const nameElement = element.querySelector('.achievement-name');

                if (iconElement && achievementIcons[achievement.id]) {
                    iconElement.innerHTML = achievementIcons[achievement.id];
                }

                if (nameElement) {
                    nameElement.textContent = achievement.name;
                }

                // Добавляем всплывающую подсказку с описанием
                element.title = achievement.description;
            } else {
                // Если достижение не разблокировано
                element.classList.add('locked');

                const iconElement = element.querySelector('.achievement-icon');
                const nameElement = element.querySelector('.achievement-name');

                if (iconElement) {
                    iconElement.innerHTML = '<path d="M3 6h18M3 12h18M3 18h18" />';
                    iconElement.style.opacity = 0.3;
                }

                if (nameElement) {
                    nameElement.textContent = '???';
                }

                element.title = 'Достижение заблокировано';
            }
        });
    },

    /**
     * Обновление интерфейса таблицы лидеров
     * @param {Object} data - Данные таблицы лидеров
     */
    updateLeaderboardUI(data) {
        if (!data || !data.leaderboard) return;

        console.log('Обновление UI лидерборда с данными:', data);

        const leaderboard = data.leaderboard;
        const currentUser = data.currentUser;

        // Получаем контейнер для таблицы лидеров
        const tableContainer = document.querySelector('.leaderboard-table');
        if (!tableContainer) return;

        // Очищаем текущие строки (кроме заголовка)
        const headerRow = tableContainer.querySelector('.leaderboard-header');
        tableContainer.innerHTML = '';
        if (headerRow) {
            tableContainer.appendChild(headerRow);
        }

        // Добавляем новые строки
        leaderboard.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';

            // Если это текущий пользователь, добавляем соответствующий класс
            if (entry.isCurrentUser) {
                row.classList.add('current-user');
            }

            row.innerHTML = `
                <div class="rank-cell">${entry.rank}</div>
                <div class="user-cell">${entry.name}</div>
                <div class="score-cell">${entry.score ? entry.score.toLocaleString() : '0'}</div>
            `;

            tableContainer.appendChild(row);
        });

        // Если текущий пользователь не в топе, добавляем его отдельно
        if (currentUser && !leaderboard.some(entry => entry.isCurrentUser)) {
            // Добавляем разделитель
            const divider = document.createElement('div');
            divider.className = 'leaderboard-divider';
            divider.innerHTML = '...';
            tableContainer.appendChild(divider);

            // Добавляем строку текущего пользователя
            const userRow = document.createElement('div');
            userRow.className = 'leaderboard-row current-user';
            userRow.innerHTML = `
                <div class="rank-cell">${currentUser.rank}</div>
                <div class="user-cell">${currentUser.name}</div>
                <div class="score-cell">${currentUser.score ? currentUser.score.toLocaleString() : '0'}</div>
            `;
            tableContainer.appendChild(userRow);
        }
    }
};

// Инициализация профиля при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
}); 