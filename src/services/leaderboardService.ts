/**
 * Типизированный сервис управления рейтингами (LeaderboardService)
 * Обеспечивает автоматическое обновление и кэширование рейтингов
 */

import Leaderboard, { type ILeaderboard, type UpdateAllResults } from '../models/Leaderboard';
import User, { type IUser, type UserRank } from '../models/User';

// Типы для периодов лидерборда
type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

// Интерфейс для статуса сервиса
export interface ServiceStatus {
    isRunning: boolean;
    isUpdating: boolean;
    lastUpdateTime: Date | null;
    updateIntervalMs: number;
    nextUpdateIn: number | null;
}

// Интерфейс для данных пользователя в рейтинге
export interface LeaderboardUserData {
    rank: number;
    isCurrentUser: boolean;
    name: string;
    score: number;
    userRank: UserRank;
}

// Интерфейс для результата получения рейтинга
export interface LeaderboardResult {
    leaderboard: LeaderboardUserData[];
    currentUser: LeaderboardUserData | null;
    cached: boolean;
    fallback?: boolean;
    updatedAt?: Date;
}

// Интерфейс для фильтра даты MongoDB
interface DateFilter {
    lastVisit?: {
        $gte: Date;
    };
}

// Интерфейс для lean документа пользователя
interface UserLeanDocument {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    nickname?: string;
    stats: {
        totalScore: number;
    };
    rank: UserRank;
}

class LeaderboardService {
    private updateInterval: NodeJS.Timeout | null = null;
    private isUpdating: boolean = false;
    private lastUpdateTime: Date | null = null;
    private readonly updateIntervalMs: number = 10 * 60 * 1000; // 10 минут

    /**
     * Запуск службы автоматического обновления рейтингов
     */
    public start(): void {
        console.log('🚀 Запуск службы обновления рейтингов...');

        // Первое обновление сразу при старте
        this.updateLeaderboards();

        // Настройка периодического обновления
        this.updateInterval = setInterval(() => {
            this.updateLeaderboards();
        }, this.updateIntervalMs);

        console.log(`✅ Служба рейтингов запущена (интервал: ${this.updateIntervalMs / 1000}с)`);
    }

