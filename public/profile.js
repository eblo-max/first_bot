/**
 * Criminal Trust - Ultra Dramatic Profile Interface
 * Мрачный интерфейс профиля детектива с элементами true crime
 */

// Telegram WebApp API
let tg = window.Telegram?.WebApp;

// Конфигурация мрачного профиля
const ProfileConfig = {
    levels: {
        // 🔥 НОВАЯ ЭКСПОНЕНЦИАЛЬНАЯ СИСТЕМА УРОВНЕЙ
        maxXP: [
            // Первые уровни (новички) - медленная прогрессия
            500,     // 1: ~10 игр
            1200,    // 2: ~14 игр  
            2500,    // 3: ~26 игр
            4500,    // 4: ~40 игр
            7500,    // 5: ~60 игр

            // Средние уровни (детективы) - нормальная прогрессия  
            12000,   // 6: ~84 игры
            18000,   // 7: ~120 игр
            26000,   // 8: ~160 игр
            36000,   // 9: ~200 игр
            50000,   // 10: ~250 игр

            // Высокие уровни (эксперты) - замедление
            70000,   // 11: ~320 игр
            95000,   // 12: ~420 игр
            130000,  // 13: ~550 игр
            175000,  // 14: ~700 игр
            235000,  // 15: ~900 игр

            // Мастерские уровни (легенды) - очень медленно
            315000,  // 16: ~1200 игр
            420000,  // 17: ~1600 игр
            560000,  // 18: ~2100 игр
            750000,  // 19: ~2800 игр
            1000000  // 20: ~3700 игр (максимум)
        ],

        // 🎖️ УЛУЧШЕННЫЕ РАНГИ С ПОДРАНГАМИ
        getRankByLevel: (level) => {
            const ranks = [
                // Новички (1-5)
                { name: 'ПОДОЗРЕВАЕМЫЙ', color: '#666666', icon: '🔰' },
                { name: 'СТАЖЕР', color: '#888888', icon: '👮‍♂️' },
                { name: 'ПАТРУЛЬНЫЙ', color: '#999999', icon: '🚔' },
                { name: 'СЕРЖАНТ', color: '#AAAAAA', icon: '⭐' },
                { name: 'ДЕТЕКТИВ', color: '#4169E1', icon: '🕵️' },

                // Средние (6-10) 
                { name: 'СТ.ДЕТЕКТИВ', color: '#1E90FF', icon: '🕵️‍♂️' },
                { name: 'ИНСПЕКТОР', color: '#00BFFF', icon: '👨‍💼' },
                { name: 'СТ.ИНСПЕКТОР', color: '#87CEEB', icon: '👨‍💼' },
                { name: 'ЛЕЙТЕНАНТ', color: '#FFD700', icon: '🎖️' },
                { name: 'КАПИТАН', color: '#FFA500', icon: '👑' },

                // Высокие (11-15)
                { name: 'МАЙОР', color: '#FF6347', icon: '🔥' },
                { name: 'ПОДПОЛКОВНИК', color: '#FF4500', icon: '💫' },
                { name: 'ПОЛКОВНИК', color: '#DC143C', icon: '⚡' },
                { name: 'ГЕНЕРАЛ', color: '#B22222', icon: '💎' },
                { name: 'ШЕФ ПОЛИЦИИ', color: '#8B0000', icon: '👨‍⚖️' },

                // Легендарные (16-20)
                { name: 'КОМИССАР', color: '#800080', icon: '🌟' },
                { name: 'СУП.КОМИССАР', color: '#9400D3', icon: '✨' },
                { name: 'МАСТЕР-ДЕТЕКТИВ', color: '#4B0082', icon: '🏆' },
                { name: 'ГРАНД-МАСТЕР', color: '#191970', icon: '💫' },
                { name: 'ЛЕГЕНДА', color: '#000080', icon: '👑' }
            ];

            const index = Math.min(Math.max(level - 1, 0), ranks.length - 1);
            return ranks[index];
        },

        // 📊 СИСТЕМА МНОЖИТЕЛЕЙ ОПЫТА
        experienceMultipliers: {
            // Базовые множители по типам активности
            perfect_game: 1.5,        // +50% за идеальную игру (5/5)
            speed_bonus: 1.3,         // +30% за быстрые ответы
            difficulty_master: 1.4,   // +40% за сложные дела
            consistency: 1.2,         // +20% за ежедневную игру
            streak_bonus: 1.6,        // +60% за серии побед

            // Достижения
            achievement_unlock: 2.0,  // +100% при разблокировке достижения

            // Сезонные события
            weekend_bonus: 1.1,       // +10% в выходные
            daily_first_game: 1.25,   // +25% за первую игру дня

            // Штрафы за "фарм"
            same_hour_penalty: 0.8,   // -20% за >3 игр в час
            same_day_penalty: 0.9     // -10% за >10 игр в день
        },

        // 🎯 СИСТЕМА МАСТЕРСТВА ПО ТИПАМ ПРЕСТУПЛЕНИЙ
        crimeTypeMastery: {
            murder: { name: 'Убийства', icon: '🔪', maxLevel: 10 },
            robbery: { name: 'Ограбления', icon: '💰', maxLevel: 10 },
            fraud: { name: 'Мошенничество', icon: '💳', maxLevel: 10 },
            theft: { name: 'Кражи', icon: '🏃‍♂️', maxLevel: 10 },
            cybercrime: { name: 'Киберпреступления', icon: '💻', maxLevel: 10 }
        }
    },
    achievements: [
        // 🚀 ПЕРВЫЕ ШАГИ (базовые достижения)
        { id: 'first_blood', name: 'Первая улика', icon: '🔍', description: 'Решили первое криминальное дело' },
        { id: 'rookie_investigator', name: 'Начинающий следователь', icon: '🕵️', description: 'Решили 10 дел' },
        { id: 'case_closer', name: 'Закрыватель дел', icon: '📝', description: 'Решили 50 дел' },
        { id: 'crime_solver', name: 'Раскрыватель преступлений', icon: '⚖️', description: 'Решили 100 дел правильно' },
        { id: 'detective_veteran', name: 'Ветеран детектив', icon: '🎖️', description: 'Решили 250 дел' },

        // 🎯 ТОЧНОСТЬ И МАСТЕРСТВО (редкие достижения)
        { id: 'sharp_shooter', name: 'Меткий стрелок', icon: '🎯', description: 'Точность 70% в 50+ делах' },
        { id: 'eagle_eye', name: 'Орлиный глаз', icon: '👁️', description: 'Точность 80% в 100+ делах' },
        { id: 'master_detective', name: 'Мастер-детектив', icon: '🏆', description: 'Точность 90% в 200+ делах' },
        { id: 'sherlock', name: 'Шерлок Холмс', icon: '🎩', description: 'Точность 95% в 300+ делах' },
        { id: 'perfectionist', name: 'Перфекционист', icon: '💎', description: '10 сессий подряд без ошибок' },

        // ⚡ СКОРОСТЬ РЕАКЦИИ (редкие достижения)
        { id: 'quick_draw', name: 'Быстрая реакция', icon: '⚡', description: '50 ответов за 15 секунд' },
        { id: 'speed_demon', name: 'Демон скорости', icon: '💨', description: '100 ответов за 10 секунд' },
        { id: 'lightning_fast', name: 'Молниеносный', icon: '🌟', description: 'Средняя скорость < 20 секунд (500 дел)' },
        { id: 'time_lord', name: 'Повелитель времени', icon: '⏰', description: 'Средняя скорость < 15 секунд (1000 дел)' },

        // 🔥 СЕРИИ И ПОСТОЯНСТВО (эпические достижения)
        { id: 'hot_streak', name: 'Горячая серия', icon: '🔥', description: '10 правильных ответов подряд' },
        { id: 'unstoppable', name: 'Неудержимый', icon: '💪', description: '25 правильных ответов подряд' },
        { id: 'legend_streak', name: 'Легендарная серия', icon: '👑', description: '50 правильных ответов подряд' },
        { id: 'untouchable', name: 'Неприкасаемый', icon: '⭐', description: '100 правильных ответов подряд' },
        { id: 'daily_detective', name: 'Ежедневный детектив', icon: '📅', description: 'Играл 30 дней подряд' },

        // 🏅 ПРОФЕССИОНАЛЬНЫЙ РОСТ (эпические достижения)
        { id: 'crime_fighter', name: 'Борец с преступностью', icon: '🚔', description: '500 дел решено' },
        { id: 'elite_investigator', name: 'Элитный следователь', icon: '🎖️', description: '1000 дел решено' },
        { id: 'legendary_detective', name: 'Легендарный детектив', icon: '⭐', description: '2500 дел решено' },
        { id: 'grand_master', name: 'Гроссмейстер', icon: '👑', description: '5000 дел решено' },
        { id: 'crime_lord', name: 'Король криминалистики', icon: '💎', description: '10000 дел решено' },

        // 🕰️ ЭКСТРЕМАЛЬНЫЕ ДОСТИЖЕНИЯ (редкие)
        { id: 'last_second_master', name: 'Мастер последней секунды', icon: '⏰', description: '100 ответов в последние 5 секунд' },
        { id: 'pressure_cooker', name: 'Под давлением', icon: '🔥', description: '50 ответов в последние 3 секунды' },
        { id: 'clutch_king', name: 'Король клатча', icon: '🎯', description: '25 ответов в последнюю секунду' },
        { id: 'ice_cold', name: 'Ледяное спокойствие', icon: '❄️', description: '200 ответов с 25-35 секундами' },

        // 📊 СТАТИСТИЧЕСКИЕ МИЛЬСТОУНЫ (эпические)
        { id: 'century_club', name: 'Клуб сотни', icon: '💯', description: '100 сессий сыграно' },
        { id: 'thousand_cases', name: 'Тысяча дел', icon: '🏛️', description: '1000 сессий сыграно' },
        { id: 'score_hunter', name: 'Охотник за очками', icon: '💰', description: '100,000 очков набрано' },
        { id: 'point_legend', name: 'Легенда очков', icon: '🏆', description: '1,000,000 очков набрано' },
        { id: 'score_god', name: 'Бог очков', icon: '💎', description: '10,000,000 очков набрано' },

        // 🌟 СПЕЦИАЛЬНЫЕ ВЫЗОВЫ (легендарные)
        { id: 'night_hunter', name: 'Ночной охотник', icon: '🌙', description: '500 дел решено ночью (00:00-06:00)' },
        { id: 'weekend_warrior', name: 'Воин выходных', icon: '🏖️', description: '1000 дел решено в выходные' },
        { id: 'workday_grind', name: 'Будничный труд', icon: '💼', description: '1000 дел решено в будни' },
        { id: 'marathon_runner', name: 'Марафонец', icon: '🏃', description: '100 дел за один день' },
        { id: 'endurance_master', name: 'Мастер выносливости', icon: '💪', description: '500 дел за неделю' },

        // 🏆 УЛЬТРА РЕДКИЕ (легендарные)
        { id: 'perfect_hundred', name: 'Идеальная сотня', icon: '🌟', description: '100 дел подряд без ошибок' },
        { id: 'speed_legend', name: 'Легенда скорости', icon: '🚀', description: '1000 дел со средним < 10 секунд' },
        { id: 'consistency_king', name: 'Король постоянства', icon: '⚖️', description: '365 дней игры подряд' },
        { id: 'ultimate_detective', name: 'Абсолютный детектив', icon: '💫', description: 'Все остальные достижения получены' }
    ]
};

