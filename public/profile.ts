/**
 * Criminal Trust - Основной модуль профиля на TypeScript
 * Объединяет все модули для работы с профилем пользователя
 */

import type {
    User,
    Achievement,
    ProfileState,
    LeaderboardPeriod,
    LeaderboardData,
    TelegramWebApp,
    CriminalEffects,
    BloodParticle
} from './types/profile-types.js';

import {
    PROFILE_CONFIG,
    getRankByLevel,
    calculateLevel,
    calculateXP,
    getXPProgress,
    getMaxXPForLevel
} from './modules/profile-config.js';

import { authService } from './modules/auth-service.js';
import { apiService } from './modules/api-service.js';
import { achievementSystem } from './achievement-system.js';

// =============================================================================
// ГЛАВНЫЙ КЛАСС ПРОФИЛЯ
// =============================================================================

export class CriminalTrustProfile {
    private state: ProfileState;
    private isInitialized = false;
    private effectsInterval: number | null = null;
    private updateInterval: number | null = null;

    constructor() {
        // Инициализируем состояние
        this.state = {
            user: null,
            achievements: [] as any[],
            leaderboard: {
                current: 'day',
                data: {} as Record<LeaderboardPeriod, LeaderboardData>
            },
            isLoading: false,
            criminalEffects: {
                glitchActive: false,
                bloodParticles: [],
                scanEffect: false,
                atmosphericEffects: false
            }
        };

        // Инициализируем систему достижений
        this.initAchievementSystem();

        this.init();
    }

    private async initAchievementSystem(): Promise<void> {
        try {
            await achievementSystem.init();
            console.log('🏆 Система достижений инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации системы достижений:', error);
        }
    }

    // =========================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // =========================================================================

    private async init(): Promise<void> {
        try {
            console.log('🚀 Инициализация Criminal Trust Profile...');

            // Настраиваем Telegram WebApp
            this.setupTelegramApp();

            // Настраиваем DOM и события
            this.setupDOM();

            // Инициализируем эффекты
            this.initCriminalEffects();

            // Выполняем аутентификацию
            await this.authenticate();

            // Загружаем данные профиля
            await this.loadProfileData();

            // Настраиваем периодические обновления
            this.startPeriodicUpdates();

            this.isInitialized = true;
            console.log('✅ Profile инициализирован успешно');

        } catch (error) {
            console.error('❌ Ошибка инициализации профиля:', error);
            this.showError('Ошибка загрузки профиля');
        }
    }

    private setupTelegramApp(): void {
        const tg = authService.getTelegramApp();
        if (tg) {
            // Применяем тему
            authService.applyTelegramTheme();

            // Настраиваем кнопку "Назад"
            authService.setupBackButton(() => {
                console.log('🔙 Переход в главное меню');
                window.location.href = '/';
            });

            console.log('📱 Telegram WebApp настроен');
        }
    }

    private setupDOM(): void {
        // Проверяем наличие необходимых DOM элементов
        if (!this.checkDOMElements()) {
            throw new Error('Необходимые DOM элементы не найдены');
        }

        // Настраиваем вкладки лидерборда
        this.initLeaderboardTabs();

        // Добавляем обработчики событий
        this.setupEventListeners();

        console.log('🎯 DOM настроен');
    }

    // =========================================================================
    // АУТЕНТИФИКАЦИЯ
    // =========================================================================

