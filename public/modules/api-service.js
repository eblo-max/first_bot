/**
 * API служба для работы с профилем, достижениями и лидербордом
 * Централизованное управление HTTP запросами
 */
import { authService } from './auth-service.js';
// =============================================================================
// КОНФИГУРАЦИЯ API
// =============================================================================
const API_CONFIG = {
    BASE_URL: '/api',
    TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    CACHE_TTL: 60000, // 1 минута кэш
};
// =============================================================================
// ОСНОВНОЙ КЛАСС API СЛУЖБЫ
// =============================================================================
export class ApiService {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }
    // =========================================================================
    // ОСНОВНЫЕ HTTP МЕТОДЫ
    // =========================================================================
    async makeRequest(endpoint, options = {}, useCache = false, cacheTTL = API_CONFIG.CACHE_TTL) {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body)}`;
        // Проверяем кэш
        if (useCache && this.isCacheValid(cacheKey)) {
            console.log(`📦 Возвращаем из кэша: ${endpoint}`);
            return { success: true, data: this.cache.get(cacheKey).data };
        }
        // Проверяем дублирующиеся запросы
        if (this.pendingRequests.has(cacheKey)) {
            console.log(`⏳ Ожидаем существующий запрос: ${endpoint}`);
            return this.pendingRequests.get(cacheKey);
        }
        // Создаем новый запрос
        const requestPromise = this.executeRequest(url, options, cacheKey, useCache, cacheTTL);
        this.pendingRequests.set(cacheKey, requestPromise);
        try {
            const result = await requestPromise;
            return result;
        }
        finally {
            this.pendingRequests.delete(cacheKey);
        }
    }
    async executeRequest(url, options, cacheKey, useCache, cacheTTL) {
        const token = authService.getCurrentToken();
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        const requestOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };
        console.log(`🌐 ${requestOptions.method || 'GET'} ${url}`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }
            // Сохраняем в кэш при успехе
            if (useCache && data.success) {
                this.setCache(cacheKey, data.data, cacheTTL);
            }
            return data;
        }
        catch (error) {
            console.error(`❌ Ошибка запроса к ${url}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }
    // =========================================================================
    // МЕТОДЫ УПРАВЛЕНИЯ КЭШЕМ
    // =========================================================================
    isCacheValid(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        const now = Date.now();
        return (now - entry.timestamp) < entry.ttl;
    }
    setCache(key, data, ttl) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    clearCache(pattern) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            this.cache.clear();
        }
        console.log('🗑️ Кэш очищен');
    }
    // =========================================================================
    // API МЕТОДЫ ДЛЯ ПРОФИЛЯ
    // =========================================================================
    async getUserProfile() {
        return this.makeRequest('/profile', {}, true);
    }
    async updateUserProfile(profileData) {
        const result = await this.makeRequest('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        // Очищаем кэш профиля при обновлении
        if (result.success) {
            this.clearCache('/profile');
        }
        return result;
    }
    async getUserStats(userId) {
        const endpoint = userId ? `/profile/stats/${userId}` : '/profile/stats';
        return this.makeRequest(endpoint, {}, true, API_CONFIG.CACHE_TTL / 2); // Более короткий кэш для статистики
    }
    // =========================================================================
    // API МЕТОДЫ ДЛЯ ДОСТИЖЕНИЙ
    // =========================================================================
    async getUserAchievements() {
        return this.makeRequest('/achievements', {}, true);
    }
    async unlockAchievement(achievementId) {
        const result = await this.makeRequest('/achievements/unlock', {
            method: 'POST',
            body: JSON.stringify({ achievementId })
        });
        // Очищаем кэш достижений
        if (result.success) {
            this.clearCache('/achievements');
            this.clearCache('/profile'); // Профиль может содержать список достижений
        }
        return result;
    }
    async getAchievementProgress() {
        return this.makeRequest('/achievements/progress', {}, true, API_CONFIG.CACHE_TTL / 4);
    }
    // =========================================================================
    // API МЕТОДЫ ДЛЯ ЛИДЕРБОРДА
    // =========================================================================
    async getLeaderboard(period = 'day') {
        return this.makeRequest(`/leaderboard/${period}`, {}, true, API_CONFIG.CACHE_TTL / 2);
    }
    async getUserPosition(period = 'day') {
        return this.makeRequest(`/leaderboard/${period}/position`, {}, true, API_CONFIG.CACHE_TTL / 2);
    }
    // =========================================================================
    // API МЕТОДЫ ДЛЯ ИГРОВЫХ РЕЗУЛЬТАТОВ
    // =========================================================================
    async submitGameResult(gameData) {
        const result = await this.makeRequest('/game/result', {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
        // Очищаем релевантные кэши после игры
        if (result.success) {
            this.clearCache('/profile');
            this.clearCache('/achievements');
            this.clearCache('/leaderboard');
        }
        return result;
    }
    async getGameHistory(limit = 10, offset = 0) {
        return this.makeRequest(`/game/history?limit=${limit}&offset=${offset}`, {}, true);
    }
    // =========================================================================
    // API МЕТОДЫ ДЛЯ АВАТАРОВ
    // =========================================================================
    async getUserAvatar(telegramId) {
        try {
            const cacheKey = `avatar:${telegramId}`;
            // Проверяем кэш аватаров (более длительный)
            if (this.isCacheValid(cacheKey)) {
                return this.cache.get(cacheKey).data;
            }
            const response = await this.makeRequest(`/user/avatar/${telegramId}`);
            if (response.success && response.data?.photoUrl) {
                // Кэшируем аватар на 1 час
                this.setCache(cacheKey, response.data.photoUrl, 3600000);
                return response.data.photoUrl;
            }
            return null;
        }
        catch (error) {
            console.error('❌ Ошибка загрузки аватара:', error);
            return null;
        }
    }
    // =========================================================================
    // ПАКЕТНЫЕ ЗАПРОСЫ
    // =========================================================================
    async getBatchData() {
        console.log('📦 Загружаем пакетные данные...');
        try {
            const [profileResult, achievementsResult, leaderboardResult, statsResult] = await Promise.allSettled([
                this.getUserProfile(),
                this.getUserAchievements(),
                this.getLeaderboard('day'),
                this.getUserStats()
            ]);
            const result = {};
            if (profileResult.status === 'fulfilled' && profileResult.value.success) {
                result.profile = profileResult.value.data;
            }
            if (achievementsResult.status === 'fulfilled' && achievementsResult.value.success) {
                result.achievements = achievementsResult.value.data;
            }
            if (leaderboardResult.status === 'fulfilled' && leaderboardResult.value.success) {
                result.leaderboard = leaderboardResult.value.data;
            }
            if (statsResult.status === 'fulfilled' && statsResult.value.success) {
                result.stats = statsResult.value.data;
            }
            console.log('✅ Пакетные данные загружены');
            return result;
        }
        catch (error) {
            console.error('❌ Ошибка загрузки пакетных данных:', error);
            throw error;
        }
    }
    // =========================================================================
    // УТИЛИТЫ
    // =========================================================================
    getConnectionStatus() {
        if (!navigator.onLine)
            return 'offline';
        // Простая проверка скорости соединения
        const connection = navigator.connection;
        if (connection) {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                return 'slow';
            }
        }
        return 'online';
    }
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    // =========================================================================
    // МЕТОДЫ ДЛЯ МОНИТОРИНГА
    // =========================================================================
    async healthCheck() {
        try {
            const response = await this.makeRequest('/health');
            return response.success;
        }
        catch {
            return false;
        }
    }
    async ping() {
        const start = Date.now();
        try {
            await this.makeRequest('/ping');
            return Date.now() - start;
        }
        catch {
            return -1;
        }
    }
}
// =============================================================================
// ЭКСПОРТ SINGLETON ЭКЗЕМПЛЯРА
// =============================================================================
export const apiService = new ApiService();
