/**
 * Система управления достижениями "Криминальный Блеф" на TypeScript
 * Включает анимации, прогресс-бары, уведомления и звуковые эффекты
 */

import type {
    Achievement,
    AchievementRequirement,
    AchievementSound,
    User,
    UserStats
} from './types/profile-types.js';

// =============================================================================
// ТИПЫ ДЛЯ СИСТЕМЫ ДОСТИЖЕНИЙ
// =============================================================================

interface AchievementNotification {
    achievement: Achievement;
    timestamp: number;
    isShown: boolean;
}

interface SoundEffect {
    name: string;
    volume: number;
    duration: number;
}

interface AchievementIcon {
    svg: string;
    animation?: string;
}

// =============================================================================
// ГЛАВНЫЙ КЛАСС СИСТЕМЫ ДОСТИЖЕНИЙ
// =============================================================================

export class AchievementSystem {
    private achievements: Map<string, Achievement> = new Map();
    private userStats: UserStats | null = null;
    private isInitialized = false;
    private notificationQueue: AchievementNotification[] = [];
    private isShowingNotification = false;
    private soundEffects: Map<string, SoundEffect> = new Map();
    private animationConfig = {
        duration: 2000,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    };

    // =========================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // =========================================================================

    constructor() {
        this.initAchievementConfig();
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🏆 Инициализация системы достижений...');

            // Создаем стили для анимаций и уведомлений
            this.injectStyles();

            // Создаем контейнер для уведомлений
            this.createNotificationContainer();

            // Инициализируем звуковые эффекты
            this.initSoundEffects();

            this.isInitialized = true;
            console.log('✅ Система достижений инициализирована');

        } catch (error) {
            console.error('❌ Ошибка инициализации системы достижений:', error);
            throw error;
        }
    }

    // =========================================================================
    // КОНФИГУРАЦИЯ ДОСТИЖЕНИЙ
    // =========================================================================

    private initAchievementConfig(): void {
        const achievementConfigs: Achievement[] = [
            // Базовые достижения
            {
                id: 'first_case',
                name: 'Первое дело',
                description: 'Проведено первое расследование',
                category: 'Начинающий',
                icon: '🔍',
                requirement: { type: 'investigations', value: 1 },
                rarity: 'common',
                sound: 'success-light',
                isUnlocked: false
            },
            {
                id: 'rookie',
                name: 'Новичок',
                description: 'Проведено 5 расследований',
                category: 'Начинающий',
                icon: '👮‍♂️',
                requirement: { type: 'investigations', value: 5 },
                rarity: 'common',
                sound: 'success-medium',
                isUnlocked: false
            },
            {
                id: 'expert',
                name: 'Эксперт',
                description: 'Проведено 50 расследований',
                category: 'Профессионал',
                icon: '🕵️',
                requirement: { type: 'investigations', value: 50 },
                rarity: 'rare',
                sound: 'success-heavy',
                isUnlocked: false
            },
            {
                id: 'sharp_eye',
                name: 'Меткий глаз',
                description: 'Достигнута точность 80% минимум в 10 играх',
                category: 'Мастерство',
                icon: '🎯',
                requirement: { type: 'accuracy', value: 80, minGames: 10 },
                rarity: 'epic',
                sound: 'success-heavy',
                isUnlocked: false
            },
            {
                id: 'serial_detective',
                name: 'Серийный детектив',
                description: '5 идеальных расследований подряд',
                category: 'Мастерство',
                icon: '🔥',
                requirement: { type: 'winStreak', value: 5 },
                rarity: 'epic',
                sound: 'success-epic',
                isUnlocked: false
            },
            {
                id: 'maniac',
                name: 'Маньяк',
                description: 'Набрано 1000 очков',
                category: 'Очки',
                icon: '💀',
                requirement: { type: 'totalScore', value: 1000 },
                rarity: 'legendary',
                sound: 'success-legendary',
                isUnlocked: false
            },
            {
                id: 'perfectionist',
                name: 'Перфекционист',
                description: '10 идеальных расследований (5/5 ответов)',
                category: 'Мастерство',
                icon: '💎',
                requirement: { type: 'perfectGames', value: 10 },
                rarity: 'epic',
                sound: 'success-heavy',
                isUnlocked: false
            },
            {
                id: 'speedster',
                name: 'Скоростной детектив',
                description: 'Завершить игру менее чем за 60 секунд',
                category: 'Скорость',
                icon: '⚡',
                requirement: { type: 'fastGame', value: 60 },
                rarity: 'rare',
                sound: 'success-medium',
                isUnlocked: false
            },
            {
                id: 'veteran',
                name: 'Ветеран',
                description: 'Проведено 100 расследований',
                category: 'Профессионал',
                icon: '🎖️',
                requirement: { type: 'investigations', value: 100 },
                rarity: 'legendary',
                sound: 'success-legendary',
                isUnlocked: false
            }
        ];

        // Заполняем Map достижений
        achievementConfigs.forEach(achievement => {
            this.achievements.set(achievement.id, achievement);
        });

        console.log(`🏆 Загружено ${this.achievements.size} достижений`);
    }

    // =========================================================================
    // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКИМИ ДАННЫМИ
    // =========================================================================

    public updateUserStats(stats: UserStats): void {
        this.userStats = stats;
        this.updateAchievementProgress();
    }

    public updateUserAchievements(userAchievements: string[]): void {
        // Обновляем статус разблокированных достижений
        this.achievements.forEach((achievement, id) => {
            achievement.isUnlocked = userAchievements.includes(id);
            if (achievement.isUnlocked && !achievement.unlockedAt) {
                achievement.unlockedAt = new Date();
            }
        });
    }

    // =========================================================================
    // РАСЧЕТ ПРОГРЕССА ДОСТИЖЕНИЙ
    // =========================================================================

    public getAchievementProgress(achievementId: string): number {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || !this.userStats || achievement.isUnlocked) {
            return achievement?.isUnlocked ? 100 : 0;
        }

        const { requirement } = achievement;
        if (!requirement) {
            return 0;
        }

        let currentValue = 0;

        switch (requirement.type) {
            case 'investigations':
                currentValue = this.userStats.totalGames || 0;
                break;

            case 'accuracy':
                if ((this.userStats.totalGames || 0) >= (requirement.minGames || 0)) {
                    currentValue = (this.userStats.totalGames > 0)
                        ? (this.userStats.totalGames / this.userStats.totalGames) * 100
                        : 0;
                }
                break;

            case 'winStreak':
                currentValue = this.userStats.streakHistory?.length
                    ? Math.max(...this.userStats.streakHistory)
                    : 0;
                break;

            case 'totalScore':
                // Нужно получить общий счет из пользователя
                currentValue = 0; // Здесь нужны данные пользователя
                break;

            case 'perfectGames':
                currentValue = this.userStats.perfectGames || 0;
                break;

            case 'fastGame':
                currentValue = this.userStats.fastestGame || 0;
                // Инвертируем для быстрых игр (меньше = лучше)
                if (currentValue > 0 && currentValue <= requirement.value) {
                    return 100;
                }
                return 0;

            default:
                currentValue = 0;
        }

        const progress = Math.min((currentValue / requirement.value) * 100, 100);
        achievement.progress = progress;
        return progress;
    }

    private updateAchievementProgress(): void {
        if (!this.userStats) return;

        this.achievements.forEach((achievement, id) => {
            if (!achievement.isUnlocked) {
                this.getAchievementProgress(id);
            }
        });
    }

    // =========================================================================
    // УВЕДОМЛЕНИЯ О ДОСТИЖЕНИЯХ
    // =========================================================================

    public async showAchievementNotification(achievement: Achievement): Promise<void> {
        const notification: AchievementNotification = {
            achievement,
            timestamp: Date.now(),
            isShown: false
        };

        this.notificationQueue.push(notification);

        if (!this.isShowingNotification) {
            await this.processNotificationQueue();
        }
    }

    private async processNotificationQueue(): Promise<void> {
        if (this.notificationQueue.length === 0 || this.isShowingNotification) {
            return;
        }

        this.isShowingNotification = true;

        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            if (notification && !notification.isShown) {
                await this.displayAchievementNotification(notification.achievement);
                notification.isShown = true;
            }
        }

        this.isShowingNotification = false;
    }

    private async displayAchievementNotification(achievement: Achievement): Promise<void> {
        return new Promise((resolve) => {
            const container = document.getElementById('achievement-notifications');
            if (!container) {
                resolve();
                return;
            }

            // Создаем элемент уведомления
            const notificationElement = document.createElement('div');
            notificationElement.className = `achievement-notification rarity-${achievement.rarity}`;
            notificationElement.innerHTML = `
                <div class="notification-content">
                    <div class="achievement-icon-large">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-unlock-title">Достижение получено!</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-rarity">${achievement.rarity}</div>
                    </div>
                </div>
                <div class="notification-glow"></div>
            `;

            // Добавляем в контейнер
            container.appendChild(notificationElement);

            // Воспроизводим звук
            if (achievement.sound) {
                this.playSound(achievement.sound);
            }

            // Запускаем анимацию появления
            requestAnimationFrame(() => {
                notificationElement.classList.add('show');
            });

            // Создаем эффект взрыва
            this.createCelebrationEffect(notificationElement);

            // Убираем уведомление через 4 секунды
            setTimeout(() => {
                notificationElement.classList.add('hide');

                setTimeout(() => {
                    if (notificationElement.parentNode) {
                        notificationElement.parentNode.removeChild(notificationElement);
                    }
                    resolve();
                }, 500);
            }, 4000);
        });
    }

    // =========================================================================
    // ОБРАБОТКА НОВЫХ ДОСТИЖЕНИЙ
    // =========================================================================

    public async handleNewAchievements(newAchievements: string[]): Promise<void> {
        for (const achievementId of newAchievements) {
            const achievement = this.achievements.get(achievementId);
            if (achievement && !achievement.isUnlocked) {
                achievement.isUnlocked = true;
                achievement.unlockedAt = new Date();

                // Показываем уведомление
                await this.showAchievementNotification(achievement);
            }
        }
    }

    // =========================================================================
    // РЕНДЕРИНГ ДОСТИЖЕНИЙ
    // =========================================================================

    public renderEnhancedAchievements(userAchievements: string[] = []): void {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        // Обновляем статус достижений
        this.updateUserAchievements(userAchievements);

        // Очищаем контейнер
        container.innerHTML = '';

        // Сортируем достижения: разблокированные сначала, потом по редкости
        const sortedAchievements = Array.from(this.achievements.values()).sort((a, b) => {
            if (a.isUnlocked && !b.isUnlocked) return -1;
            if (!a.isUnlocked && b.isUnlocked) return 1;

            const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
            return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        });

        // Создаем элементы достижений
        sortedAchievements.forEach(achievement => {
            const element = this.createEnhancedAchievementElement(achievement);
            container.appendChild(element);
        });

        console.log(`🏆 Отрендерено ${sortedAchievements.length} достижений`);
    }

    private createEnhancedAchievementElement(achievement: Achievement): HTMLElement {
        const progress = this.getAchievementProgress(achievement.id);

        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'} rarity-${achievement.rarity}`;
        card.dataset.achievementId = achievement.id;

        card.innerHTML = `
            <div class="achievement-card-inner">
                <div class="achievement-icon-container">
                    <div class="achievement-icon">${achievement.icon}</div>
                    ${achievement.isUnlocked ? '<div class="unlock-badge">✓</div>' : ''}
                </div>
                
                <div class="achievement-content">
                    <h3 class="achievement-name">${achievement.name}</h3>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-category">${achievement.category}</div>
                    
                    ${!achievement.isUnlocked ? `
                        <div class="achievement-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                                <div class="progress-glow"></div>
                            </div>
                            <span class="progress-text">${Math.round(progress)}%</span>
                        </div>
                    ` : achievement.unlockedAt ? `
                        <div class="unlock-date">
                            Получено: ${achievement.unlockedAt.toLocaleDateString()}
                        </div>
                    ` : ''}
                </div>
                
                <div class="rarity-indicator rarity-${achievement.rarity}">
                    ${achievement.rarity}
                </div>
            </div>
            
            <div class="card-glow"></div>
        `;

        // Добавляем обработчик клика
        card.addEventListener('click', () => {
            this.showAchievementModal(achievement.id, achievement.isUnlocked, []);
        });

        return card;
    }

    // =========================================================================
    // МОДАЛЬНОЕ ОКНО ДОСТИЖЕНИЯ
    // =========================================================================

    public showAchievementModal(achievementId: string, isUnlocked: boolean, userAchievements: string[] = []): void {
        const achievement = this.achievements.get(achievementId);
        if (!achievement) return;

        // Удаляем существующее модальное окно
        this.hideAchievementModal();

        const modal = this.createAchievementModal();
        const progress = this.getAchievementProgress(achievementId);

        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content achievement-modal-content rarity-${achievement.rarity}">
                    <div class="modal-header">
                        <h2 class="modal-title">${achievement.name}</h2>
                        <button class="modal-close" aria-label="Закрыть">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="achievement-large-display">
                            <div class="achievement-icon-large">${achievement.icon}</div>
                            <div class="achievement-rarity-badge rarity-${achievement.rarity}">
                                ${achievement.rarity}
                            </div>
                        </div>
                        
                        <div class="achievement-details">
                            <p class="achievement-description-full">${achievement.description}</p>
                            <div class="achievement-category-full">Категория: ${achievement.category}</div>
                            
                            ${achievement.isUnlocked ? `
                                <div class="unlock-status unlocked">
                                    <div class="unlock-icon">🎉</div>
                                    <div class="unlock-text">Достижение получено!</div>
                                    ${achievement.unlockedAt ? `
                                        <div class="unlock-date">${achievement.unlockedAt.toLocaleDateString()}</div>
                                    ` : ''}
                                </div>
                            ` : `
                                <div class="unlock-status locked">
                                    <div class="progress-section">
                                        <div class="progress-label">Прогресс: ${Math.round(progress)}%</div>
                                        <div class="progress-bar-large">
                                            <div class="progress-fill" style="width: ${progress}%"></div>
                                        </div>
                                    </div>
                                    <div class="requirement-text">
                                        ${achievement.requirement ? this.getRequirementText(achievement.requirement) : 'Требования не указаны'}
                                    </div>
                                    <div class="tips-text">
                                        ${this.getTipsText(achievementId)}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay') ||
                e.target === modal.querySelector('.modal-close')) {
                this.hideAchievementModal();
            }
        });

        // Анимация появления
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    private createAchievementModal(): HTMLElement {
        const modal = document.createElement('div');
        modal.id = 'achievement-modal';
        modal.className = 'achievement-modal';
        return modal;
    }

    public hideAchievementModal(): void {
        const modal = document.getElementById('achievement-modal');
        if (modal) {
            modal.classList.add('hide');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // =========================================================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // =========================================================================

    private getRequirementText(requirement: AchievementRequirement): string {
        switch (requirement.type) {
            case 'investigations':
                return `Проведите ${requirement.value} расследований`;
            case 'accuracy':
                return `Достигните точности ${requirement.value}% в ${requirement.minGames || 1} играх`;
            case 'winStreak':
                return `Выиграйте ${requirement.value} игр подряд`;
            case 'totalScore':
                return `Наберите ${requirement.value.toLocaleString()} очков`;
            case 'perfectGames':
                return `Завершите ${requirement.value} идеальных игр (5/5 ответов)`;
            case 'fastGame':
                return `Завершите игру менее чем за ${requirement.value} секунд`;
            default:
                return 'Выполните требование';
        }
    }

    private getTipsText(achievementId: string): string {
        const tips: Record<string, string> = {
            first_case: 'Просто начните играть!',
            rookie: 'Продолжайте расследования для получения опыта',
            expert: 'Регулярная практика поможет стать экспертом',
            sharp_eye: 'Внимательно изучайте улики перед ответом',
            serial_detective: 'Сосредоточьтесь на качестве, а не на скорости',
            maniac: 'Каждый правильный ответ приносит очки',
            perfectionist: 'Отвечайте правильно на все 5 вопросов',
            speedster: 'Быстро читайте и принимайте решения',
            veteran: 'Постоянная практика - ключ к мастерству'
        };

        return tips[achievementId] || 'Продолжайте играть для достижения цели!';
    }

    // =========================================================================
    // ЗВУКОВЫЕ ЭФФЕКТЫ
    // =========================================================================

    private initSoundEffects(): void {
        this.soundEffects.set('success-light', { name: 'light', volume: 0.3, duration: 500 });
        this.soundEffects.set('success-medium', { name: 'medium', volume: 0.5, duration: 800 });
        this.soundEffects.set('success-heavy', { name: 'heavy', volume: 0.7, duration: 1200 });
        this.soundEffects.set('success-epic', { name: 'epic', volume: 0.8, duration: 1500 });
        this.soundEffects.set('success-legendary', { name: 'legendary', volume: 1.0, duration: 2000 });

        console.log('🔊 Звуковые эффекты инициализированы');
    }

    private playSound(type: AchievementSound): void {
        try {
            // Создаем звуковой эффект через Web Audio API
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const soundEffect = this.soundEffects.get(type);

            if (!soundEffect) return;

            // Простой синтезированный звук
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Настройка звука в зависимости от типа
            switch (type) {
                case 'success-light':
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                    break;
                case 'success-medium':
                    oscillator.frequency.setValueAtTime(554, audioContext.currentTime);
                    break;
                case 'success-heavy':
                    oscillator.frequency.setValueAtTime(659, audioContext.currentTime);
                    break;
                case 'success-epic':
                    oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
                    break;
                case 'success-legendary':
                    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                    break;
            }

            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(soundEffect.volume, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + soundEffect.duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + soundEffect.duration / 1000);

        } catch (error) {
            console.warn('⚠️ Не удалось воспроизвести звук:', error);
        }
    }

    // =========================================================================
    // ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
    // =========================================================================

    private createCelebrationEffect(element: HTMLElement): void {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Создаем частицы конфетти
        for (let i = 0; i < 20; i++) {
            this.createConfettiParticle(centerX, centerY);
        }
    }

    private createConfettiParticle(x: number, y: number): void {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';

        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            width: 8px;
            height: 8px;
            background: ${color};
            pointer-events: none;
            z-index: 10000;
            border-radius: 2px;
        `;

        document.body.appendChild(particle);

        // Анимация конфетти
        const angle = Math.random() * 2 * Math.PI;
        const velocity = Math.random() * 200 + 100;
        const gravity = 500;

        let currentX = x;
        let currentY = y;
        let velocityX = Math.cos(angle) * velocity;
        let velocityY = Math.sin(angle) * velocity;

        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;

            currentX += velocityX * 0.016;
            currentY += velocityY * 0.016;
            velocityY += gravity * 0.016;

            particle.style.left = `${currentX}px`;
            particle.style.top = `${currentY}px`;
            particle.style.opacity = `${Math.max(0, 1 - elapsed / 2)}`;

            if (elapsed < 2 && currentY < window.innerHeight + 50) {
                requestAnimationFrame(animate);
            } else {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }
        };

        requestAnimationFrame(animate);
    }

    // =========================================================================
    // СОЗДАНИЕ КОНТЕЙНЕРОВ И СТИЛЕЙ
    // =========================================================================

    private createNotificationContainer(): void {
        let container = document.getElementById('achievement-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'achievement-notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    private injectStyles(): void {
        const styleId = 'achievement-system-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Стили достижений */
            .achievement-card {
                position: relative;
                border-radius: 12px;
                padding: 16px;
                margin: 8px;
                border: 2px solid transparent;
                background: linear-gradient(145deg, #2c2c2c, #1a1a1a);
                cursor: pointer;
                transition: all 0.3s ease;
                overflow: hidden;
            }

            .achievement-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            }

            .achievement-card.unlocked {
                border-color: #4CAF50;
                background: linear-gradient(145deg, #2d5a2d, #1a3d1a);
            }

            .achievement-card.locked {
                opacity: 0.7;
                border-color: #666;
            }

            /* Редкость достижений */
            .rarity-common { border-color: #808080; }
            .rarity-rare { border-color: #0077be; }
            .rarity-epic { border-color: #9932cc; }
            .rarity-legendary { border-color: #ff8c00; }
            .rarity-mythic { border-color: #ff0080; }

            /* Уведомления */
            .achievement-notification {
                background: linear-gradient(145deg, #2c2c2c, #1a1a1a);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                border-left: 4px solid #4CAF50;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: auto;
                max-width: 300px;
            }

            .achievement-notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .achievement-notification.hide {
                opacity: 0;
                transform: translateX(100%);
            }

            /* Модальное окно */
            .achievement-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .achievement-modal.show {
                opacity: 1;
            }

            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-content {
                background: linear-gradient(145deg, #2c2c2c, #1a1a1a);
                border-radius: 16px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                border: 2px solid #444;
            }

            /* Прогресс бары */
            .progress-bar {
                background: #333;
                border-radius: 8px;
                height: 8px;
                overflow: hidden;
                position: relative;
            }

            .progress-fill {
                background: linear-gradient(90deg, #4CAF50, #45a049);
                height: 100%;
                transition: width 1s ease;
                border-radius: 8px;
            }

            /* Конфетти */
            .confetti-particle {
                animation: confetti-fall 2s linear forwards;
            }

            @keyframes confetti-fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }

            /* Адаптивность */
            @media (max-width: 768px) {
                .achievement-notification {
                    max-width: calc(100vw - 40px);
                }
                
                .modal-content {
                    width: 95%;
                    padding: 16px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // =========================================================================
    // ГЕТТЕРЫ И ПУБЛИЧНЫЕ МЕТОДЫ
    // =========================================================================

    public getAllAchievements(): Achievement[] {
        return Array.from(this.achievements.values());
    }

    public getAchievement(id: string): Achievement | undefined {
        return this.achievements.get(id);
    }

    public getUnlockedAchievements(): Achievement[] {
        return this.getAllAchievements().filter(a => a.isUnlocked);
    }

    public getLockedAchievements(): Achievement[] {
        return this.getAllAchievements().filter(a => !a.isUnlocked);
    }

    public getAchievementsByCategory(category: string): Achievement[] {
        return this.getAllAchievements().filter(a => a.category === category);
    }

    public getAchievementsByRarity(rarity: string): Achievement[] {
        return this.getAllAchievements().filter(a => a.rarity === rarity);
    }

    public isReady(): boolean {
        return this.isInitialized;
    }

    // =========================================================================
    // ДЕСТРУКТОР
    // =========================================================================

    public destroy(): void {
        // Очищаем очередь уведомлений
        this.notificationQueue = [];
        this.isShowingNotification = false;

        // Удаляем контейнеры
        const notificationContainer = document.getElementById('achievement-notifications');
        if (notificationContainer) {
            notificationContainer.remove();
        }

        this.hideAchievementModal();

        // Удаляем стили
        const styles = document.getElementById('achievement-system-styles');
        if (styles) {
            styles.remove();
        }

        console.log('🧹 Система достижений уничтожена');
    }
}

// =============================================================================
// ЭКСПОРТ SINGLETON ЭКЗЕМПЛЯРА
// =============================================================================

export const achievementSystem = new AchievementSystem(); 