// Состояние профиля
const ProfileState = {
    user: null,
    achievements: [],
    leaderboard: {
        current: 'day',
        data: {}
    },
    isLoading: false,
    criminalEffects: {
        glitchActive: false,
        bloodParticles: [],
        scanEffect: false
    }
};

/**
 * Основной класс управления профилем с криминальными эффектами
 */
class DramaticCriminalProfile {
    constructor() {
        this.initTelegramWebApp();
        this.initCriminalEffects();
        this.initAchievementModal();
        this.initProfile();
    }

    initTelegramWebApp() {
        if (tg) {
            tg.ready();
            tg.expand();

            // Настройка темы
            if (tg.themeParams) {
                this.applyDarkCriminalTheme();
            }

            // Кнопка назад
            if (tg.BackButton) {
                tg.BackButton.show();
                tg.BackButton.onClick(() => {
                    this.provideCriminalFeedback('navigation');
                    this.createBloodSpatter();
                    window.history.back();
                });
            }
        }
    }

    applyDarkCriminalTheme() {
        const theme = tg.themeParams;
        document.documentElement.style.setProperty('--midnight', theme.bg_color || '#0A0A0A');
        document.documentElement.style.setProperty('--bone', theme.text_color || '#F5F5DC');
    }

    async initProfile() {
        try {
            console.log('🚀 Инициализация современного профиля...');

            // Детектируем мобильное устройство
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('📱 Мобильное устройство:', isMobile);

            // ВАЖНО: Показываем loading БЕЗ отображения любых данных
            this.showProfileSkeleton();

            // Авторизация с дополнительными попытками для мобильных
            let isAuth = await this.authenticate();

            // СПЕЦИАЛЬНЫЙ FALLBACK ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ
            if (!isAuth && isMobile) {
                console.log('🔄 Первая попытка авторизации на мобильном не удалась, пробуем альтернативные методы...');

                // Попытка 1: Переинициализация Telegram WebApp
                if (tg) {
                    console.log('🔄 Попытка 1: Переинициализация Telegram WebApp...');
                    try {
                        tg.ready();
                        tg.expand();

                        // Ждем немного для стабилизации
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        isAuth = await this.authenticate();
                        if (isAuth) {
                            console.log('✅ Авторизация успешна после переинициализации Telegram WebApp');
                        }
                    } catch (e) {
                        console.error('❌ Ошибка переинициализации Telegram WebApp:', e);
                    }
                }

                // Попытка 2: Использование данных из URL параметров
                if (!isAuth) {
                    console.log('🔄 Попытка 2: Проверка токена в URL параметрах...');
                    const urlParams = new URLSearchParams(window.location.search);
                    const urlToken = urlParams.get('token') || urlParams.get('auth_token');

                    if (urlToken) {
                        console.log('🔍 Найден токен в URL:', urlToken.substring(0, 20) + '...');
                        localStorage.setItem('token', urlToken);
                        this.token = urlToken;
                        isAuth = true;
                    }
                }

                // Попытка 3: Проверка initData в localStorage 
                if (!isAuth) {
                    console.log('🔄 Попытка 3: Использование сохраненных initData...');
                    const savedInitData = localStorage.getItem('initData');

                    if (savedInitData && savedInitData !== tg?.initData) {
                        console.log('🔍 Найдены сохраненные initData, пробуем авторизацию...');
                        try {
                            const response = await fetch('/api/auth/init', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Mobile-Fallback': 'true'
                                },
                                body: JSON.stringify({ initData: savedInitData })
                            });

                            if (response.ok) {
                                const data = await response.json();
                                if (data.status === 'success' && data.data?.token) {
                                    localStorage.setItem('token', data.data.token);
                                    this.token = data.data.token;
                                    isAuth = true;
                                    console.log('✅ Авторизация успешна с сохраненными initData');
                                }
                            }
                        } catch (e) {
                            console.error('❌ Ошибка авторизации с сохраненными initData:', e);
                        }
                    }
                }

                // Попытка 4: Режим разработчика для мобильных
                if (!isAuth) {
                    console.log('🔄 Попытка 4: Проверка режима разработчика...');
                    const isDeveloperMode = window.location.search.includes('dev=true') ||
                        window.location.search.includes('debug=true') ||
                        window.location.hostname === 'localhost';

                    if (isDeveloperMode) {
                        console.log('🔧 Режим разработчика активен - пробуем тестовую авторизацию');
                        await this.tryDeveloperAuth();
                        isAuth = true;
                    }
                }
            }

