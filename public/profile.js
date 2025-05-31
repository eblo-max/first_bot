/**
 * Criminal Trust - Modern Profile Interface
 * Современный интерфейс профиля детектива
 */

// Telegram WebApp API
let tg = window.Telegram?.WebApp;

// Конфигурация современного профиля
const ProfileConfig = {
    levels: {
        maxXP: [1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000],
        getRankByLevel: (level) => {
            const ranks = ['НОВИЧОК', 'ДЕТЕКТИВ', 'ИНСПЕКТОР', 'СЛЕДОВАТЕЛЬ', 'ЭКСПЕРТ', 'МАСТЕР', 'ЛЕГЕНДА'];
            return ranks[Math.min(Math.floor(level / 3), ranks.length - 1)];
        }
    },
    achievements: [
        { id: 'first_case', name: 'Первое дело', icon: '⭐', description: 'Завершено первое расследование' },
        { id: 'rookie', name: 'Новичок', icon: '🥇', description: '5 завершенных дел' },
        { id: 'expert', name: 'Эксперт', icon: '🏆', description: '50 завершенных дел' },
        { id: 'sharp_eye', name: 'Меткий глаз', icon: '👁️', description: '80% точность' },
        { id: 'detective', name: 'Детектив', icon: '🔍', description: '100 раскрытых дел' },
        { id: 'perfectionist', name: 'Перфекционист', icon: '💎', description: '10 идеальных игр' },
        { id: 'speedster', name: 'Спидстер', icon: '⚡', description: 'Быстрое решение' },
        { id: 'veteran', name: 'Ветеран', icon: '🎖️', description: '1 год в игре' },
        { id: 'genius', name: 'Гений', icon: '🧠', description: '95% точность' },
        { id: 'legend', name: 'Легенда', icon: '👑', description: '1000 дел' },
        { id: 'master', name: 'Мастер', icon: '🔥', description: '500 побед подряд' },
        { id: 'criminal_hunter', name: 'Охотник', icon: '🎯', description: 'Специальное достижение' }
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
    isLoading: false
};

/**
 * Основной класс управления профилем
 */
class ModernProfileManager {
    constructor() {
        this.initTelegramWebApp();
        this.initProfile();
    }

    initTelegramWebApp() {
        if (tg) {
            tg.ready();
            tg.expand();

            // Настройка темы
            if (tg.themeParams) {
                this.applyTelegramTheme();
            }

            // Кнопка назад
            if (tg.BackButton) {
                tg.BackButton.show();
                tg.BackButton.onClick(() => {
                    this.provideFeedback('navigation');
                    window.history.back();
                });
            }
        }
    }

    applyTelegramTheme() {
        const theme = tg.themeParams;
        if (theme.bg_color) {
            document.documentElement.style.setProperty('--bg-primary', theme.bg_color);
        }
        if (theme.text_color) {
            document.documentElement.style.setProperty('--text-primary', theme.text_color);
        }
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
                this.provideFeedback('achievement');
                this.createParticleEffect(item, item.classList.contains('locked') ? 'locked' : 'unlocked');
            });

            // Задержка появления
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
                this.provideFeedback('leaderboard');
                this.createRippleEffect(item);
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

    // Визуальные эффекты
    createParticleEffect(element, type = 'unlocked') {
        const colors = {
            unlocked: ['#DC2626', '#10B981', '#3B82F6'],
            locked: ['#666666', '#888888', '#AAAAAA']
        };

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: ${colors[type][Math.floor(Math.random() * colors[type].length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 10px currentColor;
            `;

            const rect = element.getBoundingClientRect();
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2}px`;

            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 8;
            const velocity = 50 + Math.random() * 30;
            let opacity = 1;

            function animate() {
                const x = Math.cos(angle) * velocity * (1 - opacity);
                const y = Math.sin(angle) * velocity * (1 - opacity);

                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = opacity;

                opacity -= 0.03;

                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            }

            requestAnimationFrame(animate);
        }
    }

    createRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(220, 38, 38, 0.3);
            pointer-events: none;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            top: 50%;
            left: 50%;
            width: 100px;
            height: 100px;
            margin: -50px 0 0 -50px;
        `;

        element.style.position = 'relative';
        element.appendChild(ripple);

        setTimeout(() => {
            element.removeChild(ripple);
        }, 600);
    }

    animateStatsCards() {
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';

            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Утилиты
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    provideFeedback(type) {
        if (tg?.HapticFeedback) {
            const feedbackTypes = {
                navigation: 'heavy',
                achievement: 'medium',
                leaderboard: 'light'
            };

            tg.HapticFeedback.impactOccurred(feedbackTypes[type] || 'light');
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
    console.log('🚀 Запуск Criminal Trust Profile');

    // CSS для анимаций
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
        
        .stat-card {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    // Запускаем профиль
    new ModernProfileManager();
});

// Экспорт для использования в других модулях
window.ModernProfileManager = ModernProfileManager;
window.ProfileState = ProfileState; 