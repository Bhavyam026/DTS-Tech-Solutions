const fs = require('node:fs');
const path = require('node:path');

async function main() {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error('Missing BROWSERBASE_API_KEY. Add it in GitHub repository Actions secrets.');
  }

  const { default: Browserbase } = await import('@browserbasehq/sdk');
  const { chromium } = require('playwright-core');

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
  let session;
  let browser;
  const results = [];
  const siteUrl = process.env.DTS_SITE_URL || 'https://bhavyam026.github.io/DTS-Tech-Solutions/';
  const outputDir = path.join(process.cwd(), 'browserbase-results');
  fs.mkdirSync(outputDir, { recursive: true });

  async function check(name, fn) {
    try {
      const details = await fn();
      results.push({ name, status: 'PASS', details: details || '' });
      console.log('PASS:', name, details || '');
    } catch (error) {
      results.push({ name, status: 'FAIL', details: error.message });
      console.error('FAIL:', name, error.message);
    }
  }

  try {
    // Browserbase can infer the project from the API key on supported accounts.
    session = await bb.sessions.create({});
    console.log('Browserbase session created:', session.id);
    if (session.replayUrl) console.log('Session replay:', session.replayUrl);
    browser = await chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();
    const consoleErrors = [];
    const failedResources = [];
    page.on('response', response => {
      if (response.status() >= 400) failedResources.push({ status: response.status(), url: response.url() });
    });
    page.on('requestfailed', request => failedResources.push({ status: 'REQUEST_FAILED', url: request.url(), error: request.failure()?.errorText || '' }));
    page.on('pageerror', error => consoleErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    let response;
    await check('Live DTS website returns HTTP 200 and expected title', async () => {
      response = await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!response) throw new Error('No document response received');
      if (response.status() !== 200) throw new Error('HTTP ' + response.status());
      const title = await page.title();
      if (!/Dynamic Technology Solutions|DTS Tech Solutions/i.test(title)) {
        throw new Error('Unexpected page title: ' + title);
      }
      return 'HTTP ' + response.status() + '; title: ' + title;
    });

    await check('Catalogue and contact sections exist', async () => {
      for (const selector of ['#home', '#catalogue', '#contact', '#productGrid']) {
        if (await page.locator(selector).count() === 0) throw new Error('Missing selector ' + selector);
      }
      return 'home, catalogue, contact, product grid found';
    });

    await check('Festival animation does not cover the full page', async () => {
      const scene = page.locator('#dtsFestivalAnimation');
      if (await scene.count()) {
        const box = await scene.boundingBox();
        if (!box) throw new Error('Festival animation exists but has no visible bounding box');
        const maxHeight = Math.max(410, (page.viewportSize()?.height || 900) * 0.5) + 2;
        if (box.height > maxHeight) throw new Error('Festival scene is too tall: ' + box.height + 'px');
        return 'festival scene height: ' + Math.round(box.height) + 'px';
      }
      return 'No festival overlay currently rendered (may be outside active festival dates)';
    });

    await check('Mobile layout has no horizontal overflow', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth
      }));
      if (dimensions.document > dimensions.viewport + 2) {
        throw new Error('Horizontal overflow: viewport=' + dimensions.viewport + ', document=' + dimensions.document);
      }
      return 'viewport ' + dimensions.viewport + 'px; document ' + dimensions.document + 'px';
    });

    await check('Cinematic festival MP4/WebM is integrated', async () => {
      // GitHub Pages may still be deploying when this push-triggered check starts.
      // Reload for up to 90 seconds so we test the current live revision, not stale HTML.
      const deadline = Date.now() + 90000;
      let lastState = 'video element missing';
      while (Date.now() < deadline) {
        await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const videos = page.locator('video');
        const count = await videos.count();
        const html = await page.content();
        const source = count
          ? (await videos.first().getAttribute('src') ||
             await videos.first().locator('source').first().getAttribute('src').catch(() => null))
          : null;
        const staleFeed = html.includes('Lloyd-Hansen/indian-festivals-api');
        if (count >= 1 && source && /\.(mp4|webm)(\?|$)/i.test(source) && !staleFeed) {
          // Ignore 404s from the old revision if the final deployed HTML no longer references it.
          for (let i = failedResources.length - 1; i >= 0; i--) {
            if (String(failedResources[i].url).includes('Lloyd-Hansen/indian-festivals-api')) {
              failedResources.splice(i, 1);
            }
          }
          return 'video source: ' + source + '; live page no longer references the retired 404 feed';
        }
        lastState = !count ? 'video element missing' : staleFeed
          ? 'live HTML still references the retired festival feed'
          : 'video source missing or invalid: ' + (source || 'missing');
        await page.waitForTimeout(10000);
      }
      throw new Error('Live deployment did not expose the current MP4/WebM and calendar fix within 90 seconds: ' + lastState);
    });

    await check('Privacy Policy and Terms page is live with approved contact details', async () => {
      const legalResponse = await page.goto(new URL('legal.html', siteUrl).toString(), {
        waitUntil: 'domcontentloaded', timeout: 60000
      });
      if (!legalResponse || legalResponse.status() !== 200) {
        throw new Error('legal.html did not return HTTP 200');
      }
      const body = (await page.locator('body').innerText()).toLowerCase();
      if (!body.includes('dtsboisar@gmail.com') || !body.includes('83909 09845')) {
        throw new Error('Approved contact details missing from legal page');
      }
      if (body.includes('info@dtssolutions.in') || body.includes('99307 81093')) {
        throw new Error('A contact detail the owner asked to remove is still present');
      }
      await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return 'legal page HTTP 200; approved contact details present; removed details absent';
    });

    await page.setViewportSize({ width: 1365, height: 900 });
    await page.screenshot({ path: path.join(outputDir, 'dts-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDir, 'dts-mobile.png'), fullPage: true });
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify({
      siteUrl,
      sessionId: session.id,
      replayUrl: session.replayUrl || null,
      checkedAt: new Date().toISOString(),
      results,
      browserConsoleErrors: consoleErrors,
      failedResources
    }, null, 2));

    if (consoleErrors.length) {
      console.warn('Browser console/page errors:', consoleErrors.join(' | '));
    }
    if (failedResources.length) {
      console.warn('Failed resource URLs:', JSON.stringify(failedResources));
    }
    const failed = results.filter(result => result.status === 'FAIL');
    console.log('\nSummary:', results.length - failed.length, 'passed,', failed.length, 'failed.');
    if (failed.length) process.exitCode = 1;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (error) { console.warn('Browser disconnect warning:', error.message); }
    }
    // Session lifecycle cleanup; do not print or expose credentials.
    if (session?.id) {
      try { await bb.sessions.update(session.id, { status: 'REQUEST_RELEASE' }); }
      catch (error) { console.warn('Session release warning:', error.message); }
    }
  }
}

main().catch(error => {
  console.error('Browserbase test setup failed:', error.message);
  process.exitCode = 1;
});
