/**
 * Система управления достижениями "Криминальный Блеф"
 * Включает анимации, прогресс-бары, уведомления и звуковые эффекты
 */

class AchievementSystem {
    constructor() {
        this.achievements = [];
        this.userStats = null;
        this.isInitialized = false;
        this.notificationQueue = [];
        this.isShowingNotification = false;

        // Конфигурация всех достижений с подробной информацией
        this.achievementConfig = {
            first_case: {
                id: 'first_case',
                name: 'Первое дело',
                description: 'Проведено первое расследование',
                category: 'Начинающий',
                icon: this.getAdvancedIcon('first_case'),
                requirement: { type: 'investigations', value: 1 },
                rarity: 'common',
                sound: 'success-light'
            },
            rookie: {
                id: 'rookie',
                name: 'Новичок',
                description: 'Проведено 5 расследований',
                category: 'Начинающий',
                icon: this.getAdvancedIcon('rookie'),
                requirement: { type: 'investigations', value: 5 },
                rarity: 'common',
                sound: 'success-medium'
            },
            expert: {
                id: 'expert',
                name: 'Эксперт',
                description: 'Проведено 50 расследований',
                category: 'Профессионал',
                icon: this.getAdvancedIcon('expert'),
                requirement: { type: 'investigations', value: 50 },
                rarity: 'rare',
                sound: 'success-heavy'
            },
            sharp_eye: {
                id: 'sharp_eye',
                name: 'Меткий глаз',
                description: 'Достигнута точность 80% минимум в 10 играх',
                category: 'Мастерство',
                icon: this.getAdvancedIcon('sharp_eye'),
                requirement: { type: 'accuracy', value: 80, minGames: 10 },
                rarity: 'epic',
                sound: 'success-heavy'
            },
            serial_detective: {
                id: 'serial_detective',
                name: 'Серийный детектив',
                description: '5 идеальных расследований подряд',
                category: 'Мастерство',
                icon: this.getAdvancedIcon('serial_detective'),
                requirement: { type: 'winStreak', value: 5 },
                rarity: 'epic',
                sound: 'success-epic'
            },
            maniac: {
                id: 'maniac',
                name: 'Маньяк',
                description: 'Набрано 1000 очков',
                category: 'Очки',
                icon: this.getAdvancedIcon('maniac'),
                requirement: { type: 'totalScore', value: 1000 },
                rarity: 'legendary',
                sound: 'success-legendary'
            },
            // Добавляем новые достижения
            perfectionist: {
                id: 'perfectionist',
                name: 'Перфекционист',
                description: '10 идеальных расследований (5/5 ответов)',
                category: 'Мастерство',
                icon: this.getAdvancedIcon('perfectionist'),
                requirement: { type: 'perfectGames', value: 10 },
                rarity: 'epic',
                sound: 'success-heavy'
            },
            speedster: {
                id: 'speedster',
                name: 'Скоростной детектив',
                description: 'Завершить игру менее чем за 60 секунд',
                category: 'Скорость',
                icon: this.getAdvancedIcon('speedster'),
                requirement: { type: 'fastGame', value: 60 },
                rarity: 'rare',
                sound: 'success-medium'
            },
            veteran: {
                id: 'veteran',
                name: 'Ветеран',
                description: 'Проведено 100 расследований',
                category: 'Профессионал',
                icon: this.getAdvancedIcon('veteran'),
                requirement: { type: 'investigations', value: 100 },
                rarity: 'legendary',
                sound: 'success-legendary'
            }
        };
    }

    /**
     * Инициализация системы достижений
     */
    init() {
        if (this.isInitialized) return;

        console.log('🏆 Инициализация системы достижений...');

        // Создаем стили для анимаций и уведомлений
        this.injectStyles();

        // Создаем контейнер для уведомлений
        this.createNotificationContainer();

        // Инициализируем звуковые эффекты
        this.initSoundEffects();

        this.isInitialized = true;
        console.log('✅ Система достижений инициализирована');
    }

