const { test, expect } = require('playwright/test');

/**
 * E2E тесты для приложения Криминальный Блеф
 * Использует Vanilla JS подход вместо Alpine.js
 */

// Токен, предоставленный для тестов
const TEST_TOKEN = '32266164ccf5fdb77194bee3aa37a13fa429971e441aa0702f843185b9885059';

// Базовый URL для тестов (продакшн)
const TEST_URL = `https://firstbot-production-87c1.up.railway.app?test=true&token=${TEST_TOKEN}`;

// Таймаут для ожидания загрузки приложения
const APP_LOAD_TIMEOUT = 15000; // Увеличим таймаут для продакшн среды

/**
 * Базовые тесты загрузки приложения
 */
test('Базовая загрузка приложения', async ({ page }) => {
    await page.goto(TEST_URL);

    // Ожидаем загрузки приложения
    await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });

    // Проверяем, что стартовый экран отображается
    const startScreen = await page.$('#start-screen.active');
    expect(startScreen).not.toBeNull();

    // Проверяем наличие кнопки "Играть"
    const playButton = await page.$('button[data-action="startGame"]');
    expect(playButton).not.toBeNull();
});

/**
 * Тест на начало игры
 */
test('Запуск игры и отображение первого вопроса', async ({ page }) => {
    await page.goto(TEST_URL);

    // Ожидаем загрузки приложения
    await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });

    // Нажимаем на кнопку "Играть"
    await page.click('button[data-action="startGame"]');

    // Ожидаем дольше для загрузки игрового экрана
    await page.waitForSelector('#game-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });

    // Проверяем, что игровой экран отображается
    const gameScreen = await page.$('#game-screen.active');
    expect(gameScreen).not.toBeNull();

    // Проверяем наличие основных элементов игрового экрана
    const scoreDisplay = await page.$('#score-display');
    expect(scoreDisplay).not.toBeNull();

    const questionProgress = await page.$('#question-progress');
    expect(questionProgress).not.toBeNull();

    const storyTitle = await page.$('#story-title');
    expect(storyTitle).not.toBeNull();

    // Проверяем, что контейнер с ответами не пустой
    const answersContainer = await page.$('#answers-container');
    expect(answersContainer).not.toBeNull();

    const answerButtons = await page.$$('#answers-container button');
    expect(answerButtons.length).toBeGreaterThan(0);
});

/**
 * Тест полного игрового цикла
 */
test('Полный игровой цикл', async ({ page }) => {
    await page.goto(`${TEST_URL}&autostart=true`);

    // Ожидаем загрузки приложения и автозапуска игры
    await page.waitForSelector('#game-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });

    // Проходим через все вопросы, выбирая первый ответ
    for (let i = 0; i < 5; i++) {
        // Ожидаем загрузки вопроса
        await page.waitForSelector('#answers-container button', { state: 'visible', timeout: APP_LOAD_TIMEOUT });

        // Выбираем первый ответ
        await page.click('#answers-container button:first-child');

        // Ожидаем экран результата
        await page.waitForSelector('#result-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });

        if (i < 4) {
            // Нажимаем "Далее" для следующего вопроса
            await page.click('button[data-action="nextQuestion"]');
            await page.waitForSelector('#game-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
        }
    }

    // После последнего вопроса нажимаем "Далее" для перехода к финальному экрану
    await page.click('button[data-action="nextQuestion"]');

    // Проверяем, что отображается экран с результатами
    const finishScreen = await page.waitForSelector('#finish-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
    expect(finishScreen).not.toBeNull();

    // Проверяем наличие кнопок для рестарта и возврата на главную
    const restartButton = await page.$('button[data-action="restartGame"]');
    expect(restartButton).not.toBeNull();

    const mainButton = await page.$('button[data-action="goToMain"]');
    expect(mainButton).not.toBeNull();
}); 