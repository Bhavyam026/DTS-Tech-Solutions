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

    await check('Catalogue, brand, search, and AI controls respond to clicks', async () => {
      await page.waitForTimeout(1500);
      const runtime = await page.evaluate(() => ({
        readyState: document.readyState,
        scriptLoaded: Array.from(document.scripts).some(script => script.src.includes('dts-site.js')),
        openAIType: typeof window.openAIAssistant,
        brandType: typeof window.setBrandFilter,
        searchType: typeof window.handleSearchInput,
        productCards: document.querySelectorAll('#productGrid .product-card').length,
        aiInitiallyHidden: !!document.getElementById('aiModal')?.classList.contains('hidden')
      }));
      if (!runtime.scriptLoaded || runtime.openAIType !== 'function' || runtime.brandType !== 'function') {
        throw new Error('Site JS/global handlers unavailable: ' + JSON.stringify(runtime));
      }
      const brand = page.locator('#brandMetrac');
      await brand.scrollIntoViewIfNeeded();
      await brand.click({ timeout: 10000 });
      const brandActive = await brand.evaluate(el => el.classList.contains('active'));
      if (!brandActive) throw new Error('METRAC brand click did not activate the filter');
      const search = page.locator('#productSearch');
      await search.fill('Metrac');
      const searchValue = await search.inputValue();
      if (searchValue !== 'Metrac') throw new Error('Search input did not accept text');
      const aiButton = page.locator('button[onclick*="openAIAssistant"]').first();
      await aiButton.scrollIntoViewIfNeeded();
      await aiButton.click({ timeout: 10000, force: true });
      const aiOpened = await page.locator('#aiModal').evaluate(el => !el.classList.contains('hidden'));
      if (!aiOpened) {
        const overlay = await page.evaluate(() => {
          const b = document.querySelector('button[onclick*="openAIAssistant"]');
          const r = b.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return { button: b.outerHTML.slice(0, 160), topElement: top?.outerHTML?.slice(0, 240), modalClass: document.getElementById('aiModal')?.className };
        });
        throw new Error('AI button did not open modal; runtime=' + JSON.stringify(runtime) + '; overlay=' + JSON.stringify(overlay));
      }
      await page.locator('#aiModal button[onclick*="closeAIAssistant"]').first().click().catch(async () => {
        await page.keyboard.press('Escape');
      });
      return 'JS handlers available; METRAC filter activated; search accepts text; AI modal opens';
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

    await check('DTS festival proxy responds with calendar data and CORS permission', async () => {
      const supportedYear = Math.min(2027, Math.max(2025, new Date().getFullYear()));
      const apiUrl = 'https://dts-tech-solutions.onrender.com/api/festivals?year=' +
        supportedYear + '&city=mumbai';
      const apiResponse = await page.request.get(apiUrl, {
        timeout: 30000,
        headers: { Origin: new URL(siteUrl).origin }
      });
      if (apiResponse.status() !== 200) {
        throw new Error('Festival proxy returned HTTP ' + apiResponse.status());
      }
      const allowOrigin = apiResponse.headers()['access-control-allow-origin'];
      if (allowOrigin !== new URL(siteUrl).origin) {
        throw new Error('Festival proxy CORS header missing or incorrect: ' + (allowOrigin || 'missing'));
      }
      const payload = await apiResponse.json();
      if (!Array.isArray(payload.festivals)) {
        throw new Error('Festival proxy response has no festivals array');
      }
      return 'HTTP 200; ' + payload.festivals.length + ' calendar entries; CORS allows DTS Pages origin';
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
        const calendarReady = html.includes('dts-tech-solutions.onrender.com/api/festivals?year=') &&
          !html.includes('astrotathya.com/api/festivals?year=');
        let videoStatus = 0;
        if (count >= 1 && source && /\.(mp4|webm)(\?|$)/i.test(source) && calendarReady && !staleFeed) {
          try {
            const videoResponse = await page.request.get(new URL(source, siteUrl).toString(), { timeout: 15000 });
            videoStatus = videoResponse.status();
          } catch (error) {
            lastState = 'video file request failed: ' + error.message;
          }
        }
        if (count >= 1 && source && /\.(mp4|webm)(\?|$)/i.test(source) && videoStatus === 200 && calendarReady && !staleFeed) {
          // Ignore failed requests from stale page versions after the current
          // deployment is confirmed to use the backend proxy.
          for (let i = failedResources.length - 1; i >= 0; i--) {
            const failedUrl = String(failedResources[i].url);
            if (failedUrl.includes('Lloyd-Hansen/indian-festivals-api') ||
                failedUrl.includes('astrotathya.com/api/festivals?year=')) {
              failedResources.splice(i, 1);
            }
          }
          for (let i = consoleErrors.length - 1; i >= 0; i--) {
            if (consoleErrors[i].includes('astrotathya.com/api/festivals?year=')) {
              consoleErrors.splice(i, 1);
            }
          }
          return 'video source: ' + source + '; video HTTP ' + videoStatus + '; dynamic calendar uses DTS backend proxy';
        }
        lastState = !count ? 'video element missing' : staleFeed
          ? 'live HTML still references the retired festival feed'
          : !calendarReady ? 'live HTML has not deployed the DTS calendar proxy yet'
          : videoStatus !== 200 ? 'video file HTTP status: ' + (videoStatus || 'request failed')
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