    private async authenticate(): Promise<void> {
        console.log('🔐 Выполняем аутентификацию...');
        this.setLoading(true);

        try {
            const authResult = await authService.authenticate();

            if (authResult.success && authResult.user) {
                console.log('✅ Аутентификация успешна');
                this.state.user = authResult.user;
            } else {
                throw new Error(authResult.error || 'Ошибка аутентификации');
            }
        } catch (error) {
            console.error('❌ Ошибка аутентификации:', error);
            this.showAuthError();
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    // =========================================================================
    // ЗАГРУЗКА ДАННЫХ
    // =========================================================================

    private async loadProfileData(): Promise<void> {
        console.log('📊 Загружаем данные профиля...');
        this.setLoading(true);

        try {
            // Показываем скелетон
            this.showProfileSkeleton();

            // Загружаем все данные параллельно
            console.log('🔄 Вызываем getBatchData...');
            const batchData = await apiService.getBatchData();
            console.log('📦 Получили batchData:', batchData);

            // Обновляем профиль
            if (batchData.profile) {
                console.log('✅ Найден profile в batchData, обновляем UI...');
                this.state.user = batchData.profile;
                this.updateProfileUI(batchData.profile);
            } else {
                console.error('❌ НЕТ ДАННЫХ ПРОФИЛЯ в batchData!', { batchData });
                // Попробуем загрузить профиль напрямую
                console.log('🔄 Пробуем загрузить профиль напрямую...');
                const profileResult = await apiService.getUserProfile();
                console.log('👤 Прямой запрос профиля:', profileResult);

                if (profileResult.success && profileResult.data) {
                    console.log('✅ Получили профиль напрямую, обновляем UI...');
                    this.state.user = profileResult.data;
                    this.updateProfileUI(profileResult.data);
                }
            }

            // Обновляем достижения
            if (batchData.achievements) {
                console.log('📊 Получены данные достижений:', batchData.achievements);

                // API возвращает объект {unlocked: [], available: [], progress: {}}
                let allAchievements: any[] = [];
                const achievementsData = batchData.achievements as any;

                // Обрабатываем разблокированные достижения (из user.achievements в базе)
                if (achievementsData.unlocked && Array.isArray(achievementsData.unlocked)) {
                    console.log('🔓 Обрабатываем разблокированные достижения:', achievementsData.unlocked.length);

                    allAchievements = [...allAchievements, ...achievementsData.unlocked.map((ach: any) => {
                        const achievementInfo = this.getAchievementInfo(ach.id);

                        return {
                            id: ach.id,
                            name: ach.name || achievementInfo.name,
                            description: ach.description || achievementInfo.description,
                            category: this.mapBackendCategoryToFrontend(ach.category) || achievementInfo.category,
                            icon: achievementInfo.icon,
                            rarity: this.mapBackendRarityToFrontend(ach.rarity) || achievementInfo.rarity,
                            isUnlocked: true,
                            progress: 100,
                            unlockedAt: ach.unlockedAt ? new Date(ach.unlockedAt) : undefined
                        };
                    })];
                }

                // Обрабатываем доступные достижения (генерируемые в generateAvailableAchievements)
                if (achievementsData.available && Array.isArray(achievementsData.available)) {
                    console.log('🔒 Обрабатываем доступные достижения:', achievementsData.available.length);

                    allAchievements = [...allAchievements, ...achievementsData.available.map((ach: any) => {
                        const achievementInfo = this.getAchievementInfo(ach.id);
                        const progress = ach.progress ? Math.min(Math.round((ach.progress.current / ach.progress.target) * 100), 99) : 0;

                        return {
                            id: ach.id,
                            name: ach.name || achievementInfo.name,
                            description: ach.description || achievementInfo.description,
                            category: this.mapBackendCategoryToFrontend(ach.category) || achievementInfo.category,
                            icon: achievementInfo.icon,
                            rarity: achievementInfo.rarity,
                            isUnlocked: false,
                            progress: progress,
                            progressData: ach.progress
                        };
                    })];
                }

                // Добавляем прочие достижения из системы как заблокированные
                const unlockedIds = allAchievements.map(a => a.id);
                const allPossibleAchievements = this.getAllPossibleAchievements();

                allPossibleAchievements.forEach(achievementInfo => {
                    if (!unlockedIds.includes(achievementInfo.id)) {
                        allAchievements.push({
                            id: achievementInfo.id,
                            name: achievementInfo.name,
                            description: achievementInfo.description,
                            category: achievementInfo.category,
                            icon: achievementInfo.icon,
                            rarity: achievementInfo.rarity,
                            isUnlocked: false,
                            progress: 0
                        });
                    }
                });

                // Сортируем достижения: разблокированные сначала, затем по прогрессу
                allAchievements.sort((a, b) => {
                    if (a.isUnlocked && !b.isUnlocked) return -1;
                    if (!a.isUnlocked && b.isUnlocked) return 1;
                    if (!a.isUnlocked && !b.isUnlocked) {
                        return (b.progress || 0) - (a.progress || 0);
                    }
                    return 0;
                });

                console.log('🏆 Сформирован финальный массив достижений:', allAchievements.length);
                console.log('📊 Статистика достижений:', {
                    unlocked: allAchievements.filter(a => a.isUnlocked).length,
                    locked: allAchievements.filter(a => !a.isUnlocked).length,
                    total: allAchievements.length
                });

                this.state.achievements = allAchievements;
                this.renderAchievements(allAchievements);
            } else {
                console.log('❌ Нет данных достижений или неправильный формат');
                // Показываем базовые достижения как заблокированные
                const baseAchievements = this.getAllPossibleAchievements().map(info => ({
                    ...info,
                    isUnlocked: false,
                    progress: 0
                }));

                this.state.achievements = baseAchievements;
                this.renderAchievements(baseAchievements);
            }

            // Обновляем лидерборд
            if (batchData.leaderboard) {
                this.state.leaderboard.data[this.state.leaderboard.current] = batchData.leaderboard;
                this.renderLeaderboard(batchData.leaderboard);
            }

            // Загружаем аватар пользователя
            if (this.state.user?.telegramId) {
                await this.loadUserAvatar(this.state.user.telegramId);
            }

            console.log('✅ Данные профиля загружены');

        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.showError('Не удалось загрузить данные профиля');
        } finally {
            this.hideProfileSkeleton();
            this.setLoading(false);
        }
    }

    // =========================================================================
    // ОБНОВЛЕНИЕ UI
    // =========================================================================

    private updateProfileUI(user: User): void {
        try {
            console.log('🎯 Обновляем UI профиля с данными:', user);
            console.log('📊 Извлеченные данные:', {
                name: this.getUserDisplayName(user),
                totalScore: user.totalScore || 0,
                gamesPlayed: user.gamesPlayed || 0,
                accuracy: user.accuracy || 0,
                telegramId: user.telegramId,
                winStreak: user.winStreak || 0
            });

            // Основная информация
            this.updateElement('user-name', this.getUserDisplayName(user));
            this.updateElement('user-id', user.telegramId?.toString() || '—');
            this.updateElement('user-total-score', (user.totalScore || 0).toLocaleString());
            this.updateElement('user-games-played', (user.gamesPlayed || 0).toString());
            this.updateElement('user-accuracy', `${Math.round(user.accuracy || 0)}%`);

            // Серия успехов
            this.updateElement('stat-streak', (user.winStreak || 0).toString());

            // Уровень и опыт
            const totalScore = user.totalScore || 0;
            const level = calculateLevel(totalScore);
            const xpProgress = getXPProgress(totalScore, level);
            const rank = getRankByLevel(level);

            console.log('📈 Рассчитанные значения:', { totalScore, level, xpProgress, rank });

            this.updateElement('user-level', level.toString());

            // Обновляем XP информацию
            this.updateElement('current-xp', calculateXP(totalScore, level).toString());
            this.updateElement('max-xp', getMaxXPForLevel(level).toString());

            // Обновляем ранговый дисплей
            this.updateRankDisplay(level, rank);

            // Загружаем аватар пользователя
            if (user.telegramId) {
                this.loadUserAvatar(user.telegramId);
            }

            console.log('🎯 UI профиля обновлен');
        } catch (error) {
            console.error('❌ Ошибка обновления UI:', error);
        }
    }

    private animateXPBar(percentage: number): void {
        const xpBar = document.querySelector('.xp-progress-fill') as HTMLElement;
        if (!xpBar) return;

        xpBar.style.width = '0%';

        setTimeout(() => {
            xpBar.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            xpBar.style.width = `${Math.min(percentage, 100)}%`;
        }, 100);
    }

    // =========================================================================
    // ДОСТИЖЕНИЯ
    // =========================================================================

    private renderAchievements(achievements: any[]): void {
        console.log('🏆 Рендеринг достижений через новую систему:', achievements.length);

        // Обновляем данные в системе достижений
        const userAchievements = achievements
            .filter(ach => ach.isUnlocked)
            .map(ach => ach.id);

        // Обновляем статус достижений в системе
        achievementSystem.updateUserAchievements(userAchievements);

        // Рендерим через новую систему
        achievementSystem.renderEnhancedAchievements(userAchievements);

        // Обновляем счетчик достижений
        const achievementsCount = document.getElementById('achievements-count');
        if (achievementsCount) {
            const unlockedCount = achievements.filter(a => a.isUnlocked).length;
            achievementsCount.textContent = unlockedCount.toString();
            console.log(`🏆 Обновлен счетчик достижений: ${unlockedCount}/${achievements.length}`);
        }

        console.log(`🏆 Отрендерено ${achievements.length} достижений через AchievementSystem`);
    }

    // =========================================================================
    // ЛИДЕРБОРД
    // =========================================================================

    private initLeaderboardTabs(): void {
        const tabs = document.querySelectorAll('.leaderboard-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', async (e) => {
                e.preventDefault();

                const period = tab.getAttribute('data-period') as LeaderboardPeriod;
                if (period) {
                    await this.switchLeaderboardPeriod(period);
                }
            });
        });
    }

