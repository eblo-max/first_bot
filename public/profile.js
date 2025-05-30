/**
 * Кибер-система управления профилем агента
 * Футуристический интерфейс с квантовыми эффектами и голографическими анимациями
 */

// Telegram WebApp API
let tg = window.Telegram?.WebApp;

/**
 * Квантовый генератор частиц
 */
function createQuantumExplosion(element, type = 'success') {
    const colors = {
        success: ['#00FFFF', '#FF00FF', '#39FF14'],
        error: ['#FF0040', '#FF6600', '#FFBF00'],
        info: ['#0066FF', '#8A2BE2', '#00FFFF']
    };

    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 8px;
            height: 8px;
            background: ${colors[type][Math.floor(Math.random() * colors[type].length)]};
            border-radius: 50%;
            pointer-events: none;
            z-index: 2000;
            box-shadow: 0 0 15px currentColor;
        `;

        const rect = element.getBoundingClientRect();
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;

        document.body.appendChild(particle);

        // Квантовая анимация
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 80 + Math.random() * 40;
        let opacity = 1;
        let scale = 1;
        let rotation = 0;

        function animateQuantumParticle() {
            const x = Math.cos(angle) * velocity * (1 - opacity);
            const y = Math.sin(angle) * velocity * (1 - opacity);

            particle.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
            particle.style.opacity = opacity;

            opacity -= 0.015;
            scale += 0.02;
            rotation += 8;

            if (opacity > 0) {
                requestAnimationFrame(animateQuantumParticle);
            } else {
                document.body.removeChild(particle);
            }
        }

        requestAnimationFrame(animateQuantumParticle);
    }
}

/**
 * Кибер-счетчик с голографическими эффектами
 */
function cyberCounter(element, targetValue, duration = 1500) {
    if (!element) return;

    const start = parseInt(element.textContent) || 0;
    const target = parseInt(targetValue) || 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Кибер-easing с квантовыми флуктуациями
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const fluctuation = Math.sin(progress * 20) * 0.1 * (1 - progress);
        const currentValue = Math.round(start + (target - start) * (easeOut + fluctuation));

        // Добавляем случайные глитчи
        if (Math.random() < 0.1 && progress < 0.9) {
            element.textContent = Math.random() > 0.5 ? '█'.repeat(3) : '▓'.repeat(3);
            setTimeout(() => {
                element.textContent = element.id === 'stat-accuracy' ? `${currentValue}%` : currentValue;
            }, 50);
        } else {
            element.textContent = element.id === 'stat-accuracy' ? `${currentValue}%` : currentValue;
        }

        // Кибер-свечение при обновлении
        if (progress < 1) {
            element.style.textShadow = `0 0 ${20 + Math.sin(progress * 10) * 10}px var(--neon-cyan)`;
            requestAnimationFrame(updateCounter);
        } else {
            element.style.textShadow = '0 0 20px var(--neon-cyan)';
        }
    }

    requestAnimationFrame(updateCounter);
}

/**
 * Голографический эффект печати
 */
function hologramTypewriter(element, text, speed = 80) {
    if (!element) return;

    element.textContent = '';
    element.style.borderRight = '3px solid var(--neon-cyan)';
    element.style.animation = 'name-glow 1s ease-in-out infinite';

    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            // Случайные кибер-символы
            if (Math.random() < 0.1) {
                element.textContent = text.substring(0, i) + '█';
                setTimeout(() => {
                    element.textContent = text.substring(0, i + 1);
                }, 30);
            } else {
                element.textContent = text.substring(0, i + 1);
            }
            i++;
        } else {
            clearInterval(typeInterval);
            setTimeout(() => {
                element.style.borderRight = 'none';
            }, 1000);
        }
    }, speed);

    // Голографический мерцание
    element.addEventListener('mouseover', () => {
        element.style.filter = 'hue-rotate(180deg) brightness(1.3)';
        setTimeout(() => {
            element.style.filter = '';
        }, 200);
    });
}

/**
 * Кибер-глитч эффект
 */
function triggerGlitch(element, duration = 300) {
    if (!element) return;

    element.classList.add('glitch');

    // Случайные кибер-символы
    const originalText = element.textContent;
    const glitchChars = '█▓▒░▀▄▌▐▆▇';

    let glitchInterval = setInterval(() => {
        if (Math.random() < 0.3) {
            const randomChars = Array(originalText.length).fill().map(() =>
                glitchChars[Math.floor(Math.random() * glitchChars.length)]
            ).join('');
            element.textContent = randomChars;

            setTimeout(() => {
                element.textContent = originalText;
            }, 50);
        }
    }, 100);

    setTimeout(() => {
        clearInterval(glitchInterval);
        element.classList.remove('glitch');
        element.textContent = originalText;
    }, duration);
}

// Состояние кибер-системы
const CyberState = {
    loading: false,
    error: false,
    errorMessage: '',
    profileData: null,
    token: null,
    isAuthenticated: false,
    quantumField: true
};

// Кибер-элементы интерфейса
const CyberElements = {
    loadingScreen: null,
    mainContent: null,
    errorScreen: null,
    errorMessage: null,

    // Профиль агента
    detectiveName: null,
    detectiveRank: null,
    reputationLevel: null,
    reputationCategory: null,

    // Боевая статистика
    statInvestigations: null,
    statSolved: null,
    statAccuracy: null,
    statScore: null,

    // Контейнеры
    achievementsContainer: null,
    leaderboardContainer: null
};

// Инициализация кибер-элементов
function initCyberElements() {
    CyberElements.loadingScreen = document.getElementById('loading-screen');
    CyberElements.mainContent = document.getElementById('main-content');
    CyberElements.errorScreen = document.getElementById('error-screen');
    CyberElements.errorMessage = document.getElementById('error-message');

    // Профиль
    CyberElements.detectiveName = document.getElementById('detective-name');
    CyberElements.detectiveRank = document.getElementById('detective-rank');
    CyberElements.reputationLevel = document.getElementById('reputation-level');
    CyberElements.reputationCategory = document.getElementById('reputation-category');

    // Статистика
    CyberElements.statInvestigations = document.getElementById('stat-investigations');
    CyberElements.statSolved = document.getElementById('stat-solved');
    CyberElements.statAccuracy = document.getElementById('stat-accuracy');
    CyberElements.statScore = document.getElementById('stat-score');

    // Контейнеры
    CyberElements.achievementsContainer = document.getElementById('achievements-container');
    CyberElements.leaderboardContainer = document.getElementById('leaderboard-container');
}

/**
 * Кибер-система управления профилем
 */
class CyberProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            console.log('🤖 Активация кибер-системы профиля...');

            initCyberElements();
            this.showLoading();

            // Инициализация Telegram WebApp с кибер-настройками
            if (tg) {
                tg.ready();
                tg.expand();

                // Кибер-тема
                if (tg.themeParams) {
                    document.documentElement.style.setProperty('--tg-bg', tg.themeParams.bg_color || '#000011');
                    document.documentElement.style.setProperty('--tg-text', tg.themeParams.text_color || '#00FFFF');
                }

                // Квантовая кнопка назад
                if (tg.BackButton) {
                    tg.BackButton.show();
                    tg.BackButton.onClick(() => {
                        this.triggerQuantumTransition();
                        if (tg.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('heavy');
                        }
                        setTimeout(() => window.history.back(), 300);
                    });
                }
            }

            // Квантовая аутентификация
            await this.quantumAuth();

            if (CyberState.isAuthenticated) {
                await this.loadCyberProfile();
                await this.loadDigitalAchievements();
                await this.loadAgentRanking();

                this.showCyberContent();
                this.initQuantumInteractivity();
            } else {
                this.showError('Квантовый доступ запрещен');
            }

        } catch (error) {
            console.error('❌ Критическая ошибка кибер-системы:', error);
            this.showError('Система взломана: ' + error.message);
        }
    }

    async quantumAuth() {
        try {
            console.log('🔐 Квантовая верификация агента...');

            const urlParams = new URLSearchParams(window.location.search);
            let token = urlParams.get('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');

            if (!token && tg?.initData) {
                const response = await fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initData: tg.initData })
                });

                if (response.ok) {
                    const data = await response.json();
                    token = data.token;
                    localStorage.setItem('token', token);
                }
            }

            if (token) {
                const response = await fetch('/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    CyberState.token = token;
                    CyberState.isAuthenticated = true;
                    console.log('✅ Квантовая верификация успешна');
                } else {
                    console.log('❌ Недействительный квантовый ключ');
                    localStorage.removeItem('token');
                }
            }

        } catch (error) {
            console.error('❌ Ошибка квантовой системы:', error);
            CyberState.isAuthenticated = false;
        }
    }

    async loadCyberProfile() {
        try {
            console.log('📊 Загрузка кибер-досье агента...');

            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${CyberState.token}` }
            });

            if (!response.ok) {
                throw new Error('Квантовые данные недоступны');
            }

            const profileData = await response.json();
            CyberState.profileData = profileData;

            console.log('✅ Кибер-досье загружено:', profileData);
            this.updateCyberUI(profileData);

        } catch (error) {
            console.error('❌ Ошибка загрузки кибер-досье:', error);
            throw error;
        }
    }

    updateCyberUI(data) {
        // Голографическое имя
        if (CyberElements.detectiveName) {
            const name = (data.basic?.firstName || data.username || 'КИБЕР-АГЕНТ').toUpperCase();
            hologramTypewriter(CyberElements.detectiveName, name);
        }

        // Кибер-ранг
        if (CyberElements.detectiveRank) {
            CyberElements.detectiveRank.textContent = data.rank?.current || 'СИСТЕМА';
            createQuantumExplosion(CyberElements.detectiveRank, 'success');
        }

        // Квантовая репутация
        if (CyberElements.reputationLevel) {
            cyberCounter(CyberElements.reputationLevel, data.reputation?.level || 0, 2000);
        }

        if (CyberElements.reputationCategory) {
            CyberElements.reputationCategory.textContent = data.reputation?.category || 'НЕОПРЕДЕЛЕНО';
        }

        // Боевая статистика с кибер-эффектами
        const stats = data.stats || {};

        if (CyberElements.statInvestigations) {
            cyberCounter(CyberElements.statInvestigations, stats.investigations || 0);
        }

        if (CyberElements.statSolved) {
            cyberCounter(CyberElements.statSolved, stats.solvedCases || 0);
        }

        if (CyberElements.statAccuracy) {
            cyberCounter(CyberElements.statAccuracy, Math.round(stats.accuracy || 0));
        }

        if (CyberElements.statScore) {
            cyberCounter(CyberElements.statScore, stats.totalScore || 0, 2500);
        }
    }

    async loadDigitalAchievements() {
        try {
            console.log('🏆 Загрузка цифровых наград...');

            const response = await fetch('/api/user/achievements', {
                headers: { 'Authorization': `Bearer ${CyberState.token}` }
            });

            if (!response.ok) {
                console.log('⚠️ Цифровые награды недоступны');
                return;
            }

            const achievements = await response.json();
            this.renderCyberAchievements(achievements);

        } catch (error) {
            console.error('❌ Ошибка загрузки цифровых наград:', error);
        }
    }

    renderCyberAchievements(achievements) {
        if (!CyberElements.achievementsContainer) return;

        const cyberAchievements = [
            { id: 'first_case', name: 'ПЕРВАЯ МИССИЯ', icon: '⚡', locked: true, description: 'Дебютная операция' },
            { id: 'rookie', name: 'КИБЕР-НОВИЧОК', icon: '🤖', locked: true, description: 'Вход в систему' },
            { id: 'expert', name: 'МАСТЕР-ХАКЕР', icon: '💎', locked: true, description: 'Экспертный уровень' },
            { id: 'sharp_eye', name: 'КВАНТОВЫЙ ГЛАЗ', icon: '👁️', locked: true, description: 'Суперзрение' },
            { id: 'serial_detective', name: 'КИБЕР-ДЕТЕКТИВ', icon: '🕵️', locked: true, description: 'Серия побед' },
            { id: 'maniac', name: 'ПЕРФЕКЦИОНИСТ', icon: '🔥', locked: true, description: 'Идеальная точность' }
        ];

        // Обновление статуса наград
        achievements.forEach(userAchievement => {
            const achievement = cyberAchievements.find(a => a.id === userAchievement.id);
            if (achievement) {
                achievement.locked = false;
                achievement.name = userAchievement.name || achievement.name;
            }
        });

        // Рендер с кибер-эффектами
        CyberElements.achievementsContainer.innerHTML = cyberAchievements.map((achievement, index) => `
            <div class="achievement-core ${achievement.locked ? '' : 'unlocked'}" 
                 title="${achievement.description}"
                 style="animation-delay: ${index * 0.1}s">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.locked ? '▓▓▓' : achievement.name}</div>
            </div>
        `).join('');

        // Квантовая интерактивность
        setTimeout(() => {
            const cores = CyberElements.achievementsContainer.querySelectorAll('.achievement-core');
            cores.forEach(core => {
                core.addEventListener('click', () => {
                    if (core.classList.contains('unlocked')) {
                        createQuantumExplosion(core, 'success');
                        triggerGlitch(core);
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('medium');
                        }
                    }
                });
            });
        }, 200);
    }

    async loadAgentRanking() {
        try {
            console.log('👑 Загрузка рейтинга кибер-агентов...');

            const response = await fetch('/api/leaderboard/week', {
                headers: { 'Authorization': `Bearer ${CyberState.token}` }
            });

            if (!response.ok) {
                console.log('⚠️ Рейтинг агентов недоступен');
                return;
            }

            const leaderboard = await response.json();
            this.renderCyberLeaderboard(leaderboard);

        } catch (error) {
            console.error('❌ Ошибка загрузки рейтинга:', error);
        }
    }

    renderCyberLeaderboard(data) {
        if (!CyberElements.leaderboardContainer) return;

        const leaders = data.leaders || [];
        const currentUser = CyberState.profileData;

        if (leaders.length === 0) {
            CyberElements.leaderboardContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--hologram-silver);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🤖</div>
                    <p style="font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 2px;">
                        КВАНТОВЫЕ ДАННЫЕ НЕДОСТУПНЫ
                    </p>
                </div>
            `;
            return;
        }

        CyberElements.leaderboardContainer.innerHTML = leaders.map((leader, index) => {
            const isCurrentUser = currentUser && leader.userId === currentUser.id;
            const rankIcons = ['🥇', '🥈', '🥉'];
            const rankIcon = rankIcons[index] || '🎖️';

            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}" 
                     style="animation-delay: ${index * 0.05}s; 
                            background: var(--hologram-secondary); 
                            border: 1px solid var(--cyber-blue);
                            border-radius: var(--radius-lg);
                            padding: var(--space-lg);
                            margin-bottom: var(--space-md);
                            display: flex; align-items: center; gap: var(--space-md);
                            transition: all var(--transition-cyber);">
                    <div style="width: 50px; height: 50px; background: var(--hologram-primary); 
                                color: var(--void-black); border-radius: 50%; 
                                display: flex; align-items: center; justify-content: center; 
                                font-weight: 900; font-family: 'Orbitron', monospace; 
                                box-shadow: 0 0 20px var(--neon-cyan);">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; margin-bottom: 2px; 
                                    font-family: 'Orbitron', monospace; color: var(--void-black);">
                            ${rankIcon} ${(leader.username || leader.firstName || 'КИБЕР-АГЕНТ').toUpperCase()}
                            ${isCurrentUser ? ' (ВЫ)' : ''}
                        </div>
                        <div style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.7); 
                                    font-family: 'Rajdhani', monospace;">
                            ${leader.score || 0} КИБЕР-ОЧКОВ
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Кибер-интерактивность рейтинга
        setTimeout(() => {
            const items = CyberElements.leaderboardContainer.querySelectorAll('.leaderboard-item');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    createQuantumExplosion(item, 'info');
                    if (tg?.HapticFeedback) {
                        tg.HapticFeedback.impactOccurred('light');
                    }
                });

                item.addEventListener('mouseenter', () => {
                    item.style.transform = 'translateX(8px) scale(1.02)';
                    item.style.borderColor = 'var(--neon-cyan)';
                    item.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.4)';
                });

                item.addEventListener('mouseleave', () => {
                    item.style.transform = '';
                    item.style.borderColor = 'var(--cyber-blue)';
                    item.style.boxShadow = '';
                });
            });
        }, 100);
    }

    initQuantumInteractivity() {
        // Кибер-звуки через HapticFeedback
        if (tg?.HapticFeedback) {
            document.querySelectorAll('.cyber-button, .stat-pod, .achievement-core').forEach(element => {
                element.addEventListener('click', () => {
                    tg.HapticFeedback.impactOccurred('medium');
                });
            });
        }

        // Квантовые частицы при наведении
        document.querySelectorAll('.cyber-module').forEach(module => {
            module.addEventListener('mouseenter', () => {
                this.generateQuantumField(module);
            });
        });

        // Случайные глитчи
        setInterval(() => {
            if (Math.random() < 0.05) {
                const elements = document.querySelectorAll('.stat-value, .agent-name');
                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                if (randomElement) {
                    triggerGlitch(randomElement, 200);
                }
            }
        }, 5000);
    }

    generateQuantumField(element) {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: var(--neon-cyan);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1500;
                    box-shadow: 0 0 10px var(--neon-cyan);
                `;

                const rect = element.getBoundingClientRect();
                particle.style.left = `${rect.left + Math.random() * rect.width}px`;
                particle.style.top = `${rect.top + Math.random() * rect.height}px`;

                document.body.appendChild(particle);

                let life = 1;
                function quantumFloat() {
                    life -= 0.02;
                    particle.style.opacity = life;
                    particle.style.transform = `translate(${Math.sin(Date.now() * 0.01) * 20}px, ${-life * 100}px) scale(${life * 2})`;

                    if (life > 0) {
                        requestAnimationFrame(quantumFloat);
                    } else {
                        document.body.removeChild(particle);
                    }
                }
                requestAnimationFrame(quantumFloat);
            }, i * 100);
        }
    }

    triggerQuantumTransition() {
        document.body.style.filter = 'hue-rotate(180deg) brightness(1.5) contrast(2)';
        setTimeout(() => {
            document.body.style.filter = '';
        }, 300);
    }

    showLoading() {
        CyberState.loading = true;
        CyberState.error = false;

        if (CyberElements.loadingScreen) {
            CyberElements.loadingScreen.classList.remove('hidden');
        }
        if (CyberElements.mainContent) CyberElements.mainContent.classList.add('hidden');
        if (CyberElements.errorScreen) CyberElements.errorScreen.classList.add('hidden');
    }

    showCyberContent() {
        CyberState.loading = false;
        CyberState.error = false;

        if (CyberElements.loadingScreen) CyberElements.loadingScreen.classList.add('hidden');
        if (CyberElements.mainContent) {
            CyberElements.mainContent.classList.remove('hidden');
            // Квантовое появление
            document.querySelectorAll('.cyber-module').forEach((module, index) => {
                module.style.animationDelay = `${index * 0.1}s`;
            });
        }
        if (CyberElements.errorScreen) CyberElements.errorScreen.classList.add('hidden');

        // Успешная активация
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    showError(message) {
        CyberState.loading = false;
        CyberState.error = true;
        CyberState.errorMessage = message;

        if (CyberElements.errorMessage) CyberElements.errorMessage.textContent = message;

        if (CyberElements.loadingScreen) CyberElements.loadingScreen.classList.add('hidden');
        if (CyberElements.mainContent) CyberElements.mainContent.classList.add('hidden');
        if (CyberElements.errorScreen) {
            CyberElements.errorScreen.classList.remove('hidden');
        }

        // Ошибка системы
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
}

// Запуск кибер-системы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Активация квантового интерфейса кибер-агента...');
    new CyberProfileManager();
});

// Обновление кибер-иконок
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
}); 