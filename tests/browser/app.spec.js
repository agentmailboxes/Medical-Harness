import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const answer = {
  type: 'answer', answer: 'The kneecap sits at the front of the knee [1]. This is reference information; discuss symptoms with a clinician.',
  articles: [{ title: 'Knee anatomy reference', year: '2025', journal: 'Synthetic browser fixture', url: 'https://example.org/anatomy', tldr: 'A reference for testing the source panel.' }],
  tool_results: [], followups: [],
  anatomy_context: { scene_id: 'knee', label: 'Knee', reason: 'See how the kneecap relates to the surrounding bones.' },
};

async function respond(page, result = answer) {
  await page.route('**/api/chat/stream', route => route.fulfill({
    contentType: 'text/event-stream',
    body: `event: meta\ndata: {"conversation_id":"browser-fixture"}\n\nevent: result\ndata: ${JSON.stringify(result)}\n\n`,
  }));
  await page.getByRole('textbox', { name: 'Ask a health question' }).fill('Where is the kneecap?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.answer-body').last()).toContainText('kneecap');
}

for (const theme of ['light', 'dark']) {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    test(`${label} ${theme}: first paint, answer, and anatomy`, async ({ page }) => {
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark', reducedMotion: 'reduce' });
      await page.addInitScript(value => localStorage.setItem('medical-harness-theme', value), theme);
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route(/\/static\/dist\/app-.*\.js$/, async route => { await gate; await route.continue(); });
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.locator('#hero')).toBeVisible();
      await expect(page.locator('body')).toHaveClass('is-home');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.locator('.composer-label').isVisible()).toBe(false);
      release();
      await expect(page.locator('#status-label')).toHaveText('Online');
      expect(requests.some(url => /atlas|\.glb|cdn\.jsdelivr|fonts\.google/.test(url))).toBe(false);
      await mkdir('docs/media', { recursive: true });
      await page.screenshot({ path: `docs/media/${label}-${theme}.png` });
      await respond(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: /Explore knee in 3D/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('#atlas-canvas canvas')).toBeVisible();
      await expect(page.locator('#atlas-status')).toBeHidden({ timeout: 20000 });
      expect(requests.filter(url => url.endsWith('.glb'))).toHaveLength(1);
      await page.screenshot({ path: `docs/media/anatomy-${label}-${theme}.png` });
      await page.locator('#atlas-search').fill('patella');
      await expect(page.locator('#atlas-structures option')).toHaveCount(2);
      await page.locator('#atlas-structures').selectOption({ label: 'left patella' });
      await expect(page.locator('#atlas-selection')).toContainText('left patella');
      await page.getByRole('button', { name: 'Use selected structure' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.locator('#atlas-canvas canvas')).toHaveCount(0);
      await expect(page.locator('#user-input')).toHaveValue('The area I mean is the left patella.');
      expect(errors).toEqual([]);
    });
  }
}

test('general answer downloads no anatomy and new conversation resets the UI', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await respond(page, { ...answer, anatomy_context: null });
  await expect(page.locator('.anatomy-toggle-btn')).toHaveCount(0);
  expect(requests.some(url => /atlas|\.glb/.test(url))).toBe(false);
  await page.getByRole('button', { name: 'Start a new question' }).click();
  await expect(page.locator('#hero')).toHaveCount(1);
  await expect(page.locator('.msg-wrapper')).toHaveCount(0);
});

test('model failure leaves a keyboard accessible structure list', async ({ page }) => {
  await page.route('**/*.glb', route => route.abort());
  await page.goto('/');
  await respond(page);
  await page.getByRole('button', { name: /Explore knee in 3D/ }).click();
  await expect(page.locator('#atlas-status')).toContainText('unavailable');
  await expect(page.getByRole('button', { name: 'Retry 3D view' })).toBeVisible();
  await page.locator('#atlas-search').fill('patella');
  await page.locator('#atlas-structures').selectOption({ label: 'right patella' });
  await page.getByRole('button', { name: 'Use selected structure' }).click();
  await expect(page.locator('#user-input')).toHaveValue('The area I mean is the right patella.');
});

test('older answers retain their own anatomy context', async ({ page }) => {
  await page.goto('/');
  await respond(page);
  await respond(page, { ...answer, anatomy_context: { scene_id: 'chest', label: 'Chest', reason: 'See the chest.' } });
  await page.getByRole('button', { name: /Explore knee in 3D/ }).click();
  await expect(page.locator('#atlas-title')).toHaveText('Knee');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('stream failure preserves the question and discards unreviewed chunks', async ({ page }) => {
  await page.goto('/');
  await page.route('**/api/chat/stream', route => route.fulfill({ contentType: 'text/event-stream', body: 'event: answer_chunk\ndata: {"text":"UNREVIEWED"}\n\nevent: error\ndata: {"detail":"Review unavailable"}\n\n' }));
  await page.locator('#user-input').fill('Synthetic question');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.msg.system')).toContainText('Review unavailable');
  await expect(page.locator('#user-input')).toHaveValue('Synthetic question');
  await expect(page.locator('body')).not.toContainText('UNREVIEWED');
});

test('reference cards preserve official links and reject active content', async ({ page }) => {
  await page.goto('/');
  await respond(page, { ...answer, anatomy_context: null, tool_results: [{
    tool: 'DailyMed medicine labels', scope: 'Label contents and interactions have not been checked.', status: 'available',
    items: [{ title: '<script>unsafe</script>', url: 'javascript:alert(1)' }, { title: 'Metformin label', url: 'https://dailymed.nlm.nih.gov/dailymed/' }],
  }] });
  await expect(page.locator('.tool-card')).toContainText('interactions have not been checked');
  await expect(page.locator('.tool-card a')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Metformin label' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.tool-card script')).toHaveCount(0);
});
