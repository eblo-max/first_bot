# Test info

- Name: Полный игровой цикл
- Location: C:\Users\user\first_bot\tests\e2e\app.test.js:69:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('#game-screen.active') to be visible

    at C:\Users\user\first_bot\tests\e2e\app.test.js:73:16
```

# Page snapshot

```yaml
- heading "Криминальный Блеф" [level=1]
- paragraph: Проверь свою наблюдательность
- button "Играть"
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
   8 | // Базовый URL для тестов
   9 | const TEST_URL = 'http://localhost:3000?test=true';
   10 |
   11 | // Таймаут для ожидания загрузки приложения
   12 | const APP_LOAD_TIMEOUT = 5000;
   13 |
   14 | /**
   15 |  * Базовые тесты загрузки приложения
   16 |  */
   17 | test('Базовая загрузка приложения', async ({ page }) => {
   18 |     await page.goto(TEST_URL);
   19 |
   20 |     // Ожидаем загрузки приложения
   21 |     await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   22 |
   23 |     // Проверяем, что стартовый экран отображается
   24 |     const startScreen = await page.$('#start-screen.active');
   25 |     expect(startScreen).not.toBeNull();
   26 |
   27 |     // Проверяем наличие кнопки "Играть"
   28 |     const playButton = await page.$('button[data-action="startGame"]');
   29 |     expect(playButton).not.toBeNull();
   30 | });
   31 |
   32 | /**
   33 |  * Тест на начало игры
   34 |  */
   35 | test('Запуск игры и отображение первого вопроса', async ({ page }) => {
   36 |     await page.goto(TEST_URL);
   37 |
   38 |     // Ожидаем загрузки приложения
   39 |     await page.waitForSelector('.container', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
   40 |
   41 |     // Нажимаем на кнопку "Играть"
   42 |     await page.click('button[data-action="startGame"]');
   43 |
   44 |     // Проверяем, что игровой экран отображается
   45 |     const gameScreen = await page.$('#game-screen.active');
   46 |     expect(gameScreen).not.toBeNull();
   47 |
   48 |     // Проверяем наличие основных элементов игрового экрана
   49 |     const scoreDisplay = await page.$('#score-display');
   50 |     expect(scoreDisplay).not.toBeNull();
   51 |
   52 |     const questionProgress = await page.$('#question-progress');
   53 |     expect(questionProgress).not.toBeNull();
   54 |
   55 |     const storyTitle = await page.$('#story-title');
   56 |     expect(storyTitle).not.toBeNull();
   57 |
   58 |     // Проверяем, что контейнер с ответами не пустой
   59 |     const answersContainer = await page.$('#answers-container');
   60 |     expect(answersContainer).not.toBeNull();
   61 |
   62 |     const answerButtons = await page.$$('#answers-container button');
   63 |     expect(answerButtons.length).toBeGreaterThan(0);
   64 | });
   65 |
   66 | /**
   67 |  * Тест полного игрового цикла
   68 |  */
   69 | test('Полный игровой цикл', async ({ page }) => {
   70 |     await page.goto(`${TEST_URL}&autostart=true`);
   71 |
   72 |     // Ожидаем загрузки приложения и автозапуска игры
>  73 |     await page.waitForSelector('#game-screen.active', { state: 'visible', timeout: APP_LOAD_TIMEOUT });
      |                ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
   74 |
   75 |     // Проходим через все вопросы, выбирая первый ответ
   76 |     for (let i = 0; i < 5; i++) {
   77 |         // Ожидаем загрузки вопроса
   78 |         await page.waitForSelector('#answers-container button', { state: 'visible' });
   79 |
   80 |         // Выбираем первый ответ
   81 |         await page.click('#answers-container button:first-child');
   82 |
   83 |         // Ожидаем экран результата
   84 |         await page.waitForSelector('#result-screen.active', { state: 'visible' });
   85 |
   86 |         if (i < 4) {
   87 |             // Нажимаем "Далее" для следующего вопроса
   88 |             await page.click('button[data-action="nextQuestion"]');
   89 |             await page.waitForSelector('#game-screen.active', { state: 'visible' });
   90 |         }
   91 |     }
   92 |
   93 |     // После последнего вопроса нажимаем "Далее" для перехода к финальному экрану
   94 |     await page.click('button[data-action="nextQuestion"]');
   95 |
   96 |     // Проверяем, что отображается экран с результатами
   97 |     const finishScreen = await page.waitForSelector('#finish-screen.active', { state: 'visible' });
   98 |     expect(finishScreen).not.toBeNull();
   99 |
  100 |     // Проверяем наличие кнопок для рестарта и возврата на главную
  101 |     const restartButton = await page.$('button[data-action="restartGame"]');
  102 |     expect(restartButton).not.toBeNull();
  103 |
  104 |     const mainButton = await page.$('button[data-action="goToMain"]');
  105 |     expect(mainButton).not.toBeNull();
  106 | }); 
```