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
     * Инициализация управления профилем
     */
    init() {
        console.log('Инициализация страницы профиля...');

        // Расширенное логирование для отладки
        console.log('=========== ДИАГНОСТИКА TELEGRAM WEBAPP ===========');
        console.log('User Agent:', navigator.userAgent);
        console.log('Window location:', window.location.href);
        console.log('Referrer:', document.referrer);
        console.log('URL параметры:', window.location.search);
        console.log('URL hash:', window.location.hash);
        console.log('Внутри iframe:', window.self !== window.top);
        console.log('window.Telegram существует:', !!window.Telegram);
        if (window.Telegram) {
            console.log('window.Telegram.WebApp существует:', !!window.Telegram.WebApp);
            if (window.Telegram.WebApp) {
                console.log('window.Telegram.WebApp.initData существует:', !!window.Telegram.WebApp.initData);
                console.log('window.Telegram.WebApp.initData длина:',
                    window.Telegram.WebApp.initData ? window.Telegram.WebApp.initData.length : 0);
            }
        }
        console.log('window.TelegramWebApp существует:', !!window.TelegramWebApp);
        console.log('window.WebApp существует:', !!window.WebApp);

        // Проверка содержимого localStorage
        console.log('localStorage auth_token:', !!localStorage.getItem('auth_token'));
        console.log('localStorage auth_token длина:',
            localStorage.getItem('auth_token') ? localStorage.getItem('auth_token').length : 0);

        // Анализ URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        console.log('Параметры URL:', Object.fromEntries(urlParams.entries()));

        // Анализ hash параметров
        const hashParams = window.location.hash ?
            new URLSearchParams(window.location.hash.slice(1)) :
            new URLSearchParams();
        console.log('Параметры hash:', Object.fromEntries(hashParams.entries()));
        console.log('=================================================');

        this.loadingStart('Загрузка профиля...');

        // Инициализация Telegram WebApp API
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            console.log('Telegram WebApp API инициализирован через window.Telegram.WebApp');
        } else if (window.TelegramWebApp) {
            tg = window.TelegramWebApp;
            console.log('Telegram WebApp API инициализирован через window.TelegramWebApp');
        } else if (window.WebApp) {
            tg = window.WebApp;
            console.log('Telegram WebApp API инициализирован через window.WebApp');
        } else {
            // Создаем минимальный объект, если API не обнаружен
            tg = this.createMinimalTelegramWebApp();
            console.log('Создан минимальный объект Telegram WebApp');
        }

        // Получаем данные initData из URL, если они есть
        const initDataFromUrl = urlParams.get('tgWebAppData') ||
            urlParams.get('initData') ||
            hashParams.get('tgWebAppData') ||
            hashParams.get('initData');

        if (initDataFromUrl && (!tg.initData || tg.initData.length === 0)) {
            console.log('Найдена initData в URL параметрах, сохраняем');
            tg.initData = initDataFromUrl;
        }

        console.log('Telegram WebApp API настроен', tg);

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

        // Настраиваем обработчики событий
        this.setupEventListeners();
    },

    /**
     * Проверка аутентификации пользователя
     */
    async checkAuthentication() {
        try {
            // Получаем токен из localStorage
            const token = localStorage.getItem('auth_token');
            console.log('Проверка аутентификации: токен ' + (token ? 'найден' : 'не найден'));

            if (!token) {
                console.log('Токен не найден, запускаем аутентификацию');
                await this.authenticateTelegram();
                return;
            }

            this.state.token = token;
            console.log('Токен сохранен в state, проверяем валидность...');

            // Проверяем валидность токена
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Если токен недействителен, запрашиваем новый
                console.log('Токен недействителен (статус ответа: ' + response.status + '), запускаем повторную аутентификацию');
                this.state.token = null;
                localStorage.removeItem('auth_token');
                await this.authenticateTelegram();
                return;
            }

            const data = await response.json();
            console.log('Токен проверен успешно, результат:', data);

            // Если токен действителен, загружаем данные профиля
            this.state.isAuthenticated = true;
            await this.loadProfileData();

        } catch (error) {
            console.error('Ошибка при проверке аутентификации:', error);

            // Сбрасываем состояние и пробуем пройти авторизацию заново
            this.state.isAuthenticated = false;
            this.state.token = null;
            localStorage.removeItem('auth_token');

            console.log('Состояние сброшено, запускаем повторную аутентификацию');
            await this.authenticateTelegram();
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
            this.loadingStart('Авторизация...');

            // Пытаемся различными способами получить initData
            let initData = '';

            // 1. Проверка window.Telegram.WebApp.initData
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
                initData = window.Telegram.WebApp.initData;
                console.log('Используем initData из window.Telegram.WebApp.initData',
                    initData.length > 20 ? initData.substring(0, 20) + '...' : initData);
            }
            // 2. Проверка tg объекта (наш собственный)
            else if (tg && tg.initData && tg.initData.length > 0) {
                initData = tg.initData;
                console.log('Используем initData из tg объекта',
                    initData.length > 20 ? initData.substring(0, 20) + '...' : initData);
            }
            // 3. Проверка URL параметров
            else {
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.slice(1));

                initData = urlParams.get('tgWebAppData') ||
                    hashParams.get('tgWebAppData') ||
                    urlParams.get('initData') ||
                    hashParams.get('initData') ||
                    '';

                if (initData && initData.length > 0) {
                    console.log('Используем initData из URL/hash параметров',
                        initData.length > 20 ? initData.substring(0, 20) + '...' : initData);
                }
            }

            // Проверяем полученные данные
            if (!initData || initData.trim() === '') {
                console.warn('Данные инициализации Telegram WebApp отсутствуют или пусты');

                // Пробуем использовать сохраненный токен, если он есть
                const storedToken = localStorage.getItem('auth_token');
                if (storedToken) {
                    console.log('Используем сохраненный токен без проверки аутентификации через Telegram');
                    this.state.token = storedToken;
                    this.state.isAuthenticated = true;

                    try {
                        // Верифицируем токен на сервере
                        const verifyResponse = await fetch('/api/auth/verify', {
                            headers: {
                                'Authorization': `Bearer ${storedToken}`
                            }
                        });

                        if (verifyResponse.ok) {
                            console.log('Токен верифицирован успешно');
                            await this.loadProfileData();
                            return;
                        } else {
                            console.warn('Токен недействителен, необходима повторная аутентификация');
                            localStorage.removeItem('auth_token');
                        }
                    } catch (verifyError) {
                        console.error('Ошибка при верификации токена:', verifyError);
                    }
                }

                // Прямой доступ без авторизации через dedicated API endpoint
                console.log('Прямой доступ без данных Telegram - пытаемся получить токен через прямой доступ');
                try {
                    const directAccessResponse = await fetch('/api/auth/direct-access', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userAgent: navigator.userAgent,
                            timestamp: new Date().toISOString()
                        })
                    });

                    if (!directAccessResponse.ok) {
                        console.error('Ошибка прямого доступа:', directAccessResponse.status, directAccessResponse.statusText);
                        throw new Error(`Ошибка прямого доступа: ${directAccessResponse.status}`);
                    }

                    const accessData = await directAccessResponse.json();
                    console.log('Ответ на запрос прямого доступа:', accessData);

                    if (accessData.status === 'success' && accessData.data && accessData.data.token) {
                        console.log('Получен токен прямого доступа');
                        localStorage.setItem('auth_token', accessData.data.token);
                        this.state.token = accessData.data.token;
                        this.state.isAuthenticated = true;
                        await this.loadProfileData();
                        return;
                    } else {
                        console.error('Некорректный ответ от API прямого доступа:', accessData);
                        throw new Error('Ошибка получения токена прямого доступа');
                    }
                } catch (directAccessError) {
                    console.error('Ошибка при получении прямого доступа:', directAccessError);
                    this.showError('Не удалось получить гостевой доступ: ' + directAccessError.message);
                    return;
                }
            }

            console.log('Отправка запроса на аутентификацию с initData');

            // Запрос на аутентификацию
            const response = await fetch('/api/auth/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ initData })
            });

            // Проверяем успешность ответа
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Ошибка аутентификации через API: ${response.status} ${response.statusText}`, errorText);

                // Пробуем использовать сохраненный токен как fallback
                const storedToken = localStorage.getItem('auth_token');
                if (storedToken) {
                    console.log('Используем сохраненный токен после ошибки API');
                    this.state.token = storedToken;
                    this.state.isAuthenticated = true;
                    await this.loadProfileData();
                    return;
                }

                this.showError(`Ошибка аутентификации (${response.status}): ${response.statusText}`);
                return;
            }

            // Парсим ответ
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Ошибка при парсинге ответа:', parseError);
                const rawText = await response.text();
                console.error('Сырой ответ:', rawText);
                this.showError('Ошибка при обработке ответа сервера');
                return;
            }

            // Проверяем успешность операции
            if (data.status !== 'success' || !data.data || !data.data.token) {
                console.error('Ошибка аутентификации: Токен не получен', data);
                this.showError('Ошибка аутентификации: ' + (data.message || 'Сервер не вернул токен'));
                return;
            }

            // Сохраняем токен
            const token = data.data.token;
            localStorage.setItem('auth_token', token);
            this.state.token = token;
            this.state.isAuthenticated = true;

            // Используем haptic feedback для успешной аутентификации
            if (tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred) {
                tg.HapticFeedback.notificationOccurred('success');
            }

            // Загружаем данные профиля
            await this.loadProfileData();

        } catch (error) {
            console.error('Ошибка при аутентификации:', error);
            this.loadingEnd();

            // Пробуем использовать сохраненный токен при ошибке
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken) {
                console.log('Используем сохраненный токен после ошибки аутентификации');
                this.state.token = storedToken;
                this.state.isAuthenticated = true;

                try {
                    await this.loadProfileData();
                    return;
                } catch (profileError) {
                    console.error('Не удалось загрузить профиль с сохраненным токеном:', profileError);
                    localStorage.removeItem('auth_token');
                    this.state.token = null;
                    this.state.isAuthenticated = false;
                }
            }

            // Показываем ошибку
            this.showError('Ошибка при аутентификации: ' + error.message);
        } finally {
            this.loadingEnd();
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

            if (!this.state.token) {
                console.error('Ошибка загрузки профиля: токен авторизации отсутствует');
                throw new Error('Токен авторизации отсутствует');
            }

            console.log('Запрос данных профиля с токеном:', this.state.token.substring(0, 10) + '...');

            // Запрашиваем данные профиля с сервера
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                // Если ошибка 401 - проблема с авторизацией, нужно повторно авторизоваться
                if (response.status === 401) {
                    console.log('Ошибка авторизации (401), запускаем повторную аутентификацию');
                    this.state.token = null;
                    localStorage.removeItem('auth_token');
                    await this.authenticateTelegram();
                    return;
                }

                console.error('Ошибка HTTP при загрузке профиля:', response.status, response.statusText);
                throw new Error(`Ошибка загрузки данных профиля: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Ответ API профиля:', data);

            if (data.status !== 'success') {
                console.error('Ошибка API при загрузке профиля:', data.message);
                throw new Error(data.message || 'Ошибка загрузки данных профиля');
            }

            // В структуре API ответ лежит в поле data
            this.profileData = data.data;
            console.log('Данные профиля получены:', this.profileData);

            // Проверяем, есть ли базовые поля в профиле
            if (!this.profileData) {
                console.error('Полученный профиль пуст');
                this.profileData = {
                    name: 'Незнакомец',
                    telegramId: 'unknown',
                    rank: 'ГОСТЬ',
                    stats: {
                        investigations: 0,
                        solvedCases: 0,
                        winStreak: 0,
                        accuracy: 0
                    }
                };
            }

            // Обрабатываем случай с новым пользователем, у которого все значения по нулям
            if (!this.profileData.stats) {
                this.profileData.stats = {
                    investigations: 0,
                    solvedCases: 0,
                    winStreak: 0,
                    accuracy: 0
                };
            }

            // Обновляем UI с полученными данными
            this.updateProfileUI(this.profileData);

            // Загружаем данные лидерборда
            await this.loadLeaderboard(this.state.currentLeaderboardPeriod);

            this.loadingEnd();

        } catch (error) {
            console.error('Ошибка при загрузке данных профиля:', error);
            this.loadingEnd();

            // Показываем ошибку
            this.showError('Ошибка загрузки профиля: ' + error.message);

            // Если ошибка связана с авторизацией, пробуем перезапустить процесс
            if (error.message && (
                error.message.includes('401') ||
                error.message.includes('403') ||
                error.message.includes('авторизаци') ||
                error.message.includes('токен')
            )) {
                console.log('Обнаружена ошибка авторизации, пробуем повторно аутентифицировать пользователя');
                this.state.token = null;
                localStorage.removeItem('auth_token');
                setTimeout(() => this.authenticateTelegram(), 1000);
            }
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