// tests/auth.spec.js

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const userEmail = `testuser_${Date.now()}@example.com`;
  const userPassword = 'password123';

  test('allows a new user to sign up, log out, and log back in', async ({ page }) => {
    // --- Step 1: Sign Up ---
    await page.goto('http://localhost:5173/signup');
    await expect(page).toHaveTitle(/Recipe App/);

    await page.getByLabel('Email').fill(userEmail);
    await page.getByLabel('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL('http://localhost:5173/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Recipe Dashboard' })).toBeVisible();

    // --- Step 2: Log Out ---
    await page.getByRole('button', { name: 'Log Out' }).click();

    // --- FIX: After logout, the app correctly redirects to the login page ---
    await expect(page).toHaveURL('http://localhost:5173/login');

    // --- Step 3: Log In ---
    // The test is already on the login page, so no need to navigate again.
    await page.getByLabel('Email').fill(userEmail);
    await page.getByLabel('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for the navigation and verify by checking for the dashboard heading again
    await expect(page).toHaveURL('http://localhost:5173/dashboard');
    await expect(page.getByRole('heading', { name: 'Recipe Dashboard' })).toBeVisible();
  });
});