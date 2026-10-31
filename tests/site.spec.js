const { test, expect } = require('@playwright/test');

const siteUrl = process.env.DTS_SITE_URL || 'https://dtsboisar.pages.dev/';

test('live site opens and has the DTS page title', async ({ page }) => {
  const response = await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  expect(response, 'The website should return a document response').not.toBeNull();
  expect(response.status(), 'The website should return HTTP 200').toBe(200);
  await expect(page).toHaveTitle(/DTS/i);
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
  const scene = page.locator('#dtsFestivalAnimation');
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

test('privacy policy and terms are published with the approved contact details', async ({ page }) => {
  const response = await page.goto(siteUrl + 'legal.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
  expect(response, 'The legal page should return a document response').not.toBeNull();
  expect(response.status(), 'The legal page should return HTTP 200').toBe(200);
  await expect(page).toHaveTitle(/Privacy Policy.*Terms of Service/i);
  await expect(page.locator('#privacy')).toBeVisible();
  await expect(page.locator('#terms')).toBeVisible();
  await expect(page.locator('#privacy h2')).toHaveText('Privacy Policy');
  await expect(page.locator('#terms h2')).toHaveText('Terms of Service');
  await expect(page.locator('#privacy')).toContainText('How we use information');
  await expect(page.locator('#privacy')).toContainText('Website AI assistant and third-party services');
  await expect(page.locator('#terms')).toContainText('Warranty, repairs and AMC');
  await expect(page.locator('#terms')).toContainText('Changes, governing law and disputes');
  const content = (await page.locator('body').innerText()).toLowerCase();
  expect(content).toContain('dtsboisar@gmail.com');
  expect(content).toContain('83909 09845');
  expect(content).not.toContain('info@dtssolutions.in');
  expect(content).not.toContain('99307 81093');
});

test('local festival background video is served successfully without calendar API calls', async ({ page }) => {
  const response = await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  expect(response.status()).toBe(200);
  const video = page.locator('#dtsFestivalBackdrop');
  await expect(video).toHaveCount(1);
  const source = await video.locator('source').getAttribute('src');
  expect(source).toMatch(/^\.\/assets\/.*\.mp4$/);
  const videoResponse = await page.request.get(new URL(source, siteUrl).toString(), { timeout: 30000 });
  expect(videoResponse.status()).toBe(200);
  const html = await page.content();
  expect(html).not.toContain('/api/festivals?year=');
  expect(html).not.toContain('nagerholidays.com/api/');
  expect(html).not.toContain('date.nager.at/api/');
});


test('electrical catalogue shows all six systems with symbols and image references', async ({ page }) => {
  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => typeof window.setCategoryFilter === 'function');
  await page.evaluate(() => window.setCategoryFilter('Electrical'));
  const grid = page.locator('#productGrid');
  await expect(grid).toContainText('DTS Earthing & Grounding System');
  await expect(grid).toContainText('Electrical Power & Control Cables');
  await expect(grid).toContainText('Industrial Electrical Automation');
  await expect(grid).toContainText('PLC Control Systems');
  await expect(grid).toContainText('SCADA Monitoring & Control Systems');
  await expect(grid).toContainText('PLCC Power Line Carrier Communication');
  await expect(grid).toContainText('⏚ Earth Ground');
  await expect(grid).toContainText('▣ PLC');
  await expect(grid).toContainText('▤ SCADA');
  const electricalCards = grid.locator('.product-card');
  await expect(electricalCards).toHaveCount(7);
  await expect(grid.locator('.product-card img')).toHaveCount(7);
});
