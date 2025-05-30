/**
 * Детективная система управления досье агента
 * Мрачный интерфейс с криминальными эффектами и нуарными анимациями
 */

// Telegram WebApp API
let tg = window.Telegram?.WebApp;

/**
 * Генератор кровавых частиц
 */
function createBloodExplosion(element, type = 'solved') {
    const colors = {
        solved: ['#8B0000', '#DC143C', '#FFD700'],
        failed: ['#FF0040', '#FF6600', '#FFBF00'],
        clue: ['#8B0000', '#4A0E0E', '#DC143C']
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

        // Криминальная анимация
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 80 + Math.random() * 40;
        let opacity = 1;
        let scale = 1;
        let rotation = 0;

        function animateBloodParticle() {
            const x = Math.cos(angle) * velocity * (1 - opacity);
            const y = Math.sin(angle) * velocity * (1 - opacity);

            particle.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
            particle.style.opacity = opacity;

            opacity -= 0.015;
            scale += 0.02;
            rotation += 8;

            if (opacity > 0) {
                requestAnimationFrame(animateBloodParticle);
            } else {
                document.body.removeChild(particle);
            }
        }

        requestAnimationFrame(animateBloodParticle);
    }
}

/**
 * Детективный счетчик с мрачными эффектами
 */
function criminalCounter(element, targetValue, duration = 1500) {
    if (!element) return;

    const start = parseInt(element.textContent) || 0;
    const target = parseInt(targetValue) || 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Детективный easing с мрачными флуктуациями
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const fluctuation = Math.sin(progress * 20) * 0.1 * (1 - progress);
        const currentValue = Math.round(start + (target - start) * (easeOut + fluctuation));

        // Добавляем случайные глитчи улик
        if (Math.random() < 0.1 && progress < 0.9) {
            element.textContent = Math.random() > 0.5 ? '███' : '▓▓▓';
            setTimeout(() => {
                element.textContent = element.id === 'stat-accuracy' ? `${currentValue}%` : currentValue;
            }, 50);
        } else {
            element.textContent = element.id === 'stat-accuracy' ? `${currentValue}%` : currentValue;
        }

        // Кровавое свечение при обновлении
        if (progress < 1) {
            element.style.textShadow = `0 0 ${20 + Math.sin(progress * 10) * 10}px var(--blood-red)`;
            requestAnimationFrame(updateCounter);
        } else {
            element.style.textShadow = '0 0 20px var(--crimson)';
        }
    }

    requestAnimationFrame(updateCounter);
}

/**
 * Эффект детективной печатной машинки
 */
function detectiveTypewriter(element, text, speed = 80) {
    if (!element) return;

    element.textContent = '';
    element.style.borderRight = '3px solid var(--crimson)';
    element.style.animation = 'name-glow 1s ease-in-out infinite';

    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            // Случайные криминальные символы
            if (Math.random() < 0.1) {
                element.textContent = text.substring(0, i) + '▓';
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

    // Мрачное мерцание
    element.addEventListener('mouseover', () => {
        element.style.filter = 'hue-rotate(30deg) brightness(1.2)';
        setTimeout(() => {
            element.style.filter = '';
        }, 200);
    });
}

/**
 * Кровавый глитч эффект
 */
function triggerBloodGlitch(element, duration = 300) {
    if (!element) return;

    element.classList.add('blood-glitch');

    // Случайные криминальные символы
    const originalText = element.textContent;
    const glitchChars = '▓▒░█▄▌▐▆▇';

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
        element.classList.remove('blood-glitch');
        element.textContent = originalText;
    }, duration);
}

// Состояние детективной системы
const CaseState = {
    investigating: false,
    error: false,
    errorMessage: '',
    detectiveData: null,
    token: null,
    isAuthenticated: false,
    crimeScene: true
};

// Элементы детективного интерфейса
const CaseElements = {
    loadingScreen: null,
    mainContent: null,
    errorScreen: null,
    errorMessage: null,

    // Досье детектива
    detectiveName: null,
    detectiveRank: null,
    reputationLevel: null,
    reputationCategory: null,

    // Криминальная статистика
    statInvestigations: null,
    statSolved: null,
    statAccuracy: null,
    statScore: null,

    // Контейнеры
    achievementsContainer: null,
    leaderboardContainer: null
};

