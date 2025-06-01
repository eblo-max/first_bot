/**
 * 🔐 МОДУЛЬ АВТОРИЗАЦИИ
 * Функции для работы с Telegram WebApp авторизацией
 */

import { AppGameData } from './game-core.js';
import { TelegramWebAppData } from './types.js';

/**
 * Проверка существующего токена на сервере
 */
export async function verifyExistingToken(token: string): Promise<boolean> {
    try {
        console.log('🔍 Проверяем токен на сервере...');

        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Токен валиден, пользователь авторизован');

            // Токен валиден - обновляем состояние
            AppGameData.token = token;
            return true;
        } else {
            console.warn('⚠️ Токен недействителен, требуется новая авторизация');

            // Токен недействителен - очищаем
            localStorage.removeItem('token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            AppGameData.token = null;
            return false;
        }

    } catch (error) {
        console.error('❌ Ошибка проверки токена:', error);

        // В случае ошибки сети - считаем что токен может быть валидным
        console.warn('⚠️ Сервер недоступен, используем оффлайн режим');
        AppGameData.token = token;
        return true;
    }
}

/**
 * Авторизация пользователя через Telegram WebApp
 */
export async function authorize(tg: TelegramWebAppData): Promise<boolean> {
    try {
        // Очищаем старые токены, если они есть
        const oldToken = localStorage.getItem('token');
        if (oldToken && oldToken.includes('guest_')) {
            localStorage.removeItem('token');
            console.log('🗑️ Найден старый гостевой токен, очищаем localStorage');
        }

        // Проверяем наличие initData от Telegram
        if (!tg.initData || tg.initData.trim() === '') {
            console.error('❌ Telegram WebApp initData отсутствует или пуст');
            throw new Error('Отсутствуют данные авторизации Telegram');
        }

        // Проверяем данные пользователя только если они есть
        const telegramUser = tg.initDataUnsafe?.user;
        if (telegramUser) {
            console.log('👤 Найден пользователь Telegram:', telegramUser.id || telegramUser.first_name || 'неизвестно');
        } else {
            console.log('⚠️ initDataUnsafe.user отсутствует, но initData есть - продолжаем авторизацию');
        }

        // Отправляем запрос авторизации
        const response = await fetch('/api/auth/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                initData: tg.initData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Ошибка авторизации: ${response.status} - ${errorText}`);
            throw new Error(`Ошибка авторизации: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !data.data.token) {
            throw new Error('Сервер не вернул токен авторизации');
        }

        // Сохраняем токен и данные пользователя
        AppGameData.token = data.data.token;

        localStorage.setItem('token', data.data.token);
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // Сохраняем initData для будущих использований
        if (tg.initData) {
            localStorage.setItem('initData', tg.initData);
        }

        console.log('✅ Пользователь авторизован:', data.data.user?.name || 'Неизвестно');
        return true;

    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);

        try {
            // Проверяем доступность API сервера
            const healthResponse = await fetch('/api/health');
            if (healthResponse.ok) {
                console.log('🏥 API сервер доступен, проблема с авторизацией Telegram');
            }
        } catch (e) {
            console.error('💥 API сервер недоступен:', e);
        }

        return false;
    }
}

/**
 * Расширенная инициализация с проверкой токенов
 */
export async function initAppWithAuth(initApp: () => void, tg: TelegramWebAppData): Promise<void> {
    try {
        // Сначала выполняем базовую инициализацию
        initApp();

        // Проверяем существующие токены
        const existingToken = localStorage.getItem('token') || localStorage.getItem('auth_token');

        if (existingToken && !existingToken.startsWith('test_token_') && !existingToken.startsWith('guest_')) {
            console.log('🔑 Найден сохраненный токен, проверяем валидность');
            const isValid = await verifyExistingToken(existingToken);

            if (!isValid) {
                // Токен невалиден, пробуем авторизоваться заново
                console.log('🔄 Пробуем новую авторизацию...');
                await authorize(tg);
            }
        } else if (tg && tg.initData && !tg.initData.includes('test_mode_data')) {
            // Нет токена, но есть данные Telegram - авторизуемся
            console.log('🆕 Нет токена, выполняем первичную авторизацию');
            await authorize(tg);
        } else {
            console.log('🧪 Режим без авторизации (тестовый или локальный)');
        }

    } catch (error) {
        console.error('❌ Ошибка расширенной инициализации:', error);
    }
} 