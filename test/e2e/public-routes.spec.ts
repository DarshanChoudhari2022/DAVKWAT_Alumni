import { expect, test, type Page } from '@playwright/test';

async function openFirstDetail(page: Page, pathPrefix: string) {
  const detailLink = page.locator(`a[href^="${pathPrefix}/"]`).first();
  const hasPublishedItem = await detailLink
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!hasPublishedItem) return false;

  await detailLink.click();
  await expect(page).toHaveURL(new RegExp(`${pathPrefix}/[^/?#]+`));
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  return true;
}

test.describe('public content', () => {
  test('home page sends baseline security headers', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-frame-options']).toBe('DENY');
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
    await expect(page.getByRole('link', { name: /join now/i })).toBeVisible();
  });

  test('announcements list and published details remain public', async ({ page }) => {
    await page.goto('/announcements');

    await expect(page).toHaveURL(/\/announcements(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Announcements', exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await openFirstDetail(page, '/announcements');
  });

  test('events list and published details remain public', async ({ page }) => {
    await page.goto('/events');

    await expect(page).toHaveURL(/\/events(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    const openedDetail = await openFirstDetail(page, '/events');
    if (openedDetail) {
      await expect(page.getByRole('heading', { name: /RSVP for this event/i })).toBeVisible();
      await expect(page.getByLabel(/Full name/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Submit RSVP/i })).toBeVisible();
    }
  });

  test('registration and password recovery entry points render without a session', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register(?:\?|$)/);
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  });
});
