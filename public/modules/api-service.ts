/**
 * API служба для работы с профилем, достижениями и лидербордом
 * Централизованное управление HTTP запросами
 */

import type {
    ApiResponse,
    User,
    Achievement,
    LeaderboardData,
    LeaderboardPeriod
} from '../types/profile-types.js';
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

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

// =============================================================================
// ОСНОВНОЙ КЛАСС API СЛУЖБЫ
// =============================================================================

export class ApiService {
    private cache = new Map<string, CacheEntry<any>>();
    private pendingRequests = new Map<string, Promise<any>>();

    // =========================================================================
    // ОСНОВНЫЕ HTTP МЕТОДЫ
    // =========================================================================

    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {},
        useCache = false,
        cacheTTL = API_CONFIG.CACHE_TTL
    ): Promise<ApiResponse<T>> {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body)}`;

        // Проверяем кэш
        if (useCache && this.isCacheValid(cacheKey)) {
            console.log(`📦 Возвращаем из кэша: ${endpoint}`);
            return { success: true, data: this.cache.get(cacheKey)!.data };
        }

        // Проверяем дублирующиеся запросы
        if (this.pendingRequests.has(cacheKey)) {
            console.log(`⏳ Ожидаем существующий запрос: ${endpoint}`);
            return this.pendingRequests.get(cacheKey);
        }

        // Создаем новый запрос
        const requestPromise = this.executeRequest<T>(url, options, cacheKey, useCache, cacheTTL);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    private async executeRequest<T>(
        url: string,
        options: RequestInit,
        cacheKey: string,
        useCache: boolean,
        cacheTTL: number
    ): Promise<ApiResponse<T>> {
        console.log(`🔍 Проверка authService:`, {
            authService_exists: !!authService,
            authService_initialized: authService?.isInitializedApp?.(),
            authService_type: typeof authService
        });

        const token = authService.getCurrentToken();
        console.log(`🔑 Получен токен для запроса:`, token ? `${token.substring(0, 20)}...` : 'ТОКЕН ОТСУТСТВУЕТ');

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
            console.log(`✅ Добавлен Authorization заголовок`);
        } else {
            console.log(`❌ Токен отсутствует - запрос без авторизации`);
        }

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        console.log(`🌐 ${requestOptions.method || 'GET'} ${url}`,
            `Headers:`, Object.keys(requestOptions.headers || {}));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log(`📡 Ответ сервера ${url}:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const data = await response.json();
            console.log(`📄 Содержимое ответа ${url}:`, data);

            if (!response.ok) {
                console.error(`❌ HTTP ошибка ${response.status}:`, data);
                throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Сохраняем в кэш при успехе
            if (useCache && data.success) {
                this.setCache(cacheKey, data.data, cacheTTL);
            }

            return data;

        } catch (error) {
            console.error(`❌ Ошибка запроса к ${url}:`, {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : undefined
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    // =========================================================================
    // МЕТОДЫ УПРАВЛЕНИЯ КЭШЕМ
    // =========================================================================

    private isCacheValid(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const now = Date.now();
        return (now - entry.timestamp) < entry.ttl;
    }

    private setCache<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    public clearCache(pattern?: string): void {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
        console.log('🗑️ Кэш очищен');
    }

    // =========================================================================
    // API МЕТОДЫ ДЛЯ ПРОФИЛЯ
    // =========================================================================

    public async getUserProfile(): Promise<ApiResponse<User>> {
        return this.makeRequest<User>('/user/profile', {}, true);
    }

    public async updateUserProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
        const result = await this.makeRequest<User>('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        // Очищаем кэш профиля при обновлении
        if (result.success) {
            this.clearCache('/user/profile');
        }

        return result;
    }

    public async getUserStats(userId?: number): Promise<ApiResponse<any>> {
        const endpoint = userId ? `/user/stats/${userId}` : '/user/stats';
        return this.makeRequest(endpoint, {}, true, API_CONFIG.CACHE_TTL / 2); // Более короткий кэш для статистики
    }

    // =========================================================================
    // API МЕТОДЫ ДЛЯ ДОСТИЖЕНИЙ
    // =========================================================================

    public async getUserAchievements(): Promise<ApiResponse<Achievement[]>> {
        return this.makeRequest<Achievement[]>('/profile/achievements/available', {}, true);
    }

    public async unlockAchievement(achievementId: string): Promise<ApiResponse<Achievement>> {
        const result = await this.makeRequest<Achievement>('/profile/achievements/unlock', {
            method: 'POST',
            body: JSON.stringify({ achievementId })
        });

        // Очищаем кэш достижений
        if (result.success) {
            this.clearCache('/profile/achievements');
            this.clearCache('/user/profile'); // Профиль может содержать список достижений
        }

        return result;
    }

    public async getAchievementProgress(): Promise<ApiResponse<Record<string, number>>> {
        return this.makeRequest('/profile/progress/next-achievements', {}, true, API_CONFIG.CACHE_TTL / 4);
    }

    // =========================================================================
    // API МЕТОДЫ ДЛЯ ЛИДЕРБОРДА
    // =========================================================================

    public async getLeaderboard(period: LeaderboardPeriod = 'day'): Promise<ApiResponse<LeaderboardData>> {
        return this.makeRequest<LeaderboardData>(`/leaderboard/${period}`, {}, true, API_CONFIG.CACHE_TTL / 2);
    }

    public async getUserPosition(period: LeaderboardPeriod = 'day'): Promise<ApiResponse<{ position: number; total: number }>> {
        return this.makeRequest(`/leaderboard/${period}/position`, {}, true, API_CONFIG.CACHE_TTL / 2);
    }

    // =========================================================================
    // API МЕТОДЫ ДЛЯ ИГРОВЫХ РЕЗУЛЬТАТОВ
    // =========================================================================

    public async submitGameResult(gameData: any): Promise<ApiResponse<any>> {
        const result = await this.makeRequest('/game/result', {
            method: 'POST',
            body: JSON.stringify(gameData)
        });

        // Очищаем релевантные кэши после игры
        if (result.success) {
            this.clearCache('/user/profile');
            this.clearCache('/profile/achievements');
            this.clearCache('/leaderboard');
        }

        return result;
    }

    public async getGameHistory(limit = 10, offset = 0): Promise<ApiResponse<any[]>> {
        return this.makeRequest(`/game/history?limit=${limit}&offset=${offset}`, {}, true);
    }

    // =========================================================================
    // API МЕТОДЫ ДЛЯ АВАТАРОВ
    // =========================================================================

    public async getUserAvatar(telegramId: number): Promise<string | null> {
        try {
            const cacheKey = `avatar:${telegramId}`;

            // Проверяем кэш аватаров (более длительный)
            if (this.isCacheValid(cacheKey)) {
                return this.cache.get(cacheKey)!.data;
            }

            // Используем прямую ссылку на изображение вместо JSON API
            const avatarUrl = `/api/user/avatar/${telegramId}`;

            // Кэшируем URL на 1 час
            this.setCache(cacheKey, avatarUrl, 3600000);
            return avatarUrl;
        } catch (error) {
            console.error('❌ Ошибка загрузки аватара:', error);
            return null;
        }
    }

    // =========================================================================
    // ПАКЕТНЫЕ ЗАПРОСЫ
    // =========================================================================

    public async getBatchData(): Promise<{
        profile?: User;
        achievements?: Achievement[];
        leaderboard?: LeaderboardData;
        stats?: any;
    }> {
        console.log('📦 Загружаем пакетные данные...');

        try {
            console.log('🔄 Запускаем параллельные запросы к API...');
            const [profileResult, achievementsResult, leaderboardResult, statsResult] = await Promise.allSettled([
                this.getUserProfile(),
                this.getUserAchievements(),
                this.getLeaderboard('day'),
                this.getUserStats()
            ]);

            console.log('📊 Результаты параллельных запросов:', {
                profile: { status: profileResult.status, success: profileResult.status === 'fulfilled' ? (profileResult.value.success || profileResult.value.status === 'success') : false },
                achievements: { status: achievementsResult.status, success: achievementsResult.status === 'fulfilled' ? (achievementsResult.value.success || achievementsResult.value.status === 'success') : false },
                leaderboard: { status: leaderboardResult.status, success: leaderboardResult.status === 'fulfilled' ? (leaderboardResult.value.success || leaderboardResult.value.status === 'success') : false },
                stats: { status: statsResult.status, success: statsResult.status === 'fulfilled' ? (statsResult.value.success || statsResult.value.status === 'success') : false }
            });

            const result: any = {};

            if (profileResult.status === 'fulfilled' && (profileResult.value.success || profileResult.value.status === 'success')) {
                result.profile = profileResult.value.data;
                console.log('✅ Profile добавлен в result:', !!result.profile);
            } else {
                console.error('❌ Profile запрос неудачен:', {
                    status: profileResult.status,
                    value: profileResult.status === 'fulfilled' ? profileResult.value : null,
                    reason: profileResult.status === 'rejected' ? profileResult.reason : null
                });
            }

            if (achievementsResult.status === 'fulfilled' && (achievementsResult.value.success || achievementsResult.value.status === 'success')) {
                result.achievements = achievementsResult.value.data;
                console.log('✅ Achievements добавлены в result:', Array.isArray(result.achievements) ? result.achievements.length : 'не массив');
            } else {
                console.error('❌ Achievements запрос неудачен:', {
                    status: achievementsResult.status,
                    value: achievementsResult.status === 'fulfilled' ? achievementsResult.value : null,
                    reason: achievementsResult.status === 'rejected' ? achievementsResult.reason : null
                });
            }

            if (leaderboardResult.status === 'fulfilled' && (leaderboardResult.value.success || leaderboardResult.value.status === 'success')) {
                result.leaderboard = leaderboardResult.value.data;
                console.log('✅ Leaderboard добавлен в result:', !!result.leaderboard);
            } else {
                console.error('❌ Leaderboard запрос неудачен:', {
                    status: leaderboardResult.status,
                    value: leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : null,
                    reason: leaderboardResult.status === 'rejected' ? leaderboardResult.reason : null
                });
            }

            if (statsResult.status === 'fulfilled' && (statsResult.value.success || statsResult.value.status === 'success')) {
                result.stats = statsResult.value.data;
                console.log('✅ Stats добавлены в result:', !!result.stats);
            } else {
                console.error('❌ Stats запрос неудачен:', {
                    status: statsResult.status,
                    value: statsResult.status === 'fulfilled' ? statsResult.value : null,
                    reason: statsResult.status === 'rejected' ? statsResult.reason : null
                });
            }

            console.log('📦 Финальный result getBatchData:', {
                hasProfile: !!result.profile,
                hasAchievements: !!result.achievements,
                hasLeaderboard: !!result.leaderboard,
                hasStats: !!result.stats,
                keys: Object.keys(result)
            });

            console.log('✅ Пакетные данные загружены');
            return result;

        } catch (error) {
            console.error('❌ Ошибка загрузки пакетных данных:', error);
            throw error;
        }
    }

    // =========================================================================
    // УТИЛИТЫ
    // =========================================================================

    public getConnectionStatus(): 'online' | 'offline' | 'slow' {
        if (!navigator.onLine) return 'offline';

        // Простая проверка скорости соединения
        const connection = (navigator as any).connection;
        if (connection) {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                return 'slow';
            }
        }

        return 'online';
    }

    public getCacheInfo(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    // =========================================================================
    // МЕТОДЫ ДЛЯ МОНИТОРИНГА
    // =========================================================================

    public async healthCheck(): Promise<boolean> {
        try {
            const response = await this.makeRequest('/health');
            return response.success;
        } catch {
            return false;
        }
    }

    public async ping(): Promise<number> {
        const start = Date.now();
        try {
            await this.makeRequest('/ping');
            return Date.now() - start;
        } catch {
            return -1;
        }
    }
}

// =============================================================================
// ЭКСПОРТ SINGLETON ЭКЗЕМПЛЯРА
// =============================================================================

export const apiService = new ApiService(); 