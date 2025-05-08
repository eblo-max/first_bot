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
        }
        console.log('window.TelegramWebApp существует:', !!window.TelegramWebApp);
        console.log('window.WebApp существует:', !!window.WebApp);

        // Проверка содержимого localStorage
        console.log('localStorage auth_token:', !!localStorage.getItem('auth_token'));

        const urlParams = new URLSearchParams(window.location.search);
        Object.fromEntries(urlParams.entries());
        console.log('Параметры URL:', Object.fromEntries(urlParams.entries()));

        const hashParams = window.location.hash ?
            new URLSearchParams(window.location.hash.slice(1)) :
            new URLSearchParams();
        console.log('Параметры hash:', Object.fromEntries(hashParams.entries()));
        console.log('=================================================');

        this.loadingStart('Загрузка профиля...');

        // ПРИНУДИТЕЛЬНО ИСПОЛЬЗУЕМ FALLBACK - ВСЕГДА СОЗДАЕМ МИНИМАЛЬНЫЙ ОБЪЕКТ
        // Это гарантирует работу Telegram Mini App даже при проблемах с определением окружения
        tg = this.createMinimalTelegramWebApp();

        // Проверка наличия параметров Telegram
        const isTelegramEnvironment = this.checkTelegramEnvironment();

        if (!isTelegramEnvironment) {
            console.warn('Вероятно, страница открыта вне Telegram Mini App');
            this.showTelegramRequiredMessage();
            return;
        }

        console.log('Telegram WebApp API инициализирован', tg);

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
     * Комплексная проверка Telegram окружения
     */
    checkTelegramEnvironment() {
        // 1. Наличие официальных API
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('Определено через window.Telegram.WebApp');
            return true;
        }

        if (window.TelegramWebApp) {
            console.log('Определено через window.TelegramWebApp');
            return true;
        }

        if (window.WebApp) {
            console.log('Определено через window.WebApp');
            return true;
        }

        // 2. Проверка URL параметров
        if (this.checkTelegramUrlParams()) {
            console.log('Определено через URL параметры');
            return true;
        }

        // 3. Проверка User Agent
        if (this.checkTelegramUserAgent()) {
            console.log('Определено через User Agent');
            return true;
        }

        // 4. Проверка iframe
        if (this.checkTelegramIframe()) {
            console.log('Определено через iframe');
            return true;
        }

        // 5. Проверка хоста и протокола
        if (window.location.hostname.includes('t.me') || document.referrer.includes('t.me')) {
            console.log('Определено через hostname/referrer t.me');
            return true;
        }

        // 6. Наличие мета-тегов Telegram
        const metaTags = document.querySelectorAll('meta');
        for (const meta of metaTags) {
            if (meta.name && meta.name.includes('telegram') ||
                meta.property && meta.property.includes('telegram')) {
                console.log('Определено через meta-теги Telegram');
                return true;
            }
        }

        // ВАЖНО: для тестирования считаем, что мы в окружении Telegram
        // В реальной среде удалите эту строку
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
        console.log('Создание минимального объекта Telegram WebApp');

        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));

        // Попытаемся извлечь данные как из URL параметров, так и из хеша
        const getParam = (name) => {
            return urlParams.get(name) || hashParams.get(name) || '';
        };

        return {
            initData: getParam('tgWebAppData') || '',
            colorScheme: getParam('tgWebAppTheme') === 'dark' ? 'dark' : 'light',
            version: getParam('tgWebAppVersion') || '1.0',
            ready: function () {
                console.log('Minimal Telegram WebApp ready');
                // Отправляем событие готовности в родительское окно (если оно есть)
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ event: 'web_app_ready' }, '*');
                }
            },
            expand: function () {
                console.log('Minimal Telegram WebApp expand');
                // Попытка сделать окно максимальным
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ event: 'web_app_expand' }, '*');
                }
            },
            BackButton: {
                isVisible: false,
                show: function () {
                    console.log('BackButton show');
                    this.isVisible = true;
                },
                hide: function () {
                    console.log('BackButton hide');
                    this.isVisible = false;
                },
                onClick: function (callback) {
                    if (callback) {
                        console.log('BackButton onClick - добавлен обработчик');
                        document.addEventListener('backbutton', callback);
                        // Добавляем обработчик для ESC клавиши
                        document.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape') callback();
                        });
                    }
                }
            },
            MainButton: {
                text: '',
                isVisible: false,
                setText: function (text) {
                    this.text = text;
                    return this;
                },
                show: function () {
                    this.isVisible = true;
                    return this;
                },
                hide: function () {
                    this.isVisible = false;
                    return this;
                },
                onClick: function (callback) {
                    // Заглушка для MainButton
                }
            },
            HapticFeedback: {
                impactOccurred: function (style) {
                    console.log('HapticFeedback impactOccurred', style);
                },
                notificationOccurred: function (type) {
                    console.log('HapticFeedback notificationOccurred', type);
                }
            }
        };
    },

    /**
     * Проверка и обработка аутентификации пользователя
     */
    async checkAuthentication() {
        try {
            // Получаем токен из localStorage
            const token = localStorage.getItem('auth_token');
            console.log('Проверка аутентификации: токен ' + (token ? 'найден' : 'не найден'));

            if (!token) {
                console.log('Токен не найден, запускаем первичную аутентификацию');
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
     * Проверяет, следует ли использовать режим эмуляции
     */
    shouldUseEmulationMode() {
        // Отключаем режим эмуляции в продакшене
        return false;

        // Режим для тестирования можно включить через URL параметр
        // return window.location.search.includes('debug_mode=true');
    },

    /**
     * Аутентификация через Telegram WebApp
     */
    async authenticateTelegram() {
        try {
            this.loadingStart('Авторизация...');

            // Пытаемся различными способами получить initData
            let initData = null;

            if (tg && tg.initData) {
                initData = tg.initData;
                console.log('Используем initData из tg объекта');
            } else {
                // Попытка получить initData из URL-параметров или хеша
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.slice(1));

                initData = urlParams.get('tgWebAppData') ||
                    hashParams.get('tgWebAppData') ||
                    urlParams.get('initData') ||
                    hashParams.get('initData') ||
                    '';

                if (initData) {
                    console.log('Используем initData из URL/hash параметров');
                }
            }

            if (!initData) {
                console.warn('Данные инициализации Telegram WebApp отсутствуют или пусты');

                // Если на устройстве есть сохраненный токен, пробуем его использовать
                const storedToken = localStorage.getItem('auth_token');
                if (storedToken) {
                    console.log('Используем сохраненный токен без проверки аутентификации через Telegram');
                    this.state.token = storedToken;
                    this.state.isAuthenticated = true;

                    // Загружаем данные профиля с сохраненным токеном
                    await this.loadProfileData();
                    return;
                }

                // Режим эмуляции используется только если явно включен
                if (this.shouldUseEmulationMode()) {
                    console.log('Включаем режим эмуляции для тестирования');
                    await this.useEmulationAuth();
                    return;
                }

                // Попытка гостевой аутентификации (если поддерживается на сервере)
                try {
                    console.log('Пробуем гостевую аутентификацию');
                    const guestResponse = await fetch('/api/auth/guest', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userAgent: navigator.userAgent,
                            referrer: document.referrer
                        })
                    });

                    if (guestResponse.ok) {
                        const guestData = await guestResponse.json();
                        if (guestData.token) {
                            console.log('Гостевая аутентификация успешна');
                            localStorage.setItem('auth_token', guestData.token);
                            this.state.token = guestData.token;
                            this.state.isAuthenticated = true;
                            await this.loadProfileData();
                            return;
                        }
                    }
                } catch (guestError) {
                    console.error('Ошибка при гостевой аутентификации:', guestError);
                }

                // Показываем ошибку, если не удалось аутентифицироваться ни одним способом
                console.error('Все методы аутентификации не сработали');
                this.showTelegramRequiredMessage();
                return;
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

            if (!response.ok) {
                // Если сервер отклонил запрос, показываем ошибку
                console.error(`Ошибка аутентификации через API: ${response.status} ${response.statusText}`);
                this.showError(`Ошибка аутентификации (${response.status}): ${response.statusText}`);
                return;
            }

            const data = await response.json();

            if (!data.token) {
                console.error('Ошибка аутентификации: Токен не получен');
                this.showError('Ошибка аутентификации: Сервер не вернул токен');
                return;
            }

            // Сохраняем токен
            const token = data.token;
            localStorage.setItem('auth_token', token);
            this.state.token = token;
            this.state.isAuthenticated = true;

            // Используем haptic feedback для успешной аутентификации
            if (tg.HapticFeedback && tg.HapticFeedback.notificationOccurred) {
                tg.HapticFeedback.notificationOccurred('success');
            }

            // Загружаем данные профиля
            await this.loadProfileData();

        } catch (error) {
            console.error('Ошибка при аутентификации:', error);
            this.loadingEnd();

            // Показываем ошибку
            this.showError('Ошибка загрузки профиля: ' + error.message);

            // Добавляем подробный вывод в консоль для отладки
            console.debug('Полные данные ошибки:', error);
            console.debug('Токен авторизации присутствует:', !!this.state.token);

            // Если ошибка связана с авторизацией, пробуем перезапустить процесс
            if (error.message && (
                error.message.includes('401') ||
                error.message.includes('авторизации') ||
                error.message.includes('токен')
            )) {
                console.log('Обнаружена ошибка авторизации, пробуем повторно аутентифицировать пользователя');
                // Очищаем токен и запускаем авторизацию заново
                this.state.token = null;
                localStorage.removeItem('auth_token');
                setTimeout(() => this.authenticateTelegram(), 1000);
            }
        }
    },

    /**
     * Эмуляция авторизации для тестирования и отладки
     */
    async useEmulationAuth() {
        console.log('Эмулируем процесс авторизации для тестирования');

        // Эмулируем задержку сети
        await new Promise(resolve => setTimeout(resolve, 500));

        // Создаем фиктивный токен для тестирования
        const mockToken = 'emulation_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('auth_token', mockToken);
        this.state.token = mockToken;
        this.state.isAuthenticated = true;

        this.loadingEnd();

        // Создаем мок-данные профиля для отображения
        this.profileData = {
            name: 'Тестовый Пользователь',
            telegramId: '1234567890',
            rank: 'ТЕСТОВЫЙ',
            stats: {
                investigations: 47,
                solvedCases: 25,
                winStreak: 3,
                accuracy: 68
            },
            achievements: [
                {
                    id: 'first_case',
                    name: 'Первое дело',
                    description: 'Завершите ваше первое расследование'
                },
                {
                    id: 'rookie',
                    name: 'Новичок',
                    description: 'Достигните 5 успешных расследований'
                }
            ]
        };

        this.updateProfileUI(this.profileData);

        // Создаем мок-данные лидерборда
        const mockLeaderboardData = {
            leaderboard: [
                { rank: 1, name: 'Шерлок Холмс', score: 1243, isCurrentUser: false },
                { rank: 2, name: 'Эркюль Пуаро', score: 984, isCurrentUser: false },
                { rank: 3, name: 'Мисс Марпл', score: 723, isCurrentUser: false },
                { rank: 4, name: 'Тестовый Пользователь', score: 532, isCurrentUser: true },
                { rank: 5, name: 'Инспектор Лестрейд', score: 256, isCurrentUser: false }
            ],
            currentUser: {
                rank: 4,
                name: 'Тестовый Пользователь',
                score: 532
            }
        };

        this.updateLeaderboardUI(mockLeaderboardData);
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

            this.profileData = data.data;
            console.log('Данные профиля получены:', this.profileData);

            // Если это новый пользователь, используем haptic feedback для обратной связи
            if (this.profileData.isNewUser && tg && tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }

            // Обрабатываем случай с новым пользователем, у которого все значения по нулям
            if (this.profileData.isNewUser || !this.profileData.stats) {
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

            // Добавляем подробный вывод в консоль для отладки
            console.debug('Полные данные ошибки:', error);
            console.debug('Токен авторизации присутствует:', !!this.state.token);

            // Если ошибка связана с авторизацией, пробуем перезапустить процесс
            if (error.message && (
                error.message.includes('401') ||
                error.message.includes('авторизации') ||
                error.message.includes('токен')
            )) {
                console.log('Обнаружена ошибка авторизации, пробуем повторно аутентифицировать пользователя');
                // Очищаем токен и запускаем авторизацию заново
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

            // Запрашиваем данные лидерборда
            const response = await fetch(`/api/user/leaderboard?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки таблицы лидеров: ${response.status} ${response.statusText}`);
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

            // Очищаем таблицу лидеров при ошибке
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
     * Отобразить сообщение о том, что требуется Telegram
     */
    showTelegramRequiredMessage() {
        this.loadingEnd();

        // Проверяем, возможно у нас есть сохраненный токен
        const token = localStorage.getItem('auth_token');
        if (token) {
            console.log('Найден токен авторизации, пробуем использовать его без проверки Telegram окружения');
            this.state.token = token;
            this.state.isAuthenticated = true;

            // Загружаем данные профиля
            this.loadProfileData();
            return;
        }

        // Показываем специальное сообщение
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
                <div class="debug-info" style="display: none; font-size: 10px; margin-top: 15px; text-align: left;">
                    <details>
                        <summary>Информация для отладки</summary>
                        <pre id="debug-data"></pre>
                    </details>
                </div>
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
                .telegram-warning .open-button {
                    background: var(--blood-red);
                    color: var(--chalk-white);
                    border: none;
                    padding: 8px 16px;
                    border-radius: var(--radius-sm);
                    margin-top: 15px;
                    cursor: pointer;
                    font-weight: bold;
                    text-decoration: none;
                    display: inline-block;
                }
                .telegram-warning details {
                    margin-top: 15px;
                    text-align: left;
                    border-top: 1px solid rgba(139, 0, 0, 0.3);
                    padding-top: 10px;
                }
                .telegram-warning summary {
                    cursor: pointer;
                    opacity: 0.7;
                }
                .telegram-warning pre {
                    white-space: pre-wrap;
                    font-size: 9px;
                    text-align: left;
                    overflow: auto;
                    max-height: 200px;
                }
            `;
            document.head.appendChild(style);

            // Очищаем контейнер и добавляем сообщение
            appContainer.innerHTML = '';
            appContainer.appendChild(telegramMessage);

            // Создаем и добавляем кнопку для открытия в Telegram
            const openButton = document.createElement('a');
            openButton.className = 'open-button';
            openButton.textContent = 'Открыть в Telegram';

            // Создаем телеграм-ссылку
            // Используем t.me/share, так как это может открыть Telegram клиент
            const telegramDeepLink = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`;
            openButton.href = telegramDeepLink;

            // Добавляем кнопку в сообщение
            telegramMessage.appendChild(openButton);

            // Добавляем информацию для отладки
            if (document.getElementById('debug-data')) {
                const debugInfo = {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    referrer: document.referrer,
                    inIframe: window.self !== window.top,
                    hasTelegram: !!window.Telegram,
                    urlParams: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
                    hashParams: Object.fromEntries(window.location.hash ?
                        new URLSearchParams(window.location.hash.slice(1)).entries() : []),
                    time: new Date().toISOString()
                };

                document.getElementById('debug-data').textContent = JSON.stringify(debugInfo, null, 2);
                document.querySelector('.debug-info').style.display = 'block';
            }

            // Добавляем скрытую кнопку для входа в режим отладки
            telegramMessage.addEventListener('click', (e) => {
                // Проверяем 5 кликов подряд
                if (!this._debugClickCounter) this._debugClickCounter = 0;
                this._debugClickCounter++;

                if (this._debugClickCounter >= 5) {
                    document.querySelector('.debug-info').style.display = 'block';
                    this._debugClickCounter = 0;
                }

                // Сбрасываем счетчик через 2 секунды
                clearTimeout(this._debugClickTimeout);
                this._debugClickTimeout = setTimeout(() => {
                    this._debugClickCounter = 0;
                }, 2000);
            });
        }

        // Пытаемся перенаправить на телеграм через 3 секунды
        setTimeout(() => {
            const telegramDeepLink = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`;
            // Проверяем не был ли еще выполнен переход
            if (document.querySelector('.telegram-warning')) {
                console.log('Перенаправление на Telegram...');
                window.location.href = telegramDeepLink;
            }
        }, 3000);
    }
};

// Инициализация профиля при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
}); 