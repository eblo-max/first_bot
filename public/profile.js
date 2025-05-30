/**
 * Управление функциональностью профиля "Криминальный Блеф"
 * Этот файл отвечает за отображение и взаимодействие с данными профиля пользователя
 * Ультра-современный дизайн с лучшими практиками UX
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

/**
 * Анимированный счетчик для статистики
 */
function animateCounter(element, targetValue, duration = 1000) {
    if (!element) return;

    const start = parseInt(element.textContent) || 0;
    const target = parseInt(targetValue) || 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing функция для плавной анимации
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(start + (target - start) * easeOut);

        element.textContent = element.id === 'stat-accuracy' ? `${currentValue}%` : currentValue;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

/**
 * Добавление частиц и эффектов
 */
function createParticleEffect(element, type = 'success') {
    if (!element) return;

    const colors = {
        success: ['#F4C430', '#DAA520', '#FFD700'],
        error: ['#DC143C', '#8B0000', '#E53E3E'],
        info: ['#0F3460', '#16213E', '#39FF14']
    };

    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: ${colors[type][Math.floor(Math.random() * colors[type].length)]};
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
        `;

        const rect = element.getBoundingClientRect();
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;

        document.body.appendChild(particle);

        // Анимация частицы
        const angle = (Math.PI * 2 * i) / 6;
        const velocity = 50 + Math.random() * 50;
        let opacity = 1;
        let scale = 1;

        function animateParticle() {
            particle.style.transform = `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(${scale})`;
            particle.style.opacity = opacity;

            opacity -= 0.02;
            scale += 0.01;

            if (opacity > 0) {
                requestAnimationFrame(animateParticle);
            } else {
                document.body.removeChild(particle);
            }
        }

        requestAnimationFrame(animateParticle);
    }
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
 * Основной класс профиля с улучшенным UX
 */
class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            console.log('🕵️ Инициализация ультра-секретного досье агента...');

            // Инициализируем элементы DOM
            initElements();

            this.showLoading();

            // Инициализация Telegram WebApp с улучшенными настройками
            if (tg) {
                tg.ready();
                tg.expand();

                // Настройка цветовой схемы
                if (tg.themeParams) {
                    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0A0A0F');
                    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#E8E8E8');
                }

                // Настройка кнопки назад
                if (tg.BackButton) {
                    tg.BackButton.show();
                    tg.BackButton.onClick(() => {
                        if (tg.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('medium');
                        }
                        window.history.back();
                    });
                }
            }

            // Проверяем аутентификацию
            await this.checkAuth();

            if (ProfileState.isAuthenticated) {
                // Загружаем данные профиля с эффектами
                await this.loadProfile();
                await this.loadAchievements();
                await this.loadLeaderboard();

                this.showContent();
                this.initInteractivity();
            } else {
                this.showError('Доступ к засекреченным данным запрещен');
            }

        } catch (error) {
            console.error('❌ Критическая ошибка системы:', error);
            this.showError('Система безопасности недоступна: ' + error.message);
        }
    }

    async checkAuth() {
        try {
            console.log('🔐 Верификация агента в системе...');

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
                    console.log('✅ Агент верифицирован в системе');
                } else {
                    console.log('❌ Недействительные данные агента');
                    localStorage.removeItem('token');
                }
            }

        } catch (error) {
            console.error('❌ Ошибка системы безопасности:', error);
            ProfileState.isAuthenticated = false;
        }
    }

    async loadProfile() {
        try {
            console.log('📊 Загрузка секретного досье...');

            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${ProfileState.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Секретные данные недоступны');
            }

            const profileData = await response.json();
            ProfileState.profileData = profileData;

            console.log('✅ Засекреченное досье загружено:', profileData);

            // Обновляем UI с анимациями
            this.updateProfileUI(profileData);

        } catch (error) {
            console.error('❌ Ошибка доступа к досье:', error);
            throw error;
        }
    }

    updateProfileUI(data) {
        // Основная информация с анимациями
        if (Elements.detectiveName) {
            const name = data.basic?.firstName || data.username || 'АГЕНТ';
            this.typewriterEffect(Elements.detectiveName, name.toUpperCase());
        }

        if (Elements.detectiveRank) {
            Elements.detectiveRank.textContent = data.rank?.current || 'НОВИЧОК';
            createParticleEffect(Elements.detectiveRank, 'success');
        }

        // Репутация с эффектами
        if (Elements.reputationLevel) {
            animateCounter(Elements.reputationLevel, data.reputation?.level || 0, 1500);
        }

        if (Elements.reputationCategory) {
            Elements.reputationCategory.textContent = data.reputation?.category || 'НЕОПРЕДЕЛЕНО';
        }

        // Статистика с анимированными счетчиками
        const stats = data.stats || {};

        if (Elements.statInvestigations) {
            animateCounter(Elements.statInvestigations, stats.investigations || 0);
        }

        if (Elements.statSolved) {
            animateCounter(Elements.statSolved, stats.solvedCases || 0);
        }

        if (Elements.statAccuracy) {
            animateCounter(Elements.statAccuracy, Math.round(stats.accuracy || 0));
        }

        if (Elements.statScore) {
            animateCounter(Elements.statScore, stats.totalScore || 0, 2000);
        }
    }

    /**
     * Эффект печатной машинки для текста
     */
    typewriterEffect(element, text, speed = 100) {
        if (!element) return;

        element.textContent = '';
        element.style.width = '0';
        element.style.borderRight = '2px solid var(--evidence-gold)';
        element.style.whiteSpace = 'nowrap';
        element.style.overflow = 'hidden';

        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                element.style.width = 'auto';
                i++;
            } else {
                clearInterval(typeInterval);
                setTimeout(() => {
                    element.style.borderRight = 'none';
                }, 500);
            }
        }, speed);
    }

    async loadAchievements() {
        try {
            console.log('🏆 Загрузка наград агента...');

            const response = await fetch('/api/user/achievements', {
                headers: {
                    'Authorization': `Bearer ${ProfileState.token}`
                }
            });

            if (!response.ok) {
                console.log('⚠️ Данные о наградах недоступны');
                return;
            }

            const achievements = await response.json();
            this.renderAchievements(achievements);

        } catch (error) {
            console.error('❌ Ошибка загрузки наград:', error);
        }
    }

    renderAchievements(achievements) {
        if (!Elements.achievementsContainer) return;

        // Базовые достижения с улучшенными иконками
        const baseAchievements = [
            { id: 'first_case', name: 'ПЕРВАЯ ОПЕРАЦИЯ', icon: '🔍', locked: true, description: 'Завершена первая миссия' },
            { id: 'rookie', name: 'АГЕНТ-НОВИЧОК', icon: '🎖️', locked: true, description: 'Получен статус агента' },
            { id: 'expert', name: 'ЭКСПЕРТ', icon: '🏆', locked: true, description: 'Мастерство подтверждено' },
            { id: 'sharp_eye', name: 'ОСТРЫЙ ГЛАЗ', icon: '👁️', locked: true, description: 'Исключительная наблюдательность' },
            { id: 'serial_detective', name: 'СЕРИЙНЫЙ ДЕТЕКТИВ', icon: '🕵️', locked: true, description: 'Раскрыто множество дел' },
            { id: 'maniac', name: 'ПЕРФЕКЦИОНИСТ', icon: '⚡', locked: true, description: 'Безупречная точность' }
        ];

        // Отмечаем разблокированные достижения
        achievements.forEach(userAchievement => {
            const achievement = baseAchievements.find(a => a.id === userAchievement.id);
            if (achievement) {
                achievement.locked = false;
                achievement.name = userAchievement.name || achievement.name;
            }
        });

        // Рендерим с улучшенными эффектами
        Elements.achievementsContainer.innerHTML = baseAchievements.map((achievement, index) => `
            <div class="achievement-medal ${achievement.locked ? '' : 'unlocked'}" 
                 title="${achievement.description}"
                 style="animation-delay: ${index * 0.1}s">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.locked ? '???' : achievement.name}</div>
            </div>
        `).join('');

        // Добавляем интерактивность
        setTimeout(() => {
            const medals = Elements.achievementsContainer.querySelectorAll('.achievement-medal');
            medals.forEach(medal => {
                medal.addEventListener('click', () => {
                    if (medal.classList.contains('unlocked')) {
                        createParticleEffect(medal, 'success');
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('light');
                        }
                    }
                });
            });
        }, 100);
    }

    async loadLeaderboard() {
        try {
            console.log('👑 Загрузка рейтинга агентов...');

            const response = await fetch('/api/leaderboard/week', {
                headers: {
                    'Authorization': `Bearer ${ProfileState.token}`
                }
            });

            if (!response.ok) {
                console.log('⚠️ Рейтинг агентов недоступен');
                return;
            }

            const leaderboard = await response.json();
            this.renderLeaderboard(leaderboard);

        } catch (error) {
            console.error('❌ Ошибка загрузки рейтинга:', error);
        }
    }

    renderLeaderboard(data) {
        if (!Elements.leaderboardContainer) return;

        const leaders = data.leaders || [];
        const currentUser = ProfileState.profileData;

        if (leaders.length === 0) {
            Elements.leaderboardContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: rgba(232, 232, 232, 0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🕵️</div>
                    <p style="font-family: 'JetBrains Mono', monospace; text-transform: uppercase;">
                        Секретные данные недоступны
                    </p>
                </div>
            `;
            return;
        }

        Elements.leaderboardContainer.innerHTML = leaders.map((leader, index) => {
            const isCurrentUser = currentUser && leader.userId === currentUser.id;
            const rankIcons = ['👑', '🥈', '🥉'];
            const rankIcon = rankIcons[index] || '🎖️';

            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}" 
                     style="animation-delay: ${index * 0.05}s">
                    <div class="leaderboard-rank">${index + 1}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">
                            ${rankIcon} ${leader.username || leader.firstName || 'АГЕНТ'}
                            ${isCurrentUser ? ' (ВЫ)' : ''}
                        </div>
                        <div class="leaderboard-score">${leader.score || 0} ОЧКОВ</div>
                    </div>
                </div>
            `;
        }).join('');

        // Добавляем интерактивность для элементов лидерборда
        setTimeout(() => {
            const items = Elements.leaderboardContainer.querySelectorAll('.leaderboard-item');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    if (tg?.HapticFeedback) {
                        tg.HapticFeedback.impactOccurred('light');
                    }
                });
            });
        }, 100);
    }

    /**
     * Инициализация интерактивности с улучшенным UX
     */
    initInteractivity() {
        // Добавляем звуковые эффекты через Telegram HapticFeedback
        if (tg?.HapticFeedback) {
            document.querySelectorAll('.interactive').forEach(element => {
                element.addEventListener('click', () => {
                    tg.HapticFeedback.impactOccurred('light');
                });
            });
        }

        // Параллакс эффект для фона
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => {
                const x = event.accelerationIncludingGravity.x;
                const y = event.accelerationIncludingGravity.y;

                document.body.style.setProperty('--parallax-x', `${x * 2}px`);
                document.body.style.setProperty('--parallax-y', `${y * 2}px`);
            });
        }

        // Добавляем эффект при скролле
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.5;

            document.body.style.setProperty('--scroll-parallax', `${parallax}px`);
        });
    }

    showLoading() {
        ProfileState.loading = true;
        ProfileState.error = false;

        if (Elements.loadingScreen) {
            Elements.loadingScreen.classList.remove('hidden');
            Elements.loadingScreen.style.animation = 'loading-fade-in 0.5s ease-out';
        }
        if (Elements.mainContent) Elements.mainContent.classList.add('hidden');
        if (Elements.errorScreen) Elements.errorScreen.classList.add('hidden');
    }

    showContent() {
        ProfileState.loading = false;
        ProfileState.error = false;

        if (Elements.loadingScreen) Elements.loadingScreen.classList.add('hidden');
        if (Elements.mainContent) {
            Elements.mainContent.classList.remove('hidden');
            Elements.mainContent.style.animation = 'fadeInUp 0.8s ease-out';
        }
        if (Elements.errorScreen) Elements.errorScreen.classList.add('hidden');

        // Эффект успешной загрузки
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    showError(message) {
        ProfileState.loading = false;
        ProfileState.error = true;
        ProfileState.errorMessage = message;

        if (Elements.errorMessage) Elements.errorMessage.textContent = message;

        if (Elements.loadingScreen) Elements.loadingScreen.classList.add('hidden');
        if (Elements.mainContent) Elements.mainContent.classList.add('hidden');
        if (Elements.errorScreen) {
            Elements.errorScreen.classList.remove('hidden');
            Elements.errorScreen.style.animation = 'fadeInUp 0.6s ease-out';
        }

        // Уведомление об ошибке
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск ультра-секретной системы профиля агента...');
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