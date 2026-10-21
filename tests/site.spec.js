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

test('cinematic festival video is integrated', async ({ page }) => {
  test.setTimeout(150000);
  const deadline = Date.now() + 90000;
  let lastState = 'video element missing';
  while (Date.now() < deadline) {
    await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const videos = page.locator('video');
    const count = await videos.count();
    const html = await page.content();
    const source = count
      ? (await videos.first().getAttribute('src') ||
         await videos.first().locator('source').first().getAttribute('src').catch(() => null))
      : null;
    const calendarReady = html.includes('astrotathya.com/api/festivals?year=') &&
      html.includes('const DTS_FESTIVAL_CALENDAR = {}');
    let videoStatus = 0;
    if (count === 1 && source && /\.(mp4|webm)(\?|$)/i.test(source) &&
        calendarReady && !html.includes('Lloyd-Hansen/indian-festivals-api')) {
      try {
        const videoResponse = await page.request.get(new URL(source, siteUrl).toString(), { timeout: 15000 });
        videoStatus = videoResponse.status();
      } catch (error) {
        lastState = 'video file request failed: ' + error.message;
      }
    }
    if (count === 1 && source && /\.(mp4|webm)(\?|$)/i.test(source) &&
        videoStatus === 200 && calendarReady && !html.includes('Lloyd-Hansen/indian-festivals-api')) {
      return;
    }
    lastState = !count ? 'video element missing' :
      html.includes('Lloyd-Hansen/indian-festivals-api') ? 'stale live HTML still references retired feed' :
      !calendarReady ? 'live page has not deployed the new dynamic festival calendar yet' :
      videoStatus !== 200 ? 'video file HTTP status: ' + (videoStatus || 'request failed') :
      'video source missing or invalid: ' + (source || 'missing');
    await page.waitForTimeout(10000);
  }
  throw new Error('Current video/calendar changes were not visible on GitHub Pages within 90 seconds: ' + lastState);
});

test('live festival feed can activate the festival animation and AI greeting', async ({ page }) => {
  // Playwright's default browser timezone on the CI runner is UTC, matching
  // this ISO date used by the page's Date object in the same runner.
  const today = new Date().toISOString().slice(0, 10);

  await page.route(/https:\/\/nagerholidays\.com\/api\/v4\/Holidays\/IN\//, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route(/https:\/\/date\.nager\.at\/api\/v3\/PublicHolidays\//, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route(/https:\/\/astrotathya\.com\/api\/festivals\?/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        year: Number(today.slice(0, 4)),
        city: 'mumbai',
        festivals: [{
          date: today,
          rule: {
            nameEn: 'Diwali',
            nameHi: 'दीपावली',
            observanceCategory: 'FESTIVAL',
            regions: ['PAN_INDIA'],
            isMajor: true
          }
        }]
      })
    })
  );

  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#dtsFestivalAnimation')).toHaveAttribute('data-festival-name', 'Diwali', { timeout: 15000 });
  await expect(page.locator('#aiGreeting')).toContainText('Deepawali', { timeout: 15000 });
});
