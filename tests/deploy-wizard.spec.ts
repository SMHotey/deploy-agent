import { test, expect } from '@playwright/test';

test.describe('Deploy Agent E2E Tests (Auth Disabled)', () => {
  // Since auth is disabled via environment variables, we can skip login

  test('user can reach dashboard without login', async ({ page }) => {
    // Start from the landing page
    await page.goto('/');

    // Click the link to dashboard (or just go directly)
    await page.goto('/dashboard');

    // Wait for the dashboard to load
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Check that we see the dashboard title
    await expect(page.getByText('Ваш прогресс к продакшену')).toBeVisible();
  });

  test('user can create a deployment via wizard', async ({ page }) => {
    // Go to dashboard (auth disabled, so we should be let in)
    await page.goto('/dashboard');
    await expect(page.getByText('Ваш прогресс к продакшену')).toBeVisible({ timeout: 5000 });

    // Now, click the button to start a new deployment
    // In the dashboard header, there is a link: "+ Запустить проект"
    await page.getByText('+ Запустить проект').click();

    // Wait for the deploy wizard to appear
    await expect(page.getByText('Расскажите о своём проекте')).toBeVisible();

    // Step 1: Choose source type (Git repository)
    await page.getByLabel('Способ загрузки').selectOption('git');
    await page.getByLabel('Repository URL').fill('https://github.com/vercel/next.js');
    await page.getByLabel('Название проекта (необязательно)').fill('test-nextjs-app');

    // Click Next
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2: Choose template
    await expect(page.getByText('Выберите шаблон')).toBeVisible();
    await page.getByLabel('Шаблон').selectOption('nextjs-vercel');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: Choose platform
    await expect(page.getByText('Выберите хостинг')).toBeVisible();
    await page.getByLabel('Платформа').selectOption('vercel');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 4: Go to checklist (since we are at step 3, next goes to step 4 which is the checklist)
    // Actually, the wizard has 5 steps: source, template, platform, ready, checklist.
    // After platform, we click "Перейти к чек-листу"
    await page.getByRole('button', { name: /Перейти к чек-листу/i }).click();

    // Step 5: Production Checklist
    await expect(page.getByText('✅ Чек-лист готовности к продакшену')).toBeVisible();

    // Fill in the required checklist items
    // Required: Environment Variables and Build
    // We'll check the boxes for these two
    await page.getByText('Переменные окружения').locator('xpath=..//..').getByRole('checkbox').check();
    await page.getByText('Сборка проекта').locator('xpath=..//..').getByRole('checkbox').check();

    // Note: The checklist also has a button that becomes enabled when required items are checked
    // We can click the button to proceed
    await expect(page.getByRole('button', { name: /Продолжить →/i })).toBeEnabled();
    await page.getByRole('button', { name: /Продолжить →/i }).click();

    // Now we are back at step 4? Actually, after clicking the button in the checklist, we go back to step 4 (the ready step)
    // Step 4: Готовы к запуску!
    await expect(page.getByText('Готовы к запуску!')).toBeVisible();
    await expect(page.getByText('Проверьте настройки и запустите проект с помощью ассистента.')).toBeVisible();

    // Mock the deployment API call to avoid actual deployment
    await page.route('/api/deploy', async route => {
      // Fulfill with a mock response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ deployment_id: 12345, deploymentId: 12345 })
      });
    });

    // Click the final button
    await page.getByRole('button', { name: /Запустить проект с помощью ассистента/i }).click();

    // Wait for redirect to the deployment status page
    await expect(page).toHaveURL(/\/deploy\/\d+/, { timeout: 10000 });

    // Check that we see the deployment ID or some indication of success
    await expect(page.getByText(/deployment started/i)).toBeVisible();
  });
});