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

                        // Используем прогресс напрямую с сервера если есть
                        let progress = 0;
                        if (ach.progress && ach.progress.current !== undefined && ach.progress.target !== undefined) {
                            progress = Math.min((ach.progress.current / ach.progress.target) * 100, 100);
                            console.log(`📊 Прогресс для ${ach.id}: ${ach.progress.current}/${ach.progress.target} = ${progress}%`);
                        } else {
                            // Fallback к расчету на клиенте
                            progress = this.calculateRealProgress(ach.id, this.state.user);
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
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        container.innerHTML = '';

        achievements.forEach(achievement => {
            const element = this.createAchievementElement(achievement);
            container.appendChild(element);
        });

        // Обновляем счетчик достижений
        const achievementsCount = document.getElementById('achievements-count');
        if (achievementsCount) {
            const unlockedCount = achievements.filter(a => a.isUnlocked).length;
            achievementsCount.textContent = unlockedCount.toString();
            console.log(`🏆 Обновлен счетчик достижений: ${unlockedCount}/${achievements.length}`);
        }

        // Добавляем интерактивность
        this.addAchievementInteractivity();

        console.log(`🏆 Отрендерено ${achievements.length} достижений`);
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
        // Обновляем иконку
        const modalIcon = document.getElementById('modal-icon');
        if (modalIcon) {
            modalIcon.textContent = this.getAchievementIcon(achievement.category || 'default');
        }

        // Обновляем заголовок
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = achievement.name || 'Неизвестное достижение';
        }

        // Обновляем описание
        const modalDescription = document.getElementById('modal-description');
        if (modalDescription) {
            modalDescription.textContent = achievement.description || 'Описание отсутствует';
        }

        // Обновляем статус
        const modalStatus = document.getElementById('modal-status');
        if (modalStatus) {
            if (achievement.isUnlocked) {
                modalStatus.textContent = 'ПОЛУЧЕНО';
                modalStatus.className = 'achievement-modal-status unlocked';
            } else {
                modalStatus.textContent = 'НЕ ПОЛУЧЕНО';
                modalStatus.className = 'achievement-modal-status locked';
            }
        }

        // Обновляем прогресс (показываем только для заблокированных достижений)
        const modalProgress = document.getElementById('modal-progress');
        const progressCurrent = document.getElementById('progress-current');
        const progressTarget = document.getElementById('progress-target');
        const progressBar = document.getElementById('progress-bar');
        const progressPercentage = document.getElementById('progress-percentage');

        if (modalProgress && !achievement.isUnlocked && achievement.progress !== undefined) {
            modalProgress.style.display = 'block';

            // Сначала пробуем использовать progressData с сервера
            if (achievement.progressData && achievement.progressData.current !== undefined && achievement.progressData.target !== undefined) {
                const { current, target } = achievement.progressData;
                const progress = Math.min((current / target) * 100, 100);

                if (progressCurrent) progressCurrent.textContent = current.toLocaleString();
                if (progressTarget) progressTarget.textContent = target.toLocaleString();
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressPercentage) progressPercentage.textContent = `${Math.round(progress)}%`;

                console.log(`📊 Показываем прогресс из сервера: ${current}/${target} = ${progress}%`);
            } else {
                // Fallback к расчету через конфигурацию
                const configAchievement = ACHIEVEMENTS_CONFIG.find(a => a.id === achievement.id);
                if (configAchievement && configAchievement.requirement && this.state.user) {
                    const req = configAchievement.requirement;
                    let currentValue = 0;
                    let targetValue = req.value;

                    // Рассчитываем текущее значение в зависимости от типа достижения
                    switch (req.type) {
                        case 'investigations':
                            // Используем gamesPlayed из User типа, но проверяем разные поля
                            currentValue = this.state.user.gamesPlayed ||
                                this.state.user.stats?.totalGames ||
                                (this.state.user as any).investigations || 0;
                            break;
                        case 'accuracy':
                            currentValue = this.state.user.accuracy || 0;
                            break;
                        case 'winStreak':
                            currentValue = this.state.user.maxWinStreak || this.state.user.winStreak || 0;
                            break;
                        case 'totalScore':
                            currentValue = this.state.user.totalScore || 0;
                            break;
                        case 'perfectGames':
                            currentValue = this.state.user.stats?.perfectGames || 0;
                            break;
                        case 'dailyStreak':
                            // Проверяем разные возможные поля
                            currentValue = (this.state.user as any).dailyStreakCurrent ||
                                (this.state.user as any).stats?.dailyStreakCurrent || 0;
                            break;
                        case 'fastGame':
                            const fastestTime = this.state.user.stats?.fastestGame || 0;
                            currentValue = fastestTime > 0 ? Math.round(fastestTime / 1000) : 0;
                            targetValue = req.value; // секунды
                            break;
                    }

                    const progress = achievement.progress;

                    if (progressCurrent) progressCurrent.textContent = currentValue.toLocaleString();
                    if (progressTarget) progressTarget.textContent = targetValue.toLocaleString();
                    if (progressBar) progressBar.style.width = `${progress}%`;
                    if (progressPercentage) progressPercentage.textContent = `${Math.round(progress)}%`;

                    console.log(`📊 Показываем прогресс из конфигурации: ${currentValue}/${targetValue} = ${progress}%`);
                } else {
                    // Последний fallback
                    const progress = achievement.progress;
                    const current = Math.round(progress);
                    const target = 100;

                    if (progressCurrent) progressCurrent.textContent = current.toString();
                    if (progressTarget) progressTarget.textContent = target.toString();
                    if (progressBar) progressBar.style.width = `${progress}%`;
                    if (progressPercentage) progressPercentage.textContent = `${current}%`;
                }
            }
        } else if (modalProgress) {
            modalProgress.style.display = 'none';
        }

        // Обновляем требования
        const modalRequirement = document.getElementById('modal-requirement');
        const requirementText = document.getElementById('requirement-text');
        if (modalRequirement && requirementText) {
            const requirement = this.getAchievementRequirement(achievement);
            requirementText.textContent = requirement;
        }

        // Обновляем награду (показываем только для разблокированных достижений)
        const modalReward = document.getElementById('modal-reward');
        const rewardText = document.getElementById('reward-text');
        if (modalReward && rewardText && achievement.isUnlocked) {
            const reward = this.getAchievementReward(achievement);
            rewardText.textContent = reward;
            modalReward.style.display = 'block';
        } else if (modalReward) {
            modalReward.style.display = 'none';
        }
    }

    private getAchievementRequirement(achievement: any): string {
        // Ищем правильное достижение в конфигурации
        const configAchievement = ACHIEVEMENTS_CONFIG.find(a => a.id === achievement.id);

        if (configAchievement && configAchievement.requirement) {
            const req = configAchievement.requirement;

            switch (req.type) {
                case 'investigations':
                    return `Провести ${req.value} расследований`;

                case 'accuracy':
                    const minGames = req.minGames || 0;
                    return `Достичь точности ${req.value}% в ${minGames}+ играх`;

                case 'winStreak':
                    return `Достичь серии из ${req.value} правильных ответов подряд`;

                case 'totalScore':
                    return `Набрать ${req.value.toLocaleString()} очков`;

                case 'perfectGames':
                    return `Сыграть ${req.value} идеальных игр (5/5 правильных ответов)`;

                case 'fastGame':
                    return `Решить дело за ${req.value} секунд или быстрее`;

                case 'dailyStreak':
                    return `Играть ${req.value} дней подряд`;

                default:
                    return configAchievement.description || 'Выполнить специальные условия';
            }
        }

        // Fallback к общим требованиям
        const requirements: Record<string, string> = {
            'Начинающий': 'Начальные достижения для новых детективов',
            'Профессионал': 'Достижения для опытных следователей',
            'Мастерство': 'Продемонстрировать высокие навыки дедукции',
            'Скорость': 'Быстро принимать решения в играх',
            'Серии': 'Поддерживать серию успешных игр',
            'Очки': 'Набрать определенное количество очков',
            'Особые': 'Выполнить особые условия'
        };

        return requirements[achievement.category || 'default'] || 'Выполнить специальные условия для получения этого достижения';
    }

    private getAchievementReward(achievement: any): string {
        // Базовые награды по редкости
        const rewards: Record<string, string> = {
            'common': '+50 очков опыта',
            'rare': '+100 очков опыта + уникальный титул',
            'epic': '+200 очков опыта + особая эмблема',
            'legendary': '+500 очков опыта + эксклюзивный ранг'
        };

        return rewards[achievement.rarity || 'common'] || '+100 очков опыта';
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

    private calculateRealProgress(achievementId: string, user: any): number {
        if (!user || !this.state.user) return 0;

        // Ищем достижение в правильной конфигурации
        const achievement = ACHIEVEMENTS_CONFIG.find(a => a.id === achievementId);
        if (!achievement || !achievement.requirement) return 0;

        const { requirement } = achievement;
        let currentValue = 0;

        switch (requirement.type) {
            case 'investigations':
                // Используем gamesPlayed из User типа, но проверяем разные поля
                currentValue = this.state.user.gamesPlayed ||
                    this.state.user.stats?.totalGames ||
                    (this.state.user as any).investigations || 0;
                break;
            case 'accuracy':
                currentValue = this.state.user.accuracy || 0;
                break;
            case 'winStreak':
                currentValue = this.state.user.maxWinStreak || this.state.user.winStreak || 0;
                break;
            case 'totalScore':
                currentValue = this.state.user.totalScore || 0;
                break;
            case 'perfectGames':
                currentValue = this.state.user.stats?.perfectGames || 0;
                break;
            case 'fastGame':
                // Для достижений скорости проверяем быстрейшую игру
                const fastestTime = this.state.user.stats?.fastestGame || 0;
                if (fastestTime > 0 && fastestTime <= requirement.value * 1000) {
                    return 100; // Уже выполнено
                }
                return 0;
            case 'dailyStreak':
                // Проверяем разные возможные поля
                currentValue = (this.state.user as any).dailyStreakCurrent ||
                    (this.state.user as any).stats?.dailyStreakCurrent || 0;
                break;
            default:
                return 0;
        }

        // Для остальных типов - процент от цели
        const progress = (currentValue / requirement.value) * 100;
        return Math.min(Math.round(progress), 99); // Максимум 99% для не разблокированных
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