    /**
     * Остановка службы
     */
    public stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('🛑 Служба обновления рейтингов остановлена');
        }
    }

    /**
     * Обновление всех рейтингов
     */
    public async updateLeaderboards(): Promise<UpdateAllResults> {
        if (this.isUpdating) {
            console.log('⏳ Обновление рейтингов уже в процессе...');
            return {};
        }

        this.isUpdating = true;
        const startTime = Date.now();

        try {
            console.log('🔄 Начинаем обновление рейтингов...');

            // Сначала очищаем старые записи
            await Leaderboard.cleanupOldEntries();

            // Обновляем все рейтинги
            const results = await Leaderboard.updateAllLeaderboards();

            this.lastUpdateTime = new Date();
            const duration = Date.now() - startTime;

            console.log(`✅ Рейтинги обновлены за ${duration}мс`);
            return results;
        } catch (error) {
            console.error('❌ Ошибка при обновлении рейтингов:', error);
            throw error;
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Принудительное обновление рейтинга для конкретного периода
     */
    public async forceUpdatePeriod(period: LeaderboardPeriod): Promise<number> {
        try {
            console.log(`🔄 Принудительное обновление рейтинга: ${period}`);
            const count = await Leaderboard.updatePeriodLeaderboard(period);
            console.log(`✅ Обновлено записей: ${count}`);
            return count;
        } catch (error) {
            console.error(`❌ Ошибка принудительного обновления рейтинга ${period}:`, error);
            throw error;
        }
    }

    /**
     * Получение статуса службы
     */
    public getStatus(): ServiceStatus {
        return {
            isRunning: !!this.updateInterval,
            isUpdating: this.isUpdating,
            lastUpdateTime: this.lastUpdateTime,
            updateIntervalMs: this.updateIntervalMs,
            nextUpdateIn: this.updateInterval ?
                Math.max(0, this.updateIntervalMs - (Date.now() - (this.lastUpdateTime?.getTime() || 0))) :
                null
        };
    }

    /**
     * Получение рейтинга с fallback на старую систему
     */
    public async getLeaderboard(
        period: LeaderboardPeriod = 'all',
        limit: number = 20,
        currentUserId: string | null = null
    ): Promise<LeaderboardResult> {
        try {
            // Пытаемся получить из кэша
            const cachedLeaderboard = await Leaderboard.getLeaderboard(period, limit);

            if (cachedLeaderboard && cachedLeaderboard.length > 0) {
                console.log(`📊 Получен кэшированный рейтинг ${period} (${cachedLeaderboard.length} записей)`);

                // Ищем текущего пользователя в рейтинге
                let currentUserData: LeaderboardUserData | null = null;
                const currentUserInTop = cachedLeaderboard.find(entry => entry.userId === currentUserId);

                if (currentUserInTop) {
                    currentUserData = {
                        rank: currentUserInTop.rank,
                        isCurrentUser: true,
                        name: currentUserInTop.username,
                        score: currentUserInTop.score,
                        userRank: currentUserInTop.userRank
                    };
                } else if (currentUserId) {
                    // Ищем пользователя в полном рейтинге
                    const userPosition = await Leaderboard.getUserPosition(currentUserId, period);
                    if (userPosition) {
                        currentUserData = {
                            rank: userPosition.rank,
                            isCurrentUser: true,
                            name: userPosition.username,
                            score: userPosition.score,
                            userRank: userPosition.userRank
                        };
                    }
                }

                // Форматируем данные для frontend
                const formattedLeaderboard: LeaderboardUserData[] = cachedLeaderboard.map(entry => ({
                    rank: entry.rank,
                    isCurrentUser: entry.userId === currentUserId,
                    name: entry.username,
                    score: entry.score,
                    userRank: entry.userRank
                }));

                return {
                    leaderboard: formattedLeaderboard,
                    currentUser: currentUserData,
                    cached: true,
                    updatedAt: cachedLeaderboard[0]?.updatedAt
                };
            } else {
                console.log(`📊 Кэш пуст для ${period}, используем fallback`);
                return await this.getFallbackLeaderboard(period, limit, currentUserId);
            }
        } catch (error) {
            console.error(`❌ Ошибка получения рейтинга ${period}, используем fallback:`, error);
            return await this.getFallbackLeaderboard(period, limit, currentUserId);
        }
    }

    /**
     * Fallback - получение рейтинга из коллекции users (старая система)
     */
    private async getFallbackLeaderboard(
        period: LeaderboardPeriod = 'all',
        limit: number = 20,
        currentUserId: string | null = null
    ): Promise<LeaderboardResult> {
        console.log(`🔄 Генерация fallback рейтинга для периода: ${period}`);

        let dateFilter: DateFilter = {};
        const now = new Date();

        // Настраиваем фильтр по периоду
        if (period === 'day') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            dateFilter = { lastVisit: { $gte: yesterday } };
        } else if (period === 'week') {
            const lastWeek = new Date(now);
            lastWeek.setDate(lastWeek.getDate() - 7);
            dateFilter = { lastVisit: { $gte: lastWeek } };
        } else if (period === 'month') {
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateFilter = { lastVisit: { $gte: lastMonth } };
        }

        // Получаем топ игроков
        const topUsers = await User.find(dateFilter)
            .sort({ 'stats.totalScore': -1 })
            .limit(limit)
            .select('telegramId firstName lastName username nickname stats.totalScore rank')
            .lean() as UserLeanDocument[];

        // Форматируем результаты
        const leaderboard: LeaderboardUserData[] = topUsers.map((user, index) => {
            const displayName = this.formatUserDisplayName(user);

            return {
                rank: index + 1,
                isCurrentUser: user.telegramId === currentUserId,
                name: displayName,
                score: user.stats.totalScore,
                userRank: user.rank
            };
        });

        // Ищем текущего пользователя, если он не в топе
        let currentUserData: LeaderboardUserData | null = null;
        const currentUserInTop = leaderboard.find(entry => entry.isCurrentUser);

        if (!currentUserInTop && currentUserId) {
            const user = await User.findOne({ telegramId: currentUserId }).lean() as UserLeanDocument | null;
            if (user) {
                const higherScoreCount = await User.countDocuments({
                    'stats.totalScore': { $gt: user.stats.totalScore },
                    ...dateFilter
                });

                const displayName = this.formatUserDisplayName(user);

                currentUserData = {
                    rank: higherScoreCount + 1,
                    isCurrentUser: true,
                    name: displayName,
                    score: user.stats.totalScore,
                    userRank: user.rank
                };
            }
        }

        return {
            leaderboard,
            currentUser: currentUserData,
            cached: false,
            fallback: true
        };
    }

    /**
     * Форматирование отображаемого имени пользователя
     */
    private formatUserDisplayName(user: UserLeanDocument): string {
        return user.nickname ||
            (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                (user.username || `Игрок ${user.telegramId.slice(-4)}`));
    }
}

// Создаем единственный экземпляр службы
const leaderboardService = new LeaderboardService();

export default leaderboardService;
module.exports = leaderboardService; 