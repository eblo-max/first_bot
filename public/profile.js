/**
 * Управление функциональностью профиля "Криминальный Блеф"
 * Этот файл отвечает за отображение и взаимодействие с данными профиля пользователя
 */

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
     * Инициализация профиля
     */
    async init() {
        try {
            console.log('Инициализация профиля...');
            this.loadingStart('Загрузка профиля...');

            // Проверяем аутентификацию
            await this.checkAuthentication();

            // Если аутентификация прошла успешно, загружаем данные
            if (this.state.isAuthenticated && this.state.token) {
                console.log('Аутентификация успешна, загружаем данные профиля...');
                await this.loadProfileData();
            } else {
                console.log('Аутентификация не пройдена');
                this.showError('Не удалось выполнить аутентификацию');
            }

        } catch (error) {
            console.error('Ошибка инициализации профиля:', error);
            this.showError('Ошибка инициализации: ' + error.message);
        } finally {
            this.loadingEnd();
        }
    },

    /**
     * Проверка аутентификации пользователя
     */
    async checkAuthentication() {
        try {
            // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА СТАРЫХ ТОКЕНОВ И ПЕРЕЗАПИСЬ
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get('token');
            const initDataFromUrl = urlParams.get('initData');

            // Если есть данные из URL, принудительно перезаписываем localStorage
            if (tokenFromUrl && initDataFromUrl) {
                console.log('Найдены данные из URL - принудительно перезаписываем localStorage');
                localStorage.clear(); // Полная очистка
                localStorage.setItem('token', tokenFromUrl);
                localStorage.setItem('auth_token', tokenFromUrl);
                localStorage.setItem('initData', initDataFromUrl);
                this.state.token = tokenFromUrl;
                this.state.isAuthenticated = true;
                console.log('localStorage перезаписан новыми данными из URL');
            }

            // Проверяем, есть ли реальные данные Telegram
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
                const realInitData = window.Telegram.WebApp.initData;
                if (realInitData && realInitData.includes('user=') && !realInitData.includes('guest_')) {
                    console.log('Найдены РЕАЛЬНЫЕ данные Telegram - принудительная переавторизация');

                    // Очищаем все старые данные
                    localStorage.clear();
                    this.state.token = null;
                    this.state.isAuthenticated = false;

                    // Проходим новую авторизацию с реальными данными
                    await this.authenticateTelegram();
                    return;
                }
            }

            // Получаем токен из localStorage только если нет данных из URL
            let token = this.state.token || localStorage.getItem('token') || localStorage.getItem('auth_token');

            console.log('Проверка аутентификации:', {
                'токен найден': token ? 'да' : 'нет',
                'длина токена': token ? token.length : 0,
                'источник': this.state.token ? 'state' : 'localStorage'
            });

            if (!token) {
                console.log('Токен не найден - попытка авторизации через Telegram');
                await this.authenticateTelegram();
                return;
            }

            // Проверяем валидность токена на сервере
            console.log('Проверяем токен на сервере...');
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Ответ проверки токена:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Токен валиден, данные:', data);

                // Проверяем, не гостевой ли это пользователь
                if (data.telegramId && data.telegramId.startsWith('guest_')) {
                    console.log('ВНИМАНИЕ: Токен содержит данные гостевого пользователя - переавторизация');
                    localStorage.clear();
                    this.state.token = null;
                    this.state.isAuthenticated = false;
                    await this.authenticateTelegram();
                    return;
                }

                this.state.token = token;
                this.state.isAuthenticated = true;
                console.log('Аутентификация успешна');
            } else {
                // Токен недействителен
                console.log('Токен недействителен - попытка переавторизации');
                localStorage.removeItem('token');
                localStorage.removeItem('auth_token');
                this.state.token = null;
                this.state.isAuthenticated = false;
                await this.authenticateTelegram();
            }
        } catch (error) {
            console.error('Ошибка проверки аутентификации:', error);
            this.showError('Ошибка проверки авторизации');
        }
    },

    /**
     * Комплексная проверка Telegram окружения
     * ВАЖНО: Всегда возвращает true - мы отключили эту проверку
     */
    checkTelegramEnvironment() {
        // Просто логируем все проверки для отладки, но игнорируем результаты

        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Признак Telegram: window.Telegram.WebApp существует');
        }

        if (window.TelegramWebApp) {
            console.log('Признак Telegram: window.TelegramWebApp существует');
        }

        if (window.WebApp) {
            console.log('Признак Telegram: window.WebApp существует');
        }

        if (this.checkTelegramUrlParams()) {
            console.log('Признак Telegram: URL параметры Telegram присутствуют');
        }

        if (this.checkTelegramUserAgent()) {
            console.log('Признак Telegram: User Agent содержит признаки Telegram');
        }

        if (this.checkTelegramIframe()) {
            console.log('Признак Telegram: страница открыта в iframe Telegram');
        }

        if (localStorage.getItem('auth_token')) {
            console.log('Признак авторизации: в localStorage есть токен');
        }

        // Мы принудительно разрешаем работу без проверки окружения Telegram
        return true;
    },

    /**
     * Проверка наличия параметров Telegram в URL
     */
    checkTelegramUrlParams() {
        // Проверяем, есть ли в URL параметры Telegram WebApp
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));

        // Проверяем параметры в URL и в хеше
        return urlParams.has('tgWebAppData') ||
            urlParams.has('tgWebAppStartParam') ||
            urlParams.has('tgWebAppVersion') ||
            urlParams.has('tgWebAppPlatform') ||
            hashParams.has('tgWebAppData') ||
            hashParams.has('tgWebAppStartParam') ||
            hashParams.has('tgWebAppVersion') ||
            hashParams.has('tgWebAppPlatform');
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
            document.referrer.includes('t.me') ||
            window.parent !== window;
    },

    /**
     * Проверка открытия в iframe от Telegram
     */
    checkTelegramIframe() {
        return window.self !== window.top &&
            (document.referrer.includes('telegram') || document.referrer.includes('t.me'));
    },

    /**
     * Создание минимального объекта Telegram WebApp для работы
     */
    createMinimalTelegramWebApp() {
        return {
            initData: '',
            colorScheme: 'dark',
            version: 'minimal-1.0',
            platform: 'unknown',
            ready: function () { console.log('Minimal WebApp ready called'); },
            expand: function () { console.log('Minimal WebApp expand called'); },
            BackButton: {
                show: function () { console.log('Minimal WebApp BackButton.show called'); },
                hide: function () { console.log('Minimal WebApp BackButton.hide called'); },
                onClick: function (callback) {
                    console.log('Minimal WebApp BackButton.onClick registered');
                    window.addEventListener('popstate', callback);
                }
            },
            HapticFeedback: {
                notificationOccurred: function (type) {
                    console.log('Minimal WebApp haptic feedback: ' + type);
                }
            },
            isExpanded: true,
            viewportHeight: window.innerHeight,
            viewportStableHeight: window.innerHeight
        };
    },

    /**
     * Аутентификация через Telegram WebApp
     */
    async authenticateTelegram() {
        try {
            console.log('Начинаем аутентификацию через Telegram...');

            // Сначала очищаем все старые данные
            localStorage.clear();
            this.state.token = null;
            this.state.isAuthenticated = false;
            console.log('Очистили все старые данные');

            // Получаем данные инициализации из URL или из Telegram WebApp
            const urlParams = new URLSearchParams(window.location.search);
            let initData = urlParams.get('initData');

            // Если нет данных в URL, пытаемся получить из Telegram WebApp
            if (!initData && window.Telegram && window.Telegram.WebApp) {
                initData = window.Telegram.WebApp.initData;
                console.log('Получили initData из Telegram WebApp:', initData ? 'данные найдены' : 'данные отсутствуют');
            }

            // Проверяем полученные данные
            if (!initData || initData.trim() === '') {
                console.warn('Данные инициализации Telegram WebApp отсутствуют или пусты');

                // НЕ СОЗДАЕМ ГОСТЕВЫХ ПОЛЬЗОВАТЕЛЕЙ - отключено
                console.log('Создание гостевых пользователей отключено');
                this.showError('Невозможно загрузить профиль без авторизации Telegram. Перенаправление на главную...');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }

            // Проверяем, что данные не содержат гостевой информации
            if (initData.includes('guest_')) {
                console.warn('Обнаружены данные гостевого пользователя - отклоняем');
                this.showError('Обнаружен гостевой режим. Переход на главную для правильной авторизации...');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }

            console.log('Отправляем запрос авторизации с валидными initData...');

            // Отправляем запрос на сервер для авторизации
            const response = await fetch('/api/auth/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    initData: initData
                })
            });

            console.log('Ответ сервера авторизации:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка ответа сервера:', errorText);
                throw new Error(`Ошибка авторизации: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Данные авторизации получены:', {
                status: data.status,
                hasToken: !!data.token,
                hasUser: !!data.user,
                telegramId: data.user ? data.user.telegramId : 'нет'
            });

            if (data.status === 'success' && data.token) {
                // Проверяем, что токен не содержит данные гостевого пользователя
                if (data.user && data.user.telegramId && data.user.telegramId.startsWith('guest_')) {
                    console.error('Сервер вернул токен гостевого пользователя - отклоняем');
                    this.showError('Ошибка авторизации: получен гостевой токен. Перенаправление...');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                    return;
                }

                // Сохраняем токен и данные пользователя
                this.state.token = data.token;
                this.state.isAuthenticated = true;
                localStorage.setItem('token', data.token);
                localStorage.setItem('auth_token', data.token);

                console.log('Авторизация успешна для пользователя:', data.user.firstName || data.user.username);

                // Загружаем данные профиля
                await this.loadProfileData();
            } else {
                throw new Error(data.message || 'Неизвестная ошибка авторизации');
            }

        } catch (error) {
            console.error('Ошибка в authenticateTelegram:', error);
            this.showConnectionError('Не удалось авторизоваться через Telegram: ' + error.message);
        }
    },

    /**
     * Проверяет, следует ли использовать режим эмуляции
     */
    shouldUseEmulationMode() {
        // Отключаем режим эмуляции в продакшене
        return false;

        // Режим для тестирования можно включить через URL параметр
        // return window.location.search.includes('debug_mode=true');
    },

    /**
     * Использует эмуляционную аутентификацию для тестирования без Telegram
     */
    async useEmulationAuth() {
        console.log('Используем эмуляционную аутентификацию');
        try {
            const response = await fetch('/api/auth/emulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userAgent: navigator.userAgent,
                    emulationKey: 'dev_mode_enabled'
                })
            });

            if (!response.ok) {
                throw new Error(`Ошибка эмуляционной аутентификации: ${response.status}`);
            }

            const data = await response.json();
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                this.state.token = data.token;
                this.state.isAuthenticated = true;
                await this.loadProfileData();
            } else {
                throw new Error('Эмуляционная аутентификация не вернула токен');
            }
        } catch (error) {
            console.error('Ошибка при эмуляционной аутентификации:', error);
            this.showError('Ошибка при тестовой аутентификации: ' + error.message);
        }
    },

    /**
     * Резервный метод авторизации при ошибках
     */
    async useFallbackAuth() {
        console.log('Применение резервного метода авторизации');
        this.loadingEnd();

        // Пытаемся использовать сохраненный токен
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            console.log('Используем сохраненный токен как fallback');
            this.state.token = storedToken;
            this.state.isAuthenticated = true;

            try {
                await this.loadProfileData();
                return;
            } catch (e) {
                console.error('Не удалось загрузить профиль с сохраненным токеном:', e);
                // Если токен недействителен, удаляем его
                localStorage.removeItem('auth_token');
                this.state.token = null;
                this.state.isAuthenticated = false;
            }
        }

        // Показываем ошибку и кнопку для повтора
        this.showConnectionError('Не удалось загрузить профиль. Пожалуйста, попробуйте позже.');
    },

    /**
     * Показывает ошибку соединения с сервером
     */
    showConnectionError(message) {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'auth-error';
            errorMessage.innerHTML = `
                <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3>Ошибка подключения</h3>
                <p>${message}</p>
                <button class="retry-button">Повторить</button>
            `;

            // Добавляем стили для сообщения
            if (!document.querySelector('.auth-error-styles')) {
                const style = document.createElement('style');
                style.className = 'auth-error-styles';
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
                        margin-top: 12px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: background-color 0.2s ease;
                    }
                    .retry-button:hover {
                        background: var(--fresh-blood);
                    }
                `;
                document.head.appendChild(style);
            }

            // Очищаем контейнер и добавляем сообщение
            appContainer.innerHTML = '';
            appContainer.appendChild(errorMessage);

            // Добавляем обработчик для кнопки повтора
            const retryButton = errorMessage.querySelector('.retry-button');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    window.location.reload();
                });
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
     * Загрузка данных профиля пользователя
     */
    async loadProfileData() {
        try {
            this.loadingStart('Загрузка профиля...');

            // Получаем токен из localStorage (проверяем оба ключа)
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Отсутствует токен авторизации');
            }

            console.log('Отправляем запрос профиля с токеном:', token.substring(0, 20) + '...');

            // Запрашиваем данные профиля с сервера
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Ответ от сервера профиля:', response.status, response.statusText);

            if (response.status === 401) {
                // Токен недействителен, перенаправляем на авторизацию
                console.log('Токен недействителен (401), очищаем и перенаправляем');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('token');
                window.location.href = '/';
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка ответа сервера:', response.status, errorText);
                throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Получены данные профиля:', data);

            if (data.status === 'success') {
                // Сохраняем данные профиля
                this.profileData = data.data;
                console.log('Данные профиля сохранены:', this.profileData);

                // Обновляем интерфейс профиля
                this.updateProfileUI(this.profileData);

                // Загружаем таблицу лидеров
                await this.loadLeaderboard();

            } else {
                throw new Error(data.message || 'Ошибка при загрузке профиля');
            }

        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);

            // Показываем сообщение об ошибке
            this.showError('Не удалось загрузить данные профиля. Проверьте подключение к интернету.');

            // Если это ошибка авторизации, возвращаемся на главную
            if (error.message.includes('токен') || error.message.includes('401')) {
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        } finally {
            this.loadingEnd();
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

            console.log('Загрузка таблицы лидеров за период:', period);

            // Запрашиваем данные лидерборда
            const response = await fetch(`/api/user/leaderboard?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.warn('Ошибка авторизации при загрузке лидерборда');
                    // Не сбрасываем токен здесь, так как это некритичная ошибка
                }
                throw new Error(`Ошибка загрузки таблицы лидеров: ${response.status} ${response.statusText}`);
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Ошибка при парсинге ответа лидерборда:', parseError);
                throw new Error('Ошибка при обработке данных таблицы лидеров');
            }

            if (data.status !== 'success' || !data.data) {
                throw new Error(data.message || 'Ошибка загрузки таблицы лидеров');
            }

            console.log('Данные лидерборда получены:', data.data);

            // Обновляем UI с данными лидерборда
            this.updateLeaderboardUI(data.data);

        } catch (error) {
            console.error('Ошибка при загрузке таблицы лидеров:', error);

            // Очищаем таблицу лидеров при ошибке или создаем пустую, если ее нет
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

        // Если список лидеров пуст, показываем сообщение
        if (leaderboard.length === 0) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'leaderboard-row';
            emptyRow.innerHTML = `
                <div class="rank-cell">-</div>
                <div class="user-cell">Данные пока отсутствуют</div>
                <div class="score-cell">-</div>
            `;
            tableContainer.appendChild(emptyRow);
            return;
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
            this.elements.profileName.textContent = data.name || 'Новый детектив';
        }

        if (this.elements.profileBadge) {
            this.elements.profileBadge.textContent = data.rank || 'НОВИЧОК';
        }

        if (this.elements.profileId) {
            this.elements.profileId.textContent = data.telegramId || '-';
        }

        // Обновляем статистику (обеспечиваем корректное отображение нулевых значений)
        if (this.elements.investigationsCount) {
            this.elements.investigationsCount.textContent = data.stats?.investigations !== undefined ?
                data.stats.investigations : '0';
        }

        if (this.elements.solvedCases) {
            this.elements.solvedCases.textContent = data.stats?.solvedCases !== undefined ?
                data.stats.solvedCases : '0';
        }

        if (this.elements.winStreak) {
            this.elements.winStreak.textContent = data.stats?.winStreak !== undefined ?
                data.stats.winStreak : '0';
        }

        if (this.elements.accuracy) {
            const accuracyValue = data.stats?.accuracy !== undefined ? data.stats.accuracy : 0;
            this.elements.accuracy.textContent = `${accuracyValue}%`;
        }

        // Если это новый пользователь, добавляем особый класс
        if (data.isNewUser) {
            document.body.classList.add('new-user');
        } else {
            document.body.classList.remove('new-user');
        }

        // Обновляем достижения
        if (data.achievements) {
            this.updateAchievementsUI(data.achievements);
        } else {
            // Для новых пользователей без достижений показываем все как заблокированные
            const emptyAchievements = [];
            this.updateAchievementsUI(emptyAchievements);
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
     * Показывает сообщение о необходимости открыть страницу в Telegram
     */
    showTelegramRequiredMessage() {
        // Создаем контейнер
        const container = document.createElement('div');
        container.className = 'telegram-required-message';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
        container.style.backgroundColor = '#1e1e1e';
        container.style.color = '#fff';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.textAlign = 'center';
        container.style.padding = '20px';
        container.style.zIndex = '10000';

        // Добавляем лого
        const logo = document.createElement('div');
        logo.innerHTML = `<svg viewBox="0 0 32 32" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" stroke="#C4302B" stroke-width="2"/>
            <path d="M22.9865 10.1152C22.9487 10.0499 22.9238 9.97705 22.9238 9.9025C22.9238 9.82625 22.9487 9.75339 22.9865 9.68805C23.0243 9.62272 23.0742 9.56641 23.1316 9.52344C23.1891 9.48047 23.2529 9.45175 23.3196 9.43893C23.3864 9.42611 23.4546 9.42944 23.5196 9.4486C23.5846 9.46775 23.6444 9.50222 23.6946 9.54944C23.7448 9.59667 23.7841 9.65544 23.8097 9.72137C23.8353 9.7873 23.8465 9.85871 23.8426 9.92983C23.8387 10.0009 23.8199 10.0702 23.7879 10.1324L17.1621 21.8648C17.1157 21.9371 17.0536 21.9976 16.9803 22.0416C16.907 22.0855 16.8244 22.112 16.7393 22.1191C16.6541 22.1262 16.5685 22.1137 16.489 22.0825C16.4095 22.0513 16.3383 22.0022 16.2809 21.9388L9.93079 14.6512C9.87471 14.5961 9.832 14.5295 9.80555 14.4563C9.77911 14.3832 9.76962 14.3051 9.77776 14.228C9.78591 14.1508 9.81149 14.0766 9.85237 14.0107C9.89325 13.9448 9.9484 13.8889 10.0142 13.8469C10.0801 13.8049 10.1549 13.7779 10.2323 13.7681C10.3097 13.7584 10.388 13.7662 10.4618 13.7911C10.5356 13.816 10.6031 13.8573 10.6593 13.9121C10.7155 13.9669 10.7588 14.0339 10.7862 14.1082L16.6926 20.7922L22.9865 10.1152Z" fill="#C4302B"/>
        </svg>`;
        container.appendChild(logo);

        // Добавляем заголовок
        const title = document.createElement('h2');
        title.textContent = 'Требуется Telegram';
        title.style.marginTop = '20px';
        title.style.marginBottom = '10px';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.fontSize = '24px';
        title.style.color = '#c4302b';
        container.appendChild(title);

        // Добавляем текст сообщения
        const message = document.createElement('p');
        message.textContent = 'Эта страница доступна только через Telegram Mini App.';
        message.style.marginBottom = '20px';
        message.style.fontFamily = 'Arial, sans-serif';
        message.style.fontSize = '16px';
        message.style.lineHeight = '1.4';
        container.appendChild(message);

        // Добавляем инструкцию
        const instruction = document.createElement('p');
        instruction.textContent = 'Пожалуйста, откройте ссылку в приложении Telegram.';
        instruction.style.marginBottom = '30px';
        instruction.style.fontFamily = 'Arial, sans-serif';
        instruction.style.fontSize = '16px';
        instruction.style.lineHeight = '1.4';
        container.appendChild(instruction);

        // Добавляем отладочную информацию
        const debugInfo = document.createElement('details');
        debugInfo.style.marginTop = '20px';
        debugInfo.style.width = '80%';
        debugInfo.style.textAlign = 'left';
        debugInfo.style.fontSize = '12px';
        debugInfo.style.fontFamily = 'monospace';
        debugInfo.style.border = '1px solid #444';
        debugInfo.style.padding = '10px';
        debugInfo.style.borderRadius = '5px';

        const summary = document.createElement('summary');
        summary.textContent = 'Информация для отладки';
        summary.style.cursor = 'pointer';
        summary.style.color = '#888';
        summary.style.paddingBottom = '10px';
        debugInfo.appendChild(summary);

        const debugText = document.createElement('pre');
        debugText.style.whiteSpace = 'pre-wrap';
        debugText.style.wordBreak = 'break-all';
        debugText.style.color = '#888';
        debugText.style.maxHeight = '200px';
        debugText.style.overflow = 'auto';
        debugText.style.fontSize = '10px';
        debugText.innerHTML = JSON.stringify({
            "userAgent": navigator.userAgent,
            "platform": navigator.platform,
            "webAppExists": !!window.Telegram?.WebApp,
            "url": window.location.href,
            "referrer": document.referrer,
            "timestamp": new Date().toISOString(),
            "inIframe": window.self !== window.top
        }, null, 2);

        debugInfo.appendChild(debugText);
        container.appendChild(debugInfo);

        // Добавляем кнопку для открытия в Telegram
        const button = document.createElement('button');
        button.textContent = 'Открыть в Telegram';
        button.style.padding = '12px 24px';
        button.style.backgroundColor = '#c4302b';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.fontSize = '16px';
        button.style.fontWeight = 'bold';
        button.style.cursor = 'pointer';
        button.style.fontFamily = 'Arial, sans-serif';
        button.style.marginTop = '20px';

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#a82b25';
        });

        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#c4302b';
        });

        button.addEventListener('click', () => {
            // Попытка открыть в Telegram
            const url = window.location.href;
            const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
            window.location.href = telegramUrl;
        });

        container.appendChild(button);

        // Добавляем контейнер в body
        document.body.appendChild(container);

        // Скрываем основной контент
        const mainContent = document.querySelector('.container');
        if (mainContent) {
            mainContent.style.display = 'none';
        }

        // Останавливаем загрузку
        this.loadingEnd();
    }
};

// Инициализация профиля при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
}); 