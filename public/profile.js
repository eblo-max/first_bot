/**
 * Управление функциональностью профиля "Криминальный Блеф"
 * Этот файл отвечает за отображение и взаимодействие с данными профиля пользователя
 */

// Объект Telegram WebApp для доступа к API Telegram Mini Apps
let tg = null;

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
 * Объект для работы с профилем пользователя
 */
const ProfileManager = {
    /**
     * Элементы интерфейса
     */
    elements: {
        profileName: document.querySelector('.profile-name'),
        profileBadge: document.querySelector('.profile-badge'),
        profileId: document.querySelector('.profile-id span'),

        // Статистика
        investigationsCount: document.querySelector('.stat-card[data-tag="ОПЫТ"] .stat-value'),
        solvedCases: document.querySelector('.stat-card[data-tag="УСПЕХ"] .stat-value'),
        winStreak: document.querySelector('.stat-card[data-tag="СЕРИЯ"] .stat-value'),
        accuracy: document.querySelector('.stat-card[data-tag="ТОЧНОСТЬ"] .stat-value'),

        // Лидерборд
        leaderboardRows: document.querySelectorAll('.leaderboard-row'),
        leaderboardTabs: document.querySelectorAll('.tab-button'),

        // Кнопки навигации
        mainButton: document.querySelector('.nav-button:not(.primary)'),
        newGameButton: document.querySelector('.nav-button.primary'),

        // Достижения
        achievements: document.querySelectorAll('.achievement')
    },

    /**
     * Данные профиля
     */
    profileData: null,

    /**
     * Состояние приложения
     */
    state: {
        token: null,
        isLoading: false,
        currentLeaderboardPeriod: 'week',
        isAuthenticated: false,
        error: null
    },

    /**
     * Инициализация профиля
     */
    async init() {
        try {
            console.log('🕵️ Инициализация профиля детектива...');

            this.showLoading();

            // Инициализация Telegram WebApp
            if (tg) {
                tg.ready();
                tg.expand();
            }

            // Проверяем аутентификацию
            await this.checkAuth();

            if (this.state.isAuthenticated) {
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
    },

    /**
     * Проверка аутентификации пользователя
     */
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
                    this.state.token = token;
                    this.state.isAuthenticated = true;
                    console.log('✅ Аутентификация успешна');
                } else {
                    console.log('❌ Токен недействителен');
                    localStorage.removeItem('token');
                }
            }

        } catch (error) {
            console.error('❌ Ошибка аутентификации:', error);
            this.state.isAuthenticated = false;
        }
    },

    /**
     * Загрузка данных профиля пользователя
     */
    async loadProfile() {
        try {
            console.log('📊 Загрузка профиля...');

            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить профиль');
            }

            const profileData = await response.json();
            this.profileData = profileData;

            console.log('✅ Профиль загружен:', profileData);

            // Обновляем UI
            this.updateProfileUI(profileData);

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
            throw error;
        }
    },

    /**
     * Обновление интерфейса профиля на основе данных
     * @param {Object} data - Данные профиля
     */
    updateProfileUI(data) {
        if (!data) return;

        // Обновляем информацию о профиле
        if (this.elements.profileName) {
            this.elements.profileName.textContent = data.basic?.firstName || data.username || 'Детектив';
        }

        if (this.elements.profileBadge) {
            this.elements.profileBadge.textContent = data.rank?.current || 'НОВИЧОК';
        }

        if (this.elements.profileId) {
            this.elements.profileId.textContent = data.telegramId || '-';
        }

        // Загружаем аватар пользователя
        this.loadUserAvatar();

        // Обновляем статистику (обеспечиваем корректное отображение нулевых значений)
        if (this.elements.investigationsCount) {
            this.elements.investigationsCount.textContent = data.stats?.investigations !== undefined ?
                data.stats.investigations : '0';
        }

        if (this.elements.solvedCases) {
            this.elements.solvedCases.textContent = data.stats?.solvedCases !== undefined ?
                data.stats.solvedCases : '0';
        }

        if (this.elements.winStreak) {
            this.elements.winStreak.textContent = data.stats?.winStreak !== undefined ?
                data.stats.winStreak : '0';
        }

        if (this.elements.accuracy) {
            const accuracyValue = data.stats?.accuracy !== undefined ? data.stats.accuracy : 0;
            this.elements.accuracy.textContent = `${accuracyValue}%`;
        }
    },

    /**
     * Загрузка аватара пользователя из Telegram
     */
    async loadUserAvatar() {
        const avatarImage = document.getElementById('avatar-image');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');
        const avatarLoading = document.getElementById('avatar-loading');

        if (!avatarImage || !avatarPlaceholder || !avatarLoading) {
            return;
        }

        try {
            // Показываем загрузку
            avatarLoading.style.display = 'block';
            avatarPlaceholder.style.opacity = '0.3';

            // Получаем токен
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Токен авторизации отсутствует');
            }

            // Запрашиваем аватар с сервера
            const response = await fetch('/api/user/avatar', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success' && data.data.hasAvatar && data.data.avatarUrl) {
                // Загружаем изображение
                const img = new Image();

                img.onload = () => {
                    // Успешно загружено - показываем аватар
                    avatarImage.src = data.data.avatarUrl;
                    avatarImage.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                    avatarLoading.style.display = 'none';

                    // Добавляем плавное появление
                    avatarImage.style.opacity = '0';
                    setTimeout(() => {
                        avatarImage.style.transition = 'opacity 0.3s ease';
                        avatarImage.style.opacity = '1';
                    }, 50);
                };

                img.onerror = () => {
                    // Ошибка загрузки изображения
                    this.showAvatarPlaceholder();
                };

                // Начинаем загрузку изображения
                img.src = data.data.avatarUrl;

            } else {
                // У пользователя нет аватара
                this.showAvatarPlaceholder();
            }

        } catch (error) {
            console.error('Ошибка при загрузке аватара:', error);
            this.showAvatarPlaceholder();
        }
    },

    /**
     * Показывает плейсхолдер аватара
     */
    showAvatarPlaceholder() {
        const avatarImage = document.getElementById('avatar-image');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');
        const avatarLoading = document.getElementById('avatar-loading');

        if (avatarImage) {
            avatarImage.style.display = 'none';
        }

        if (avatarPlaceholder) {
            avatarPlaceholder.style.display = 'block';
            avatarPlaceholder.style.opacity = '1';
        }

        if (avatarLoading) {
            avatarLoading.style.display = 'none';
        }
    },

    /**
     * Загрузка данных таблицы лидеров
     */
    async loadLeaderboard(period = 'week') {
        try {
            if (!this.state.token) {
                throw new Error('Токен авторизации отсутствует');
            }

            // Запрашиваем данные лидерборда
            const response = await fetch(`/api/user/leaderboard?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Не сбрасываем токен здесь, так как это некритичная ошибка
                }
                throw new Error(`Ошибка загрузки таблицы лидеров: ${response.status} ${response.statusText}`);
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Ошибка при парсинге ответа лидерборда:', parseError);
                throw new Error('Ошибка при обработке данных таблицы лидеров');
            }

            if (data.status !== 'success' || !data.data) {
                throw new Error(data.message || 'Ошибка загрузки таблицы лидеров');
            }

            // Обновляем UI с данными лидерборда
            this.updateLeaderboardUI(data.data);

        } catch (error) {
            console.error('Ошибка при загрузке таблицы лидеров:', error);

            // Очищаем таблицу лидеров при ошибке или создаем пустую, если ее нет
            const tableContainer = document.querySelector('.leaderboard-table');
            if (tableContainer) {
                const headerRow = tableContainer.querySelector('.leaderboard-header');
                tableContainer.innerHTML = '';
                if (headerRow) {
                    tableContainer.appendChild(headerRow);
                }

                // Добавляем сообщение об ошибке в таблицу
                const errorRow = document.createElement('div');
                errorRow.className = 'leaderboard-row';
                errorRow.innerHTML = `
                    <div class="rank-cell">-</div>
                    <div class="user-cell" style="color: var(--blood-red);">Ошибка загрузки данных</div>
                    <div class="score-cell">-</div>
                `;
                tableContainer.appendChild(errorRow);
            }
        }
    },

    /**
     * Обновление интерфейса лидерборда
     * @param {Object} data - Данные лидерборда
     */
    updateLeaderboardUI(data) {
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (!leaderboardContent) {
            console.error('Контейнер лидерборда не найден');
            return;
        }

        // Если данных нет или список пуст
        if (!data || !data.entries || data.entries.length === 0) {
            leaderboardContent.innerHTML = `
                <div class="empty-leaderboard">
                    <div class="empty-leaderboard-icon">🏆</div>
                    <div class="empty-leaderboard-text">Рейтинг пуст</div>
                    <div class="empty-leaderboard-subtext">Станьте первым детективом!</div>
                </div>
            `;
            return;
        }

        // Очищаем контейнер
        leaderboardContent.innerHTML = '';

        // Получаем текущего пользователя для выделения
        const currentUserTelegramId = this.profileData?.telegramId;

        // Создаем строки лидерборда
        data.entries.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';

            // Выделяем текущего пользователя
            if (entry.telegramId === currentUserTelegramId) {
                row.classList.add('current-user');
            }

            // Форматируем очки
            const formattedScore = new Intl.NumberFormat('ru-RU').format(entry.totalScore || 0);

            row.innerHTML = `
                <div class="rank-cell">${entry.rank || (index + 1)}</div>
                <div class="user-cell">${entry.name || entry.username || 'Анонимный детектив'}</div>
                <div class="score-cell">${formattedScore}</div>
            `;

            leaderboardContent.appendChild(row);
        });
    },

    /**
     * Загрузка достижений пользователя
     */
    async loadAchievements() {
        try {
            console.log('🏆 Загрузка достижений...');

            const response = await fetch('/api/user/achievements', {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
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
    },

    /**
     * Обновление интерфейса достижений
     * @param {Array} achievements - Массив достижений пользователя
     */
    renderAchievements(achievements) {
        if (!this.elements.achievements) return;

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
        this.elements.achievements.forEach((element, index) => {
            const achievement = baseAchievements[index];
            const iconElement = element.querySelector('.achievement-icon');
            const nameElement = element.querySelector('.achievement-name');

            if (iconElement) {
                iconElement.innerHTML = achievement.icon;
            }

            if (nameElement) {
                nameElement.textContent = achievement.name;
            }

            element.classList.toggle('locked', achievement.locked);
        });
    },

    /**
     * Начало загрузки данных
     */
    showLoading() {
        this.state.isLoading = true;
        this.state.error = false;

        if (this.elements.loadingScreen) this.elements.loadingScreen.classList.remove('hidden');
        if (this.elements.mainContent) this.elements.mainContent.classList.add('hidden');
        if (this.elements.errorScreen) this.elements.errorScreen.classList.add('hidden');
    },

    /**
     * Окончание загрузки данных
     */
    showContent() {
        this.state.isLoading = false;
        this.state.error = false;

        if (this.elements.loadingScreen) this.elements.loadingScreen.classList.add('hidden');
        if (this.elements.mainContent) this.elements.mainContent.classList.remove('hidden');
        if (this.elements.errorScreen) this.elements.errorScreen.classList.add('hidden');
    },

    /**
     * Отображение ошибки
     */
    showError(message) {
        this.state.error = true;
        this.state.errorMessage = message;

        if (this.elements.errorMessage) this.elements.errorMessage.textContent = message;

        if (this.elements.loadingScreen) this.elements.loadingScreen.classList.add('hidden');
        if (this.elements.mainContent) this.elements.mainContent.classList.add('hidden');
        if (this.elements.errorScreen) this.elements.errorScreen.classList.remove('hidden');
    },

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработчики для табов лидерборда
        this.elements.leaderboardTabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                // Удаляем класс active у всех табов
                this.elements.leaderboardTabs.forEach(t => t.classList.remove('active'));
                // Добавляем класс active к выбранному табу
                tab.classList.add('active');

                // Получаем период из атрибута data-period или из текста кнопки
                const period = tab.dataset.period || tab.textContent.trim().toLowerCase();
                this.state.currentLeaderboardPeriod = period;

                // Загружаем данные лидерборда для выбранного периода
                this.loadLeaderboard(period);

                // Тактильная обратная связь в Telegram
                if (tg && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
            });
        });

        // Прямые обработчики для кнопок навигации
        const mainButton = document.querySelector('[data-action="goToMain"]');
        const newGameButton = document.querySelector('[data-action="startNewGame"]');

        if (mainButton) {
            mainButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                // Тактильный отклик
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                }

                window.location.href = createAuthenticatedUrl('/');
            });
        } else {
            console.error('Кнопка "Главная" не найдена!');
        }

        if (newGameButton) {
            newGameButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                // Тактильный отклик
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                }

                window.location.href = createAuthenticatedUrl('/game.html');
            });
        } else {
            console.error('Кнопка "Новое дело" не найдена!');
        }

        // Дополнительный универсальный обработчик как fallback
        document.addEventListener('click', (event) => {
            const actionElement = event.target.closest('[data-action]');
            if (!actionElement) return;

            const action = actionElement.getAttribute('data-action');

            // Избегаем дублирования для кнопок навигации
            if (action === 'goToMain' || action === 'startNewGame') {
                return; // Эти кнопки уже обрабатываются выше
            }

            // Тактильный отклик
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
        });
    }
};

// Инициализация профиля при загрузке DOM
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