            if (isAuth) {
                // Загружаем данные параллельно (достижения теперь грузятся в updateProfileUI)
                await Promise.all([
                    this.loadUserProfile(),
                    this.loadLeaderboardData('day')
                ]);

                this.hideProfileSkeleton();

                // Инициализируем переключение вкладок лидербоарда
                this.initLeaderboardTabs();

                this.startPeriodicUpdates();
            } else {
                // Если все попытки не удались
                this.showAuthError();
            }

        } catch (error) {
            console.error('❌ Ошибка инициализации профиля:', error);
            this.showError('Ошибка загрузки профиля');
        }
    }

    async tryDeveloperAuth() {
        try {
            // В режиме разработки НЕ показываем никаких данных
            console.log('🔧 Режим разработчика - создаем временного пользователя для тестирования');

            // Показываем сообщение о тестовом режиме
            this.showDeveloperMessage();

        } catch (error) {
            console.error('❌ Ошибка в режиме разработки:', error);
            this.showDeveloperMessage();
        }
    }

    // 🔄 НОВЫЕ МЕТОДЫ ДЛЯ ПРАВИЛЬНОГО СОСТОЯНИЯ ЗАГРУЗКИ

    showProfileSkeleton() {
        console.log('⏳ Показываем skeleton загрузки профиля');

        // Скрываем весь контент профиля
        const profileContent = document.querySelector('.profile-container');
        if (profileContent) {
            profileContent.style.display = 'none';
        }

        // Показываем skeleton loader
        const existingSkeleton = document.getElementById('profile-skeleton');
        if (existingSkeleton) {
            existingSkeleton.style.display = 'block';
            return;
        }

        // Создаем skeleton loader
        const skeleton = document.createElement('div');
        skeleton.id = 'profile-skeleton';
        skeleton.className = 'profile-skeleton-container';
        skeleton.innerHTML = `
            <div class="skeleton-header">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton-name"></div>
                    <div class="skeleton-rank"></div>
                    <div class="skeleton-level"></div>
                </div>
            </div>
            
            <div class="skeleton-progress">
                <div class="skeleton-progress-bar"></div>
                <div class="skeleton-progress-text"></div>
            </div>
            
            <div class="skeleton-stats">
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
            </div>
            
            <div class="skeleton-loading-text">
                <div class="loading-dots">Загрузка профиля<span class="dots">...</span></div>
            </div>
        `;

        // Добавляем стили для skeleton
        const style = document.createElement('style');
        style.textContent = `
            .profile-skeleton-container {
                max-width: 500px;
                margin: 0 auto;
                padding: 20px;
                color: #F5F5DC;
            }

            .skeleton-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 30px;
                padding: 20px;
                background: rgba(26, 26, 26, 0.8);
                border: 1px solid rgba(220, 20, 60, 0.3);
                border-radius: 16px;
            }

            .skeleton-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(90deg, rgba(220, 20, 60, 0.2) 25%, rgba(220, 20, 60, 0.4) 50%, rgba(220, 20, 60, 0.2) 75%);
                background-size: 200% 100%;
                animation: skeletonPulse 1.5s ease-in-out infinite;
            }

            .skeleton-info {
                flex: 1;
            }

            .skeleton-name, .skeleton-rank, .skeleton-level {
                height: 16px;
                background: linear-gradient(90deg, rgba(220, 20, 60, 0.2) 25%, rgba(220, 20, 60, 0.4) 50%, rgba(220, 20, 60, 0.2) 75%);
                background-size: 200% 100%;
                animation: skeletonPulse 1.5s ease-in-out infinite;
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .skeleton-name { width: 60%; }
            .skeleton-rank { width: 80%; }
            .skeleton-level { width: 40%; }

            .skeleton-progress {
                margin-bottom: 30px;
                padding: 15px;
                background: rgba(26, 26, 26, 0.6);
                border: 1px solid rgba(220, 20, 60, 0.2);
                border-radius: 12px;
            }

            .skeleton-progress-bar {
                height: 12px;
                background: linear-gradient(90deg, rgba(220, 20, 60, 0.2) 25%, rgba(220, 20, 60, 0.4) 50%, rgba(220, 20, 60, 0.2) 75%);
                background-size: 200% 100%;
                animation: skeletonPulse 1.5s ease-in-out infinite;
                border-radius: 6px;
                margin-bottom: 8px;
            }

            .skeleton-progress-text {
                height: 14px;
                width: 50%;
                background: linear-gradient(90deg, rgba(220, 20, 60, 0.2) 25%, rgba(220, 20, 60, 0.4) 50%, rgba(220, 20, 60, 0.2) 75%);
                background-size: 200% 100%;
                animation: skeletonPulse 1.5s ease-in-out infinite;
                border-radius: 7px;
            }

            .skeleton-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-bottom: 30px;
            }

            .skeleton-stat {
                height: 60px;
                background: linear-gradient(90deg, rgba(220, 20, 60, 0.2) 25%, rgba(220, 20, 60, 0.4) 50%, rgba(220, 20, 60, 0.2) 75%);
                background-size: 200% 100%;
                animation: skeletonPulse 1.5s ease-in-out infinite;
                border-radius: 12px;
            }

            .skeleton-loading-text {
                text-align: center;
                padding: 20px;
            }

            .loading-dots {
                font-size: 1.1rem;
                color: #DC143C;
                font-weight: 600;
            }

            .dots {
                animation: dotAnimation 1.5s infinite;
            }

            @keyframes skeletonPulse {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }

            @keyframes dotAnimation {
                0%, 20% { color: transparent; }
                40% { color: #DC143C; }
                100% { color: #DC143C; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(skeleton);
    }

    hideProfileSkeleton() {
        console.log('✅ Скрываем skeleton и показываем реальный профиль');

        const skeleton = document.getElementById('profile-skeleton');
        if (skeleton) {
            skeleton.style.display = 'none';
        }

        const profileContent = document.querySelector('.profile-container');
        if (profileContent) {
            profileContent.style.display = 'block';
        }

        // Проверяем наличие всех необходимых элементов
        this.checkDOMElements();
    }

    // Новый метод для проверки элементов DOM
    checkDOMElements() {
        const requiredElements = [
            'detective-name',
            'user-id',
            'user-level',
            'detective-rank',
            'user-avatar',
            'avatar-placeholder',
            'current-xp',
            'max-xp',
            'xp-bar',
            'stat-investigations',
            'stat-solved',
            'stat-streak',
            'stat-accuracy'
        ];

        console.log('🔍 Проверка элементов DOM:');

        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`✅ ${id}: найден`);
            } else {
                console.error(`❌ ${id}: НЕ НАЙДЕН!`);
            }
        });

        // Дополнительная проверка контейнеров
        const containers = [
            '.profile-card',
            '.stats-grid',
            '.achievements-scroll',
            '.leaderboard-container'
        ];

        containers.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`✅ ${selector}: найден`);
            } else {
                console.error(`❌ ${selector}: НЕ НАЙДЕН!`);
            }
        });
    }

    showDeveloperMessage() {
        const skeleton = document.getElementById('profile-skeleton');
        if (skeleton) {
            skeleton.innerHTML = `
                <div class="developer-message">
                    <div class="dev-icon">🔧</div>
                    <h3>Режим разработчика</h3>
                    <p>Профиль недоступен в режиме разработки.<br>Для полного функционала откройте приложение в Telegram.</p>
                    <button onclick="window.location.reload()" class="dev-reload-btn">
                        Перезагрузить
                    </button>
                </div>
            `;

            // Добавляем стили для сообщения разработчика
            const style = document.createElement('style');
            style.textContent = `
                .developer-message {
                    text-align: center;
                    padding: 40px;
                    background: rgba(26, 26, 26, 0.9);
                    border: 2px solid #DC143C;
                    border-radius: 16px;
                    color: #F5F5DC;
                }

                .dev-icon {
                    font-size: 3rem;
                    margin-bottom: 20px;
                }

                .developer-message h3 {
                    color: #DC143C;
                    margin-bottom: 15px;
                    font-size: 1.3rem;
                }

                .developer-message p {
                    opacity: 0.8;
                    line-height: 1.5;
                    margin-bottom: 25px;
                }

                .dev-reload-btn {
                    background: #DC143C;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .dev-reload-btn:hover {
                    background: #B91C3C;
                    transform: translateY(-2px);
                }
            `;
            document.head.appendChild(style);
        }
    }

    initLeaderboardTabs() {
        const tabs = document.querySelectorAll('.leaderboard-tab');
        if (!tabs.length) return;

        console.log('🔧 Инициализируем переключение вкладок лидербоарда');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                // Убираем активный класс у всех вкладок
                tabs.forEach(t => t.classList.remove('active'));

                // Добавляем активный класс к нажатой вкладке
                tab.classList.add('active');

                // Получаем период из data-period
                const period = tab.dataset.period;
                console.log(`📊 Переключаемся на период: ${period}`);

                // Загружаем данные для выбранного периода
                await this.loadLeaderboardData(period);

                // Haptic feedback
                this.provideCriminalFeedback('leaderboard');
            });
        });

        // Устанавливаем активную вкладку "день" по умолчанию
        const dayTab = document.querySelector('.leaderboard-tab[data-period="day"]');
        if (dayTab) {
            dayTab.classList.add('active');
        }
    }

    async authenticate() {
        try {
            console.log('🔐 === НАЧАЛО ДЕТАЛЬНОЙ ДИАГНОСТИКИ АВТОРИЗАЦИИ ===');
            console.log('🔍 Platform:', tg?.platform || 'UNKNOWN');
            console.log('🔍 Version:', tg?.version || 'UNKNOWN');
            console.log('🔍 User-Agent:', navigator.userAgent);
            console.log('🔍 Is Mobile:', /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
            console.log('🔍 Screen:', `${screen.width}x${screen.height}`);

            // Диагностика Telegram WebApp состояния
            if (tg) {
                console.log('🔍 Telegram WebApp State:');
                console.log('  - initData length:', tg.initData?.length || 0);
                console.log('  - initData sample:', tg.initData?.substring(0, 100) + '...' || 'EMPTY');
                console.log('  - initDataUnsafe:', JSON.stringify(tg.initDataUnsafe, null, 2));
                console.log('  - isExpanded:', tg.isExpanded);
                console.log('  - viewportHeight:', tg.viewportHeight);
                console.log('  - colorScheme:', tg.colorScheme);
            } else {
                console.error('❌ Telegram WebApp объект недоступен!');
            }

            // Получаем токен из различных источников
            let token = new URLSearchParams(window.location.search).get('token') ||
                localStorage.getItem('token') ||
                localStorage.getItem('auth_token');

            console.log('🔍 Поиск существующего токена:', token ? `НАЙДЕН (${token.substring(0, 20)}...)` : 'НЕТ');

            // Если нет токена и есть Telegram WebApp, пытаемся авторизоваться
            if (!token && tg?.initData) {
                console.log('🔐 Попытка авторизации через Telegram WebApp...');
                console.log('🔍 Отправляемые данные на сервер:');
                console.log('  - initData длина:', tg.initData.length);
                console.log('  - initData начало:', tg.initData.substring(0, 200));

                const authPayload = { initData: tg.initData };
                console.log('🔍 Auth payload:', JSON.stringify(authPayload, null, 2));

                const response = await fetch('/api/auth/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': navigator.userAgent
                    },
                    body: JSON.stringify(authPayload)
                });

                console.log('🔍 Ответ сервера:');
                console.log('  - Status:', response.status);
                console.log('  - Status Text:', response.statusText);
                console.log('  - Headers:', [...response.headers.entries()]);

                if (response.ok) {
                    const data = await response.json();
                    console.log('  - Response Data:', JSON.stringify(data, null, 2));

                    if (data.status === 'success' && data.data?.token) {
                        token = data.data.token;
                        localStorage.setItem('token', token);
                        console.log('✅ Токен получен через Telegram');
                    } else {
                        console.error('❌ Сервер не вернул токен:', data);
                    }
                } else {
                    const errorText = await response.text();
                    console.error('❌ Ошибка авторизации:');
                    console.error('  - Status:', response.status);
                    console.error('  - Error:', errorText);

                    // Пытаемся парсить как JSON для детальной диагностики
                    try {
                        const errorData = JSON.parse(errorText);
                        console.error('  - Parsed Error:', JSON.stringify(errorData, null, 2));
                    } catch (e) {
                        console.error('  - Raw Error Text:', errorText);
                    }
                }
            } else if (!tg?.initData) {
                console.error('❌ initData отсутствует в Telegram WebApp!');
                console.log('🔍 Доступные данные Telegram:');
                console.log('  - tg объект:', !!tg);
                console.log('  - tg.initData:', tg?.initData || 'UNDEFINED');
                console.log('  - tg.initDataUnsafe:', tg?.initDataUnsafe || 'UNDEFINED');
            }

            // Проверяем валидность токена
            if (token) {
                console.log('🔍 Проверка валидности токена...');
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': navigator.userAgent
                    }
                });

                console.log('🔍 Результат проверки токена:');
                console.log('  - Status:', response.status);
                console.log('  - Status Text:', response.statusText);

                if (response.ok) {
                    this.token = token;
                    console.log('✅ Токен валиден');
                    return true;
                } else {
                    const errorText = await response.text();
                    console.log('❌ Токен недействителен:', errorText);
                    localStorage.removeItem('token');
                    localStorage.removeItem('auth_token');
                }
            }

            console.log('❌ Авторизация не удалась - токен отсутствует или недействителен');
            return false;

        } catch (error) {
            console.error('❌ Критическая ошибка авторизации:', error);
            console.error('❌ Stack trace:', error.stack);
            return false;
        }
    }

    async loadUserProfile() {
        try {
            console.log('📊 Загружаем реальный профиль пользователя...');
            console.log('🔑 Используемый токен:', this.token ? `${this.token.substring(0, 20)}...` : 'ОТСУТСТВУЕТ');

            ProfileState.isLoading = true;

            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Ответ сервера профиля:');
            console.log('  - Status:', response.status);
            console.log('  - Status Text:', response.statusText);
            console.log('  - Headers:', [...response.headers.entries()]);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка ответа сервера:');
                console.error('  - Status:', response.status);
                console.error('  - Error Text:', errorText);

                if (response.status === 404) {
                    throw new Error('Пользователь не найден');
                } else if (response.status === 401) {
                    throw new Error('Ошибка авторизации');
                } else {
                    throw new Error(`Ошибка сервера: ${response.status}`);
                }
            }

            const userData = await response.json();
            console.log('✅ ПОЛНЫЕ данные профиля получены:');
            console.log('📋 Структура userData:', JSON.stringify(userData, null, 2));

            // Детальный анализ структуры данных
            console.log('🔍 Анализ структуры данных:');
            console.log('  - Тип userData:', typeof userData);
            console.log('  - Ключи userData:', Object.keys(userData));

            if (userData.data) {
                console.log('  - Есть userData.data:', typeof userData.data);
                console.log('  - Ключи userData.data:', Object.keys(userData.data));
            }

            if (userData.user) {
                console.log('  - Есть userData.user:', typeof userData.user);
                console.log('  - Ключи userData.user:', Object.keys(userData.user));
            }

            // Поиск данных пользователя в различных местах
            let actualUserData = null;

            if (userData.data && typeof userData.data === 'object') {
                actualUserData = userData.data;
                console.log('📊 Используем userData.data');
            } else if (userData.user && typeof userData.user === 'object') {
                actualUserData = userData.user;
                console.log('📊 Используем userData.user');
            } else if (userData.firstName || userData.username || userData.telegramId) {
                actualUserData = userData;
                console.log('📊 Используем userData напрямую');
            } else {
                console.error('❌ Не найдены данные пользователя в ответе сервера!');
                actualUserData = userData; // попробуем anyway
            }

            console.log('🎯 Финальные данные для обработки:', actualUserData);

            ProfileState.user = actualUserData;
            this.updateProfileUI(actualUserData);

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
            console.error('❌ Stack trace:', error.stack);
            this.showError(`Не удалось загрузить профиль: ${error.message}`);
        } finally {
            ProfileState.isLoading = false;
        }
    }

    updateProfileUI(userData) {
        console.log('🔄 Обновление UI профиля...', userData);

        const stats = userData.stats || {};

        // Обновляем уровень и XP
        const level = this.calculateLevel(stats.totalScore || 0);
        this.updateElement('user-level', level);

        const { current, max } = this.calculateXP(stats.totalScore || 0, level);
        this.updateElement('current-xp', current.toLocaleString());
        this.updateElement('max-xp', max.toLocaleString());

        const xpPercentage = max > 0 ? (current / max) * 100 : 0;
        this.animateXPBar(xpPercentage);

        // 🎖️ ОБНОВЛЯЕМ РАНГ С НОВОЙ СИСТЕМОЙ
        this.updateRankDisplay(level);

        // Обновляем статистику
        this.updateElement('stat-investigations', stats.investigations || 0);
        this.updateElement('stat-solved', stats.solvedCases || 0);
        this.updateElement('stat-streak', stats.winStreak || 0);
        this.updateElement('stat-accuracy', stats.accuracy || 0);

        // 🔧 ИСПРАВЛЕННОЕ ОБНОВЛЕНИЕ ИМЕНИ И ID ПОЛЬЗОВАТЕЛЯ
        console.log('📝 Обрабатываем имя пользователя:', {
            firstName: userData.firstName,
            username: userData.username,
            telegramId: userData.telegramId
        });

        // Определяем имя для отображения
        let displayName = '';
        if (userData.firstName && userData.firstName.trim()) {
            displayName = userData.firstName.trim();
        } else if (userData.username && userData.username.trim()) {
            displayName = userData.username.trim();
        } else {
            displayName = 'Детектив';
        }

        console.log('✅ Финальное имя для отображения:', displayName);

        // Обновляем имя пользователя
        this.updateElement('detective-name', displayName.toUpperCase());
        const nameElement = document.getElementById('detective-name');
        if (nameElement) {
            nameElement.setAttribute('data-text', displayName.toUpperCase());
        }

        // Обновляем ID пользователя
        if (userData.telegramId) {
            this.updateElement('user-id', userData.telegramId);
        } else {
            this.updateElement('user-id', '—');
        }

        // Загружаем аватар если есть telegramId
        if (userData.telegramId) {
            this.loadUserAvatar(userData.telegramId);
        }

        console.log('✅ UI профиля обновлен, генерируем достижения...');

        // 🎖️ ПРИНУДИТЕЛЬНО ГЕНЕРИРУЕМ ДОСТИЖЕНИЯ НА ОСНОВЕ СТАТИСТИКИ
        if (stats && (stats.investigations > 0 || stats.totalScore > 0)) {
            console.log('🔧 Принудительная генерация достижений на основе статистики...');
            const generatedAchievements = this.generateBasicAchievements(stats);
            if (generatedAchievements.length > 0) {
                console.log('🎯 Применяем сгенерированные достижения:', generatedAchievements);
                ProfileState.achievements = generatedAchievements;
                this.renderAchievements(generatedAchievements);
            }
        }
    }

    calculateLevel(totalScore) {
        const levels = ProfileConfig.levels.maxXP;
        for (let i = 0; i < levels.length; i++) {
            if (totalScore < levels[i]) return i + 1;
        }
        return levels.length;
    }

    calculateXP(totalScore, level) {
        const levels = ProfileConfig.levels.maxXP;
        const prevLevelXP = level > 1 ? levels[level - 2] : 0;
        const currentLevelXP = levels[level - 1] || levels[levels.length - 1];

        const current = totalScore - prevLevelXP;
        const max = currentLevelXP - prevLevelXP;
        const percentage = Math.min((current / max) * 100, 100);

        return { current, max, percentage };
    }

    animateXPBar(percentage) {
        const xpBar = document.getElementById('xp-bar');
        if (xpBar) {
            // Сначала сбрасываем ширину
            xpBar.style.width = '0%';

            // Анимируем до нужного значения
            setTimeout(() => {
                xpBar.style.width = `${percentage}%`;
            }, 500);
        }
    }

    // Исправленная загрузка аватара для идеального круглого отображения
    async loadUserAvatar(telegramId) {
        const avatarContainer = document.getElementById('user-avatar');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');

        if (!telegramId || !avatarContainer) return;

        try {
            console.log('🖼️ Загружаем аватар пользователя...');
            const response = await fetch('/api/user/avatar', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'success' && data.data.hasAvatar) {
                    // Удаляем существующее изображение если есть
                    const existingImg = avatarContainer.querySelector('img');
                    if (existingImg) {
                        existingImg.remove();
                    }

                    // Создаем новый img элемент
                    const img = document.createElement('img');
                    img.alt = 'Аватар детектива';
                    img.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        object-position: center;
                        border-radius: 50%;
                        z-index: 2;
                        opacity: 0;
                        transition: opacity 0.5s ease;
                    `;

                    // Обработчики загрузки изображения
                    img.onload = () => {
                        console.log('✅ Аватар успешно загружен');
                        if (avatarPlaceholder) {
                            avatarPlaceholder.style.opacity = '0';
                        }

                        // Плавное появление аватара
                        setTimeout(() => {
                            img.style.opacity = '1';
                        }, 100);
                    };

                    img.onerror = () => {
                        console.log('❌ Ошибка загрузки аватара');
                        img.remove();
                        if (avatarPlaceholder) {
                            avatarPlaceholder.style.opacity = '1';
                        }
                    };

                    // Добавляем изображение в контейнер
                    avatarContainer.appendChild(img);

                    // Начинаем загрузку
                    img.src = data.data.avatarUrl;

                } else {
                    console.log('ℹ️ Аватар не найден, показываем заглушку');
                    if (avatarPlaceholder) {
                        avatarPlaceholder.style.opacity = '1';
                    }
                }
            } else {
                console.log('⚠️ Не удалось получить данные аватара');
                if (avatarPlaceholder) {
                    avatarPlaceholder.style.opacity = '1';
                }
            }
        } catch (error) {
            console.error('❌ Ошибка при загрузке аватара:', error);
            if (avatarPlaceholder) {
                avatarPlaceholder.style.opacity = '1';
            }
        }
    }

    async loadUserAchievements() {
        try {
            console.log('🏆 Загружаем достижения пользователя...');

            let userAchievements = [];

            // Сначала пробуем загрузить конкретные достижения пользователя
            try {
                const response = await fetch('/api/profile/achievements/available', {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('📊 Ответ API достижений:', data);

                    // Проверяем различные форматы ответа API
                    if (data.unlocked && Array.isArray(data.unlocked)) {
                        userAchievements = data.unlocked;
                    } else if (data.achievements && Array.isArray(data.achievements)) {
                        userAchievements = data.achievements;
                    } else if (data.data && data.data.unlocked && Array.isArray(data.data.unlocked)) {
                        userAchievements = data.data.unlocked;
                    } else if (data.data && data.data.achievements && Array.isArray(data.data.achievements)) {
                        userAchievements = data.data.achievements;
                    } else if (Array.isArray(data)) {
                        userAchievements = data;
                    }

                    console.log('✅ Открытые достижения из API:', userAchievements);
                } else {
                    console.log(`⚠️ API недоступен (${response.status}), переходим к генерации`);
                }
            } catch (apiError) {
                console.log('⚠️ Ошибка API достижений:', apiError.message);
            }

            // Если API не вернул достижения, пытаемся сгенерировать на основе статистики
            if (userAchievements.length === 0) {
                console.log('🔧 API не вернул достижения, генерируем на основе статистики...');

                // Альтернативный метод - из профиля пользователя
                if (ProfileState.user?.achievements && Array.isArray(ProfileState.user.achievements)) {
                    userAchievements = ProfileState.user.achievements;
                    console.log('📋 Достижения из профиля пользователя:', userAchievements);
                }

                // Генерируем основные достижения на основе статистики
                if (userAchievements.length === 0 && ProfileState.user?.stats) {
                    userAchievements = this.generateBasicAchievements(ProfileState.user.stats);
                    console.log('🎖️ Сгенерированные достижения:', userAchievements);
                }
            }

            ProfileState.achievements = userAchievements;
            this.renderAchievements(userAchievements);

            return userAchievements;

        } catch (error) {
            console.error('❌ Критическая ошибка загрузки достижений:', error);

            // Последняя попытка - генерируем базовые достижения
            if (ProfileState.user?.stats) {
                const basicAchievements = this.generateBasicAchievements(ProfileState.user.stats);
                console.log('🛠️ Fallback достижения:', basicAchievements);
                this.renderAchievements(basicAchievements);
                return basicAchievements;
            } else {
                console.log('❌ Нет данных для генерации достижений');
                this.renderAchievements([]);
                return [];
            }
        }
    }

    // Новый метод для генерации базовых достижений на основе статистики
    generateBasicAchievements(stats) {
        const achievements = [];

        console.log('📊 Статистика для генерации достижений:', stats);

        // Проверяем каждое достижение на основе статистики
        const investigations = stats.investigations || stats.totalGames || 0;
        const accuracy = stats.accuracy || 0;
        const winStreak = stats.winStreak || stats.currentStreak || 0;
        const totalScore = stats.totalScore || 0;
        const solvedCases = stats.solvedCases || stats.correctAnswers || 0;

        // Основные достижения по количеству дел
        if (investigations >= 1) {
            achievements.push({ id: 'first_blood', unlockedAt: new Date() });
        }
        if (investigations >= 10) {
            achievements.push({ id: 'rookie_investigator', unlockedAt: new Date() });
        }
        if (investigations >= 50) {
            achievements.push({ id: 'case_closer', unlockedAt: new Date() });
        }
        if (investigations >= 100) {
            achievements.push({ id: 'crime_solver', unlockedAt: new Date() });
        }
        if (investigations >= 250) {
            achievements.push({ id: 'detective_veteran', unlockedAt: new Date() });
        }

        // Достижения по точности
        if (investigations >= 50 && accuracy >= 70) {
            achievements.push({ id: 'sharp_shooter', unlockedAt: new Date() });
        }
        if (investigations >= 100 && accuracy >= 80) {
            achievements.push({ id: 'eagle_eye', unlockedAt: new Date() });
        }
        if (investigations >= 200 && accuracy >= 90) {
            achievements.push({ id: 'master_detective', unlockedAt: new Date() });
        }

        // Достижения по сериям
        if (winStreak >= 10) {
            achievements.push({ id: 'hot_streak', unlockedAt: new Date() });
        }
        if (winStreak >= 25) {
            achievements.push({ id: 'unstoppable', unlockedAt: new Date() });
        }

        // Достижения по общему счету
        if (totalScore >= 100000) {
            achievements.push({ id: 'score_hunter', unlockedAt: new Date() });
        }
        if (totalScore >= 1000000) {
            achievements.push({ id: 'point_legend', unlockedAt: new Date() });
        }

        // Достижения по количеству правильных ответов
        if (solvedCases >= 500) {
            achievements.push({ id: 'crime_fighter', unlockedAt: new Date() });
        }
        if (solvedCases >= 1000) {
            achievements.push({ id: 'elite_investigator', unlockedAt: new Date() });
        }

        console.log('🎖️ Сгенерированные достижения:', achievements);
        return achievements;
    }

    renderAchievements(userAchievements = []) {
        const container = document.getElementById('achievements-container');
        if (!container) return;

        console.log('🎨 Рендерим достижения. Пользовательские:', userAchievements);
        console.log('📋 Все доступные достижения:', ProfileConfig.achievements.length);

        // Создаем мапу открытых достижений для быстрого поиска
        const unlockedAchievementsMap = new Map();

        userAchievements.forEach(achievement => {
            if (typeof achievement === 'string') {
                // Если достижение просто строка (ID)
                unlockedAchievementsMap.set(achievement, true);
            } else if (achievement && achievement.id) {
                // Если достижение объект с ID
                unlockedAchievementsMap.set(achievement.id, achievement);
            }
        });

        console.log('🗺️ Карта открытых достижений:', unlockedAchievementsMap);

        // Объединяем все достижения с информацией о разблокировке
        const achievements = ProfileConfig.achievements.map(achievement => {
            const isUnlocked = unlockedAchievementsMap.has(achievement.id);
            const unlockedData = unlockedAchievementsMap.get(achievement.id);

            console.log(`🔍 Достижение ${achievement.id}: ${isUnlocked ? 'ОТКРЫТО' : 'ЗАКРЫТО'}`);

            return {
                ...achievement,
                unlocked: isUnlocked,
                unlockedAt: unlockedData && typeof unlockedData === 'object' ? unlockedData.unlockedAt : null
            };
        });

        console.log('🎯 Финальный список достижений для рендера:', achievements);

        // Рендерим HTML
        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-item ${achievement.unlocked ? '' : 'locked'}" 
                 data-achievement-id="${achievement.id}"
                 title="${achievement.unlocked ? 'Получено' : 'Заблокировано'}: ${achievement.description}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                ${achievement.unlocked ? '<div class="achievement-checkmark">✓</div>' : ''}
            </div>
        `).join('');

        // Обновляем счетчик
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        const countElement = document.getElementById('achievements-count');
        if (countElement) {
            countElement.textContent = unlockedCount;
        }

        console.log(`📊 Отображено ${unlockedCount} из ${achievements.length} достижений`);

        // Добавляем интерактивность
        this.addAchievementInteractivity();
    }

    addAchievementInteractivity() {
        document.querySelectorAll('.achievement-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.provideCriminalFeedback('achievement');

                // Получаем данные достижения
                const achievementId = item.dataset.achievementId || `achievement_${index}`;
                const isLocked = item.classList.contains('locked');

                // Показываем модальное окно
                this.showAchievementModal(achievementId, !isLocked);

                if (!isLocked) {
                    this.createHologramExplosion(item);
                    this.createAdvancedParticles(item, 'crime');
                }
            });

            item.addEventListener('mouseenter', () => {
                this.createAdvancedCrimeScene();
                item.classList.add('evidence-highlight');
            });

            item.addEventListener('mouseleave', () => {
                item.classList.remove('evidence-highlight');
            });

            // Задержка появления с драматичным эффектом
            item.style.animationDelay = `${index * 0.1}s`;
        });
    }

    showAchievementModal(achievementId, isUnlocked) {
        const modal = document.getElementById('achievement-modal');
        const modalIcon = document.getElementById('modal-icon');
        const modalTitle = document.getElementById('modal-title');
        const modalDescription = document.getElementById('modal-description');
        const modalStatus = document.getElementById('modal-status');
        const modalProgress = document.getElementById('modal-progress');
        const modalRequirement = document.getElementById('modal-requirement');
        const modalReward = document.getElementById('modal-reward');

        // Находим данные достижения
        const achievement = ProfileConfig.achievements.find(a => a.id === achievementId) || {
            id: achievementId,
            name: 'Неизвестное достижение',
            icon: '❓',
            description: 'Секретное достижение. Продолжайте расследования, чтобы узнать больше.'
        };

        // Заполняем основные данные
        modalIcon.textContent = achievement.icon;
        modalTitle.textContent = achievement.name;
        modalDescription.textContent = achievement.description;

        // Получаем требования и прогресс
        const requirementInfo = this.getAchievementRequirement(achievementId);
        const progressInfo = this.getAchievementProgress(achievementId);

        // Показываем требования
        const requirementText = document.getElementById('requirement-text');
        requirementText.textContent = requirementInfo.text;

        // Устанавливаем статус
        if (isUnlocked) {
            modalStatus.textContent = 'ПОЛУЧЕНО';
            modalStatus.className = 'achievement-modal-status unlocked';
            modalProgress.style.display = 'none';
            modalReward.style.display = 'block';

            // Показываем награду
            const rewardText = document.getElementById('reward-text');
            rewardText.textContent = requirementInfo.reward || '+100 очков опыта';
        } else {
            modalStatus.textContent = 'НЕ ПОЛУЧЕНО';
            modalStatus.className = 'achievement-modal-status locked';

            // Показываем прогресс только если есть данные
            if (progressInfo.current !== undefined && progressInfo.target > 0) {
                modalProgress.style.display = 'block';

                const progressCurrent = document.getElementById('progress-current');
                const progressTarget = document.getElementById('progress-target');
                const progressBar = document.getElementById('progress-bar');
                const progressPercentage = document.getElementById('progress-percentage');

                progressCurrent.textContent = progressInfo.current;
                progressTarget.textContent = progressInfo.target;

                const percentage = Math.min((progressInfo.current / progressInfo.target) * 100, 100);
                progressBar.style.width = `${percentage}%`;
                progressPercentage.textContent = `${Math.round(percentage)}%`;
            } else {
                modalProgress.style.display = 'none';
            }

            modalReward.style.display = 'none';
        }

        // Показываем модальное окно
        modal.classList.add('show');

        // Добавляем драматичные эффекты
        if (isUnlocked) {
            this.createCelebrationEffect();
        }

        // Haptic feedback
        this.provideCriminalFeedback('achievement');
    }

    getAchievementRequirement(achievementId) {
        const requirements = {
            // Основные достижения
            'first_blood': {
                text: 'Решили первое криминальное дело',
                reward: '+50 очков опыта'
            },
            'rookie_investigator': {
                text: 'Решили 10 дел',
                reward: '+100 очков опыта'
            },
            'case_closer': {
                text: 'Решили 50 дел',
                reward: '+200 очков опыта'
            },
            'crime_solver': {
                text: 'Решили 100 дел правильно',
                reward: '+500 очков опыта'
            },
            'detective_veteran': {
                text: 'Решили 250 дел',
                reward: '+1000 очков опыта'
            },

            // Профессиональные достижения
            'sharp_shooter': {
                text: 'Точность 70% в 50+ делах',
                reward: '+200 очков опыта'
            },
            'eagle_eye': {
                text: 'Точность 80% в 100+ делах',
                reward: '+300 очков опыта'
            },
            'master_detective': {
                text: 'Точность 90% в 200+ делах',
                reward: '+400 очков опыта'
            },
            'sherlock': {
                text: 'Точность 95% в 300+ делах',
                reward: '+500 очков опыта'
            },
            'perfectionist': {
                text: '10 сессий подряд без ошибок',
                reward: '+1000 очков опыта'
            },

            // Специальные достижения
            'quick_draw': {
                text: '50 ответов за 15 секунд',
                reward: '+100 очков опыта'
            },
            'speed_demon': {
                text: '100 ответов за 10 секунд',
                reward: '+200 очков опыта'
            },
            'lightning_fast': {
                text: 'Средняя скорость < 20 секунд (500 дел)',
                reward: '+300 очков опыта'
            },
            'time_lord': {
                text: 'Средняя скорость < 15 секунд (1000 дел)',
                reward: '+400 очков опыта'
            },

            // Серийные достижения
            'hot_streak': {
                text: 'Горячая серия',
                reward: '+100 очков опыта'
            },
            'unstoppable': {
                text: 'Неудержимый',
                reward: '+200 очков опыта'
            },
            'legend_streak': {
                text: 'Легендарная серия',
                reward: '+500 очков опыта'
            },
            'untouchable': {
                text: '100 правильных ответов подряд',
                reward: '+1000 очков опыта'
            },
            'daily_detective': {
                text: 'Играл 30 дней подряд',
                reward: '+800 очков опыта'
            },

            // Социальные достижения
            'crime_fighter': {
                text: '500 дел решено',
                reward: '+500 очков опыта'
            },
            'elite_investigator': {
                text: '1000 дел решено',
                reward: '+1000 очков опыта'
            },
            'legendary_detective': {
                text: '2500 дел решено',
                reward: '+2000 очков опыта'
            },
            'grand_master': {
                text: '5000 дел решено',
                reward: '+3000 очков опыта'
            },
            'crime_lord': {
                text: '10000 дел решено',
                reward: '+4000 очков опыта'
            },

            // Экстремальные достижения
            'last_second_master': {
                text: '100 ответов в последние 5 секунд',
                reward: '+100 очков опыта'
            },
            'pressure_cooker': {
                text: '50 ответов в последние 3 секунды',
                reward: '+200 очков опыта'
            },
            'clutch_king': {
                text: '25 ответов в последнюю секунду',
                reward: '+300 очков опыта'
            },
            'ice_cold': {
                text: '200 ответов с 25-35 секундами',
                reward: '+400 очков опыта'
            },

            // Статистические милстоуны
            'century_club': {
                text: '100 сессий сыграно',
                reward: '+1000 очков опыта'
            },
            'thousand_cases': {
                text: '1000 сессий сыграно',
                reward: '+2000 очков опыта'
            },
            'score_hunter': {
                text: '100,000 очков набрано',
                reward: '+5000 очков опыта'
            },
            'point_legend': {
                text: '1,000,000 очков набрано',
                reward: '+10000 очков опыта'
            },
            'score_god': {
                text: '10,000,000 очков набрано',
                reward: '+20000 очков опыта'
            },

            // Специальные вызовы
            'night_hunter': {
                text: '500 дел решено ночью (00:00-06:00)',
                reward: '+500 очков опыта'
            },
            'weekend_warrior': {
                text: '1000 дел решено в выходные',
                reward: '+1000 очков опыта'
            },
            'workday_grind': {
                text: '1000 дел решено в будни',
                reward: '+1000 очков опыта'
            },
            'marathon_runner': {
                text: '100 дел за один день',
                reward: '+1000 очков опыта'
            },
            'endurance_master': {
                text: '500 дел за неделю',
                reward: '+2000 очков опыта'
            },
            'perfect_hundred': {
                text: 'Идеальная сотня',
                reward: '+1000 очков опыта'
            },
            'speed_legend': {
                text: 'Легенда скорости',
                reward: '+1000 очков опыта'
            },
            'consistency_king': {
                text: '365 дней игры подряд',
                reward: '+1000 очков опыта'
            },
            'ultimate_detective': {
                text: 'Все остальные достижения получены',
                reward: '+10000 очков опыта'
            }
        };

        return requirements[achievementId] || {
            text: 'Продолжайте расследования для получения подсказок',
            reward: '+100 очков опыта'
        };
    }

    getAchievementProgress(achievementId) {
        if (!ProfileState.user?.stats) {
            return { current: 0, target: 1 };
        }

        const stats = ProfileState.user.stats;
        const progressMap = {
            'first_blood': {
                current: Math.min(stats.investigations || 0, 1),
                target: 1
            },
            'rookie_investigator': {
                current: Math.min(stats.investigations || 0, 10),
                target: 10
            },
            'case_closer': {
                current: Math.min(stats.investigations || 0, 50),
                target: 50
            },
            'crime_solver': {
                current: Math.min(stats.investigations || 0, 100),
                target: 100
            },
            'detective_veteran': {
                current: Math.min(stats.investigations || 0, 250),
                target: 250
            },
            'sharp_shooter': {
                current: (stats.investigations >= 50 && stats.accuracy >= 70) ? 1 : 0,
                target: 1
            },
            'eagle_eye': {
                current: (stats.investigations >= 100 && stats.accuracy >= 80) ? 1 : 0,
                target: 1
            },
            'master_detective': {
                current: (stats.investigations >= 200 && stats.accuracy >= 90) ? 1 : 0,
                target: 1
            },
            'sherlock': {
                current: (stats.investigations >= 300 && stats.accuracy >= 95) ? 1 : 0,
                target: 1
            },
            'perfectionist': {
                current: Math.min(stats.perfectGames || 0, 10),
                target: 10
            },
            'quick_draw': {
                current: (stats.averageTime && stats.averageTime <= 15000) ? 1 : 0,
                target: 1
            },
            'speed_demon': {
                current: (stats.averageTime && stats.averageTime <= 10000) ? 1 : 0,
                target: 1
            },
            'lightning_fast': {
                current: (stats.averageTime && stats.averageTime <= 20000) ? 1 : 0,
                target: 1
            },
            'time_lord': {
                current: (stats.averageTime && stats.averageTime <= 15000) ? 1 : 0,
                target: 1
            },
            'hot_streak': {
                current: Math.min(stats.winStreak || 0, 10),
                target: 10
            },
            'unstoppable': {
                current: Math.min(stats.winStreak || 0, 25),
                target: 25
            },
            'legend_streak': {
                current: Math.min(stats.winStreak || 0, 50),
                target: 50
            },
            'untouchable': {
                current: Math.min(stats.winStreak || 0, 100),
                target: 100
            },
            'daily_detective': {
                current: Math.min(stats.currentStreak || 0, 30),
                target: 30
            },
            'crime_fighter': {
                current: Math.min(stats.solvedCases || 0, 500),
                target: 500
            },
            'elite_investigator': {
                current: Math.min(stats.solvedCases || 0, 1000),
                target: 1000
            },
            'legendary_detective': {
                current: Math.min(stats.solvedCases || 0, 2500),
                target: 2500
            },
            'grand_master': {
                current: Math.min(stats.totalScore || 0, 500000),
                target: 500000
            },
            'crime_lord': {
                current: Math.min(stats.totalScore || 0, 1000000),
                target: 1000000
            },
            'last_second_master': {
                current: (stats.averageTime && stats.averageTime <= 5000) ? 1 : 0,
                target: 1
            },
            'pressure_cooker': {
                current: (stats.averageTime && stats.averageTime <= 3000) ? 1 : 0,
                target: 1
            },
            'clutch_king': {
                current: (stats.averageTime && stats.averageTime <= 1500) ? 1 : 0,
                target: 1
            },
            'ice_cold': {
                current: (stats.averageTime && stats.averageTime <= 20000) ? 1 : 0,
                target: 1
            },
            'century_club': {
                current: Math.min(stats.totalGames || 0, 100),
                target: 100
            },
            'thousand_cases': {
                current: Math.min(stats.totalGames || 0, 1000),
                target: 1000
            },
            'score_hunter': {
                current: Math.min(stats.totalScore || 0, 100000),
                target: 100000
            },
            'point_legend': {
                current: Math.min(stats.totalScore || 0, 1000000),
                target: 1000000
            },
            'score_god': {
                current: Math.min(stats.totalScore || 0, 10000000),
                target: 10000000
            },
            'night_hunter': {
                current: (stats.currentStreak && stats.currentStreak === 500) ? 1 : 0,
                target: 1
            },
            'weekend_warrior': {
                current: (stats.currentStreak && stats.currentStreak === 1000) ? 1 : 0,
                target: 1
            },
            'workday_grind': {
                current: (stats.currentStreak && stats.currentStreak === 1000) ? 1 : 0,
                target: 1
            },
            'marathon_runner': {
                current: (stats.currentStreak && stats.currentStreak === 100) ? 1 : 0,
                target: 1
            },
            'endurance_master': {
                current: (stats.currentStreak && stats.currentStreak === 500) ? 1 : 0,
                target: 1
            },
            'perfect_hundred': {
                current: (stats.perfectGames && stats.perfectGames === 100) ? 1 : 0,
                target: 1
            },
            'speed_legend': {
                current: (stats.totalGames && stats.totalGames >= 1000) ? 1 : 0,
                target: 1
            },
            'consistency_king': {
                current: (stats.currentStreak && stats.currentStreak === 365) ? 1 : 0,
                target: 1
            },
            'ultimate_detective': {
                current: (stats.totalScore && stats.totalScore >= 10000000) ? 1 : 0,
                target: 1
            }
        };

        return progressMap[achievementId] || { current: 0, target: 1 };
    }

    hideAchievementModal() {
        const modal = document.getElementById('achievement-modal');
        modal.classList.remove('show');
    }

    createCelebrationEffect() {
        // Создаем золотые частицы
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                    position: fixed;
                width: ${4 + Math.random() * 6}px;
                height: ${4 + Math.random() * 6}px;
                background: ${['#FFD700', '#FFA500', '#FF6347'][Math.floor(Math.random() * 3)]};
                border-radius: 50%;
                pointer-events: none;
                    z-index: 1001;
                left: 50%;
                top: 50%;
                box-shadow: 0 0 15px currentColor;
            `;

            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 15;
            const velocity = 80 + Math.random() * 40;
            let opacity = 1;
            let scale = 1;

            function animate() {
                const x = Math.cos(angle) * velocity * (1 - opacity);
                const y = Math.sin(angle) * velocity * (1 - opacity) - 50;

                particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                particle.style.opacity = opacity;

                opacity -= 0.02;
                scale += 0.03;

                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            }

            setTimeout(() => requestAnimationFrame(animate), i * 50);
        }
    }

    initAchievementModal() {
        const modal = document.getElementById('achievement-modal');
        const closeBtn = document.getElementById('modal-close');

        // Закрытие по кнопке
        closeBtn.addEventListener('click', () => {
            this.hideAchievementModal();
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideAchievementModal();
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.hideAchievementModal();
            }
        });
    }

    async loadLeaderboardData(period) {
        try {
            console.log(`📊 Загружаем лидербоард за ${period}...`);
            this.showLeaderboardSkeleton();

            const response = await fetch(`/api/profile/leaderboard/${period}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            console.log('✅ Данные лидербоарда получены:', result);

            // Преобразуем данные в нужный формат
            const data = this.transformLeaderboardData(result, period);

            ProfileState.leaderboard.data[period] = data;
            ProfileState.leaderboard.current = period;

            this.renderLeaderboard(data);
            this.updateUserPosition(data);

        } catch (error) {
            console.error('❌ Ошибка загрузки лидербоарда:', error);
            this.showError(`Не удалось загрузить рейтинг: ${error.message}`);

            // Показываем пустой лидербоард вместо mock данных
            this.renderEmptyLeaderboard();
        }
    }

    transformLeaderboardData(apiData, period) {
        try {
            // Проверяем структуру ответа API
            const leaderboardData = apiData.totalScore || apiData.data?.leaderboard || [];
            const currentUserId = ProfileState.user?.basic?.telegramId || ProfileState.user?.telegramId;

            console.log('🔄 Трансформируем данные лидербоарда:', { leaderboardData, currentUserId });

            const transformedLeaderboard = leaderboardData.map((user, index) => ({
                rank: index + 1,
                name: this.getUserDisplayName(user),
                score: user.stats?.totalScore || user.score || 0,
                isCurrentUser: user.telegramId === currentUserId
            }));

            // Найдем позицию текущего пользователя
            const currentUserEntry = transformedLeaderboard.find(entry => entry.isCurrentUser);

            const currentUser = currentUserEntry || {
                rank: '—',
                score: ProfileState.user?.stats?.totalScore || 0
            };

            return {
                leaderboard: transformedLeaderboard,
                currentUser: currentUser,
                meta: {
                    period: period,
                    total: Math.max(transformedLeaderboard.length, transformedLeaderboard.length)
                }
            };
        } catch (error) {
            console.error('❌ Ошибка трансформации данных лидербоарда:', error);
            return {
                leaderboard: [],
                currentUser: { rank: '—', score: 0 },
                meta: { period: period, total: 0 }
            };
        }
    }

    getUserDisplayName(user) {
        if (user.firstName) {
            return user.firstName + (user.lastName ? ` ${user.lastName}` : '');
        }
        if (user.username) {
            return user.username;
        }
        if (user.nickname) {
            return user.nickname;
        }
        return 'Детектив';
    }

    renderLeaderboard(data) {
        const container = document.getElementById('leaderboard-container');
        if (!container || !data.leaderboard) return;

        const leaderboardHTML = data.leaderboard.map(player => `
            <div class="leaderboard-item ${player.isCurrentUser ? 'current-user' : ''}">
                <div class="player-rank ${player.rank <= 3 ? 'top3' : ''}">${player.rank}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}${player.isCurrentUser ? ' (Вы)' : ''}</div>
                    <div class="player-score">${player.score.toLocaleString()} очков</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = leaderboardHTML;

        // Добавляем интерактивность
        this.addLeaderboardInteractivity();
    }

    updateUserPosition(data) {
        if (data.currentUser) {
            this.updateElement('user-position', data.currentUser.rank);
        }
        if (data.meta?.total) {
            this.updateElement('total-players', data.meta.total.toLocaleString());
        }
    }

    addLeaderboardInteractivity() {
        document.querySelectorAll('.leaderboard-item').forEach(item => {
            item.addEventListener('click', () => {
                this.provideCriminalFeedback('leaderboard');
                this.createScanningEffect(item);
                this.createAdvancedParticles(item, 'blood');
            });

            item.addEventListener('mouseenter', () => {
                if (Math.random() < 0.3) {
                    item.classList.add('blood-drip');
                }
            });

            item.addEventListener('mouseleave', () => {
                item.classList.remove('blood-drip');
            });
        });
    }

    showLeaderboardSkeleton() {
        const container = document.getElementById('leaderboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-skeleton" style="height: 60px; margin-bottom: 8px;"></div>
            <div class="loading-skeleton" style="height: 60px; margin-bottom: 8px;"></div>
            <div class="loading-skeleton" style="height: 60px;"></div>
        `;
    }

    // Новые драматичные эффекты
    createAdvancedCrimeScene() {
        // Создаем 8 частиц при наведении
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: ${['#8B0000', '#FF0040', '#DC143C', '#4A0000'][Math.floor(Math.random() * 4)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 10px currentColor;
                filter: blur(1px);
            `;
            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 8;
            const velocity = 40 + Math.random() * 20;
            let opacity = 1;
            let scale = 1;

            function animate() {
                const x = Math.cos(angle) * velocity * (1 - opacity);
                const y = Math.sin(angle) * velocity * (1 - opacity) - 20;

                particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                particle.style.opacity = opacity;

                opacity -= 0.025;
                scale += 0.02;

                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            }

            requestAnimationFrame(animate);
        }
    }

    createAdvancedParticles(element, type = 'crime') {
        const colors = {
            crime: ['#8B0000', '#FF0040', '#DC143C'],
            evidence: ['#FFD700', '#FFF200', '#DAA520'],
            blood: ['#8B0000', '#4A0000', '#5C1010']
        };

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: ${2 + Math.random() * 4}px;
                height: ${2 + Math.random() * 4}px;
                background: ${colors[type][Math.floor(Math.random() * colors[type].length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 8px currentColor;
            `;

            const rect = element.getBoundingClientRect();
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2}px`;

            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 12;
            const velocity = 30 + Math.random() * 40;
            let opacity = 1;

            function animate() {
                const x = Math.cos(angle) * velocity * (1 - opacity);
                const y = Math.sin(angle) * velocity * (1 - opacity);

                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = opacity;

                opacity -= 0.02;

                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            }

            requestAnimationFrame(animate);
        }
    }

    createScanningEffect(element) {
        const scanner = document.createElement('div');
        scanner.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 0, 64, 0.3), transparent);
            pointer-events: none;
            z-index: 10;
        `;

        element.style.position = 'relative';
        element.appendChild(scanner);

        scanner.animate([
            { left: '-100%' },
            { left: '100%' }
        ], {
            duration: 800,
            easing: 'ease-out'
        }).addEventListener('finish', () => {
            element.removeChild(scanner);
        });
    }

    createHologramExplosion(element) {
        // Создаем 20 светящихся фрагментов
        for (let i = 0; i < 20; i++) {
            const fragment = document.createElement('div');
            fragment.style.cssText = `
                position: absolute;
                width: ${3 + Math.random() * 6}px;
                height: ${3 + Math.random() * 6}px;
                background: ${['#FF0040', '#00BFFF', '#39FF14'][Math.floor(Math.random() * 3)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 15px currentColor;
                filter: blur(0.5px);
            `;

            const rect = element.getBoundingClientRect();
            fragment.style.left = `${rect.left + rect.width / 2}px`;
            fragment.style.top = `${rect.top + rect.height / 2}px`;

            document.body.appendChild(fragment);

            const angle = Math.random() * Math.PI * 2;
            const velocity = 60 + Math.random() * 40;
            let opacity = 1;
            let scale = 1;

            function animate() {
                const x = Math.cos(angle) * velocity * (1 - opacity);
                const y = Math.sin(angle) * velocity * (1 - opacity);

                fragment.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                fragment.style.opacity = opacity;

                opacity -= 0.015;
                scale += 0.03;

                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(fragment);
                }
            }

            requestAnimationFrame(animate);
        }
    }

    createAtmosphericEffects() {
        // Создаем 15 медленно плавающих частиц пыли
        for (let i = 0; i < 15; i++) {
            const dust = document.createElement('div');
            dust.style.cssText = `
                position: fixed;
                width: 1px;
                height: 1px;
                background: rgba(245, 245, 220, 0.3);
                border-radius: 50%;
                pointer-events: none;
                z-index: 5;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: floatDust ${10 + Math.random() * 20}s linear infinite;
            `;

            document.body.appendChild(dust);
        }
    }

    createRandomScanEffect() {
        // Случайные сканирования элементов каждые 8 секунд
        setInterval(() => {
            const elements = document.querySelectorAll('.stat-card, .achievement-item, .leaderboard-item');
            if (elements.length > 0 && Math.random() < 0.3) {
                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                this.createScanningEffect(randomElement);
            }
        }, 8000);
    }

    initCriminalEffects() {
        // Добавляем CSS для новых анимаций
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatDust {
                0% {
                    transform: translateY(0) translateX(0) rotate(0deg);
                    opacity: 0;
                }
                10%, 90% {
                    opacity: 0.3;
                }
                100% {
                    transform: translateY(-100vh) translateX(50px) rotate(360deg);
                    opacity: 0;
                }
            }

            .blood-drip {
                position: relative;
                overflow: hidden;
            }

            .blood-drip::after {
                content: '';
                position: absolute;
                top: -5px;
                left: 50%;
                width: 2px;
                height: 0;
                background: #8B0000;
                border-radius: 0 0 50% 50%;
                animation: bloodDrip 2s ease-in-out infinite;
            }

            @keyframes bloodDrip {
                0% { height: 0; top: -5px; }
                50% { height: 20px; top: 100%; }
                100% { height: 0; top: 100%; }
            }

            .evidence-highlight {
                position: relative;
            }

            .evidence-highlight::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, transparent, #FFD700, transparent);
                opacity: 0;
                z-index: -1;
                border-radius: inherit;
                animation: evidenceGlow 1s ease-in-out;
            }

            @keyframes evidenceGlow {
                0%, 100% { opacity: 0; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);

        // Запускаем атмосферные эффекты
        this.createAtmosphericEffects();
        this.createRandomScanEffect();
        this.startPeriodicCriminalEffects();
    }

    startPeriodicCriminalEffects() {
        // Случайные глитчи каждые 3 секунды - БЕЗ СДВИГОВ
        setInterval(() => {
            if (Math.random() < 0.12) {
                const elements = document.querySelectorAll('.profile-name, .header-title, .position-rank');
                elements.forEach(el => {
                    // Только цветовые эффекты, без сдвигов
                    el.style.filter = 'hue-rotate(180deg) contrast(1.3) saturate(2)';
                    setTimeout(() => {
                        el.style.filter = 'hue-rotate(90deg) invert(0.1)';
                        setTimeout(() => {
                            el.style.filter = '';
                        }, 50);
                    }, 50);
                });
            }
        }, 3000);

        // Тревожное мигание каждые 5 секунд
        setInterval(() => {
            if (Math.random() < 0.15) {
                const alertElements = document.querySelectorAll('.crime-stamp, .rank-badge, .level-badge-center');
                alertElements.forEach((el, index) => {
                    setTimeout(() => {
                        const originalBg = el.style.background;
                        const originalAnimation = el.style.animation;

                        el.style.animation = 'none';
                        el.style.background = 'linear-gradient(135deg, #FF0040, #8B0000)';
                        el.style.boxShadow = '0 0 20px #FF0040';

                        setTimeout(() => {
                            el.style.animation = originalAnimation;
                            el.style.background = originalBg;
                            el.style.boxShadow = '';
                        }, 200);
                    }, index * 100);
                });
            }
        }, 5000);
    }

    // Утилиты
    updateElement(id, value) {
        const element = document.getElementById(id);
        console.log(`🔧 updateElement: id="${id}", value="${value}", element=${element ? 'найден' : 'НЕ НАЙДЕН'}`);

        if (element) {
            element.textContent = value;
            console.log(`✅ Элемент ${id} обновлен значением: "${value}"`);

            // Для имени пользователя также обновляем data-text атрибут для голографического эффекта
            if (id === 'detective-name') {
                element.setAttribute('data-text', value);
                console.log(`✅ Установлен data-text для ${id}: "${value}"`);
            }
        } else {
            console.error(`❌ Элемент с ID "${id}" не найден в DOM!`);
        }
    }

    provideCriminalFeedback(type) {
        if (tg?.HapticFeedback) {
            const feedbackTypes = {
                navigation: 'heavy',
                achievement: 'heavy',
                leaderboard: 'medium',
                crime: 'heavy'
            };

            tg.HapticFeedback.impactOccurred(feedbackTypes[type] || 'light');
        }

        // Добавляем визуальную обратную связь
        if (type === 'achievement' || type === 'crime') {
            document.body.style.filter = 'hue-rotate(180deg) contrast(1.3)';
            setTimeout(() => {
                document.body.style.filter = '';
            }, 150);
        }
    }

    showLoadingState() {
        ProfileState.isLoading = true;
        // Показываем скелетоны если нужно
    }

    hideLoadingState() {
        ProfileState.isLoading = false;
    }

    showError(message) {
        console.log('🚨 Показываем ошибку:', message);

        this.hideLoadingState();

        // Создаем элемент ошибки
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${message}</div>
            <button class="retry-button" onclick="window.location.reload()">
                Попробовать снова
            </button>
        `;

        // Находим контейнер и показываем ошибку
        const container = document.querySelector('.profile-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorContainer);
        }

        // Применяем стили к ошибке
        errorContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            color: #ff4757;
            min-height: 300px;
        `;
    }

    showAuthError() {
        console.log('🔒 Показываем ошибку авторизации');

        const authModal = document.createElement('div');
        authModal.className = 'auth-error-modal';
        authModal.innerHTML = `
            <div class="auth-error-content">
                <div class="auth-error-icon">🔐</div>
                <h3>Для доступа к профилю необходима авторизация через Telegram</h3>
                <p>Откройте приложение в Telegram для корректной работы</p>
                <button class="auth-retry-button" onclick="window.location.reload()">
                    OK
                </button>
            </div>
        `;

        // Добавляем модальное окно в body
        document.body.appendChild(authModal);

        // Применяем стили
        authModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        const content = authModal.querySelector('.auth-error-content');
        content.style.cssText = `
            background: #1a1a1a;
            padding: 30px;
            border-radius: 15px;
            border: 1px solid #333;
            text-align: center;
            max-width: 350px;
            margin: 20px;
            color: #fff;
        `;

        const icon = authModal.querySelector('.auth-error-icon');
        icon.style.cssText = `
            font-size: 48px;
            margin-bottom: 20px;
        `;

        const button = authModal.querySelector('.auth-retry-button');
        button.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            margin-top: 20px;
            cursor: pointer;
            font-size: 16px;
        `;
    }

    startPeriodicUpdates() {
        // Обновляем данные каждые 5 минут
        setInterval(() => {
            if (!ProfileState.isLoading) {
                this.loadLeaderboardData(ProfileState.leaderboard.current);
            }
        }, 5 * 60 * 1000);
    }

    renderEmptyLeaderboard() {
        const container = document.getElementById('leaderboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-leaderboard">
                <div class="empty-leaderboard-icon">📊</div>
                <div class="empty-leaderboard-text">Нет данных</div>
                <div class="empty-leaderboard-subtext">Рейтинг временно недоступен</div>
            </div>
        `;
    }

    // 🔥 НОВАЯ СИСТЕМА РАСЧЕТА ОПЫТА С МНОЖИТЕЛЯМИ
    calculateAdvancedExperience(gameResult, userStats) {
        let baseExperience = gameResult.totalScore || 0;
        let multiplier = 1.0;
        let bonusReasons = [];

        const multipliers = ProfileConfig.levels.experienceMultipliers;
        const now = new Date();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;

        // 🎯 БОНУС ЗА ИДЕАЛЬНУЮ ИГРУ
        if (gameResult.correctAnswers === gameResult.totalQuestions) {
            multiplier *= multipliers.perfect_game;
            bonusReasons.push(`Идеальная игра: +${Math.round((multipliers.perfect_game - 1) * 100)}%`);
        }

        // ⚡ БОНУС ЗА СКОРОСТЬ (среднее время < 30 сек)
        const avgTime = gameResult.averageTime || gameResult.timeSpent / gameResult.totalQuestions;
        if (avgTime < 30000) { // менее 30 секунд
            multiplier *= multipliers.speed_bonus;
            bonusReasons.push(`Быстрая реакция: +${Math.round((multipliers.speed_bonus - 1) * 100)}%`);
        }

        // 🎖️ БОНУС ЗА СЛОЖНОСТЬ (hard дела)
        if (gameResult.difficulty === 'hard') {
            multiplier *= multipliers.difficulty_master;
            bonusReasons.push(`Мастер сложности: +${Math.round((multipliers.difficulty_master - 1) * 100)}%`);
        }

        // 🔥 БОНУС ЗА СЕРИЮ ПОБЕД
        if (userStats.winStreak >= 3) {
            const streakMultiplier = Math.min(1 + (userStats.winStreak * 0.1), 2.0); // до +100%
            multiplier *= streakMultiplier;
            bonusReasons.push(`Серия побед x${userStats.winStreak}: +${Math.round((streakMultiplier - 1) * 100)}%`);
        }

        // 📅 СЕЗОННЫЕ БОНУСЫ
        if (isWeekend) {
            multiplier *= multipliers.weekend_bonus;
            bonusReasons.push(`Выходные: +${Math.round((multipliers.weekend_bonus - 1) * 100)}%`);
        }

        // 🌅 БОНУС ЗА ПЕРВУЮ ИГРУ ДНЯ
        const today = now.toDateString();
        const lastPlayDate = userStats.lastPlayed ? new Date(userStats.lastPlayed).toDateString() : null;
        if (lastPlayDate !== today) {
            multiplier *= multipliers.daily_first_game;
            bonusReasons.push(`Первая игра дня: +${Math.round((multipliers.daily_first_game - 1) * 100)}%`);
        }

        // ⚠️ ШТРАФЫ ЗА ЧРЕЗМЕРНУЮ ИГРУ
        const gamesThisHour = this.getGamesInLastHour(userStats);
        const gamesToday = this.getGamesToday(userStats);

        if (gamesThisHour > 3) {
            multiplier *= multipliers.same_hour_penalty;
            bonusReasons.push(`Слишком много игр в час: ${Math.round((multipliers.same_hour_penalty - 1) * 100)}%`);
        }

        if (gamesToday > 10) {
            multiplier *= multipliers.same_day_penalty;
            bonusReasons.push(`Слишком много игр за день: ${Math.round((multipliers.same_day_penalty - 1) * 100)}%`);
        }

        // 📊 ФИНАЛЬНЫЙ РАСЧЕТ
        const finalExperience = Math.round(baseExperience * multiplier);
        const bonusExperience = finalExperience - baseExperience;

        return {
            base: baseExperience,
            multiplier: multiplier,
            bonus: bonusExperience,
            final: finalExperience,
            reasons: bonusReasons
        };
    }

    // 🕐 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ПОДСЧЕТА ИГР
    getGamesInLastHour(userStats) {
        // В реальной системе это будет запрос к БД
        // Пока заглушка, возвращает случайное число 0-5
        return Math.floor(Math.random() * 6);
    }

    getGamesToday(userStats) {
        // В реальной системе это будет запрос к БД
        // Пока заглушка, возвращает случайное число 0-15
        return Math.floor(Math.random() * 16);
    }

    // 🎖️ СИСТЕМА РАНГОВ С ЦВЕТАМИ И ИКОНКАМИ
    updateRankDisplay(level) {
        const rankInfo = ProfileConfig.levels.getRankByLevel(level);
        const rankElement = document.getElementById('detective-rank');

        if (rankElement && rankInfo) {
            rankElement.textContent = rankInfo.name;
            rankElement.style.color = rankInfo.color;
            rankElement.style.borderColor = rankInfo.color;

            // Добавляем иконку если есть
            const iconSpan = rankElement.querySelector('.rank-icon') || document.createElement('span');
            iconSpan.className = 'rank-icon';
            iconSpan.textContent = rankInfo.icon;

            if (!rankElement.querySelector('.rank-icon')) {
                rankElement.prepend(iconSpan);
            }
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔪 Запуск Dramatic Criminal Trust Profile');

    // Запускаем мрачный профиль
    new DramaticCriminalProfile();
});

// Экспорт для использования в других модулях
window.DramaticCriminalProfile = DramaticCriminalProfile;
window.ProfileState = ProfileState; 