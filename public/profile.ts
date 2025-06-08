/**
 * Criminal Trust - Основной модуль профиля на TypeScript
 * Объединяет все модули для работы с профилем пользователя
 */

import type {
    User,
    Achievement,
    AchievementConfig,
    ProfileState,
    LeaderboardPeriod,
    LeaderboardData,
    TelegramWebApp,
    CriminalEffects,
    BloodParticle
} from './types/profile-types.js';

import {
    PROFILE_CONFIG,
    ACHIEVEMENTS_CONFIG,
    getRankByLevel,
    calculateLevel,
    calculateXP,
    getXPProgress,
    getMaxXPForLevel
} from './modules/profile-config.js';

import { authService } from './modules/auth-service.js';
import { apiService } from './modules/api-service.js';

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

        this.init();
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
        console.log('📋 Загрузка данных профиля...');

        try {
            // Получаем данные пакетно для оптимизации
            const batchData = await apiService.getBatchData();

            if (batchData.profile) {
                console.log('👤 Обновление данных пользователя:', batchData.profile);
                this.state.user = batchData.profile;
                this.updateProfileUI(batchData.profile);
            }

            // ИСПРАВЛЕННАЯ обработка достижений
            if (batchData.achievements) {
                console.log('📊 [ИСПРАВЛЕНО] Получены данные достижений:', batchData.achievements);

                // API возвращает объект {unlocked: [], available: [], progress: {}}
                let allAchievements: any[] = [];
                const achievementsData = batchData.achievements as any;

                // Обрабатываем разблокированные достижения (из user.achievements в базе)
                if (achievementsData.unlocked && Array.isArray(achievementsData.unlocked)) {
                    console.log('🔓 [ИСПРАВЛЕНО] Обрабатываем разблокированные достижения:', achievementsData.unlocked.length);

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

                // ИСПРАВЛЕНО: Обрабатываем доступные достижения (генерируемые сервером)
                if (achievementsData.available && Array.isArray(achievementsData.available)) {
                    console.log('🔒 [ИСПРАВЛЕНО] Обрабатываем доступные достижения:', achievementsData.available.length);

                    allAchievements = [...allAchievements, ...achievementsData.available.map((ach: any) => {
                        const achievementInfo = this.getAchievementInfo(ach.id);

                        // ИСПРАВЛЕНО: Используем прогресс ТОЛЬКО с сервера
                        let progress = 0;
                        if (ach.progress && ach.progress.current !== undefined && ach.progress.target !== undefined) {
                            progress = Math.min((ach.progress.current / ach.progress.target) * 100, 100);
                            console.log(`📊 [ИСПРАВЛЕНО] Прогресс для ${ach.id}: ${ach.progress.current}/${ach.progress.target} = ${progress}%`);
                        }

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

                // Добавляем прочие достижения из системы как заблокированные (с прогрессом 0)
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

                console.log('🏆 [ИСПРАВЛЕНО] Сформирован финальный массив достижений:', allAchievements.length);
                console.log('📊 [ИСПРАВЛЕНО] Статистика достижений:', {
                    unlocked: allAchievements.filter(a => a.isUnlocked).length,
                    locked: allAchievements.filter(a => !a.isUnlocked).length,
                    total: allAchievements.length
                });

                this.state.achievements = allAchievements;
                this.renderAchievements(allAchievements);
            }

            // Обновляем лидерборд
            if (batchData.leaderboard) {
                console.log('🏆 Обработка данных лидерборда:', batchData.leaderboard);
                this.renderLeaderboard(batchData.leaderboard);
                this.updateUserPosition(batchData.leaderboard);
            }

            console.log('✅ Профиль полностью загружен');
            this.setLoading(false);

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
            this.showError('Ошибка загрузки данных профиля');
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
        console.log('🏆 Рендерим достижения в новом стиле:', achievements.length);

        const container = document.getElementById('achievements-grid');
        if (!container) {
            console.error('❌ Контейнер достижений не найден');
            return;
        }

        // Очищаем контейнер
        container.innerHTML = '';

        // Получаем все возможные достижения из конфигурации
        const allAchievements = ACHIEVEMENTS_CONFIG || [];
        console.log('📋 Всего достижений в конфигурации:', allAchievements.length);

        if (!allAchievements || allAchievements.length === 0) {
            console.error('❌ ACHIEVEMENTS_CONFIG пустая или не загружена!');
            container.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Ошибка загрузки конфигурации достижений</div>';
            return;
        }

        let unlockedCount = 0;

        // Создаем карточки для всех достижений
        allAchievements.forEach(achievementConfig => {
            // Ищем данные о прогрессе этого достижения
            const achievementData = achievements.find(a => a.id === achievementConfig.id);

            // ИСПРАВЛЕННАЯ ЛОГИКА: Используем только серверные данные о достижениях
            let isUnlocked = false;
            if (achievementData && achievementData.isUnlocked) {
                isUnlocked = true;
                unlockedCount++;
            }

            // Создаем объект прогресса для карточки на основе серверных данных
            const progress = {
                current: achievementData?.progressData?.current || 0,
                target: achievementData?.progressData?.target || achievementConfig.requirement?.value || 100,
                percentage: achievementData?.progress || 0
            };

            console.log(`🎯 Достижение ${achievementConfig.name}: разблокировано=${isUnlocked}, прогресс=${progress.percentage}%`);

            // Создаем карточку в новом стиле
            const card = this.createAchievementCard(achievementConfig, progress, isUnlocked);
            container.appendChild(card);
        });

        // Обновляем счетчик
        this.updateElement('achievements-count', unlockedCount.toString());

        console.log(`✅ Отрендерено ${allAchievements.length} достижений (${unlockedCount} разблокировано)`);
    }

    private createAchievementElement(achievement: any): HTMLElement {
        const div = document.createElement('div');
        div.className = `achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`;
        div.dataset.achievementId = achievement.id;

        // Добавляем класс редкости если есть
        if (achievement.rarity) {
            div.classList.add(`rarity-${achievement.rarity}`);
        }

        // Создаем красивый контент
        div.innerHTML = `
            <div class="achievement-icon">${this.getAchievementIcon(achievement.category || 'default')}</div>
            <div class="achievement-content">
                <h3 class="achievement-name">${achievement.name || 'Неизвестное достижение'}</h3>
                <p class="achievement-description">${achievement.description || 'Описание отсутствует'}</p>
                <div class="achievement-category">${this.getCategoryDisplayName(achievement.category || 'default')}</div>
                ${!achievement.isUnlocked && achievement.progress !== undefined ? `
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${achievement.progress}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(achievement.progress)}%</span>
                    </div>
                ` : ''}
            </div>
            ${achievement.isUnlocked ? '<div class="achievement-unlock-badge">✓</div>' : ''}
        `;

        // Добавляем обработчик клика для модального окна
        div.addEventListener('click', () => {
            this.showAchievementModal(achievement.id);
            authService.hapticFeedback('medium');
        });

        return div;
    }

    private getCategoryDisplayName(category: string): string {
        const categoryNames: Record<string, string> = {
            'score': 'НАБРАННЫЕ ОЧКИ',
            'games': 'КОЛИЧЕСТВО ИГР',
            'investigation': 'РАССЛЕДОВАНИЯ',
            'deduction': 'ДЕДУКЦИЯ',
            'social': 'СОЦИАЛЬНОЕ',
            'speed': 'СКОРОСТЬ',
            'accuracy': 'ТОЧНОСТЬ',
            'streak': 'СЕРИИ',
            'special': 'ОСОБЫЕ',
            'default': 'ОБЩИЕ'
        };

        return categoryNames[category] || category.toUpperCase();
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
        // Импорт новой системы достижений
        const { ACHIEVEMENTS_CONFIG } = window as any;

        // Ищем в новой системе достижений
        if (ACHIEVEMENTS_CONFIG) {
            const newAchievement = ACHIEVEMENTS_CONFIG.find((ach: any) => ach.id === achievementId);
            if (newAchievement) {
                return {
                    id: newAchievement.id,
                    name: newAchievement.name,
                    description: newAchievement.description,
                    category: newAchievement.category,
                    icon: newAchievement.icon,
                    rarity: newAchievement.rarity
                };
            }
        }

        // НОВАЯ БАЗА ДОСТИЖЕНИЙ "КРИМИНАЛЬНЫЙ БЛЕФ"
        const achievementDatabase: Record<string, any> = {
            // === СЛЕДОВАТЕЛЬ ===
            'first_investigation': {
                name: 'Первое расследование',
                description: 'Завершите ваше первое криминальное расследование',
                category: 'investigation',
                icon: '🔍',
                rarity: 'common'
            },
            'truth_seeker': {
                name: 'Искатель истины',
                description: 'Правильно определите ошибку преступника в первый раз',
                category: 'investigation',
                icon: '🎯',
                rarity: 'common'
            },
            'rookie_detective': {
                name: 'Детектив-новичок',
                description: 'Проведите 5 расследований',
                category: 'investigation',
                icon: '🕵️',
                rarity: 'common'
            },
            'crime_solver': {
                name: 'Раскрыватель преступлений',
                description: 'Раскройте 10 криминальных дел',
                category: 'investigation',
                icon: '⚖️',
                rarity: 'common'
            },
            'experienced_investigator': {
                name: 'Опытный следователь',
                description: 'Проведите 25 расследований',
                category: 'investigation',
                icon: '🎖️',
                rarity: 'rare'
            },
            'senior_detective': {
                name: 'Старший детектив',
                description: 'Проведите 50 расследований',
                category: 'investigation',
                icon: '👨‍💼',
                rarity: 'rare'
            },
            'veteran_investigator': {
                name: 'Ветеран следствия',
                description: 'Проведите 100 расследований',
                category: 'investigation',
                icon: '🏅',
                rarity: 'epic'
            },
            'master_detective': {
                name: 'Мастер-детектив',
                description: 'Проведите 250 расследований',
                category: 'investigation',
                icon: '🏆',
                rarity: 'legendary'
            },

            // === ТОЧНОСТЬ ===
            'sharp_eye': {
                name: 'Острый глаз',
                description: 'Достигните точности 60% в 10+ расследованиях',
                category: 'accuracy',
                icon: '👁️',
                rarity: 'common'
            },
            'keen_observer': {
                name: 'Внимательный наблюдатель',
                description: 'Достигните точности 75% в 20+ расследованиях',
                category: 'accuracy',
                icon: '🔍',
                rarity: 'rare'
            },
            'master_analyst': {
                name: 'Мастер анализа',
                description: 'Достигните точности 85% в 50+ расследованиях',
                category: 'accuracy',
                icon: '📊',
                rarity: 'epic'
            },
            'sherlock_holmes': {
                name: 'Шерлок Холмс',
                description: 'Достигните точности 95% в 100+ расследованиях',
                category: 'accuracy',
                icon: '🎩',
                rarity: 'legendary'
            },

            // === СКОРОСТЬ ===
            'quick_thinker': {
                name: 'Быстрый ум',
                description: 'Решите дело за 10 секунд или быстрее',
                category: 'speed',
                icon: '⚡',
                rarity: 'common'
            },
            'lightning_detective': {
                name: 'Молниеносный детектив',
                description: 'Решите дело за 5 секунд или быстрее',
                category: 'speed',
                icon: '⚡',
                rarity: 'rare'
            },
            'instant_deduction': {
                name: 'Мгновенная дедукция',
                description: 'Решите дело за 2 секунды или быстрее',
                category: 'speed',
                icon: '💨',
                rarity: 'epic'
            },
            'speed_demon': {
                name: 'Демон скорости',
                description: 'Поддерживайте среднее время решения менее 15 секунд в 50+ играх',
                category: 'speed',
                icon: '🏃‍♂️',
                rarity: 'epic'
            },

            // === СЕРИИ ===
            'perfect_start': {
                name: 'Идеальное начало',
                description: 'Сыграйте одну идеальную игру (5/5 правильных ответов)',
                category: 'streak',
                icon: '🌟',
                rarity: 'common'
            },
            'winning_streak_3': {
                name: 'Тройная серия',
                description: 'Выиграйте 3 идеальные игры подряд',
                category: 'streak',
                icon: '🔥',
                rarity: 'rare'
            },
            'winning_streak_5': {
                name: 'Горячая серия',
                description: 'Выиграйте 5 идеальных игр подряд',
                category: 'streak',
                icon: '🔥',
                rarity: 'epic'
            },
            'winning_streak_10': {
                name: 'Неостановимый',
                description: 'Выиграйте 10 идеальных игр подряд',
                category: 'streak',
                icon: '💪',
                rarity: 'legendary'
            },
            'perfectionist': {
                name: 'Перфекционист',
                description: 'Сыграйте 10 идеальных игр',
                category: 'streak',
                icon: '💎',
                rarity: 'rare'
            },
            'flawless_master': {
                name: 'Безупречный мастер',
                description: 'Сыграйте 50 идеальных игр',
                category: 'streak',
                icon: '👑',
                rarity: 'legendary'
            },

            // === ОЧКИ ===
            'first_thousand': {
                name: 'Первая тысяча',
                description: 'Наберите 1,000 очков',
                category: 'score',
                icon: '💰',
                rarity: 'common'
            },
            'five_thousand_points': {
                name: 'Пять тысяч очков',
                description: 'Наберите 5,000 очков',
                category: 'score',
                icon: '💰',
                rarity: 'rare'
            },
            'ten_thousand_elite': {
                name: 'Элита десяти тысяч',
                description: 'Наберите 10,000 очков',
                category: 'score',
                icon: '💰',
                rarity: 'epic'
            },
            'legendary_scorer': {
                name: 'Легендарный счетчик',
                description: 'Наберите 25,000 очков',
                category: 'score',
                icon: '🏆',
                rarity: 'legendary'
            },

            // Fallback для старых достижений
            'detective_experienced': {
                name: 'Опытный детектив',
                description: 'Проведено 25 расследований',
                category: 'investigation',
                icon: '🔍',
                rarity: 'common'
            }
        };

        const achievement = achievementDatabase[achievementId];
        if (achievement) {
            return {
                id: achievementId,
                name: achievement.name,
                description: achievement.description,
                category: achievement.category,
                icon: achievement.icon,
                rarity: achievement.rarity
            };
        }

        // Fallback для неизвестных достижений
        return {
            id: achievementId,
            name: 'Неизвестное достижение',
            description: 'Описание недоступно',
            category: 'investigation',
            icon: '🔍',
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

    private setElementText(id: string, text: string): void {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
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

    private showAchievementModal(achievementId: string): void {
        const achievement = this.state.achievements.find(a => a.id === achievementId);
        if (!achievement) {
            console.error('❌ Достижение не найдено:', achievementId);
            return;
        }

        console.log('🏆 Показываем модальное окно для достижения:', achievement);

        // Находим существующий модальный элемент
        const modal = document.getElementById('achievement-modal');
        if (!modal) {
            console.error('❌ Модальное окно не найдено в DOM');
            return;
        }

        // Обновляем содержимое модального окна
        this.updateModalContent(achievement);

        // Показываем модальное окно
        modal.classList.add('show');
        modal.style.display = 'flex';

        // Добавляем обработчики закрытия если еще не добавлены
        this.setupModalCloseHandlers(modal);

        // Haptic feedback
        authService.hapticFeedback('medium');
    }

    private updateModalContent(achievement: any): void {
        const modalIcon = document.getElementById('modal-icon');
        const modalCaseNumber = document.getElementById('modal-case-number');
        const modalTitle = document.getElementById('modal-title');
        const modalDescription = document.getElementById('modal-description');
        const modalStatus = document.getElementById('modal-status');
        const modalProgress = document.getElementById('modal-evidence');
        const progressCurrent = document.getElementById('evidence-current');
        const progressTarget = document.getElementById('evidence-target');
        const progressBar = document.getElementById('evidence-bar');
        const detailType = document.getElementById('detail-type');
        const detailReward = document.getElementById('detail-reward');

        if (modalIcon) modalIcon.textContent = achievement.icon || '🏆';
        if (modalCaseNumber) modalCaseNumber.textContent = `ДЕЛО №${achievement.id.toUpperCase()}`;
        if (modalTitle) modalTitle.textContent = achievement.name;
        if (modalDescription) modalDescription.textContent = achievement.description;

        // ИСПРАВЛЕНО: Статус достижения
        if (modalStatus) {
            const statusBadge = modalStatus.querySelector('.achievement-status-badge');
            if (statusBadge) {
                if (achievement.isUnlocked) {
                    statusBadge.className = 'achievement-status-badge unlocked';
                    statusBadge.innerHTML = '<span>✓</span> ДЕЛО ЗАКРЫТО';
                } else {
                    statusBadge.className = 'achievement-status-badge locked';
                    statusBadge.innerHTML = '<span>⏳</span> РАССЛЕДУЕТСЯ';
                }
            }
        }

        // ИСПРАВЛЕНО: Прогресс достижения
        if (modalProgress) {
            // Ищем достижение в конфигурации для получения подробной информации
            const configAchievement = ACHIEVEMENTS_CONFIG.find(a => a.id === achievement.id);

            if (configAchievement && configAchievement.requirement && this.state.user) {
                modalProgress.style.display = 'block';
                const req = configAchievement.requirement;

                // ИСПРАВЛЕНО: Используем данные прогресса с сервера если они есть
                let currentValue = 0;
                let targetValue = req.value || 1;
                let progressPercentageValue = 0;

                if (achievement.progressData && achievement.progressData.current !== undefined && achievement.progressData.target !== undefined) {
                    // Используем данные с сервера
                    currentValue = achievement.progressData.current;
                    targetValue = achievement.progressData.target;
                    progressPercentageValue = achievement.progress || 0;

                    console.log(`📊 [ИСПРАВЛЕНО] Используем серверные данные для ${achievement.id}: ${currentValue}/${targetValue} = ${progressPercentageValue}%`);
                } else {
                    // Fallback к расчету на основе типа требования (для совместимости)
                    switch (req.type) {
                        case 'investigations':
                            currentValue = (this.state.user as any).investigations ||
                                Math.floor(((this.state.user as any).totalQuestions || 0) / 5) ||
                                this.state.user.gamesPlayed || 0;
                            break;
                        case 'correctAnswers':
                            const totalQuestions = (this.state.user as any).totalQuestions || 0;
                            const accuracy = this.state.user.accuracy || 0;
                            currentValue = Math.round(totalQuestions * accuracy / 100);
                            break;
                        case 'solvedCases':
                            currentValue = (this.state.user as any).solvedCases ||
                                (this.state.user as any).investigations ||
                                Math.floor(((this.state.user as any).totalQuestions || 0) / 5) || 0;
                            break;
                        case 'accuracy':
                            // Для достижений точности проверяем количество игр
                            const gamesPlayed = (this.state.user as any).investigations || this.state.user.gamesPlayed || 0;
                            const minGames = req.minGames || 0;

                            if (gamesPlayed >= minGames) {
                                currentValue = Math.round(this.state.user.accuracy || 0);
                                targetValue = req.value || 100;
                            } else {
                                currentValue = gamesPlayed;
                                targetValue = minGames;
                            }
                            break;
                        case 'totalScore':
                            currentValue = this.state.user.totalScore || 0;
                            break;
                        case 'perfectGames':
                            currentValue = (this.state.user as any).perfectGames ||
                                this.state.user.stats?.perfectGames || 0;
                            break;
                        case 'winStreak':
                            currentValue = (this.state.user as any).maxWinStreak ||
                                this.state.user.maxWinStreak ||
                                this.state.user.winStreak || 0;
                            break;
                        case 'fastestGame':
                            const fastestTime = (this.state.user as any).fastestGame ||
                                this.state.user.stats?.fastestGame || 0;
                            const targetTimeMs = targetValue * 1000;

                            if (fastestTime > 0 && fastestTime <= targetTimeMs) {
                                currentValue = targetValue;
                                progressPercentageValue = 100;
                            } else if (fastestTime > 0) {
                                const progressRatio = Math.max(0, (targetTimeMs / fastestTime));
                                currentValue = Math.round(targetValue * progressRatio);
                                progressPercentageValue = Math.min(Math.round(progressRatio * 100), 99);
                            }
                            break;
                        case 'dailyStreak':
                            currentValue = (this.state.user as any).dailyStreakCurrent ||
                                this.state.user.stats?.dailyStreakCurrent || 0;
                            break;
                        case 'reputation':
                            const rep = (this.state.user as any).reputation;
                            if (rep) {
                                currentValue = rep.level || Math.round((rep.accuracy + rep.speed + rep.consistency + rep.difficulty) / 4);
                            }
                            break;
                        default:
                            // Для неизвестных типов используем базовые данные
                            currentValue = 0;
                            break;
                    }

                    // Рассчитываем процент для fallback случаев
                    if (req.type !== 'fastestGame') {
                        progressPercentageValue = Math.min(Math.round((currentValue / targetValue) * 100), achievement.isUnlocked ? 100 : 99);
                    }
                }

                // Для полученных достижений показываем 100%
                if (achievement.isUnlocked) {
                    if (req.type === 'fastestGame') {
                        // Для скорости показываем реальное время
                        progressPercentageValue = 100;
                    } else {
                        // Для остальных - обеспечиваем что текущее >= целевого
                        currentValue = Math.max(currentValue, targetValue);
                        progressPercentageValue = 100;
                    }
                }

                // Обновляем элементы интерфейса
                if (progressCurrent) progressCurrent.textContent = currentValue.toLocaleString();
                if (progressTarget) progressTarget.textContent = targetValue.toLocaleString();
                if (progressBar) {
                    progressBar.style.width = `${progressPercentageValue}%`;
                }
            } else {
                modalProgress.style.display = 'none';
            }
        }

        // Детали достижения
        if (detailType) detailType.textContent = achievement.category || 'Общее';
        if (detailReward) detailReward.textContent = achievement.rarity || 'Обычное';

        // Обновляем класс модального окна для правильной стилизации
        const modalContent = document.querySelector('.achievement-modal-content');
        if (modalContent) {
            if (achievement.isUnlocked) {
                modalContent.classList.add('unlocked');
            } else {
                modalContent.classList.remove('unlocked');
            }
        }
    }

    private setupModalCloseHandlers(modal: HTMLElement): void {
        // Удаляем старые обработчики если есть
        modal.removeEventListener('click', this.handleModalClick);

        // Добавляем новый обработчик
        modal.addEventListener('click', this.handleModalClick);

        // Обработчик для кнопки закрытия
        const closeButton = document.getElementById('modal-close');
        if (closeButton) {
            closeButton.removeEventListener('click', this.hideAchievementModal);
            closeButton.addEventListener('click', this.hideAchievementModal);
        }

        // Обработчик ESC
        document.removeEventListener('keydown', this.handleModalEscape);
        document.addEventListener('keydown', this.handleModalEscape);
    }

    private handleModalClick = (e: Event): void => {
        const modal = document.getElementById('achievement-modal');
        if (modal && e.target === modal) {
            this.hideAchievementModal();
        }
    }

    private handleModalEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            this.hideAchievementModal();
        }
    }

    private hideAchievementModal = (): void => {
        const modal = document.getElementById('achievement-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';

            // Удаляем обработчики
            modal.removeEventListener('click', this.handleModalClick);
            document.removeEventListener('keydown', this.handleModalEscape);

            const closeButton = document.getElementById('modal-close');
            if (closeButton) {
                closeButton.removeEventListener('click', this.hideAchievementModal);
            }
        }

        // Haptic feedback
        authService.hapticFeedback('light');
    }

    private addAchievementInteractivity(): void {
        // Добавляем эффекты при наведении (клики уже обрабатываются в createAchievementElement)
        const cards = document.querySelectorAll('.achievement-card');
        cards.forEach(card => {
            // Убираем старые обработчики наведения
            card.removeEventListener('mouseenter', this.handleAchievementHover);
            card.removeEventListener('mouseleave', this.handleAchievementLeave);

            // Добавляем новые
            card.addEventListener('mouseenter', this.handleAchievementHover);
            card.addEventListener('mouseleave', this.handleAchievementLeave);
        });
    }

    private handleAchievementHover = (e: Event): void => {
        authService.hapticFeedback('light');
        const card = e.target as HTMLElement;
        if (card) {
            card.style.transform = 'translateY(-2px) scale(1.02)';
        }
    }

    private handleAchievementLeave = (e: Event): void => {
        const card = e.target as HTMLElement;
        if (card) {
            card.style.transform = '';
        }
    }

    // УДАЛЕНА функция calculateRealProgress - весь расчет прогресса теперь происходит на сервере

    /**
     * 🎯 СОЗДАНИЕ КАРТОЧКИ ДОСТИЖЕНИЯ В СТИЛЕ ДЕТЕКТИВНОГО ДОСЬЕ
     */
    private createAchievementCard(achievement: Achievement, progress: any, isUnlocked: boolean): HTMLElement {
        console.log('🎯 Создаем карточку:', achievement.name, 'isUnlocked:', isUnlocked);

        const card = document.createElement('div');
        card.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
        card.setAttribute('data-achievement-id', achievement.id);

        // Рассчитываем прогресс в процентах
        const progressPercent = progress ? Math.min(progress.percentage || 0, 100) : 0;

        console.log(`📊 Прогресс для ${achievement.name}: ${progressPercent}%`, { progress });

        card.innerHTML = `
            <!-- Статус печать -->
            <div class="achievement-status-stamp ${isUnlocked ? 'unlocked' : 'locked'}">
                ${isUnlocked ? '✓' : '🔒'}
            </div>

            <!-- Иконка достижения -->
            <div class="achievement-icon">${achievement.icon || '🏆'}</div>

            <!-- Название -->
            <div class="achievement-name">${achievement.name || 'Неизвестное достижение'}</div>

            <!-- Краткое описание -->
            <div class="achievement-summary">
                ${this.getAchievementSummary(achievement)}
            </div>

            <!-- Мини прогресс-бар внизу -->
            <div class="achievement-progress-mini">
                <div class="achievement-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        `;

        // Обработчик клика для открытия модального окна
        card.addEventListener('click', () => {
            this.openAchievementModal(achievement, progress, isUnlocked);
        });

        return card;
    }

    /**
     * 📝 ПОЛУЧЕНИЕ КРАТКОГО ОПИСАНИЯ ДОСТИЖЕНИЯ
     */
    private getAchievementSummary(achievement: Achievement): string {
        const req = achievement.requirement;
        if (!req) return 'Секретное задание';

        switch (req.type) {
            case 'investigations':
                return `Завершить ${req.value} расследований`;
            case 'accuracy':
                return `Достичь ${req.value}% точности`;
            case 'totalScore':
                return `Набрать ${req.value} очков`;
            case 'perfectGames':
                return `${req.value} безошибочных игр`;
            case 'winStreak':
                return `Серия из ${req.value} побед`;
            case 'dailyStreak':
                return `${req.value} дней подряд`;
            case 'crimeType':
                return `Специализация: ${req.crimeType}`;
            case 'difficultyType':
                return `Сложность: ${req.difficulty}`;
            case 'reputation':
                return `Репутация: ${req.value}`;
            case 'combo':
                return `Комбо x${req.value}`;
            default:
                return 'Секретное задание';
        }
    }

    /**
     * 📁 ОТКРЫТИЕ МОДАЛЬНОГО ОКНА ФАЙЛА ДЕЛА
     */
    private openAchievementModal(achievement: Achievement, progress: any, isUnlocked: boolean): void {
        console.log('🔍 Открываем дело:', achievement.name);

        const modal = document.getElementById('achievement-modal');
        const modalContent = modal?.querySelector('.achievement-modal-content');

        if (!modal || !modalContent) {
            console.error('❌ Модальное окно не найдено');
            return;
        }

        // Устанавливаем класс статуса для стилизации
        modalContent.className = `achievement-modal-content ${isUnlocked ? 'unlocked' : 'locked'}`;

        // Заполняем данные
        this.setElementText('modal-case-number', `ДЕЛО №${achievement.id.toUpperCase()}`);
        this.setElementText('modal-icon', achievement.icon);
        this.setElementText('modal-title', achievement.name.toUpperCase());
        this.setElementText('modal-description', achievement.description);

        // Настраиваем секцию улик
        const evidenceSection = document.getElementById('modal-evidence');
        if (evidenceSection && progress) {
            evidenceSection.style.display = 'block';
            this.setElementText('evidence-current', progress.current.toString());
            this.setElementText('evidence-target', progress.target.toString());

            const evidenceBar = document.getElementById('evidence-bar') as HTMLElement;
            if (evidenceBar) {
                const progressPercent = Math.min((progress.current / progress.target) * 100, 100);
                evidenceBar.style.width = `${progressPercent}%`;
            }
        } else if (evidenceSection) {
            evidenceSection.style.display = 'none';
        }

        // Детали дела
        this.setElementText('detail-type', this.getAchievementCategory(achievement));
        this.setElementText('detail-reward', this.getAchievementReward(achievement));

        // Статус дела
        const statusBadge = document.getElementById('modal-status');
        if (statusBadge) {
            statusBadge.className = `achievement-status-badge ${isUnlocked ? 'unlocked' : 'locked'}`;
            statusBadge.innerHTML = isUnlocked
                ? '<span>✓</span> ДЕЛО ЗАКРЫТО'
                : '<span>🔍</span> РАССЛЕДОВАНИЕ';
        }

        // Настраиваем обработчики закрытия ПЕРЕД показом модального окна
        this.setupModalCloseHandlers(modal);

        // Показываем модальное окно
        modal.style.display = 'flex';
        modal.classList.add('show');

        // Haptic feedback для Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    /**
     * 📂 ПОЛУЧЕНИЕ КАТЕГОРИИ ДОСТИЖЕНИЯ
     */
    private getAchievementCategory(achievement: Achievement): string {
        const req = achievement.requirement;
        if (!req) return 'Секретное';

        switch (req.type) {
            case 'investigations':
            case 'perfectGames':
                return 'Расследования';
            case 'accuracy':
                return 'Точность';
            case 'totalScore':
                return 'Очки';
            case 'winStreak':
            case 'dailyStreak':
                return 'Серии';
            case 'crimeType':
            case 'difficultyType':
                return 'Специализация';
            case 'reputation':
                return 'Репутация';
            case 'combo':
                return 'Комбо';
            default:
                return 'Секретное';
        }
    }

    /**
     * 🏆 ПОЛУЧЕНИЕ НАГРАДЫ ЗА ДОСТИЖЕНИЕ
     */
    private getAchievementReward(achievement: Achievement): string {
        // Базовые награды по редкости
        const rarityRewards: Record<string, number> = {
            'common': 50,
            'rare': 100,
            'epic': 250,
            'legendary': 500,
            'mythic': 1000
        };

        const exp = rarityRewards[achievement.rarity] || 50;
        let reward = `${exp} EXP`;

        // Добавляем бонус за редкость
        if (achievement.rarity === 'legendary' || achievement.rarity === 'mythic') {
            reward += ' + Особый титул';
        }

        return reward;
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