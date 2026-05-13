import { test, expect } from '@playwright/test';

test.describe('Debug Tests', () => {
  test('basic page load and text check', async ({ page }) => {
    // Go to dashboard directly
    await page.goto('/dashboard');
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
    
    // Get the page content
    const content = await page.content();
    
    // Log the content to see what we're getting
    console.log('PAGE CONTENT LENGTH:', content.length);
    console.log('FIRST 500 CHARS:', content.substring(0, 500));
    
    // Check for the title element specifically
    const titleElement = await page.locator('h1').first();
    await expect(titleElement).toBeVisible({ timeout: 5000 });
    
    const titleText = await titleElement.textContent();
    console.log('H1 TEXT CONTENT:', titleText);
    
    // Check for our specific text
    await expect(page.getByText('Ваш прогресс к продакшену', { exact: false })).toBeVisible({ timeout: 5000 });
  });
});