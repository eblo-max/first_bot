/**
 * Criminal Trust - Основной модуль профиля на TypeScript
 * Объединяет все модули для работы с профилем пользователя
 */
import { getRankByLevel, calculateLevel, getXPProgress } from './modules/profile-config.js';
import { authService } from './modules/auth-service.js';
import { apiService } from './modules/api-service.js';
// =============================================================================
// ГЛАВНЫЙ КЛАСС ПРОФИЛЯ
// =============================================================================
export class CriminalTrustProfile {
    constructor() {
        this.isInitialized = false;
        this.effectsInterval = null;
        this.updateInterval = null;
        // Инициализируем состояние
        this.state = {
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
                scanEffect: false,
                atmosphericEffects: false
            }
        };
        this.init();
    }
    // =========================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // =========================================================================
    async init() {
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
        }
        catch (error) {
            console.error('❌ Ошибка инициализации профиля:', error);
            this.showError('Ошибка загрузки профиля');
        }
    }
    setupTelegramApp() {
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
    setupDOM() {
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
    async authenticate() {
        console.log('🔐 Выполняем аутентификацию...');
        this.setLoading(true);
        try {
            const authResult = await authService.authenticate();
            if (authResult.success && authResult.user) {
                console.log('✅ Аутентификация успешна');
                this.state.user = authResult.user;
            }
            else {
                throw new Error(authResult.error || 'Ошибка аутентификации');
            }
        }
        catch (error) {
            console.error('❌ Ошибка аутентификации:', error);
            this.showAuthError();
            throw error;
        }
        finally {
            this.setLoading(false);
        }
    }
    // =========================================================================
    // ЗАГРУЗКА ДАННЫХ
    // =========================================================================
    async loadProfileData() {
        console.log('📊 Загружаем данные профиля...');
        this.setLoading(true);
        try {
            // Показываем скелетон
            this.showProfileSkeleton();
            // Загружаем все данные параллельно
            const batchData = await apiService.getBatchData();
            // Обновляем профиль
            if (batchData.profile) {
                this.state.user = batchData.profile;
                this.updateProfileUI(batchData.profile);
            }
            // Обновляем достижения
            if (batchData.achievements) {
                this.state.achievements = batchData.achievements;
                this.renderAchievements(batchData.achievements);
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
        }
        catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            this.showError('Не удалось загрузить данные профиля');
        }
        finally {
            this.hideProfileSkeleton();
            this.setLoading(false);
        }
    }
    // =========================================================================
    // ОБНОВЛЕНИЕ UI
    // =========================================================================
    updateProfileUI(user) {
        try {
            console.log('🎯 Обновляем UI профиля с данными:', user);

            // Основная информация
            this.updateElement('user-name', this.getUserDisplayName(user));
            this.updateElement('user-total-score', (user.stats?.totalScore || 0).toLocaleString());
            this.updateElement('user-games-played', (user.stats?.investigations || 0).toString());
            this.updateElement('user-accuracy', `${Math.round(user.stats?.accuracy || 0)}%`);

            // Уровень и опыт
            const totalScore = user.stats?.totalScore || 0;
            const level = calculateLevel(totalScore);
            const xpProgress = getXPProgress(totalScore, level);
            const rank = getRankByLevel(level);

            this.updateElement('user-level', level.toString());
            this.updateElement('user-rank', rank.name);
            this.updateElement('user-rank-icon', rank.icon);

            // Обновляем цвет ранга
            const rankElement = document.getElementById('user-rank');
            if (rankElement) {
                rankElement.style.color = rank.color;
            }

            // Анимируем XP бар
            this.animateXPBar(xpProgress);

            // Обновляем ранговый дисплей
            this.updateRankDisplay(level, rank);

            console.log('🎯 UI профиля обновлен');
        }
        catch (error) {
            console.error('❌ Ошибка обновления UI:', error);
        }
    }
    animateXPBar(percentage) {
        const xpBar = document.querySelector('.xp-progress-fill');
        if (!xpBar)
            return;
        xpBar.style.width = '0%';
        setTimeout(() => {
            xpBar.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            xpBar.style.width = `${Math.min(percentage, 100)}%`;
        }, 100);
    }
    // =========================================================================
    // ДОСТИЖЕНИЯ
    // =========================================================================
    renderAchievements(achievements) {
        const container = document.getElementById('achievements-grid');
        if (!container)
            return;
        container.innerHTML = '';
        achievements.forEach(achievement => {
            const element = this.createAchievementElement(achievement);
            container.appendChild(element);
        });
        // Добавляем интерактивность
        this.addAchievementInteractivity();
        console.log(`🏆 Отрендерено ${achievements.length} достижений`);
    }
    createAchievementElement(achievement) {
        const div = document.createElement('div');
        div.className = `achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`;
        div.dataset.achievementId = achievement.id;
        const rarityClass = `rarity-${achievement.rarity}`;
        div.classList.add(rarityClass);
        div.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <h3 class="achievement-name">${achievement.name}</h3>
                <p class="achievement-description">${achievement.description}</p>
                <div class="achievement-category">${achievement.category}</div>
                ${!achievement.isUnlocked ? `
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${achievement.progress || 0}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(achievement.progress || 0)}%</span>
                    </div>
                ` : ''}
            </div>
            ${achievement.isUnlocked ? '<div class="achievement-unlock-badge">✓</div>' : ''}
        `;
        return div;
    }
    // =========================================================================
    // ЛИДЕРБОРД
    // =========================================================================
    initLeaderboardTabs() {
        const tabs = document.querySelectorAll('.leaderboard-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', async (e) => {
                e.preventDefault();
                const period = tab.getAttribute('data-period');
                if (period) {
                    await this.switchLeaderboardPeriod(period);
                }
            });
        });
    }
    async switchLeaderboardPeriod(period) {
        if (this.state.leaderboard.current === period)
            return;
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
        }
        catch (error) {
            console.error('❌ Ошибка загрузки лидерборда:', error);
            this.renderEmptyLeaderboard();
        }
    }
    renderLeaderboard(data) {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        console.log('🏆 Рендеринг лидерборда с данными:', data);

        if (!data.leaderboard || data.leaderboard.length === 0) {
            this.renderEmptyLeaderboard();
            return;
        }

        const html = data.leaderboard.map((entry, index) => {
            const rank = getRankByLevel(1); // Используем базовый ранг пока нет уровня в API
            const isCurrentUser = entry.isCurrentUser;

            return `
                <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                    <div class="position">#${entry.rank || index + 1}</div>
                    <div class="user-info">
                        <div class="user-avatar">
                            <div class="avatar-placeholder">👤</div>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${entry.name || 'Детектив'}</div>
                            <div class="user-rank" style="color: ${rank.color}">
                                ${rank.icon} ${entry.userRank || 'СТАЖЕР'}
                            </div>
                        </div>
                    </div>
                    <div class="user-stats">
                        <div class="score">${(entry.score || 0).toLocaleString()}</div>
                        <div class="accuracy">-</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Обновляем позицию текущего пользователя
        this.updateUserPosition(data);
    }
    // =========================================================================
    // КРИМИНАЛЬНЫЕ ЭФФЕКТЫ
    // =========================================================================
    initCriminalEffects() {
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
    startPeriodicCriminalEffects() {
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
    createRandomScanEffect() {
        const elements = document.querySelectorAll('.achievement-card, .leaderboard-entry');
        if (elements.length === 0)
            return;
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        this.createScanningEffect(randomElement);
    }
    createScanningEffect(element) {
        if (!element)
            return;
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
    createAtmosphericEffects() {
        // Создаем несколько частиц крови
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createBloodParticle();
            }, i * 100);
        }
    }
    createBloodParticle() {
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
                }
                else {
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
    getUserDisplayName(user) {
        console.log('👤 Получаем имя пользователя:', user);
        return user.name || `${user.firstName || 'Детектив'} ${user.lastName || ''}`.trim();
    }
    updateElement(id, value) {
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
    setLoading(loading) {
        this.state.isLoading = loading;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }
    showError(message) {
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
    showAuthError() {
        this.showError('Ошибка авторизации. Перезапустите приложение из Telegram.');
    }
    // =========================================================================
    // ПРОВЕРКА DOM
    // =========================================================================
    checkDOMElements() {
        const requiredElements = [
            'user-name',
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
    showProfileSkeleton() {
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
    hideProfileSkeleton() {
        // Удаляем скелетон после загрузки
        const skeleton = document.querySelector('.skeleton-loader');
        if (skeleton) {
            skeleton.remove();
        }
    }
    showLeaderboardSkeleton() {
        const container = document.getElementById('leaderboard-content');
        if (!container)
            return;
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
    renderEmptyLeaderboard() {
        const container = document.getElementById('leaderboard-content');
        if (!container)
            return;
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
    setupEventListeners() {
        // Обработчик для модального окна достижений
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('.achievement-card')) {
                const card = target.closest('.achievement-card');
                const achievementId = card.dataset.achievementId;
                if (achievementId) {
                    this.showAchievementModal(achievementId);
                }
            }
        });
        // Обработчик для закрытия модалок
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAchievementModal();
            }
        });
    }
    showAchievementModal(achievementId) {
        const achievement = this.state.achievements.find(a => a.id === achievementId);
        if (!achievement)
            return;
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'achievement-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${achievement.name}</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="achievement-large-icon">${achievement.icon}</div>
                        <p class="achievement-description">${achievement.description}</p>
                        <div class="achievement-rarity rarity-${achievement.rarity}">${achievement.rarity}</div>
                        ${achievement.isUnlocked ?
                `<div class="unlock-status unlocked">Получено!</div>` :
                `<div class="unlock-status locked">
                                <div class="progress-info">Прогресс: ${Math.round(achievement.progress || 0)}%</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${achievement.progress || 0}%"></div>
                                </div>
                            </div>`}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Обработчик закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay') ||
                e.target === modal.querySelector('.modal-close')) {
                this.hideAchievementModal();
            }
        });
        // Haptic feedback
        authService.hapticFeedback('light');
    }
    hideAchievementModal() {
        const modal = document.querySelector('.achievement-modal');
        if (modal) {
            modal.remove();
        }
    }
    // =========================================================================
    // ПЕРИОДИЧЕСКИЕ ОБНОВЛЕНИЯ
    // =========================================================================
    startPeriodicUpdates() {
        // Обновляем данные каждые 30 секунд
        this.updateInterval = window.setInterval(async () => {
            try {
                await this.loadProfileData();
            }
            catch (error) {
                console.error('❌ Ошибка периодического обновления:', error);
            }
        }, 30000);
    }
    // =========================================================================
    // ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ
    // =========================================================================
    async loadUserAvatar(telegramId) {
        try {
            const avatarUrl = await apiService.getUserAvatar(telegramId);
            if (avatarUrl) {
                const avatarElement = document.querySelector('.user-avatar img');
                if (avatarElement) {
                    avatarElement.src = avatarUrl;
                }
            }
        }
        catch (error) {
            console.error('❌ Ошибка загрузки аватара:', error);
        }
    }
    addAchievementInteractivity() {
        // Добавляем эффекты при наведении
        const cards = document.querySelectorAll('.achievement-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                authService.hapticFeedback('light');
            });
        });
    }
    updateUserPosition(data) {
        const positionElement = document.getElementById('user-position');
        if (positionElement && data.currentUser && data.currentUser.rank) {
            positionElement.textContent = `Ваша позиция: #${data.currentUser.rank}`;
            console.log('📈 Позиция пользователя обновлена:', data.currentUser.rank);
        } else {
            console.log('📈 Позиция пользователя не найдена');
        }
    }
    updateRankDisplay(level, rank) {
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
    destroy() {
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
    getState() {
        return this.state;
    }
    isReady() {
        return this.isInitialized;
    }
}
// Автоинициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM загружен, инициализируем профиль...');
    window.criminalProfile = new CriminalTrustProfile();
});
// Экспорт для использования в других модулях
export default CriminalTrustProfile;
