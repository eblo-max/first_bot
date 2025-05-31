/**
 * Criminal Trust - Ultra Dramatic Profile Interface
 * Мрачный интерфейс профиля детектива с элементами true crime
 */

// Telegram WebApp API
let tg = window.Telegram?.WebApp;

// Конфигурация мрачного профиля
const ProfileConfig = {
    levels: {
        maxXP: [1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000],
        getRankByLevel: (level) => {
            const ranks = ['ПОДОЗРЕВАЕМЫЙ', 'ДЕТЕКТИВ', 'ИНСПЕКТОР', 'СЛЕДОВАТЕЛЬ', 'ЭКСПЕРТ', 'ОХОТНИК', 'ЛЕГЕНДА'];
            return ranks[Math.min(Math.floor(level / 3), ranks.length - 1)];
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

            // Показываем загрузку
            this.showLoadingState();

            // Авторизация
            const isAuth = await this.authenticate();

            if (isAuth) {
                // Загружаем данные параллельно
                await Promise.all([
                    this.loadUserProfile(),
                    this.loadUserAchievements(),
                    this.loadLeaderboardData('day')
                ]);

                this.hideLoadingState();

                // Инициализируем переключение вкладок лидербоарда
                this.initLeaderboardTabs();

                this.startPeriodicUpdates();
            } else {
                // Если авторизация не удалась, пробуем режим разработки
                const isDeveloperMode = window.location.search.includes('dev=true') ||
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

                if (isDeveloperMode) {
                    console.log('🔧 Режим разработки: пробуем авторизацию с тестовым токеном');
                    await this.tryDeveloperAuth();
                } else {
                    this.showAuthError();
                }
            }

        } catch (error) {
            console.error('❌ Ошибка инициализации профиля:', error);
            this.showError('Ошибка загрузки профиля');
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
            // Получаем токен из различных источников
            let token = new URLSearchParams(window.location.search).get('token') ||
                localStorage.getItem('token') ||
                localStorage.getItem('auth_token');

            // Если нет токена и есть Telegram WebApp, пытаемся авторизоваться
            if (!token && tg?.initData) {
                console.log('🔐 Авторизация через Telegram WebApp...');
                const response = await fetch('/api/auth/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initData: tg.initData })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.data?.token) {
                        token = data.data.token;
                        localStorage.setItem('token', token);
                        console.log('✅ Токен получен через Telegram');
                    }
                }
            }

            // Проверяем валидность токена
            if (token) {
                const response = await fetch('/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    this.token = token;
                    console.log('✅ Токен валиден');
                    return true;
                } else {
                    console.log('❌ Токен недействителен');
                    localStorage.removeItem('token');
                    localStorage.removeItem('auth_token');
                }
            }

            console.log('❌ Токен не найден или недействителен');
            return false;

        } catch (error) {
            console.error('❌ Ошибка авторизации:', error);
            return false;
        }
    }

    async tryDeveloperAuth() {
        try {
            // Пытаемся создать тестового пользователя для разработки
            const testToken = localStorage.getItem('dev_token');

            if (testToken) {
                console.log('🔧 Используем сохраненный dev токен');
                this.token = testToken;
                await this.loadUserProfile();
                await this.loadUserAchievements();
                await this.loadLeaderboardData('day');
                this.hideLoadingState();
                return;
            }

            console.log('🔧 Показываем тестовые данные для разработки');
            this.showTestData();
            this.hideLoadingState();

        } catch (error) {
            console.error('❌ Ошибка в режиме разработки:', error);
            this.showTestData();
            this.hideLoadingState();
        }
    }

    async loadUserProfile() {
        try {
            console.log('📊 Загружаем реальный профиль пользователя...');
            ProfileState.isLoading = true;

            const response = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Пользователь не найден');
                } else if (response.status === 401) {
                    throw new Error('Ошибка авторизации');
                } else {
                    throw new Error(`Ошибка сервера: ${response.status}`);
                }
            }

            const userData = await response.json();
            console.log('✅ Реальные данные профиля получены:', userData);

            ProfileState.user = userData;
            this.updateProfileUI(userData);

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
            this.showError(`Не удалось загрузить профиль: ${error.message}`);
        } finally {
            ProfileState.isLoading = false;
            this.hideLoadingState();
        }
    }

    updateProfileUI(userData) {
        try {
            console.log('🎨 Обновляем UI профиля с реальными данными');

            // Основные данные пользователя
            const basic = userData.basic || userData;

            // Обновляем основную информацию
            this.updateElement('detective-name', basic.firstName || basic.username || 'Детектив');
            this.updateElement('user-id', basic.telegramId);

            // Обновляем ранг
            const rank = userData.rank || basic.rank || 'НОВИЧОК';
            this.updateElement('detective-rank', rank.current || rank.displayName || rank);

            // Обновляем статистику
            const stats = userData.stats || {};
            this.updateElement('stat-investigations', stats.investigations || 0);
            this.updateElement('stat-solved', stats.solvedCases || stats.correctAnswers || 0);
            this.updateElement('stat-streak', stats.winStreak || stats.currentStreak || 0);

            // Рассчитываем точность
            let accuracy = stats.accuracy || 0;
            if (accuracy === 0 && stats.totalQuestions > 0) {
                accuracy = Math.round((stats.solvedCases / stats.totalQuestions) * 100);
            }
            this.updateElement('stat-accuracy', `${accuracy}%`);

            // Обновляем уровень и XP
            const level = this.calculateLevel(stats.totalScore || 0);
            this.updateElement('user-level', level);

            const { current, max } = this.calculateXP(stats.totalScore || 0, level);
            this.updateElement('current-xp', current.toLocaleString());
            this.updateElement('max-xp', max.toLocaleString());

            const xpPercentage = max > 0 ? (current / max) * 100 : 0;
            this.animateXPBar(xpPercentage);

            // Обновляем позицию в рейтинге
            this.updateElement('user-position', ProfileState.userPosition || '—');
            this.updateElement('total-players', ProfileState.totalPlayers || '1,000+');

            // Загружаем аватар
            this.loadUserAvatar(basic.telegramId);

            console.log('✅ UI профиля обновлен');
        } catch (error) {
            console.error('❌ Ошибка обновления UI:', error);
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
            const response = await fetch('/api/profile/achievements/available', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            let achievements = [];
            if (response.ok) {
                const data = await response.json();
                achievements = data.unlocked || [];
                console.log('✅ Достижения загружены:', achievements);
            } else {
                console.log('⚠️ Не удалось загрузить достижения, используем пустой список');
            }

            ProfileState.achievements = achievements;
            this.renderAchievements(achievements);

        } catch (error) {
            console.error('❌ Ошибка загрузки достижений:', error);
            this.renderAchievements([]);
        }
    }

    renderAchievements(userAchievements = []) {
        const container = document.getElementById('achievements-container');
        if (!container) return;

        const achievements = ProfileConfig.achievements.map(achievement => {
            const isUnlocked = userAchievements.some(ua => ua.id === achievement.id);
            return {
                ...achievement,
                unlocked: isUnlocked
            };
        });

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-item ${achievement.unlocked ? '' : 'locked'}" 
                 data-achievement-id="${achievement.id}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
            </div>
        `).join('');

        // Обновляем счетчик
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        const countElement = document.getElementById('achievements-count');
        if (countElement) {
            countElement.textContent = unlockedCount;
        }

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
        if (element) {
            element.textContent = value;

            // Для имени пользователя также обновляем data-text атрибут для голографического эффекта
            if (id === 'detective-name') {
                element.setAttribute('data-text', value);
            }
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