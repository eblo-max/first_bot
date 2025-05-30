/**
 * 🔄 МИГРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ К НОВОЙ СИСТЕМЕ
 * 
 * Этот скрипт обновляет существующих пользователей:
 * - Добавляет новые поля репутации
 * - Пересчитывает статистику
 * - Мигрирует старые ранги к новым
 * - Добавляет достижения за уже выполненные действия
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

// Подключение к MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Подключение к MongoDB установлено');
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
}

// Маппинг старых рангов к новым
const rankMapping = {
    'НОВИЧОК': 'СТАЖЕР',
    'ДЕТЕКТИВ': 'ДЕТЕКТИВ',
    'ИНСПЕКТОР': 'ИНСПЕКТОР',
    'СЛЕДОВАТЕЛЬ': 'СЛЕДОВАТЕЛЬ',
    'ЭКСПЕРТ': 'КОМИССАР',
    'КРИМИНАЛИСТ': 'ГЛАВНЫЙ_ИНСПЕКТОР'
};

// Основная функция миграции
async function migrateUsers() {
    try {
        console.log('🚀 Начало миграции пользователей...');

        // Получаем всех пользователей
        const users = await User.find({}).lean();
        console.log(`📊 Найдено пользователей: ${users.length}`);

        let migrated = 0;
        let errors = 0;

        for (const userData of users) {
            try {
                console.log(`🔄 Мигрируем пользователя: ${userData.username || userData.telegramId}`);

                // Получаем пользователя как полный объект (не lean)
                const user = await User.findById(userData._id);

                if (!user) {
                    console.log(`⚠️ Пользователь ${userData.telegramId} не найден`);
                    continue;
                }

                let needsUpdate = false;

                // === 1. МИГРАЦИЯ РАНГА ===
                if (rankMapping[user.rank]) {
                    console.log(`  📈 Обновляем ранг: ${user.rank} → ${rankMapping[user.rank]}`);
                    user.rank = rankMapping[user.rank];
                    needsUpdate = true;
                }

                // === 2. ИНИЦИАЛИЗАЦИЯ РЕПУТАЦИИ ===
                if (!user.reputation || !user.reputation.level) {
                    console.log(`  ⭐ Инициализируем репутацию`);
                    user.reputation = {
                        level: 50,
                        category: 'ОБЫЧНЫЙ',
                        accuracy: 0,
                        speed: 0,
                        consistency: 0,
                        difficulty: 0
                    };
                    needsUpdate = true;
                }

                // === 3. ИНИЦИАЛИЗАЦИЯ НОВЫХ ПОЛЕЙ СТАТИСТИКИ ===
                if (!user.stats.perfectGames) {
                    console.log(`  📊 Инициализируем новые поля статистики`);

                    // Подсчет идеальных игр из истории
                    user.stats.perfectGames = user.gameHistory.filter(game =>
                        game.correctAnswers === game.totalQuestions
                    ).length;

                    // Инициализация времени
                    user.stats.averageTime = user.stats.averageTime || 0;
                    user.stats.fastestGame = user.stats.fastestGame || 0;

                    // Инициализация ежедневной активности
                    user.stats.dailyStreakCurrent = user.stats.dailyStreakCurrent || 0;
                    user.stats.dailyStreakBest = user.stats.dailyStreakBest || 0;
                    user.stats.lastActiveDate = user.stats.lastActiveDate || user.lastVisit || new Date();

                    // Инициализация игр по сложности
                    user.stats.easyGames = user.stats.easyGames || 0;
                    user.stats.mediumGames = user.stats.mediumGames || user.stats.investigations || 0; // все старые игры как medium
                    user.stats.hardGames = user.stats.hardGames || 0;
                    user.stats.expertGames = user.stats.expertGames || 0;

                    needsUpdate = true;
                }

                // === 4. ИНИЦИАЛИЗАЦИЯ НАГРАД ===
                if (!user.rewards) {
                    console.log(`  🎁 Инициализируем систему наград`);
                    user.rewards = {
                        experienceBonus: 1.0,
                        reputationBonus: 1.0,
                        nextRankProgress: 0
                    };
                    needsUpdate = true;
                }

                // === 5. ОБНОВЛЕНИЕ СТРУКТУРЫ ДОСТИЖЕНИЙ ===
                const oldAchievements = user.achievements || [];
                const updatedAchievements = oldAchievements.map(achievement => {
                    if (!achievement.category) {
                        return {
                            ...achievement.toObject(),
                            category: 'ПРОГРЕСС',
                            rarity: 'ОБЫЧНОЕ',
                            progress: {
                                current: 1,
                                target: 1
                            }
                        };
                    }
                    return achievement;
                });

                if (updatedAchievements.length !== oldAchievements.length ||
                    !oldAchievements.every(a => a.category)) {
                    console.log(`  🏅 Обновляем структуру достижений`);
                    user.achievements = updatedAchievements;
                    needsUpdate = true;
                }

                // === 6. ОБНОВЛЕНИЕ ИСТОРИИ ИГР ===
                if (user.gameHistory && user.gameHistory.length > 0) {
                    const updatedHistory = user.gameHistory.map(game => {
                        if (!game.difficulty) {
                            return {
                                ...game.toObject(),
                                difficulty: 'MEDIUM',
                                perfectGame: game.correctAnswers === game.totalQuestions,
                                timeSpent: game.timeSpent || 0,
                                reputationGained: 0
                            };
                        }
                        return game;
                    });

                    if (!user.gameHistory.every(g => g.difficulty)) {
                        console.log(`  📈 Обновляем историю игр`);
                        user.gameHistory = updatedHistory;
                        needsUpdate = true;
                    }
                }

                // === 7. ПЕРЕСЧЕТ РЕПУТАЦИИ И РАНГОВ ===
                if (needsUpdate) {
                    console.log(`  🔢 Пересчитываем репутацию и прогресс`);

                    // Базовый пересчет репутации
                    user.reputation.accuracy = Math.min(100, user.stats.accuracy * 1.2);
                    user.reputation.consistency = Math.min(100, user.stats.winStreak * 8 + user.stats.investigations * 0.5);
                    user.reputation.difficulty = user.stats.mediumGames > 0 ? 25 : 0;
                    user.reputation.speed = 0; // будет обновляться при новых играх

                    const totalReputation = (
                        user.reputation.accuracy * 0.35 +
                        user.reputation.speed * 0.25 +
                        user.reputation.consistency * 0.25 +
                        user.reputation.difficulty * 0.15
                    );

                    user.reputation.level = Math.round(Math.max(0, Math.min(100, totalReputation)));

                    // Определение категории репутации
                    if (user.reputation.level >= 90) user.reputation.category = 'ЛЕГЕНДАРНЫЙ';
                    else if (user.reputation.level >= 75) user.reputation.category = 'ЭЛИТНЫЙ';
                    else if (user.reputation.level >= 60) user.reputation.category = 'УВАЖАЕМЫЙ';
                    else if (user.reputation.level >= 30) user.reputation.category = 'ОБЫЧНЫЙ';
                    else user.reputation.category = 'КРИТИКУЕМЫЙ';

                    // Обновление ранга и прогресса
                    user.updateRank();

                    // Проверка достижений за уже выполненные действия
                    user.checkAchievements();
                }

                // === 8. СОХРАНЕНИЕ ===
                if (needsUpdate) {
                    await user.save();
                    migrated++;
                    console.log(`  ✅ Пользователь ${user.username || user.telegramId} успешно мигрирован`);
                    console.log(`     - Ранг: ${user.rank}`);
                    console.log(`     - Репутация: ${user.reputation.level} (${user.reputation.category})`);
                    console.log(`     - Достижений: ${user.achievements.length}`);
                } else {
                    console.log(`  ⏭️ Пользователь ${user.username || user.telegramId} уже актуален`);
                }

            } catch (error) {
                errors++;
                console.error(`❌ Ошибка миграции пользователя ${userData.telegramId}:`, error.message);
            }
        }

        console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА!');
        console.log(`✅ Успешно мигрировано: ${migrated}`);
        console.log(`❌ Ошибок: ${errors}`);
        console.log(`📊 Всего пользователей: ${users.length}`);

    } catch (error) {
        console.error('❌ Критическая ошибка миграции:', error);
    } finally {
        await mongoose.disconnect();
        console.log('💾 Подключение к MongoDB закрыто');
    }
}

// Запуск миграции
async function main() {
    console.log('🔄 МИГРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ К НОВОЙ СИСТЕМЕ РЕПУТАЦИИ И ДОСТИЖЕНИЙ');
    console.log('=' * 70);

    await connectDB();
    await migrateUsers();

    process.exit(0);
}

// Запуск только если файл вызван напрямую
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { migrateUsers, connectDB }; 