# Test info

- Name: Базовая загрузка приложения
- Location: C:\Users\user\first_bot\tests\e2e\app.test.js:20:1

# Error details

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "https://firstbot-production-87c1.up.railway.app/?test=true&token=32266164ccf5fdb77194bee3aa37a13fa429971e441aa0702f843185b9885059", waiting until "load"

    at C:\Users\user\first_bot\tests\e2e\app.test.js:21:16
```

# Test source

```ts
   1 | const { test, expect } = require('playwright/test');
   2 |
   3 | /**
   4 |  * E2E тесты для приложения Криминальный Блеф
   5 |  * Использует Vanilla JS подход вместо Alpine.js
   6 |  */
   7 |
   8 | // Токен, предоставленный для тестов
   9 | const TEST_TOKEN = '32266164ccf5fdb77194bee3aa37a13fa429971e441aa0702f843185b9885059';
   10 |
   11 | // Базовый URL для тестов (продакшн)
   12 | const TEST_URL = `https://firstbot-production-87c1.up.railway.app?test=true&token=${TEST_TOKEN}`;
   13 |
   14 | // Таймаут для ожидания загрузки приложения
   15 | const APP_LOAD_TIMEOUT = 15000; // Увеличим таймаут для продакшн среды
   16 |
   17 | /**
   18 |  * Базовые тесты загрузки приложения
   19 |  */
   20 | test('Базовая загрузка приложения', async ({ page }) => {
>  21 |     await page.goto(TEST_URL);
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
   22 |
   23 |     // Ожидаем загрузки приложения
   24 |     await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   25 |
   26 |     // Проверяем, что стартовый экран отображается
   27 |     const startScreen = await page.$('#start-screen.active');
   28 |     expect(startScreen).not.toBeNull();
   29 |
   30 |     // Проверяем наличие кнопки "Играть"
   31 |     const playButton = await page.$('button[data-action="startGame"]');
   32 |     expect(playButton).not.toBeNull();
   33 | });
   34 |
   35 | /**
   36 |  * Тест на начало игры
   37 |  */
   38 | test('Запуск игры и отображение первого вопроса', async ({ page }) => {
   39 |     await page.goto(TEST_URL);
   40 |
   41 |     // Ожидаем загрузки приложения
   42 |     await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   43 |
   44 |     // Нажимаем на кнопку "Играть"
   45 |     await page.click('button[data-action="startGame"]');
   46 |
   47 |     // Ожидаем дольше для загрузки игрового экрана
   48 |     await page.waitForSelector('#game-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   49 |
   50 |     // Проверяем, что игровой экран отображается
   51 |     const gameScreen = await page.$('#game-screen.active');
   52 |     expect(gameScreen).not.toBeNull();
   53 |
   54 |     // Проверяем наличие основных элементов игрового экрана
   55 |     const scoreDisplay = await page.$('#score-display');
   56 |     expect(scoreDisplay).not.toBeNull();
   57 |
   58 |     const questionProgress = await page.$('#question-progress');
   59 |     expect(questionProgress).not.toBeNull();
   60 |
   61 |     const storyTitle = await page.$('#story-title');
   62 |     expect(storyTitle).not.toBeNull();
   63 |
   64 |     // Проверяем, что контейнер с ответами не пустой
   65 |     const answersContainer = await page.$('#answers-container');
   66 |     expect(answersContainer).not.toBeNull();
   67 |
   68 |     const answerButtons = await page.$$('#answers-container button');
   69 |     expect(answerButtons.length).toBeGreaterThan(0);
   70 | });
   71 |
   72 | /**
   73 |  * Тест частичного игрового цикла (только один раунд)
   74 |  */
   75 | test('Частичный игровой цикл', async ({ page }) => {
   76 |     // Используем обычный URL без автостарта
   77 |     await page.goto(TEST_URL);
   78 |
   79 |     // Ожидаем загрузки приложения
   80 |     await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   81 |
   82 |     // Нажимаем на кнопку "Играть" вручную
   83 |     await page.click('button[data-action="startGame"]');
   84 |
   85 |     // Ожидаем загрузки игрового экрана
   86 |     await page.waitForSelector('#game-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   87 |
   88 |     // Ожидаем загрузки вопроса
   89 |     await page.waitForSelector('#answers-container button', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   90 |
   91 |     // Выбираем первый ответ
   92 |     await page.click('#answers-container button:first-child');
   93 |
   94 |     // Ожидаем экран результата
   95 |     await page.waitForSelector('#result-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   96 |
   97 |     // Проверяем наличие кнопки "Далее"
   98 |     const nextButton = await page.$('button[data-action="nextQuestion"]');
   99 |     expect(nextButton).not.toBeNull();
  100 |
  101 |     // Проверка успешна, если мы дошли до этого места
  102 |     expect(true).toBe(true);
  103 | }); 
```