    private async switchLeaderboardPeriod(period: LeaderboardPeriod): Promise<void> {
        if (this.state.leaderboard.current === period) return;

        this.state.leaderboard.current = period;

        // Обновляем активную вкладку
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-period="${period}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Загружаем данные для выбранного периода
        this.showLeaderboardSkeleton();

        try {
            const response = await apiService.getLeaderboard(period);
            if (response.success && response.data) {
                this.state.leaderboard.data[period] = response.data;
                this.renderLeaderboard(response.data);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки лидерборда:', error);
            this.renderEmptyLeaderboard();
        }
    }

    private renderLeaderboard(data: any): void {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        console.log('🏆 Рендеринг лидерборда с данными:', data);

        // Обрабатываем данные в зависимости от структуры ответа
        let users = [];
        if (data.totalScore && Array.isArray(data.totalScore)) {
            users = data.totalScore;
        } else if (data.users && Array.isArray(data.users)) {
            users = data.users;
        } else if (Array.isArray(data)) {
            users = data;
        }

        console.log('🏆 Найдено пользователей в лидерборде:', users.length);

        if (!users || users.length === 0) {
            this.renderEmptyLeaderboard();
            return;
        }

        const html = users.map((entry: any, index: number) => {
            // Определяем уровень и ранг
            const userScore = entry.stats?.totalScore || entry.score || 0;
            const level = calculateLevel(userScore);
            const rank = getRankByLevel(level);
            const isCurrentUser = this.state.user &&
                (entry.telegramId === this.state.user.telegramId ||
                    entry.user?.telegramId === this.state.user.telegramId);

            // Определяем имя пользователя
            const userName = entry.name ||
                this.getUserDisplayName(entry.user || entry) ||
                'Детектив';

            return `
                <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                    <div class="position">#${entry.rank || index + 1}</div>
                    <div class="user-info">
                        <div class="user-avatar">
                            <img src="/api/user/avatar/${entry.telegramId || entry.user?.telegramId}" 
                                 alt="Avatar" 
                                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
                                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"40\\" fill=\\"%23333\\"/></svg>'">
                        </div>
                        <div class="user-details">
                            <div class="user-name">${userName}</div>
                            <div class="user-rank" style="color: ${rank.color}; font-size: 12px;">
                                ${rank.icon} ${rank.name}
                            </div>
                        </div>
                    </div>
                    <div class="user-stats">
                        <div class="score" style="font-weight: bold;">${userScore.toLocaleString()}</div>
                        <div class="accuracy" style="font-size: 12px; color: #888;">Ур. ${level}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Обновляем позицию текущего пользователя
        this.updateUserPosition({
            userPosition: this.findUserPosition(users),
            totalUsers: data.total || users.length
        });
    }

    private findUserPosition(users: any[]): number | null {
        if (!this.state.user) return null;

        const userPosition = users.findIndex(entry =>
            entry.telegramId === this.state.user?.telegramId ||
            entry.user?.telegramId === this.state.user?.telegramId
        );

        return userPosition >= 0 ? userPosition + 1 : null;
    }

    // =========================================================================
    // КРИМИНАЛЬНЫЕ ЭФФЕКТЫ
    // =========================================================================

    private initCriminalEffects(): void {
        // Создаем контейнер для эффектов
        let effectsContainer = document.getElementById('criminal-effects');
        if (!effectsContainer) {
            effectsContainer = document.createElement('div');
            effectsContainer.id = 'criminal-effects';
            effectsContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            `;
            document.body.appendChild(effectsContainer);
        }

        // Запускаем периодические эффекты
        this.startPeriodicCriminalEffects();

        console.log('🎭 Криминальные эффекты инициализированы');
    }

    private startPeriodicCriminalEffects(): void {
        // Эффекты каждые 10 секунд
        this.effectsInterval = window.setInterval(() => {
            if (Math.random() > 0.7) { // 30% шанс
                this.createRandomScanEffect();
            }

            if (Math.random() > 0.9) { // 10% шанс
                this.createAtmosphericEffects();
            }
        }, 10000);
    }

    private createRandomScanEffect(): void {
        const elements = document.querySelectorAll('.achievement-card, .leaderboard-entry');
        if (elements.length === 0) return;

        const randomElement = elements[Math.floor(Math.random() * elements.length)] as HTMLElement;
        this.createScanningEffect(randomElement);
    }

    private createScanningEffect(element: HTMLElement): void {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const scanLine = document.createElement('div');
        scanLine.style.cssText = `
            position: absolute;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ff00, transparent);
            z-index: 1001;
            animation: scan 2s ease-in-out;
        `;

        const effectsContainer = document.getElementById('criminal-effects');
        if (effectsContainer) {
            effectsContainer.appendChild(scanLine);

            setTimeout(() => {
                if (scanLine.parentNode) {
                    scanLine.parentNode.removeChild(scanLine);
                }
            }, 2000);
        }
    }

    private createAtmosphericEffects(): void {
        // Создаем несколько частиц крови
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createBloodParticle();
            }, i * 100);
        }
    }

    private createBloodParticle(): void {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 2;
        const x = Math.random() * window.innerWidth;
        const y = -10;

        particle.style.cssText = `
            position: absolute;
            top: ${y}px;
            left: ${x}px;
            width: ${size}px;
            height: ${size}px;
            background: #8B0000;
            border-radius: 50%;
            pointer-events: none;
            z-index: 999;
        `;

        const effectsContainer = document.getElementById('criminal-effects');
        if (effectsContainer) {
            effectsContainer.appendChild(particle);

            // Анимация падения
            let currentY = y;
            const gravity = 0.5;
            let velocity = 0;

            const animate = () => {
                velocity += gravity;
                currentY += velocity;
                particle.style.top = `${currentY}px`;

                if (currentY < window.innerHeight + 10) {
                    requestAnimationFrame(animate);
                } else {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }
            };

            requestAnimationFrame(animate);
        }
    }

    // =========================================================================
    // УТИЛИТАРНЫЕ МЕТОДЫ
    // =========================================================================

    private getAchievementIcon(category: string): string {
        const iconMap: { [key: string]: string } = {
            'progress': '📈',
            'mastery': '🎯',
            'speed': '⚡',
            'streak': '🔥',
            'special': '⭐',
            'score': '💰',
            'investigations': '🔍',
            'accuracy': '🎯',
            'default': '🏆'
        };
        return iconMap[category] || '🏆';
    }

    private getAchievementInfo(achievementId: string): {
        id: string;
        name: string;
        description: string;
        category: string;
        icon: string;
        rarity: string
    } {
        const achievementDatabase: Record<string, any> = {
            // === ПРОГРЕСС ===
            'first_case': {
                name: 'Первое дело',
                description: 'Провели первое расследование',
                category: 'progress',
                rarity: 'common'
            },
            'detective_rookie': {
                name: 'Начинающий детектив',
                description: 'Проведено 5 расследований',
                category: 'progress',
                rarity: 'common'
            },
            'detective_experienced': {
                name: 'Опытный детектив',
                description: 'Проведено 25 расследований',
                category: 'progress',
                rarity: 'common'
            },
            'detective_veteran': {
                name: 'Ветеран розыска',
                description: 'Проведено 50 расследований',
                category: 'progress',
                rarity: 'rare'
            },
            'detective_master': {
                name: 'Мастер следствия',
                description: 'Проведено 100 расследований',
                category: 'progress',
                rarity: 'rare'
            },
            'detective_legend': {
                name: 'Легенда криминалистики',
                description: 'Проведено 250 расследований',
                category: 'progress',
                rarity: 'epic'
            },
            'detective_immortal': {
                name: 'Бессмертный сыщик',
                description: 'Проведено 500 расследований',
                category: 'progress',
                rarity: 'legendary'
            },

            // === МАСТЕРСТВО ===
            'perfectionist': {
                name: 'Перфекционист',
                description: 'Точность 95%+ в 20+ играх',
                category: 'mastery',
                rarity: 'epic'
            },
            'master_detective': {
                name: 'Мастер-детектив',
                description: 'Точность 90%+ в 50+ играх',
                category: 'mastery',
                rarity: 'rare'
            },
            'perfect_5': {
                name: 'Снайпер',
                description: '5 идеальных игр',
                category: 'mastery',
                rarity: 'common'
            },
            'perfect_15': {
                name: 'Безошибочный',
                description: '15 идеальных игр',
                category: 'mastery',
                rarity: 'rare'
            },
            'perfect_50': {
                name: 'Гений дедукции',
                description: '50 идеальных игр',
                category: 'mastery',
                rarity: 'epic'
            },
            'perfect_100': {
                name: 'Шерлок Холмс',
                description: '100 идеальных игр',
                category: 'mastery',
                rarity: 'legendary'
            },

            // === СКОРОСТЬ ===
            'speed_demon': {
                name: 'Демон скорости',
                description: 'Решили дело за 30 секунд',
                category: 'speed',
                rarity: 'rare'
            },
            'lightning_fast': {
                name: 'Молниеносный',
                description: 'Решили дело за 15 секунд',
                category: 'speed',
                rarity: 'epic'
            },

            // === СЕРИИ ===
            'streak_3': {
                name: 'Удачная серия',
                description: 'Серия из 3 идеальных игр',
                category: 'streak',
                rarity: 'common'
            },
            'streak_5': {
                name: 'Горячая рука',
                description: 'Серия из 5 идеальных игр',
                category: 'streak',
                rarity: 'rare'
            },
            'streak_10': {
                name: 'Неостановимый',
                description: 'Серия из 10 идеальных игр',
                category: 'streak',
                rarity: 'epic'
            },
            'streak_20': {
                name: 'Машина правосудия',
                description: 'Серия из 20 идеальных игр',
                category: 'streak',
                rarity: 'legendary'
            },
            'daily_3': {
                name: 'Постоянство',
                description: '3 дня подряд',
                category: 'streak',
                rarity: 'common'
            },
            'daily_7': {
                name: 'Еженедельник',
                description: '7 дней подряд',
                category: 'streak',
                rarity: 'rare'
            },
            'daily_30': {
                name: 'Месячная преданность',
                description: '30 дней подряд',
                category: 'streak',
                rarity: 'epic'
            },
            'daily_100': {
                name: 'Одержимый работой',
                description: '100 дней подряд',
                category: 'streak',
                rarity: 'legendary'
            },

            // === ОЧКИ ===
            'score_1k': {
                name: 'Первая тысяча',
                description: 'Набрано 1000 очков',
                category: 'score',
                rarity: 'common'
            },
            'score_5k': {
                name: 'Пять тысяч очков',
                description: 'Набрано 5000 очков',
                category: 'score',
                rarity: 'rare'
            },
            'score_10k': {
                name: 'Десять тысяч очков',
                description: 'Набрано 10000 очков',
                category: 'score',
                rarity: 'epic'
            },
            'score_25k': {
                name: 'Четверть сотни тысяч',
                description: 'Набрано 25000 очков',
                category: 'score',
                rarity: 'legendary'
            },

            // === ОСОБЫЕ ===
            'expert_specialist': {
                name: 'Специалист экспертного уровня',
                description: 'Решили 10 дел экспертного уровня',
                category: 'special',
                rarity: 'epic'
            },
            'legendary_reputation': {
                name: 'Легендарная репутация',
                description: 'Достигли 90+ репутации',
                category: 'special',
                rarity: 'legendary'
            },
            'versatile_detective': {
                name: 'Разносторонний детектив',
                description: 'Играли во всех уровнях сложности',
                category: 'special',
                rarity: 'rare'
            },

            // === BACKEND ДОСТИЖЕНИЯ ===
            'detective_novice': {
                name: 'Детектив-новичок',
                description: 'Наберите 100 очков',
                category: 'score',
                rarity: 'common'
            },
            'detective_expert': {
                name: 'Опытный детектив',
                description: 'Наберите 1000 очков',
                category: 'score',
                rarity: 'rare'
            },
            'case_solver': {
                name: 'Решатель дел',
                description: 'Решите 10 дел',
                category: 'investigations',
                rarity: 'common'
            },
            'veteran_detective': {
                name: 'Ветеран сыска',
                description: 'Решите 50 дел',
                category: 'investigations',
                rarity: 'rare'
            }
        };

        const info = achievementDatabase[achievementId];
        if (info) {
            return {
                id: achievementId,
                name: info.name,
                description: info.description,
                category: info.category,
                icon: this.getAchievementIcon(info.category),
                rarity: info.rarity
            };
        }

        // Fallback для неизвестных достижений
        return {
            id: achievementId,
            name: 'Неизвестное достижение',
            description: 'Описание отсутствует',
            category: 'special',
            icon: this.getAchievementIcon('default'),
            rarity: 'common'
        };
    }

    private mapBackendCategoryToFrontend(backendCategory: string): string {
        const categoryMap: Record<string, string> = {
            'ПРОГРЕСС': 'progress',
            'МАСТЕРСТВО': 'mastery',
            'СКОРОСТЬ': 'speed',
            'СЕРИИ': 'streak',
            'ОСОБЫЕ': 'special',
            'score': 'score',
            'investigations': 'investigations',
            'accuracy': 'accuracy'
        };

        return categoryMap[backendCategory] || 'special';
    }

    private mapBackendRarityToFrontend(backendRarity: string): string {
        const rarityMap: Record<string, string> = {
            'ОБЫЧНОЕ': 'common',
            'РЕДКОЕ': 'rare',
            'ЭПИЧЕСКОЕ': 'epic',
            'ЛЕГЕНДАРНОЕ': 'legendary'
        };

        return rarityMap[backendRarity] || 'common';
    }

    private getAllPossibleAchievements(): Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        icon: string;
        rarity: string;
    }> {
        const allIds = [
            // Прогресс
            'first_case', 'detective_rookie', 'detective_experienced', 'detective_veteran',
            'detective_master', 'detective_legend', 'detective_immortal',

            // Мастерство
            'perfectionist', 'master_detective', 'perfect_5', 'perfect_15', 'perfect_50', 'perfect_100',

            // Скорость
            'speed_demon', 'lightning_fast',

            // Серии
            'streak_3', 'streak_5', 'streak_10', 'streak_20',
            'daily_3', 'daily_7', 'daily_30', 'daily_100',

            // Очки
            'score_1k', 'score_5k', 'score_10k', 'score_25k',

            // Особые
            'expert_specialist', 'legendary_reputation', 'versatile_detective',

            // Backend достижения
            'detective_novice', 'detective_expert', 'case_solver', 'veteran_detective'
        ];

        return allIds.map(id => this.getAchievementInfo(id));
    }

    private getUserDisplayName(user: any): string {
        console.log('👤 Обработка имени пользователя:', user);

        // Если есть готовое поле name с сервера
        if (user.name && user.name !== 'Детектив') {
            return user.name;
        }

        // Если есть телеграм имя
        if (user.firstName) {
            return `${user.firstName} ${user.lastName || ''}`.trim();
        }

        // Если есть username
        if (user.username) {
            return `@${user.username}`;
        }

        // Дефолтное значение
        return 'Детектив';
    }

    private updateElement(id: string, value: string): void {
        console.log(`🔧 Попытка обновить элемент:`, { id, value });
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ Элемент найден, обновляем:`, id, `старое значение: "${element.textContent}" → новое: "${value}"`);
            element.textContent = value;
        } else {
            console.error(`❌ Элемент не найден:`, id);
            console.log(`🔍 Доступные элементы на странице:`, Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        }
    }

    private setLoading(loading: boolean): void {
        this.state.isLoading = loading;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }

    private showError(message: string): void {
        // Используем Telegram haptic feedback
        authService.hapticFeedback('error');

        // Показываем ошибку
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">❌</div>
                    <div class="error-text">${message}</div>
                    <button class="retry-button" onclick="location.reload()">
                        Попробовать снова
                    </button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }

    private showAuthError(): void {
        this.showError('Ошибка авторизации. Перезапустите приложение из Telegram.');
    }

    // =========================================================================
    // ПРОВЕРКА DOM
    // =========================================================================

    private checkDOMElements(): boolean {
        const requiredElements = [
            'user-name',
            'user-id',
            'user-total-score',
            'user-games-played',
            'user-accuracy',
            'user-level',
            'achievements-grid',
            'leaderboard-content'
        ];

        const missing = requiredElements.filter(id => !document.getElementById(id));

        if (missing.length > 0) {
            console.error('❌ Отсутствуют DOM элементы:', missing);
            return false;
        }

        return true;
    }

    // =========================================================================
    // СКЕЛЕТОНЫ ЗАГРУЗКИ
    // =========================================================================

    private showProfileSkeleton(): void {
        // Логика показа скелетона профиля
        const skeletonHTML = `
            <div class="skeleton-loader">
                <div class="skeleton-item skeleton-avatar"></div>
                <div class="skeleton-item skeleton-text"></div>
                <div class="skeleton-item skeleton-text short"></div>
            </div>
        `;

        const profileContainer = document.getElementById('profile-info');
        if (profileContainer) {
            profileContainer.innerHTML = skeletonHTML;
        }
    }

    private hideProfileSkeleton(): void {
        // Удаляем скелетон после загрузки
        const skeleton = document.querySelector('.skeleton-loader');
        if (skeleton) {
            skeleton.remove();
        }
    }

    private showLeaderboardSkeleton(): void {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        const skeletonHTML = Array.from({ length: 5 }, (_, i) => `
            <div class="leaderboard-entry skeleton">
                <div class="skeleton-item position">#${i + 1}</div>
                <div class="skeleton-item user-avatar"></div>
                <div class="skeleton-item user-name"></div>
                <div class="skeleton-item score"></div>
            </div>
        `).join('');

        container.innerHTML = skeletonHTML;
    }

    private renderEmptyLeaderboard(): void {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏆</div>
                <div class="empty-text">Лидерборд пуст</div>
                <div class="empty-subtitle">Будьте первым!</div>
            </div>
        `;
    }

    // =========================================================================
    // ОБРАБОТЧИКИ СОБЫТИЙ
    // =========================================================================

    private setupEventListeners(): void {
        // Обработчики вкладок лидерборда
        this.initLeaderboardTabs();

        // Обработчик кнопки "Назад"
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.Telegram?.WebApp?.close?.();
                authService.hapticFeedback('medium');
            });
        }

        console.log('📱 Event listeners настроены');
    }

    // =========================================================================
    // ПЕРИОДИЧЕСКИЕ ОБНОВЛЕНИЯ
    // =========================================================================

    private startPeriodicUpdates(): void {
        // Обновляем данные каждые 30 секунд
        this.updateInterval = window.setInterval(async () => {
            try {
                await this.loadProfileData();
            } catch (error) {
                console.error('❌ Ошибка периодического обновления:', error);
            }
        }, 30000);
    }

    // =========================================================================
    // ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ
    // =========================================================================

    private async loadUserAvatar(telegramId: number): Promise<void> {
        try {
            console.log('🖼️ Загружаем аватар для пользователя:', telegramId);

            const avatarUrl = await apiService.getUserAvatar(telegramId);
            console.log('📥 Получен URL аватара:', avatarUrl);

            if (avatarUrl) {
                // Ищем контейнер аватара
                const avatarContainer = document.getElementById('user-avatar');
                const placeholderElement = document.getElementById('avatar-placeholder');

                if (avatarContainer && placeholderElement) {
                    // Создаем новый img элемент
                    const imgElement = document.createElement('img');
                    imgElement.src = avatarUrl;
                    imgElement.alt = 'User Avatar';
                    imgElement.style.width = '100%';
                    imgElement.style.height = '100%';
                    imgElement.style.objectFit = 'cover';
                    imgElement.style.borderRadius = '50%';

                    // Обработчик успешной загрузки
                    imgElement.onload = () => {
                        placeholderElement.style.opacity = '0';
                        setTimeout(() => {
                            placeholderElement.style.display = 'none';
                        }, 300);
                        console.log('✅ Аватар успешно загружен');
                    };

                    // Обработчик ошибки загрузки
                    imgElement.onerror = () => {
                        console.log('❌ Ошибка загрузки аватара, оставляем placeholder');
                        imgElement.remove();
                    };

                    // Добавляем изображение в контейнер
                    avatarContainer.appendChild(imgElement);
                } else {
                    console.error('❌ Не найдены элементы аватара:', { avatarContainer, placeholderElement });
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки аватара:', error);
        }
    }

    private updateUserPosition(data: any): void {
        console.log('📊 Обновляем позицию пользователя в лидерборде:', data);

        const positionElement = document.getElementById('user-position');
        const totalPlayersElement = document.getElementById('total-players');

        if (positionElement && data.userPosition) {
            positionElement.textContent = data.userPosition.toString();
            console.log('✅ Позиция обновлена:', data.userPosition);
        } else {
            positionElement && (positionElement.textContent = '—');
            console.log('❌ Позиция пользователя не найдена в данных:', data);
        }

        if (totalPlayersElement && data.totalUsers) {
            totalPlayersElement.textContent = data.totalUsers.toString();
            console.log('✅ Общее количество игроков обновлено:', data.totalUsers);
        } else {
            totalPlayersElement && (totalPlayersElement.textContent = '—');
            console.log('❌ Общее количество пользователей не найдено в данных:', data);
        }
    }

    private updateRankDisplay(level: number, rank: any): void {
        const rankElement = document.getElementById('rank-display');
        if (rankElement) {
            rankElement.innerHTML = `
                <div class="rank-icon">${rank.icon}</div>
                <div class="rank-info">
                    <div class="rank-name">${rank.name}</div>
                    <div class="rank-level">Уровень ${level}</div>
                </div>
            `;
        }
    }

    // =========================================================================
    // ДЕСТРУКТОР
    // =========================================================================

    public destroy(): void {
        if (this.effectsInterval) {
            clearInterval(this.effectsInterval);
        }

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Очищаем кэш API
        apiService.clearCache();

        console.log('🧹 Profile уничтожен');
    }

    // =========================================================================
    // ГЕТТЕРЫ ДЛЯ ОТЛАДКИ
    // =========================================================================

    public getState(): ProfileState {
        return this.state;
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ DOM
// =============================================================================

// Глобальная переменная для доступа из консоли
declare global {
    interface Window {
        criminalProfile?: CriminalTrustProfile;
    }
}

// Автоинициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM загружен, инициализируем профиль...');
    window.criminalProfile = new CriminalTrustProfile();
});

// Экспорт для использования в других модулях
export default CriminalTrustProfile; 