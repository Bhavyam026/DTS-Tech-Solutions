const { test, expect } = require('@playwright/test');

const siteUrl = process.env.DTS_SITE_URL || 'https://bhavyam026.github.io/DTS-Tech-Solutions/';

test('live site opens and has the DTS page title', async ({ page }) => {
  const response = await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  expect(response, 'The website should return a document response').not.toBeNull();
  expect(response.status(), 'The website should return HTTP 200').toBe(200);
  await expect(page).toHaveTitle(/Dynamic Technology Solutions/i);
});

test('main catalogue and contact sections are present', async ({ page }) => {
  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#home')).toHaveCount(1);
  await expect(page.locator('#catalogue')).toHaveCount(1);
  await expect(page.locator('#contact')).toHaveCount(1);
  await expect(page.locator('#productGrid')).toHaveCount(1);
});

test('festival scene does not block navigation or the page', async ({ page }) => {
  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const scene = page.locator('#dts-festival-scene');
  if (await scene.count()) {
    const box = await scene.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeLessThanOrEqual(Math.max(410, page.viewportSize().height * 0.5) + 2);
  }
  await expect(page.locator('#catalogue')).toBeVisible();
  await expect(page.locator('#contact')).toBeAttached();
});

test('mobile layout renders without a wide horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
});

test('cinematic festival video is integrated', async ({ page }) => {
  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const videos = page.locator('video');
  await expect(videos, 'A real MP4/WebM video element has not been added to index.html yet').toHaveCount(1);
  const source = await videos.locator('source').getAttribute('src').catch(() => null);
  const directSource = await videos.getAttribute('src');
  expect(source || directSource || '').toMatch(/\.(mp4|webm)(\?|$)/i);
});
