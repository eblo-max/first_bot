/**
 * Служба авторизации для Telegram WebApp
 * Обрабатывает аутентификацию пользователя и управление токенами
 */
// =============================================================================
// КОНФИГУРАЦИЯ АВТОРИЗАЦИИ
// =============================================================================
const AUTH_CONFIG = {
    API_BASE_URL: '/api',
    TOKEN_KEY: 'criminal_trust_token',
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    TOKEN_REFRESH_THRESHOLD: 300000 // 5 минут до истечения
};
// =============================================================================
// ОСНОВНОЙ КЛАСС СЛУЖБЫ АВТОРИЗАЦИИ
// =============================================================================
export class AuthService {
    constructor() {
        this.token = null;
        this.telegramApp = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.initTelegramApp();
    }
    // =========================================================================
    // ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
    // =========================================================================
    initTelegramApp() {
        try {
            this.telegramApp = window.Telegram?.WebApp || null;
            if (this.telegramApp) {
                this.telegramApp.ready();
                this.telegramApp.expand();
                console.log('🚀 Telegram WebApp инициализирован');
                this.isInitialized = true;
            }
            else {
                console.warn('⚠️ Telegram WebApp недоступен');
            }
        }
        catch (error) {
            console.error('❌ Ошибка инициализации Telegram WebApp:', error);
        }
    }
    // =========================================================================
    // МЕТОДЫ ПОЛУЧЕНИЯ ТОКЕНА
    // =========================================================================
    getStoredToken() {
        try {
            return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        }
        catch (error) {
            console.error('❌ Ошибка получения токена из localStorage:', error);
            return null;
        }
    }
    setToken(token) {
        console.log(`💾 Сохраняем токен:`, token ? `${token.substring(0, 20)}...` : 'ПУСТОЙ ТОКЕН');
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('token', token); // Дублируем для совместимости
        } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
        }
    }
    clearToken() {
        console.log(`🗑️ Очищаем токен`);
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
    }
    getCurrentToken() {
        const currentToken = this.token || this.getStoredToken();
        console.log(`🔍 Получаем текущий токен:`, currentToken ? `${currentToken.substring(0, 20)}...` : 'ТОКЕН НЕ НАЙДЕН');
        return currentToken;
    }
    // =========================================================================
    // АВТОРИЗАЦИЯ ЧЕРЕЗ TELEGRAM
    // =========================================================================
    async authenticate() {
        console.log('🔐 Начинаем аутентификацию...');
        // Проверяем существующий токен
        const storedToken = this.getStoredToken();
        if (storedToken) {
            this.token = storedToken;
            console.log('🔑 Токен найден и установлен:', storedToken.substring(0, 20) + '...');
            // Проверяем валидность токена
            const verification = await this.verifyToken(storedToken);
            if (verification.success && verification.user) {
                console.log('✅ Токен валиден, пользователь авторизован');
                return { success: true, user: verification.user };
            }
            else {
                console.log('❌ Токен недействителен, очищаем');
                this.clearToken();
            }
        }
        // Получаем данные пользователя из Telegram
        const telegramData = this.getTelegramUserData();
        if (!telegramData) {
            return { success: false, error: 'Данные Telegram недоступны' };
        }
        // Выполняем авторизацию через API
        try {
            const authResult = await this.performAuth(telegramData);
            if (authResult.success && authResult.data) {
                this.setToken(authResult.data.token);
                console.log('✅ Успешная авторизация');
                return { success: true, user: authResult.data.user };
            }
            else {
                console.error('❌ Ошибка авторизации:', authResult.error);
                return { success: false, error: authResult.error || 'Ошибка авторизации' };
            }
        }
        catch (error) {
            console.error('❌ Исключение при авторизации:', error);
            return { success: false, error: 'Ошибка соединения с сервером' };
        }
    }
    // =========================================================================
    // ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ИЗ TELEGRAM
    // =========================================================================
    getTelegramUserData() {
        if (!this.telegramApp) {
            console.log('🔍 Telegram WebApp недоступен, используем developer mode');
            return this.getDeveloperModeData();
        }
        try {
            // Используем initData для аутентификации
            if (this.telegramApp.initData) {
                console.log('📱 Используем Telegram initData');
                return {
                    initData: this.telegramApp.initData,
                    user: this.telegramApp.initDataUnsafe?.user
                };
            }
            // Fallback к пользователю из initDataUnsafe
            if (this.telegramApp.initDataUnsafe?.user) {
                console.log('📱 Используем Telegram user data');
                return {
                    user: this.telegramApp.initDataUnsafe.user
                };
            }
            console.log('⚠️ Telegram данные недоступны, используем developer mode');
            return this.getDeveloperModeData();
        }
        catch (error) {
            console.error('❌ Ошибка получения Telegram данных:', error);
            return this.getDeveloperModeData();
        }
    }
    getDeveloperModeData() {
        console.log('🛠️ Developer mode активирован');
        return {
            user: {
                id: 5731136459,
                first_name: 'Developer',
                username: 'dev_mode'
            },
            isDeveloperMode: true
        };
    }
    // =========================================================================
    // API ЗАПРОСЫ
    // =========================================================================
    async performAuth(telegramData) {
        const response = await this.makeAuthRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(telegramData)
        });
        return response;
    }
    async verifyToken(token) {
        try {
            const response = await this.makeAuthRequest('/auth/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.success && response.data) {
                return { success: true, user: response.data.user };
            }
            else {
                return { success: false };
            }
        }
        catch (error) {
            console.error('❌ Ошибка проверки токена:', error);
            return { success: false };
        }
    }
    async makeAuthRequest(endpoint, options = {}) {
        const url = `${AUTH_CONFIG.API_BASE_URL}${endpoint}`;
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const requestOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };
        try {
            console.log(`🌐 ${requestOptions.method || 'GET'} ${url}`);
            const response = await fetch(url, requestOptions);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }
            return data;
        }
        catch (error) {
            console.error(`❌ Ошибка запроса к ${url}:`, error);
            // Повторный запрос при ошибке сети
            if (this.retryCount < AUTH_CONFIG.MAX_RETRY_ATTEMPTS && this.isNetworkError(error)) {
                this.retryCount++;
                console.log(`🔄 Повторный запрос ${this.retryCount}/${AUTH_CONFIG.MAX_RETRY_ATTEMPTS}`);
                await this.delay(AUTH_CONFIG.RETRY_DELAY * this.retryCount);
                return this.makeAuthRequest(endpoint, options);
            }
            this.retryCount = 0;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }
    // =========================================================================
    // УТИЛИТЫ
    // =========================================================================
    isNetworkError(error) {
        return error instanceof TypeError && error.message === 'Failed to fetch';
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    isAuthenticated() {
        return !!this.getCurrentToken();
    }
    getTelegramApp() {
        return this.telegramApp;
    }
    isInitializedApp() {
        return this.isInitialized;
    }
    // =========================================================================
    // УПРАВЛЕНИЕ ТЕМОЙ
    // =========================================================================
    applyTelegramTheme() {
        if (!this.telegramApp?.themeParams)
            return;
        try {
            const root = document.documentElement;
            const themeParams = this.telegramApp.themeParams;
            // Применяем основные цвета темы
            if (themeParams.bg_color) {
                root.style.setProperty('--tg-bg-color', themeParams.bg_color);
            }
            if (themeParams.text_color) {
                root.style.setProperty('--tg-text-color', themeParams.text_color);
            }
            if (themeParams.hint_color) {
                root.style.setProperty('--tg-hint-color', themeParams.hint_color);
            }
            if (themeParams.button_color) {
                root.style.setProperty('--tg-button-color', themeParams.button_color);
            }
            console.log('🎨 Telegram тема применена');
        }
        catch (error) {
            console.error('❌ Ошибка применения темы:', error);
        }
    }
    // =========================================================================
    // УПРАВЛЕНИЕ КНОПКОЙ "НАЗАД"
    // =========================================================================
    setupBackButton(callback) {
        if (!this.telegramApp?.BackButton)
            return;
        try {
            this.telegramApp.BackButton.show();
            this.telegramApp.BackButton.onClick(callback);
            console.log('🔙 Кнопка "Назад" настроена');
        }
        catch (error) {
            console.error('❌ Ошибка настройки кнопки "Назад":', error);
        }
    }
    hideBackButton() {
        if (!this.telegramApp?.BackButton)
            return;
        try {
            this.telegramApp.BackButton.hide();
        }
        catch (error) {
            console.error('❌ Ошибка скрытия кнопки "Назад":', error);
        }
    }
    // =========================================================================
    // HAPTIC FEEDBACK
    // =========================================================================
    hapticFeedback(type) {
        if (!this.telegramApp?.HapticFeedback)
            return;
        try {
            switch (type) {
                case 'success':
                case 'error':
                case 'warning':
                    this.telegramApp.HapticFeedback.notificationOccurred(type);
                    break;
                case 'light':
                case 'medium':
                case 'heavy':
                    this.telegramApp.HapticFeedback.impactOccurred(type);
                    break;
            }
        }
        catch (error) {
            console.error('❌ Ошибка haptic feedback:', error);
        }
    }
}
// =============================================================================
// ЭКСПОРТ SINGLETON ЭКЗЕМПЛЯРА
// =============================================================================
export const authService = new AuthService();