// Инициализация детективных элементов
function initCaseElements() {
    CaseElements.loadingScreen = document.getElementById('loading-screen');
    CaseElements.mainContent = document.getElementById('main-content');
    CaseElements.errorScreen = document.getElementById('error-screen');
    CaseElements.errorMessage = document.getElementById('error-message');

    // Досье
    CaseElements.detectiveName = document.getElementById('detective-name');
    CaseElements.detectiveRank = document.getElementById('detective-rank');
    CaseElements.reputationLevel = document.getElementById('reputation-level');
    CaseElements.reputationCategory = document.getElementById('reputation-category');

    // Статистика
    CaseElements.statInvestigations = document.getElementById('stat-investigations');
    CaseElements.statSolved = document.getElementById('stat-solved');
    CaseElements.statAccuracy = document.getElementById('stat-accuracy');
    CaseElements.statScore = document.getElementById('stat-score');

    // Контейнеры
    CaseElements.achievementsContainer = document.getElementById('achievements-container');
    CaseElements.leaderboardContainer = document.getElementById('leaderboard-container');
}

/**
 * Детективная система управления досье
 */
class CriminalProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            console.log('🕵️ Активация детективной системы досье...');

            initCaseElements();
            this.showInvestigation();

            // Инициализация Telegram WebApp с детективными настройками
            if (tg) {
                tg.ready();
                tg.expand();

                // Мрачная тема
                if (tg.themeParams) {
                    document.documentElement.style.setProperty('--tg-bg', tg.themeParams.bg_color || '#0D0D0D');
                    document.documentElement.style.setProperty('--tg-text', tg.themeParams.text_color || '#F5F5DC');
                }

                // Детективная кнопка назад
                if (tg.BackButton) {
                    tg.BackButton.show();
                    tg.BackButton.onClick(() => {
                        this.triggerCrimeSceneTransition();
                        if (tg.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('heavy');
                        }
                        setTimeout(() => window.history.back(), 300);
                    });
                }
            }

            // Криминальная аутентификация
            await this.detectiveAuth();

            if (CaseState.isAuthenticated) {
                await this.loadDetectiveDossier();
                await this.loadCriminalAchievements();
                await this.loadDetectiveRanking();

                this.showCaseContent();
                this.initCrimeSceneInteractivity();
            } else {
                this.showError('Доступ к досье запрещен');
            }

        } catch (error) {
            console.error('❌ Критическая ошибка детективной системы:', error);
            this.showError('Система взломана: ' + error.message);
        }
    }

    async detectiveAuth() {
        try {
            console.log('🔐 Проверка удостоверения детектива...');

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
                    CaseState.token = token;
                    CaseState.isAuthenticated = true;
                    console.log('✅ Удостоверение детектива подтверждено');
                } else {
                    console.log('❌ Недействительное удостоверение');
                    localStorage.removeItem('token');
                }
            }

        } catch (error) {
            console.error('❌ Ошибка проверки удостоверения:', error);
            CaseState.isAuthenticated = false;
        }
    }

    async loadDetectiveDossier() {
        try {
            console.log('📊 Загрузка досье детектива...');

            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${CaseState.token}` }
            });

            if (!response.ok) {
                throw new Error('Досье недоступно');
            }

            const detectiveData = await response.json();
            CaseState.detectiveData = detectiveData;

            console.log('✅ Досье детектива загружено:', detectiveData);
            this.updateDetectiveUI(detectiveData);

        } catch (error) {
            console.error('❌ Ошибка загрузки досье:', error);
            throw error;
        }
    }

    updateDetectiveUI(data) {
        // Детективное имя
        if (CaseElements.detectiveName) {
            const name = (data.basic?.firstName || data.username || 'ДЕТЕКТИВ').toUpperCase();
            detectiveTypewriter(CaseElements.detectiveName, name);
        }

        // Детективный ранг
        if (CaseElements.detectiveRank) {
            CaseElements.detectiveRank.textContent = data.rank?.current || 'НОВИЧОК';
            createBloodExplosion(CaseElements.detectiveRank, 'solved');
        }

        // Криминальная репутация
        if (CaseElements.reputationLevel) {
            criminalCounter(CaseElements.reputationLevel, data.reputation?.level || 0, 2000);
        }

        if (CaseElements.reputationCategory) {
            CaseElements.reputationCategory.textContent = data.reputation?.category || 'НЕОПРЕДЕЛЕНО';
        }

        // Криминальная статистика с мрачными эффектами
        const stats = data.stats || {};

        if (CaseElements.statInvestigations) {
            criminalCounter(CaseElements.statInvestigations, stats.investigations || 0);
        }

        if (CaseElements.statSolved) {
            criminalCounter(CaseElements.statSolved, stats.solvedCases || 0);
        }

        if (CaseElements.statAccuracy) {
            criminalCounter(CaseElements.statAccuracy, Math.round(stats.accuracy || 0));
        }

        if (CaseElements.statScore) {
            criminalCounter(CaseElements.statScore, stats.totalScore || 0, 2500);
        }
    }

    async loadCriminalAchievements() {
        try {
            console.log('🏆 Загрузка улик и наград...');

            const response = await fetch('/api/user/achievements', {
                headers: { 'Authorization': `Bearer ${CaseState.token}` }
            });

            if (!response.ok) {
                console.log('⚠️ Улики и награды недоступны');
                return;
            }

            const achievements = await response.json();
            this.renderForensicEvidence(achievements);

        } catch (error) {
            console.error('❌ Ошибка загрузки улик:', error);
        }
    }

    renderForensicEvidence(achievements) {
        if (!CaseElements.achievementsContainer) return;

        const forensicEvidence = [
            { id: 'first_case', name: 'ПЕРВОЕ ДЕЛО', icon: '🔍', locked: true, description: 'Начало карьеры' },
            { id: 'rookie', name: 'НОВИЧОК', icon: '🕵️', locked: true, description: 'Первые шаги' },
            { id: 'expert', name: 'ЭКСПЕРТ', icon: '💀', locked: true, description: 'Опытный криминалист' },
            { id: 'sharp_eye', name: 'ОСТРЫЙ ГЛАЗ', icon: '👁️', locked: true, description: 'Замечает детали' },
            { id: 'serial_detective', name: 'СЕРИЙНЫЙ СЫЩИК', icon: '🔗', locked: true, description: 'Связанные дела' },
            { id: 'maniac', name: 'ПЕРФЕКЦИОНИСТ', icon: '🎯', locked: true, description: 'Идеальная точность' }
        ];

        // Обновление статуса улик
        achievements.forEach(userAchievement => {
            const evidence = forensicEvidence.find(e => e.id === userAchievement.id);
            if (evidence) {
                evidence.locked = false;
                evidence.name = userAchievement.name || evidence.name;
            }
        });

        // Рендер с криминалистическими эффектами
        CaseElements.achievementsContainer.innerHTML = forensicEvidence.map((evidence, index) => `
            <div class="achievement-card hologram-effect interactive-hover ${evidence.locked ? '' : 'unlocked'}" 
                 title="${evidence.description}"
                 style="animation-delay: ${index * 0.15}s">
                <div class="achievement-icon">${evidence.icon}</div>
                <div class="achievement-name">${evidence.locked ? '▓▓▓' : evidence.name}</div>
            </div>
        `).join('');

        // Криминалистическая интерактивность
        setTimeout(() => {
            const cards = CaseElements.achievementsContainer.querySelectorAll('.achievement-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    if (card.classList.contains('unlocked')) {
                        createForensicExplosion(card, 'solved');
                        triggerForensicGlitch(card);
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('heavy');
                        }
                    }
                });
            });
        }, 300);
    }

    async loadDetectiveRanking() {
        try {
            console.log('👑 Загрузка рейтинга детективов...');

            const response = await fetch('/api/leaderboard/week', {
                headers: { 'Authorization': `Bearer ${CaseState.token}` }
            });

            if (!response.ok) {
                console.log('⚠️ Рейтинг детективов недоступен');
                return;
            }

            const leaderboard = await response.json();
            this.renderDetectiveLeaderboard(leaderboard);

        } catch (error) {
            console.error('❌ Ошибка загрузки рейтинга:', error);
        }
    }

    renderDetectiveLeaderboard(data) {
        if (!CaseElements.leaderboardContainer) return;

        const leaders = data.leaders || [];
        const currentUser = CaseState.detectiveData;

        if (leaders.length === 0) {
            CaseElements.leaderboardContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--bone-white);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🕵️</div>
                    <p style="font-family: 'Special Elite', monospace; text-transform: uppercase; letter-spacing: 2px;">
                        ДОСЬЕ ЗАСЕКРЕЧЕНО
                    </p>
                </div>
            `;
            return;
        }

        CaseElements.leaderboardContainer.innerHTML = leaders.map((leader, index) => {
            const isCurrentUser = currentUser && leader.userId === currentUser.id;
            const rankIcons = ['🥇', '🥈', '🥉'];
            const rankIcon = rankIcons[index] || '🎖️';

            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}" 
                     style="animation-delay: ${index * 0.05}s; 
                            background: var(--shadow-gradient); 
                            border: 2px solid var(--steel-gray);
                            border-radius: var(--radius-lg);
                            padding: var(--space-lg);
                            margin-bottom: var(--space-md);
                            display: flex; align-items: center; gap: var(--space-md);
                            transition: all var(--transition-detective);">
                    <div style="width: 50px; height: 50px; background: var(--blood-gradient); 
                                color: var(--bone-white); border-radius: 50%; 
                                display: flex; align-items: center; justify-content: center; 
                                font-weight: 900; font-family: 'JetBrains Mono', monospace; 
                                box-shadow: 0 0 20px var(--blood-red);">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; margin-bottom: 2px; 
                                    font-family: 'Special Elite', monospace; color: var(--bone-white);">
                            ${rankIcon} ${(leader.username || leader.firstName || 'ДЕТЕКТИВ').toUpperCase()}
                            ${isCurrentUser ? ' (ВЫ)' : ''}
                        </div>
                        <div style="font-size: 0.9rem; color: rgba(245, 245, 220, 0.7); 
                                    font-family: 'Special Elite', monospace;">
                            ${leader.score || 0} ОЧКОВ
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Детективная интерактивность рейтинга
        setTimeout(() => {
            const items = CaseElements.leaderboardContainer.querySelectorAll('.leaderboard-item');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    createBloodExplosion(item, 'clue');
                    if (tg?.HapticFeedback) {
                        tg.HapticFeedback.impactOccurred('light');
                    }
                });

                item.addEventListener('mouseenter', () => {
                    item.style.transform = 'translateX(8px) scale(1.02)';
                    item.style.borderColor = 'var(--crimson)';
                    item.style.boxShadow = '0 0 30px rgba(139, 0, 0, 0.4)';
                });

                item.addEventListener('mouseleave', () => {
                    item.style.transform = '';
                    item.style.borderColor = 'var(--steel-gray)';
                    item.style.boxShadow = '';
                });
            });
        }, 100);
    }

    initCrimeSceneInteractivity() {
        // Детективные звуки через HapticFeedback
        if (tg?.HapticFeedback) {
            document.querySelectorAll('.evidence-button, .stat-evidence, .evidence-piece').forEach(element => {
                element.addEventListener('click', () => {
                    tg.HapticFeedback.impactOccurred('medium');
                });
            });
        }

        // Кровавые частицы при наведении
        document.querySelectorAll('.case-module').forEach(module => {
            module.addEventListener('mouseenter', () => {
                this.generateCrimeScene(module);
            });
        });

        // Случайные криминальные глитчи
        setInterval(() => {
            if (Math.random() < 0.05) {
                const elements = document.querySelectorAll('.stat-value, .detective-name');
                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                if (randomElement) {
                    triggerBloodGlitch(randomElement, 200);
                }
            }
        }, 5000);
    }

    generateCrimeScene(element) {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: var(--blood-red);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1500;
                    box-shadow: 0 0 10px var(--blood-red);
                `;

                const rect = element.getBoundingClientRect();
                particle.style.left = `${rect.left + Math.random() * rect.width}px`;
                particle.style.top = `${rect.top + Math.random() * rect.height}px`;

                document.body.appendChild(particle);

                let life = 1;
                function crimeFloat() {
                    life -= 0.02;
                    particle.style.opacity = life;
                    particle.style.transform = `translate(${Math.sin(Date.now() * 0.01) * 20}px, ${-life * 100}px) scale(${life * 2})`;

                    if (life > 0) {
                        requestAnimationFrame(crimeFloat);
                    } else {
                        document.body.removeChild(particle);
                    }
                }
                requestAnimationFrame(crimeFloat);
            }, i * 100);
        }
    }

    triggerCrimeSceneTransition() {
        document.body.style.filter = 'hue-rotate(30deg) brightness(1.3) contrast(1.5)';
        setTimeout(() => {
            document.body.style.filter = '';
        }, 300);
    }

    showInvestigation() {
        CaseState.investigating = true;
        CaseState.error = false;

        if (CaseElements.loadingScreen) {
            CaseElements.loadingScreen.classList.remove('hidden');
        }
        if (CaseElements.mainContent) CaseElements.mainContent.classList.add('hidden');
        if (CaseElements.errorScreen) CaseElements.errorScreen.classList.add('hidden');
    }

    showCaseContent() {
        CaseState.investigating = false;
        CaseState.error = false;

        if (CaseElements.loadingScreen) CaseElements.loadingScreen.classList.add('hidden');
        if (CaseElements.mainContent) {
            CaseElements.mainContent.classList.remove('hidden');
            // Детективное появление
            document.querySelectorAll('.case-module').forEach((module, index) => {
                module.style.animationDelay = `${index * 0.1}s`;
            });
        }
        if (CaseElements.errorScreen) CaseElements.errorScreen.classList.add('hidden');

        // Успешное расследование
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    showError(message) {
        CaseState.investigating = false;
        CaseState.error = true;
        CaseState.errorMessage = message;

        if (CaseElements.errorMessage) CaseElements.errorMessage.textContent = message;

        if (CaseElements.loadingScreen) CaseElements.loadingScreen.classList.add('hidden');
        if (CaseElements.mainContent) CaseElements.mainContent.classList.add('hidden');
        if (CaseElements.errorScreen) {
            CaseElements.errorScreen.classList.remove('hidden');
        }

        // Ошибка расследования
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
}

// Запуск детективной системы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Активация интерфейса детективного досье...');
    new CriminalProfileManager();
});

// Обновление детективных иконок
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
}); 