    /**
     * Получение продвинутых иконок для достижений
     */
    getAdvancedIcon(achievementId) {
        const icons = {
            first_case: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path fill="url(#grad-${achievementId})" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                <circle cx="12" cy="12" r="2" fill="#FFF" opacity="0.8"/>
            `,
            rookie: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#4682B4;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle fill="url(#grad-${achievementId})" cx="12" cy="8" r="7" />
                <path fill="#FFF" d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" opacity="0.9"/>
            `,
            expert: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#9932CC;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#8A2BE2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path fill="url(#grad-${achievementId})" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                <path fill="#FFF" d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" opacity="0.9"/>
                <rect x="10" y="9" width="4" height="2" fill="#FFD700"/>
            `,
            sharp_eye: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FF6347;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#DC143C;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle fill="url(#grad-${achievementId})" cx="12" cy="12" r="10" />
                <path fill="#FFF" stroke="#FFF" stroke-width="2" d="M8 12l2 2 4-4" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="#FFF" stroke-width="1"/>
            `,
            serial_detective: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#32CD32;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path fill="url(#grad-${achievementId})" d="M9 11l3 3L22 4" stroke="#FFF" stroke-width="2"/>
                <path fill="url(#grad-${achievementId})" d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                <circle cx="15" cy="6" r="2" fill="#FFD700"/>
            `,
            maniac: `
                <defs>
                    <radialGradient id="grad-${achievementId}">
                        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                        <stop offset="70%" style="stop-color:#FF4500;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#8B0000;stop-opacity:1" />
                    </radialGradient>
                </defs>
                <circle cx="12" cy="12" r="10" fill="url(#grad-${achievementId})"/>
                <path fill="#FFF" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <text x="12" y="16" text-anchor="middle" fill="#FFF" font-size="8" font-weight="bold">1K</text>
            `,
            perfectionist: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#E6E6FA;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#9370DB;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle fill="url(#grad-${achievementId})" cx="12" cy="12" r="10"/>
                <path fill="#FFF" d="M7 12l3 3 6-6" stroke="#FFF" stroke-width="2"/>
                <circle cx="12" cy="12" r="6" fill="none" stroke="#FFF" stroke-width="1" stroke-dasharray="2,2"/>
            `,
            speedster: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#00BFFF;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#0080FF;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path fill="url(#grad-${achievementId})" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                <circle cx="18" cy="6" r="1.5" fill="#FFD700"/>
                <circle cx="6" cy="18" r="1.5" fill="#FFD700"/>
            `,
            veteran: `
                <defs>
                    <linearGradient id="grad-${achievementId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#DAA520;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#FFD700;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle fill="url(#grad-${achievementId})" cx="12" cy="12" r="10"/>
                <path fill="#8B0000" d="M12 4l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/>
                <circle cx="12" cy="12" r="2" fill="#FFD700"/>
                <text x="12" y="21" text-anchor="middle" fill="#FFF" font-size="6" font-weight="bold">100</text>
            `
        };

        return icons[achievementId] || icons.first_case;
    }

    /**
     * Внедрение CSS стилей для анимаций
     */
    injectStyles() {
        const styles = `
            <style id="achievement-system-styles">
                /* Контейнер уведомлений */
                .achievement-notifications {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    pointer-events: none;
                }

                /* Уведомление о достижении */
                .achievement-notification {
                    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                    border: 2px solid #FFD700;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    min-width: 300px;
                    max-width: 400px;
                    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
                    backdrop-filter: blur(10px);
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    pointer-events: auto;
                    position: relative;
                    overflow: hidden;
                }

                .achievement-notification::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
                    animation: achievement-shine 2s infinite;
                }

                .achievement-notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }

                .achievement-notification.rarity-common {
                    border-color: #87CEEB;
                    box-shadow: 0 8px 32px rgba(135, 206, 235, 0.3);
                }

                .achievement-notification.rarity-rare {
                    border-color: #9932CC;
                    box-shadow: 0 8px 32px rgba(153, 50, 204, 0.3);
                }

                .achievement-notification.rarity-epic {
                    border-color: #FF6347;
                    box-shadow: 0 8px 32px rgba(255, 99, 71, 0.3);
                }

                .achievement-notification.rarity-legendary {
                    border-color: #FFD700;
                    box-shadow: 0 8px 32px rgba(255, 215, 0, 0.5);
                    animation: achievement-legendary-glow 2s infinite alternate;
                }

                .achievement-notification-icon {
                    width: 48px;
                    height: 48px;
                    margin-right: 16px;
                    flex-shrink: 0;
                    animation: achievement-icon-bounce 1s ease-out;
                }

                .achievement-notification-content {
                    flex: 1;
                    color: #fff;
                }

                .achievement-notification-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: #FFD700;
                }

