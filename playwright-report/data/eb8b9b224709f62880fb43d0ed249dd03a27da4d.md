# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug.test.ts >> Debug Tests >> basic page load and text check
- Location: tests\debug.test.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Ваш прогресс к продакшену')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Ваш прогресс к продакшену')

```

```yaml
- navigation:
  - link "D Deploy Agent":
    - /url: /
- main:
  - heading "От AI-кода до живого продукта. Без страха и деплоя «вслепую»." [level=1]
  - paragraph: Мы не просто запускаем ваш проект на Vercel или Netlify — мы проверяем его, объясняем ошибки и находим первых пользователей через комьюнити тестировщиков. Ваш AI-ассистент на пути к продакшену.
  - button "Запустить проект с помощью ассистента →"
  - button "У меня уже есть аккаунт"
  - img
  - paragraph: Проверка кода
  - img
  - paragraph: Деплой на Vercel
  - img
  - paragraph: Тестирование людьми
  - heading "Как мы помогаем новичкам" [level=2]
  - paragraph: Три шага от AI-кода до живого продукта с первыми пользователями
  - img
  - text: "1"
  - heading "Проверка AI-кода" [level=3]
  - paragraph: Наш AI-ассистент проверит код, сгенерированный в Cursor, найдёт типичные ошибки новичков и объяснит их человеческим языком.
  - img
  - text: "2"
  - heading "Деплой на Vercel" [level=3]
  - paragraph: Мы используем Vercel под капотом (официальные партнёры). Ваш Cursor-проект задеплоится профессионально и быстро.
  - img
  - text: "3"
  - heading "Тестирование реальными людьми" [level=3]
  - paragraph: Комьюнити тестировщиков проверит ваш проект, найдёт баги и даст честный фидбек. Получите первых пользователей!
  - heading "Быстрый старт без Git" [level=2]
  - paragraph: Сгенерировали код в Cursor или Replit, но не знаете, что делать дальше?
  - text: "1"
  - heading "Скачайте код" [level=3]
  - paragraph: Скачайте ZIP-архив с вашим AI-кодом из Cursor или Replit. Никаких репозиториев, просто загрузите файлы.
  - text: "2"
  - heading "Загрузите на платформу" [level=3]
  - paragraph:
    - text: Перейдите на
    - link "создание проекта":
      - /url: /projects/new
    - text: ", выберите «Загрузка кода» и загрузите ZIP-архив. Мы автоматически определим стек."
  - text: "3"
  - heading "Пройдите чек-лист" [level=3]
  - paragraph: Наш AI-наставник проверит переменные окружения, базу данных и конфигурацию перед деплоем. Исправьте ошибки и запускайте!
  - text: "4"
  - heading "Получите живой URL" [level=3]
  - paragraph:
    - text: Через 2-3 минуты ваш проект будет доступен по адресу
    - code: https://your-project.vercel.app
    - text: . Отправляйте на тестирование комьюнити!
  - button "Начать путь к продакшену →"
  - heading "Готовы довести AI-проект до ума?" [level=2]
  - paragraph: Мы поможем там, где ChatGPT молчит. Первые пользователи, честный фидбек и работающий продукт уже через 1 день.
  - button "Запустить проект с помощью ассистента"
- contentinfo:
  - paragraph:
    - text: Built by Deploy Agent. The source code is available on
    - link "GitHub":
      - /url: https://github.com
    - text: .
  - link "View Partner Offers":
    - /url: /partners
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Debug Tests', () => {
  4  |   test('basic page load and text check', async ({ page }) => {
  5  |     // Go to dashboard directly
  6  |     await page.goto('/dashboard');
  7  |     
  8  |     // Wait for network to be idle
  9  |     await page.waitForLoadState('networkidle');
  10 |     
  11 |     // Get the page content
  12 |     const content = await page.content();
  13 |     
  14 |     // Log the content to see what we're getting
  15 |     console.log('PAGE CONTENT LENGTH:', content.length);
  16 |     console.log('FIRST 500 CHARS:', content.substring(0, 500));
  17 |     
  18 |     // Check for the title element specifically
  19 |     const titleElement = await page.locator('h1').first();
  20 |     await expect(titleElement).toBeVisible({ timeout: 5000 });
  21 |     
  22 |     const titleText = await titleElement.textContent();
  23 |     console.log('H1 TEXT CONTENT:', titleText);
  24 |     
  25 |     // Check for our specific text
> 26 |     await expect(page.getByText('Ваш прогресс к продакшену', { exact: false })).toBeVisible({ timeout: 5000 });
     |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  27 |   });
  28 | });
```