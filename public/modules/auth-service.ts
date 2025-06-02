/**
 * Служба авторизации для Telegram WebApp
 * Обрабатывает аутентификацию пользователя и управление токенами
 */

import type { TelegramWebApp, ApiResponse, AuthResponse, User } from '../types/profile-types.js';

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
    private token: string | null = null;
    private telegramApp: TelegramWebApp | null = null;
    private isInitialized = false;
    private retryCount = 0;

    constructor() {
        this.initTelegramApp();
    }

    // =========================================================================
    // ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
    // =========================================================================

    private initTelegramApp(): void {
        try {
            this.telegramApp = window.Telegram?.WebApp || null;

            if (this.telegramApp) {
                this.telegramApp.ready();
                this.telegramApp.expand();
                console.log('🚀 Telegram WebApp инициализирован');
                this.isInitialized = true;
            } else {
                console.warn('⚠️ Telegram WebApp недоступен');
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации Telegram WebApp:', error);
        }
    }

    // =========================================================================
    // МЕТОДЫ ПОЛУЧЕНИЯ ТОКЕНА
    // =========================================================================

    private getStoredToken(): string | null {
        try {
            console.log(`🔍 localStorage содержимое:`, {
                auth_token: localStorage.getItem('auth_token'),
                token: localStorage.getItem('token'),
                criminal_trust_token: localStorage.getItem(AUTH_CONFIG.TOKEN_KEY),
                all_keys: Object.keys(localStorage),
                localStorage_length: localStorage.length
            });

            // Проверяем оба возможных ключа для совместимости
            const token = localStorage.getItem('auth_token') ||
                localStorage.getItem('token') ||
                localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
            console.log(`📱 Ищем сохраненный токен:`, token ? `${token.substring(0, 20)}...` : 'НЕ НАЙДЕН');
            return token;
        } catch (error) {
            console.error('❌ Ошибка получения токена из localStorage:', error);
            return null;
        }
    }

    private setToken(token: string | null): void {
        console.log(`💾 Сохраняем токен:`, token ? `${token.substring(0, 20)}...` : 'ПУСТОЙ ТОКЕН');
        this.token = token;
        if (token) {
            localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token); // Основной ключ
            localStorage.setItem('auth_token', token); // Совместимость
            localStorage.setItem('token', token); // Совместимость

            // Проверяем что токен действительно сохранился
            console.log(`✅ Проверка сохранения:`, {
                saved_auth_token: localStorage.getItem('auth_token'),
                saved_token: localStorage.getItem('token'),
                saved_main: localStorage.getItem(AUTH_CONFIG.TOKEN_KEY),
                in_memory: this.token ? `${this.token.substring(0, 20)}...` : 'НЕТ'
            });
        } else {
            localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
        }
    }

    private clearToken(): void {
        console.log(`🗑️ Очищаем токен`);
        this.token = null;
        localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
    }

    public getCurrentToken(): string | null {
        const currentToken = this.token || this.getStoredToken();
        console.log(`🔍 Получаем текущий токен:`, currentToken ? `${currentToken.substring(0, 20)}...` : 'ТОКЕН НЕ НАЙДЕН');
        return currentToken;
    }

    // =========================================================================
    // АВТОРИЗАЦИЯ ЧЕРЕЗ TELEGRAM
    // =========================================================================

    public async authenticate(): Promise<{ success: boolean; user?: User; error?: string }> {
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
            } else {
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
            console.log('📡 Результат авторизации:', authResult);

            // Сервер возвращает { status: 'success', data: { token, user } }
            if ((authResult.success || authResult.status === 'success') && authResult.data) {
                this.setToken(authResult.data.token);
                console.log('✅ Успешная авторизация');
                return { success: true, user: authResult.data.user };
            } else {
                console.error('❌ Ошибка авторизации:', authResult.error || authResult.message);
                return { success: false, error: authResult.error || authResult.message || 'Ошибка авторизации' };
            }
        } catch (error) {
            console.error('❌ Исключение при авторизации:', error);
            return { success: false, error: 'Ошибка соединения с сервером' };
        }
    }

    // =========================================================================
    // ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ИЗ TELEGRAM
    // =========================================================================

    private getTelegramUserData(): any {
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

        } catch (error) {
            console.error('❌ Ошибка получения Telegram данных:', error);
            return this.getDeveloperModeData();
        }
    }

    private getDeveloperModeData(): any {
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

    private async performAuth(telegramData: any): Promise<ApiResponse<AuthResponse>> {
        // Формируем правильный формат данных для API /auth/init
        const requestData = telegramData.initData
            ? { initData: telegramData.initData }
            : telegramData; // Fallback для developer mode

        const response = await this.makeAuthRequest('/auth/init', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });

        return response;
    }

    private async verifyToken(token: string): Promise<{ success: boolean; user?: User }> {
        try {
            const response = await this.makeAuthRequest('/auth/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.success && response.data) {
                return { success: true, user: response.data.user };
            } else {
                return { success: false };
            }
        } catch (error) {
            console.error('❌ Ошибка проверки токена:', error);
            return { success: false };
        }
    }

    private async makeAuthRequest(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<any>> {
        const url = `${AUTH_CONFIG.API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const requestOptions: RequestInit = {
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

        } catch (error) {
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

    private isNetworkError(error: any): boolean {
        return error instanceof TypeError && error.message === 'Failed to fetch';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public isAuthenticated(): boolean {
        return !!this.getCurrentToken();
    }

    public getTelegramApp(): TelegramWebApp | null {
        return this.telegramApp;
    }

    public isInitializedApp(): boolean {
        return this.isInitialized;
    }

    public applyTelegramTheme(): void {
        if (this.telegramApp && this.telegramApp.colorScheme) {
            document.documentElement.setAttribute('data-theme', this.telegramApp.colorScheme);
            console.log(`🎨 Применена тема Telegram: ${this.telegramApp.colorScheme}`);
        }
    }

    public setupBackButton(callback: () => void): void {
        if (this.telegramApp && this.telegramApp.BackButton) {
            this.telegramApp.BackButton.show();
            this.telegramApp.BackButton.onClick(callback);
            console.log('🔙 Кнопка "Назад" настроена');
        }
    }

    public logout(): void {
        console.log('🚪 Выход из аккаунта...');
        this.clearToken();
    }

    // =========================================================================
    // HAPTIC FEEDBACK
    // =========================================================================

    public hapticFeedback(type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): void {
        if (!this.telegramApp?.HapticFeedback) return;

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
        } catch (error) {
            console.error('❌ Ошибка haptic feedback:', error);
        }
    }
}

// =============================================================================
// ЭКСПОРТ SINGLETON ЭКЗЕМПЛЯРА
// =============================================================================

export const authService = new AuthService(); 