                .achievement-notification-desc {
                    font-size: 12px;
                    color: #ccc;
                    line-height: 1.3;
                }

                .achievement-notification-category {
                    font-size: 10px;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }

                /* Прогресс-бары для достижений */
                .achievement-progress {
                    margin-top: 8px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    height: 6px;
                    overflow: hidden;
                    position: relative;
                }

                .achievement-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #32CD32, #228B22);
                    border-radius: 4px;
                    transition: width 0.8s ease-out;
                    position: relative;
                }

                .achievement-progress-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                    animation: progress-shine 2s infinite;
                }

                .achievement-progress-text {
                    font-size: 10px;
                    color: #ccc;
                    margin-top: 2px;
                    text-align: center;
                }

                /* Улучшенные карточки достижений */
                .achievement.unlocked {
                    transform: scale(1.02);
                    box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);
                    animation: achievement-unlock-pulse 1s ease-out;
                }

                .achievement.new-unlock {
                    animation: achievement-new-unlock 2s ease-out;
                }

                /* Анимации */
                @keyframes achievement-shine {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }

                @keyframes achievement-legendary-glow {
                    0% { box-shadow: 0 8px 32px rgba(255, 215, 0, 0.5); }
                    100% { box-shadow: 0 8px 32px rgba(255, 215, 0, 0.8); }
                }

                @keyframes achievement-icon-bounce {
                    0% { transform: scale(0) rotate(0deg); }
                    50% { transform: scale(1.2) rotate(180deg); }
                    100% { transform: scale(1) rotate(360deg); }
                }

                @keyframes progress-shine {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }

                @keyframes achievement-unlock-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1.02); }
                }

                @keyframes achievement-new-unlock {
                    0% { 
                        transform: scale(1);
                        box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                    }
                    20% { 
                        transform: scale(1.1);
                        box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
                    }
                    40% { 
                        transform: scale(1.05);
                        box-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
                    }
                    100% { 
                        transform: scale(1.02);
                        box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);
                    }
                }

                /* Адаптивность для мобильных */
                @media (max-width: 480px) {
                    .achievement-notifications {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                    }
                    
                    .achievement-notification {
                        min-width: unset;
                        max-width: unset;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Создание контейнера для уведомлений
     */
    createNotificationContainer() {
        if (document.getElementById('achievement-notifications')) return;

        const container = document.createElement('div');
        container.id = 'achievement-notifications';
        container.className = 'achievement-notifications';
        document.body.appendChild(container);
    }

    /**
     * Инициализация звуковых эффектов
     */
    initSoundEffects() {
        // Создаем Web Audio API контекст для звуковых эффектов
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.soundEnabled = true;
        } catch (error) {
            console.warn('Web Audio API не поддерживается:', error);
            this.soundEnabled = false;
        }
    }

    /**
     * Воспроизведение звукового эффекта
     */
    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;

        const soundConfig = {
            'success-light': { frequency: 800, duration: 0.2 },
            'success-medium': { frequency: 1000, duration: 0.3 },
            'success-heavy': { frequency: 1200, duration: 0.4 },
            'success-epic': { frequency: 1400, duration: 0.5 },
            'success-legendary': { frequency: 1600, duration: 0.6 }
        };

        const config = soundConfig[type] || soundConfig['success-light'];

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.7, this.audioContext.currentTime + config.duration);

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    /**
     * Обновление пользовательской статистики
     */
    updateUserStats(stats) {
        this.userStats = stats;
        console.log('📊 Статистика пользователя обновлена:', stats);
    }

    /**
     * Получение прогресса достижения
     */
    getAchievementProgress(achievementId) {
        console.log(`🔍 Получение прогресса для достижения: ${achievementId}`);
        console.log('📊 Текущая статистика пользователя:', this.userStats);

        if (!this.userStats) {
            console.warn('⚠️ Статистика пользователя отсутствует');
            return { current: 0, required: 1, percentage: 0 };
        }

        const config = this.achievementConfig[achievementId];
        if (!config) {
            console.warn(`⚠️ Конфигурация для достижения ${achievementId} не найдена`);
            return { current: 0, required: 1, percentage: 0 };
        }

        console.log(`📋 Конфигурация достижения ${achievementId}:`, config.requirement);

        const req = config.requirement;
        let current = 0;
        let required = req.value;

        switch (req.type) {
            case 'investigations':
                current = this.userStats.investigations || 0;
                console.log(`🔎 Расследования: current=${current}, required=${required}`);
                break;
            case 'accuracy':
                current = this.userStats.accuracy || 0;
                required = req.value;
                // Проверяем минимальное количество игр
                if (req.minGames && (this.userStats.investigations || 0) < req.minGames) {
                    current = 0;
                    console.log(`🎯 Точность: недостаточно игр (${this.userStats.investigations || 0} < ${req.minGames}), current=0`);
                } else {
                    console.log(`🎯 Точность: current=${current}%, required=${required}%`);
                }
                break;
            case 'winStreak':
                current = this.userStats.winStreak || 0;
                console.log(`🔥 Серия побед: current=${current}, required=${required}`);
                break;
            case 'totalScore':
                current = this.userStats.totalScore || 0;
                console.log(`💯 Общий счет: current=${current}, required=${required}`);
                break;
            case 'perfectGames':
                current = this.userStats.perfectGames || 0;
                console.log(`⭐ Идеальные игры: current=${current}, required=${required}`);
                break;
            case 'fastGame':
                current = this.userStats.fastestGame || 999;
                // Для времени - инвертируем логику
                const result = {
                    current: Math.max(0, required - current),
                    required,
                    percentage: current <= required ? 100 : ((required / current) * 100)
                };
                console.log(`⚡ Быстрая игра: fastestGame=${current}s, required=${required}s, result=`, result);
                return result;
        }

        const percentage = Math.min(100, (current / required) * 100);
        const result = { current, required, percentage };
        console.log(`📈 Итоговый прогресс для ${achievementId}:`, result);
        return result;
    }

    /**
     * Показ уведомления о новом достижении
     */
    showAchievementNotification(achievement) {
        const config = this.achievementConfig[achievement.id];
        if (!config) {
            console.warn('Неизвестное достижение:', achievement.id);
            return;
        }

        console.log('🏆 Показываем уведомление о достижении:', achievement.name);

        // Добавляем в очередь
        this.notificationQueue.push({ achievement, config });

        // Если не показываем уведомление, начинаем показ
        if (!this.isShowingNotification) {
            this.processNotificationQueue();
        }

        // Воспроизводим звук
        this.playSound(config.sound);

        // Добавляем тактильную обратную связь через Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    }

    /**
     * Обработка очереди уведомлений
     */
    async processNotificationQueue() {
        if (this.notificationQueue.length === 0) {
            this.isShowingNotification = false;
            return;
        }

        this.isShowingNotification = true;
        const { achievement, config } = this.notificationQueue.shift();

        const container = document.getElementById('achievement-notifications');
        if (!container) return;

        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `achievement-notification rarity-${config.rarity}`;

        notification.innerHTML = `
            <svg class="achievement-notification-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                ${config.icon}
            </svg>
            <div class="achievement-notification-content">
                <div class="achievement-notification-title">${achievement.name}</div>
                <div class="achievement-notification-desc">${achievement.description}</div>
            </div>
        `;

        container.appendChild(notification);

        // Анимация появления
        setTimeout(() => notification.classList.add('show'), 100);

        // Автоматическое скрытие через 4 секунды
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }

                // Обрабатываем следующее уведомление через 500мс
                setTimeout(() => this.processNotificationQueue(), 500);
            }, 500);
        }, 4000);
    }

    /**
     * Обработка новых достижений от сервера
     */
    handleNewAchievements(newAchievements) {
        if (!Array.isArray(newAchievements) || newAchievements.length === 0) return;

        console.log('🎉 Получены новые достижения:', newAchievements);

        newAchievements.forEach(achievement => {
            this.showAchievementNotification(achievement);
            this.animateAchievementUnlock(achievement.id);
        });
    }

    /**
     * Анимация разблокировки достижения в UI
     */
    animateAchievementUnlock(achievementId) {
        const achievementElements = document.querySelectorAll('.achievement');

        achievementElements.forEach(element => {
            const achievementConfig = this.achievementConfig[achievementId];
            if (achievementConfig && element.dataset.achievementId === achievementId) {
                element.classList.remove('locked');
                element.classList.add('unlocked', 'new-unlock');

                // Убираем анимацию через 2 секунды
                setTimeout(() => {
                    element.classList.remove('new-unlock');
                }, 2000);
            }
        });
    }

    /**
     * Обновление прогресс-баров достижений
     */
    updateAchievementProgress() {
        if (!this.userStats) return;

        Object.keys(this.achievementConfig).forEach(achievementId => {
            const progressElement = document.querySelector(`[data-achievement-id="${achievementId}"] .achievement-progress-bar`);
            const textElement = document.querySelector(`[data-achievement-id="${achievementId}"] .achievement-progress-text`);

            if (progressElement && textElement) {
                const progress = this.getAchievementProgress(achievementId);

                progressElement.style.width = `${progress.percentage}%`;
                textElement.textContent = `${progress.current}/${progress.required}`;
            }
        });
    }

    /**
     * Рендеринг улучшенного списка достижений
     */
    renderEnhancedAchievements(userAchievements = []) {
        const container = document.querySelector('.achievements-grid');
        if (!container) return;

        // Очищаем контейнер
        container.innerHTML = '';

        Object.values(this.achievementConfig).forEach(config => {
            const isUnlocked = userAchievements.some(a => a.id === config.id);
            const progress = this.getAchievementProgress(config.id);

            const achievementEl = document.createElement('div');
            achievementEl.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'} rarity-${config.rarity}`;
            achievementEl.dataset.achievementId = config.id;
            achievementEl.title = config.description;

            achievementEl.innerHTML = `
                <svg class="achievement-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    ${isUnlocked ? config.icon : '<path d="M6 10h12M6 14h12M6 18h12" stroke="currentColor" opacity="0.3"/>'}
                </svg>
                <div class="achievement-name">${isUnlocked ? config.name : '???'}</div>
                ${!isUnlocked ? `
                    <div class="achievement-progress">
                        <div class="achievement-progress-bar" style="width: ${progress.percentage}%"></div>
                    </div>
                    <div class="achievement-progress-text">${progress.current}/${progress.required}</div>
                ` : ''}
            `;

            container.appendChild(achievementEl);
        });
    }
}

// Создаем глобальный экземпляр системы достижений
window.AchievementSystem = new AchievementSystem();

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AchievementSystem.init();
    });
} else {
    window.AchievementSystem.init();
} 