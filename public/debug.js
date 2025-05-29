// Упрощенный инструмент диагностики
(function () {
    console.log('Инструмент диагностики запущен (упрощенная версия)');

    // Функция для получения состояния приложения
    function debugAppState() {
        // Проверяем наличие основных объектов приложения
        const hasGameState = typeof window.GameState !== 'undefined';
        const hasTestInterface = typeof window.CriminalBluffTestInterface !== 'undefined';

        // Информация о Telegram WebApp
        const tgStatus = window.Telegram?.WebApp ? {
            colorScheme: window.Telegram.WebApp.colorScheme,
            isExpanded: window.Telegram.WebApp.isExpanded,
            version: window.Telegram.WebApp.version,
            hasTelegramUser: !!window.Telegram.WebApp.initDataUnsafe?.user
        } : 'Не доступен';

        // Информация о приложении
        let appData = null;
        try {
            if (window.CriminalBluffApp && window.CriminalBluffApp.getData) {
                const data = window.CriminalBluffApp.getData();
                appData = {
                    isLoading: data.isLoading,
                    isInitialized: data.isInitialized,
                    currentScreen: data.currentScreen,
                    theme: data.theme,
                    isTestMode: data.isTestMode
                };
            }
        } catch (e) {
            appData = { error: 'Ошибка при получении данных приложения: ' + e.message };
        }

        return {
            timestamp: new Date().toISOString(),
            appCore: {
                hasGameState,
                hasTestInterface
            },
            telegramWebApp: tgStatus,
            app: appData
        };
    }

    // Глобальный интерфейс для диагностики
    window.debugApp = {
        getState: debugAppState,
        // Функция для принудительной отправки ready() в Telegram
        forceTelegramReady: function () {
            if (window.Telegram && window.Telegram.WebApp) {
                console.log('Отправка принудительного сигнала ready() в Telegram WebApp');
                window.Telegram.WebApp.ready();
                return 'Успешно отправлен сигнал ready()';
            }
            return 'Telegram WebApp не найден';
        }
    };

    // Добавляем кнопку отладки в интерфейс
    window.addEventListener('load', function () {
        // Создаем кнопку отладки
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Debug';
        debugButton.style.position = 'fixed';
        debugButton.style.bottom = '10px';
        debugButton.style.right = '10px';
        debugButton.style.zIndex = '9999';
        debugButton.style.padding = '5px 10px';
        debugButton.style.background = '#f44336';
        debugButton.style.color = 'white';
        debugButton.style.border = 'none';
        debugButton.style.borderRadius = '4px';
        debugButton.style.fontSize = '12px';
        debugButton.style.opacity = '0.7';

        // При клике выводим отладочную информацию
        debugButton.addEventListener('click', function () {
            const state = debugAppState();

        });

        // Добавляем кнопку в DOM
        setTimeout(() => {
            document.body.appendChild(debugButton);
        }, 1000);
    });
})(); 