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
        { id: 'first_case', name: 'Первое дело', icon: '⭐', description: 'Первая жертва найдена' },
        { id: 'rookie', name: 'Новичок', icon: '🥇', description: '5 трупов исследовано' },
        { id: 'expert', name: 'Эксперт', icon: '🏆', description: '50 убийц поймано' },
        { id: 'sharp_eye', name: 'Меткий глаз', icon: '👁️', description: '80% точность расследований' },
        { id: 'detective', name: 'Детектив', icon: '🔍', description: '100 преступлений раскрыто' },
        { id: 'perfectionist', name: 'Перфекционист', icon: '💎', description: '10 идеальных расследований' },
        { id: 'speedster', name: 'Охотник', icon: '⚡', description: 'Быстрая поимка серийника' },
        { id: 'veteran', name: 'Ветеран', icon: '🎖️', description: '1 год охоты на убийц' },
        { id: 'genius', name: 'Гений', icon: '🧠', description: '95% точность профилирования' },
        { id: 'legend', name: 'Легенда', icon: '👑', description: '1000 дел закрыто' },
        { id: 'master', name: 'Мастер', icon: '🔥', description: '500 серийных убийц поймано' },
        { id: 'criminal_hunter', name: 'Охотник на убийц', icon: '🎯', description: 'Поймал опасного маньяка' }
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
            'first_case': {
                text: 'Завершите первое расследование',
                reward: '+50 очков опыта'
            },
            'rookie': {
                text: 'Проведите 5 расследований',
                reward: '+100 очков опыта'
            },
            'expert': {
                text: 'Проведите 25 расследований',
                reward: '+250 очков опыта'
            },
            'sharp_eye': {
                text: 'Достигните 80% точности при минимум 10 играх',
                reward: '+200 очков опыта'
            },
            'detective': {
                text: 'Проведите 50 расследований',
                reward: '+300 очков опыта'
            },
            'perfectionist': {
                text: 'Завершите 5 игр с идеальным результатом (5/5)',
                reward: '+400 очков опыта'
            },
            'speedster': {
                text: 'Достигните среднего времени ответа менее 20 секунд',
                reward: '+150 очков опыта'
            },
            'veteran': {
                text: 'Играйте в течение 6 месяцев',
                reward: '+500 очков опыта'
            },
            'genius': {
                text: 'Достигните 95% точности при минимум 20 играх',
                reward: '+600 очков опыта'
            },
            'legend': {
                text: 'Проведите 100 расследований',
                reward: '+1000 очков опыта'
            },
            'master': {
                text: 'Наберите 10,000 очков',
                reward: '+800 очков опыта'
            },
            'criminal_hunter': {
                text: 'Достигните серии из 10 правильных ответов подряд',
                reward: '+300 очков опыта'
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
            'first_case': {
                current: Math.min(stats.investigations || 0, 1),
                target: 1
            },
            'rookie': {
                current: Math.min(stats.investigations || 0, 5),
                target: 5
            },
            'expert': {
                current: Math.min(stats.investigations || 0, 25),
                target: 25
            },
            'sharp_eye': {
                current: (stats.investigations >= 10 && stats.accuracy >= 80) ? 1 : 0,
                target: 1
            },
            'detective': {
                current: Math.min(stats.investigations || 0, 50),
                target: 50
            },
            'perfectionist': {
                current: Math.min(stats.perfectGames || 0, 5),
                target: 5
            },
            'speedster': {
                current: (stats.averageTime && stats.averageTime <= 20000) ? 1 : 0,
                target: 1
            },
            'veteran': {
                // Проверяем дату регистрации (примерно)
                current: 0, // Заглушка, нужно проверить реальную дату
                target: 1
            },
            'genius': {
                current: (stats.investigations >= 20 && stats.accuracy >= 95) ? 1 : 0,
                target: 1
            },
            'legend': {
                current: Math.min(stats.investigations || 0, 100),
                target: 100
            },
            'master': {
                current: Math.min(stats.totalScore || 0, 10000),
                target: 10000
            },
            'criminal_hunter': {
                current: Math.min(stats.maxWinStreak || 0, 10),
                target: 10
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
        console.error('💥 Показываем ошибку:', message);

        // Создаем элемент ошибки если его нет
        let errorDiv = document.getElementById('profile-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'profile-error';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--blood-red);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 1000;
                font-size: 14px;
                max-width: 90%;
                text-align: center;
            `;
            document.body.appendChild(errorDiv);
        }

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Скрываем через 5 секунд
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 5000);
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