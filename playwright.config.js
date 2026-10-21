module.exports = {
  testDir: './tests',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1365, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  timeout: 60000,
  expect: { timeout: 15000 }
};
