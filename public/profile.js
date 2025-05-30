/**
 * Управление функциональностью профиля "Криминальный Блеф"
 * Этот файл отвечает за отображение и взаимодействие с данными профиля пользователя
 */

// Объект Telegram WebApp для доступа к API Telegram Mini Apps
let tg = window.Telegram?.WebApp;

/**
 * Вспомогательная функция для создания URL с параметрами авторизации
 */
function createAuthenticatedUrl(baseUrl) {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    let url = baseUrl;

    // Если есть токен, добавляем его в URL
    if (token) {
        url += `?token=${encodeURIComponent(token)}`;
    }

    // Если есть данные Telegram WebApp, добавляем их тоже
    if (window.Telegram?.WebApp?.initData) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}initData=${encodeURIComponent(window.Telegram.WebApp.initData)}`;
    }

    return url;
}

// Состояние приложения
const ProfileState = {
    loading: false,
    error: false,
    errorMessage: '',
    profileData: null,
    token: null,
    isAuthenticated: false
};

// DOM элементы
const Elements = {
    loadingScreen: null,
    mainContent: null,
    errorScreen: null,
    errorMessage: null,

    // Профиль
    detectiveName: null,
    detectiveRank: null,
    reputationLevel: null,
    reputationCategory: null,

    // Статистика
    statInvestigations: null,
    statSolved: null,
    statAccuracy: null,
    statScore: null,

    // Контейнеры
    achievementsContainer: null,
    leaderboardContainer: null
};

// Инициализация DOM элементов
function initElements() {
    Elements.loadingScreen = document.getElementById('loading-screen');
    Elements.mainContent = document.getElementById('main-content');
    Elements.errorScreen = document.getElementById('error-screen');
    Elements.errorMessage = document.getElementById('error-message');

    // Профиль
    Elements.detectiveName = document.getElementById('detective-name');
    Elements.detectiveRank = document.getElementById('detective-rank');
    Elements.reputationLevel = document.getElementById('reputation-level');
    Elements.reputationCategory = document.getElementById('reputation-category');

    // Статистика
    Elements.statInvestigations = document.getElementById('stat-investigations');
    Elements.statSolved = document.getElementById('stat-solved');
    Elements.statAccuracy = document.getElementById('stat-accuracy');
    Elements.statScore = document.getElementById('stat-score');

    // Контейнеры
    Elements.achievementsContainer = document.getElementById('achievements-container');
    Elements.leaderboardContainer = document.getElementById('leaderboard-container');
}

/**
 * Основной класс профиля
 */
class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            console.log('🕵️ Инициализация профиля детектива...');

            // Инициализируем элементы DOM
            initElements();

            this.showLoading();

            // Инициализация Telegram WebApp
            if (tg) {
                tg.ready();
                tg.expand();
            }

            // Проверяем аутентификацию
            await this.checkAuth();

            if (ProfileState.isAuthenticated) {
                // Загружаем данные профиля
                await this.loadProfile();
                await this.loadAchievements();
                await this.loadLeaderboard();

                this.showContent();
            } else {
                this.showError('Не удалось выполнить аутентификацию');
            }

        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки: ' + error.message);
        }
    }

    async checkAuth() {
        try {
            console.log('🔐 Проверка аутентификации...');

            // Получаем токен из URL или localStorage
            const urlParams = new URLSearchParams(window.location.search);
            let token = urlParams.get('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');

            if (!token && tg?.initData) {
                // Пытаемся аутентифицироваться через Telegram
                const response = await fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        initData: tg.initData
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    token = data.token;
                    localStorage.setItem('token', token);
                }
            }

            if (token) {
                // Проверяем токен на сервере
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    ProfileState.token = token;
                    ProfileState.isAuthenticated = true;
                    console.log('✅ Аутентификация успешна');
                } else {
                    console.log('❌ Токен недействителен');
                    localStorage.removeItem('token');
                }
            }

        } catch (error) {
            console.error('❌ Ошибка аутентификации:', error);
            ProfileState.isAuthenticated = false;
        }
    }

    async loadProfile() {
        try {
            console.log('📊 Загрузка профиля...');

            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${ProfileState.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить профиль');
            }

            const profileData = await response.json();
            ProfileState.profileData = profileData;

            console.log('✅ Профиль загружен:', profileData);

            // Обновляем UI
            this.updateProfileUI(profileData);

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
            throw error;
        }
    }

    updateProfileUI(data) {
        // Основная информация
        if (Elements.detectiveName) {
            Elements.detectiveName.textContent = data.basic?.firstName || data.username || 'Детектив';
        }

        if (Elements.detectiveRank) {
            Elements.detectiveRank.textContent = data.rank?.current || 'НОВИЧОК';
        }

        // Репутация
        if (Elements.reputationLevel) {
            Elements.reputationLevel.textContent = data.reputation?.level || 0;
        }

        if (Elements.reputationCategory) {
            Elements.reputationCategory.textContent = data.reputation?.category || 'Неизвестно';
        }

        // Статистика
        const stats = data.stats || {};

        if (Elements.statInvestigations) {
            Elements.statInvestigations.textContent = stats.investigations || 0;
        }

        if (Elements.statSolved) {
            Elements.statSolved.textContent = stats.solvedCases || 0;
        }

        if (Elements.statAccuracy) {
            Elements.statAccuracy.textContent = Math.round(stats.accuracy || 0) + '%';
        }

        if (Elements.statScore) {
            Elements.statScore.textContent = stats.totalScore || 0;
        }
    }

    async loadAchievements() {
        try {
            console.log('🏆 Загрузка достижений...');

            const response = await fetch('/api/user/achievements', {
                headers: {
                    'Authorization': `Bearer ${ProfileState.token}`
                }
            });

            if (!response.ok) {
                console.log('⚠️ Не удалось загрузить достижения');
                return;
            }

            const achievements = await response.json();
            this.renderAchievements(achievements);

        } catch (error) {
            console.error('❌ Ошибка загрузки достижений:', error);
        }
    }

    renderAchievements(achievements) {
        if (!Elements.achievementsContainer) return;

        // Базовые достижения с иконками
        const baseAchievements = [
            { id: 'first_case', name: 'ПЕРВОЕ ДЕЛО', icon: '🔍', locked: true },
            { id: 'rookie', name: 'НОВИЧОК', icon: '🎖️', locked: true },
            { id: 'expert', name: 'ЭКСПЕРТ', icon: '🏆', locked: true },
            { id: 'sharp_eye', name: 'ОСТРЫЙ ГЛАЗ', icon: '👁️', locked: true },
            { id: 'serial_detective', name: 'СЕРИЙНЫЙ СЫЩИК', icon: '🕵️', locked: true },
            { id: 'maniac', name: 'МАНЬЯК', icon: '⚡', locked: true }
        ];

        // Отмечаем разблокированные достижения
        achievements.forEach(userAchievement => {
            const achievement = baseAchievements.find(a => a.id === userAchievement.id);
            if (achievement) {
                achievement.locked = false;
                achievement.name = userAchievement.name || achievement.name;
            }
        });

        // Рендерим
        Elements.achievementsContainer.innerHTML = baseAchievements.map(achievement => `
            <div class="achievement-badge ${achievement.locked ? '' : 'unlocked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.locked ? '???' : achievement.name}</div>
            </div>
        `).join('');
    }

    async loadLeaderboard() {
        try {
            console.log('👑 Загрузка лидерборда...');

            const response = await fetch('/api/leaderboard/week', {
                headers: {
                    'Authorization': `Bearer ${ProfileState.token}`
                }
            });

            if (!response.ok) {
                console.log('⚠️ Не удалось загрузить лидерборд');
                return;
            }

            const leaderboard = await response.json();
            this.renderLeaderboard(leaderboard);

        } catch (error) {
            console.error('❌ Ошибка загрузки лидерборда:', error);
        }
    }

    renderLeaderboard(data) {
        if (!Elements.leaderboardContainer) return;

        const leaders = data.leaders || [];
        const currentUser = ProfileState.profileData;

        if (leaders.length === 0) {
            Elements.leaderboardContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--suspect-gray);">
                    <p>Пока нет данных о лидерах</p>
                </div>
            `;
            return;
        }

        Elements.leaderboardContainer.innerHTML = leaders.map((leader, index) => {
            const isCurrentUser = currentUser && leader.userId === currentUser.id;
            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank">${index + 1}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${leader.username || leader.firstName || 'Детектив'}</div>
                        <div class="leaderboard-score">${leader.score || 0} очков</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showLoading() {
        ProfileState.loading = true;
        ProfileState.error = false;

        if (Elements.loadingScreen) Elements.loadingScreen.classList.remove('hidden');
        if (Elements.mainContent) Elements.mainContent.classList.add('hidden');
        if (Elements.errorScreen) Elements.errorScreen.classList.add('hidden');
    }

    showContent() {
        ProfileState.loading = false;
        ProfileState.error = false;

        if (Elements.loadingScreen) Elements.loadingScreen.classList.add('hidden');
        if (Elements.mainContent) Elements.mainContent.classList.remove('hidden');
        if (Elements.errorScreen) Elements.errorScreen.classList.add('hidden');
    }

    showError(message) {
        ProfileState.loading = false;
        ProfileState.error = true;
        ProfileState.errorMessage = message;

        if (Elements.errorMessage) Elements.errorMessage.textContent = message;

        if (Elements.loadingScreen) Elements.loadingScreen.classList.add('hidden');
        if (Elements.mainContent) Elements.mainContent.classList.add('hidden');
        if (Elements.errorScreen) Elements.errorScreen.classList.remove('hidden');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск профиля детектива...');
    new ProfileManager();
});

// Обновление иконок Lucide
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
}); 