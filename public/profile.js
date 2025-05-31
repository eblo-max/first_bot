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
            console.log('📊 Загружаем профиль пользователя...');
            const response = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки профиля: ${response.status}`);
            }

            const userData = await response.json();
            ProfileState.user = userData;

            console.log('✅ Профиль загружен:', userData);
            this.updateProfileUI(userData);

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
            this.showTestData();
        }
    }

    updateProfileUI(userData) {
        console.log('🔄 Обновляем UI профиля:', userData);

        // Базовая информация
        const firstName = userData.basic?.firstName || userData.firstName || 'ДЕТЕКТИВ';
        const telegramId = userData.basic?.telegramId || userData.telegramId || '000000000';

        this.updateElement('detective-name', firstName.toUpperCase());
        this.updateElement('user-id', telegramId);

        // Уровень и XP
        const totalScore = userData.stats?.totalScore || 0;
        const level = this.calculateLevel(totalScore);
        const xpData = this.calculateXP(totalScore, level);

        this.updateElement('user-level', level);
        this.updateElement('detective-rank', ProfileConfig.levels.getRankByLevel(level));
        this.updateElement('current-xp', xpData.current.toLocaleString());
        this.updateElement('max-xp', xpData.max.toLocaleString());

        // Обновляем прогресс-бар с анимацией
        this.animateXPBar(xpData.percentage);

        // Статистика
        const stats = userData.stats || {};
        this.updateElement('stat-investigations', stats.investigations || 0);
        this.updateElement('stat-solved', stats.solvedCases || 0);
        this.updateElement('stat-streak', stats.winStreak || 0);

        // Точность с символом %
        const accuracy = Math.round(stats.accuracy || 0);
        const accuracyElement = document.getElementById('stat-accuracy');
        if (accuracyElement) {
            accuracyElement.innerHTML = `${accuracy}<span style="color: var(--accent-red);">%</span>`;
        }

        // Аватар
        this.loadUserAvatar(telegramId);

        // Анимации появления
        this.animateStatsCards();
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

    async loadUserAvatar(telegramId) {
        try {
            console.log('🖼️ Загружаем аватар пользователя...');
            const response = await fetch('/api/user/avatar', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data?.avatarUrl) {
                    const avatarPlaceholder = document.getElementById('avatar-placeholder');
                    if (avatarPlaceholder) {
                        avatarPlaceholder.innerHTML = `<img src="${data.data.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                        console.log('✅ Аватар загружен');
                    }
                } else {
                    console.log('⚠️ Аватар не найден в ответе API');
                }
            } else {
                console.log('⚠️ Не удалось загрузить аватар, используем заглушку');
            }
        } catch (error) {
            console.log('⚠️ Ошибка загрузки аватара:', error);
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

        const unlockedIds = userAchievements.map(a => a.id || a);
        let unlockedCount = 0;

        const achievementsHTML = ProfileConfig.achievements.map(achievement => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            if (isUnlocked) unlockedCount++;

            return `
                <div class="achievement-item ${isUnlocked ? '' : 'locked'}" 
                     title="${achievement.description}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-name">${achievement.name}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = achievementsHTML;

        // Обновляем счетчик
        this.updateElement('achievements-count', unlockedCount);

        // Добавляем интерактивность
        this.addAchievementInteractivity();
    }

    addAchievementInteractivity() {
        document.querySelectorAll('.achievement-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.provideCriminalFeedback('achievement');
                this.createHologramExplosion(item);
                this.createAdvancedParticles(item, item.classList.contains('locked') ? 'evidence' : 'crime');
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

    async loadLeaderboardData(period) {
        try {
            console.log(`📊 Загружаем лидербоард за ${period}...`);
            // Показываем скелетон загрузки
            this.showLeaderboardSkeleton();

            const response = await fetch(`/api/profile/leaderboard/${period}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            let data;
            if (response.ok) {
                const result = await response.json();
                // Преобразуем данные в нужный формат
                data = this.transformLeaderboardData(result, period);
                console.log('✅ Лидербоард загружен:', data);
            } else {
                console.log('⚠️ Не удалось загрузить лидербоард, используем тестовые данные');
                // Генерируем тестовые данные
                data = this.generateMockLeaderboard(period);
            }

            ProfileState.leaderboard.data[period] = data;
            ProfileState.leaderboard.current = period;

            this.renderLeaderboard(data);
            this.updateUserPosition(data);

        } catch (error) {
            console.error('❌ Ошибка загрузки рейтинга:', error);
            const mockData = this.generateMockLeaderboard(period);
            this.renderLeaderboard(mockData);
        }
    }

    transformLeaderboardData(apiData, period) {
        // Преобразуем данные API в формат, ожидаемый фронтендом
        const leaderboardData = apiData.totalScore || [];
        const currentUserId = ProfileState.user?.basic?.telegramId || ProfileState.user?.telegramId;

        const transformedLeaderboard = leaderboardData.map((user, index) => ({
            rank: index + 1,
            name: this.getUserDisplayName(user),
            score: user.stats?.totalScore || 0,
            isCurrentUser: user.telegramId === currentUserId
        }));

        // Найдем позицию текущего пользователя
        const currentUserEntry = transformedLeaderboard.find(entry => entry.isCurrentUser);
        const currentUser = currentUserEntry || {
            rank: Math.floor(Math.random() * 500) + 100, // Случайная позиция если не найден
            score: ProfileState.user?.stats?.totalScore || 0
        };

        return {
            leaderboard: transformedLeaderboard,
            currentUser: currentUser,
            meta: {
                period: period,
                total: Math.max(transformedLeaderboard.length, 1000) // Минимум показываем 1000 игроков
            }
        };
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

    generateMockLeaderboard(period) {
        const names = ['Шерлок Холмс', 'Эркюль Пуаро', 'Мисс Марпл', 'Коломбо', 'Морс', 'Ватсон'];
        const isCurrentUserInList = Math.random() > 0.5;

        return {
            leaderboard: names.map((name, index) => ({
                rank: index + 1,
                name: name,
                score: 5000 - (index * 500),
                isCurrentUser: isCurrentUserInList && index === 2
            })),
            currentUser: {
                rank: isCurrentUserInList ? 3 : 247,
                score: isCurrentUserInList ? 4000 : 1250
            },
            meta: {
                period: period,
                total: 12459
            }
        };
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

            @keyframes criminalGlitch {
                0%, 98%, 100% {
                    transform: translate(0);
                    filter: hue-rotate(0deg);
                }
                1% {
                    transform: translate(-2px, 1px);
                    filter: hue-rotate(90deg) contrast(1.5);
                }
                3% {
                    transform: translate(2px, -1px);
                    filter: hue-rotate(180deg) saturate(2);
                }
                5% {
                    transform: translate(-1px, -1px);
                    filter: hue-rotate(270deg) invert(0.1);
                }
            }

            .glitch-effect {
                animation: criminalGlitch 0.3s ease-in-out;
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
        // Случайные глитчи каждые 3 секунды
        setInterval(() => {
            if (Math.random() < 0.12) {
                const elements = document.querySelectorAll('.profile-name, .header-title, .position-rank');
                elements.forEach(el => {
                    el.classList.add('glitch-effect');
                    setTimeout(() => el.classList.remove('glitch-effect'), 300);
                });
            }
        }, 3000);

        // Тревожное мигание каждые 5 секунд
        setInterval(() => {
            if (Math.random() < 0.15) {
                const alertElements = document.querySelectorAll('.crime-stamp, .rank-badge, .level-badge');
                alertElements.forEach((el, index) => {
                    setTimeout(() => {
                        el.style.animation = 'none';
                        el.style.background = '#FF0040';
                        setTimeout(() => {
                            el.style.animation = '';
                            el.style.background = '';
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

    showTestData() {
        console.log('📊 Показываем тестовые данные');

        // Тестовые данные для демонстрации
        const testUser = {
            basic: { firstName: 'ЛАТА' },
            telegramId: '573113459',
            stats: {
                investigations: 10,
                solvedCases: 35,
                winStreak: 0,
                accuracy: 70,
                totalScore: 3750
            }
        };

        this.updateProfileUI(testUser);
    }

    showAuthError() {
        console.log('❌ Ошибка авторизации, показываем тестовые данные');
        this.showTestData();
    }

    showError(message) {
        console.error('❌', message);
        // Можно добавить toast уведомление
    }

    startPeriodicUpdates() {
        // Обновляем данные каждые 5 минут
        setInterval(() => {
            if (!ProfileState.isLoading) {
                this.loadLeaderboardData(ProfileState.leaderboard.current);
            }
        }, 5 * 60 * 1000);
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