const Leaderboard = require('../models/Leaderboard');

class LeaderboardService {
    constructor() {
        this.updateInterval = null;
        this.isUpdating = false;
        this.lastUpdateTime = null;
        this.updateIntervalMs = 10 * 60 * 1000; // 10 минут
    }

    /**
     * Запуск службы автоматического обновления рейтингов
     */
    start() {
        
        // Первое обновление сразу при старте
        this.updateLeaderboards();

        // Настройка периодического обновления
        this.updateInterval = setInterval(() => {
            this.updateLeaderboards();
        }, this.updateIntervalMs);

    }

    /**
     * Остановка службы
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            
        }
    }

    /**
     * Обновление всех рейтингов
     */
    async updateLeaderboards() {
        if (this.isUpdating) {
            
            return;
        }

        this.isUpdating = true;
        const startTime = Date.now();

        try {
            
            // Сначала очищаем старые записи
            await Leaderboard.cleanupOldEntries();

            // Обновляем все рейтинги
            const results = await Leaderboard.updateAllLeaderboards();

            this.lastUpdateTime = new Date();
            const duration = Date.now() - startTime;

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
    async forceUpdatePeriod(period) {
        try {
            
            const count = await Leaderboard.updatePeriodLeaderboard(period);
            
            return count;
        } catch (error) {
            console.error(`❌ Ошибка принудительного обновления рейтинга ${period}:`, error);
            throw error;
        }
    }

    /**
     * Получение статуса службы
     */
    getStatus() {
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
    async getLeaderboard(period = 'all', limit = 20, currentUserId = null) {
        try {
            // Пытаемся получить из кэша
            const cachedLeaderboard = await Leaderboard.getLeaderboard(period, limit);

            if (cachedLeaderboard && cachedLeaderboard.length > 0) {
                
                // Ищем текущего пользователя в рейтинге
                let currentUserData = null;
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
                const formattedLeaderboard = cachedLeaderboard.map(entry => ({
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
    async getFallbackLeaderboard(period = 'all', limit = 20, currentUserId = null) {
        
        const User = require('../models/User');

        let dateFilter = {};
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
            .lean();

        // Форматируем результаты
        const leaderboard = topUsers.map((user, index) => {
            const displayName = user.nickname ||
                (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                    (user.username || `Игрок ${user.telegramId.slice(-4)}`));

            return {
                rank: index + 1,
                isCurrentUser: user.telegramId === currentUserId,
                name: displayName,
                score: user.stats.totalScore,
                userRank: user.rank
            };
        });

        // Ищем текущего пользователя, если он не в топе
        let currentUserData = null;
        const currentUserInTop = leaderboard.find(entry => entry.isCurrentUser);

        if (!currentUserInTop && currentUserId) {
            const user = await User.findOne({ telegramId: currentUserId });
            if (user) {
                const higherScoreCount = await User.countDocuments({
                    'stats.totalScore': { $gt: user.stats.totalScore },
                    ...dateFilter
                });

                const displayName = user.nickname ||
                    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() :
                        (user.username || `Игрок ${user.telegramId.slice(-4)}`));

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
}

// Создаем единственный экземпляр службы
const leaderboardService = new LeaderboardService();

module.exports = leaderboardService; 