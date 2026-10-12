import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('production analytics redacts URLs and rejects custom events', async ({ page }) => {
  const manifest = JSON.parse(await readFile('static/build.json', 'utf8'));
  const views = [];
  await page.route('**/_vercel/insights/script.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `const filter = window.vaq.find(([type]) => type === 'beforeSend')[1];
      fetch('/_vercel/insights/view', {method: 'POST', body: JSON.stringify(filter({type: 'pageview', url: location.href}))});
      window.va = (type, data) => { if (type === 'event') {
        const event = filter({type: 'event', url: location.href, data});
        if (event) fetch('/_vercel/insights/event', {method: 'POST', body: JSON.stringify(event)});
      }};`,
  }));
  await page.route('**/_vercel/insights/view', route => {
    views.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  });
  await page.route('**/_vercel/insights/event', () => { throw new Error('Custom events must not be sent'); });
  await page.route('http://127.0.0.1:8080/?*', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace('</body>', `<script type="module" src="${manifest['analytics.js']}"></script></body>`);
    await route.fulfill({ response, body: html });
  });
  await page.goto('/?synthetic_private_value=do-not-collect#private-fragment');
  await expect.poll(() => views.length).toBe(1);
  expect(views[0]).toEqual({ type: 'pageview', url: 'http://127.0.0.1:8080/' });
  await expect(page.locator('script[src="/_vercel/insights/script.js"]')).toHaveAttribute('data-sdkv', '2.0.1');
  expect(await page.evaluate(() => window.vam)).toBe('production');
  await page.evaluate(() => window.va('event', { name: 'Synthetic private event', data: 'do-not-collect' }));
  await expect(page.locator('#status-label')).toHaveText('Online');
});

test('ordinary local visits do not request analytics', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('#status-label')).toHaveText('Online');
  expect(requests.some(url => /analytics-|_vercel\/insights/.test(url))).toBe(false);
});
