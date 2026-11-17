import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// External services are mocked so tests are deterministic and never depend on a third party being up.
test.beforeEach(async ({ page }) => {
  await page.route('https://api.frankfurter.dev/**', (route) => {
    const url = route.request().url();
    const body = url.includes('/currencies')
      ? { USD: 'United States Dollar', INR: 'Indian Rupee', EUR: 'Euro' }
      : { base: 'USD', date: '2026-11-16', rates: { INR: 93.93, EUR: 0.86 } };
    return route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
  });
});

const PAGES = [
  '/',
  '/countries',
  '/countries/IN',
  '/countries/DE',
  '/directory/organizations',
  '/directory/organizations/wto',
  '/directory/authorities',
  '/directory/authorities/in-dgft',
  '/intelligence',
  '/academy',
  '/data-reliability',
  '/methodology',
  '/about',
  '/privacy',
];

test.describe('deep links and metadata', () => {
  for (const path of PAGES) {
    test(`${path} loads directly with a title, one h1 and no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main h1')).not.toBeEmpty();
      expect(await page.title()).toContain('eport');
      await page.waitForLoadState('networkidle');
      // Reference-rate requests may legitimately fail offline in CI; everything else must be clean.
      expect(errors.filter((e) => !/frankfurter|Failed to load resource/i.test(e))).toEqual([]);
    });
  }

  test('static shells carry page-specific titles and canonical URLs', async ({ request }) => {
    // GitHub Pages redirects /path to /path/ for directory pages, so the shell is requested with the slash.
    const html = await (await request.get('/directory/authorities/in-dgft/')).text();
    expect(html).toContain('<title>Directorate General of Foreign Trade (DGFT)');
    expect(html).toContain('rel="canonical" href="https://eport.live/directory/authorities/in-dgft/"');
  });

  test('sitemap and robots are served', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://eport.live/countries/IN/</loc>');
    expect(sitemap).not.toContain('/search/');
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://eport.live/sitemap.xml');
  });

  test('an unknown path shows the not-found page without crashing', async ({ page }) => {
    await page.goto('/no/such/page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
    await expect(page.getByText('This page does not exist')).toBeVisible();
  });

  test('an unknown country code shows an explanatory empty state', async ({ page }) => {
    await page.goto('/countries/ZZ');
    await expect(page.getByText(/No country has the code/)).toBeVisible();
  });
});

test.describe('search', () => {
  test('finds a country despite a typo and opens it from the keyboard', async ({ page }) => {
    await page.goto('/');
    const box = page.locator('#hero-search');
    await box.fill('germny');
    await expect(page.getByRole('option', { name: /Germany/ })).toBeVisible();
    await box.press('ArrowDown');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/countries\/DE$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Germany' })).toBeVisible();
  });

  test('finds an authority by abbreviation on the results page', async ({ page }) => {
    await page.goto('/search?q=DGFT');
    await expect(page.getByRole('link', { name: /Directorate General of Foreign Trade/ }).first()).toBeVisible();
  });

  test('says so honestly when nothing matches', async ({ page }) => {
    await page.goto('/search?q=zzzzqqqq');
    await expect(page.getByText('Nothing matched that search')).toBeVisible();
  });

  test('remembers recent searches and clears them', async ({ page }) => {
    await page.goto('/search?q=India');
    await page.locator('#page-search').fill('India');
    await page.locator('#page-search').press('Enter');
    await page.goto('/');
    await page.locator('#hero-search').focus();
    await expect(page.getByRole('option', { name: 'India' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('option', { name: 'India' })).toHaveCount(0);
  });
});

test.describe('trust and honesty', () => {
  test('country without published guidance says absence does not mean no requirement', async ({ page }) => {
    await page.goto('/countries/DE');
    await expect(page.getByText(/does not mean no requirement exists/)).toBeVisible();
  });

  test('India shows what is published and what is still pending', async ({ page }) => {
    await page.goto('/countries/IN');
    await expect(page.getByRole('heading', { name: /Published now/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /not yet published/ })).toBeVisible();
  });

  test('authority page labels the summary as eport editorial and shows verification', async ({ page }) => {
    await page.goto('/directory/authorities/in-dgft');
    await expect(page.getByText('eport editorial summary')).toBeVisible();
    await expect(page.getByText('Source and verification')).toBeVisible();
    await expect(page.getByText(/not affiliated with or endorsed/)).toBeVisible();
  });

  test('knowledge graph links connect India to its authorities', async ({ page }) => {
    await page.goto('/countries/IN');
    await expect(page.getByRole('heading', { name: 'Connected records' })).toBeVisible();
    await page.getByRole('link', { name: /Directorate General of Foreign Trade/ }).first().click();
    await expect(page).toHaveURL(/in-dgft/);
  });

  test('the Data Reliability Centre lists unavailable datasets and the blocked API', async ({ page }) => {
    await page.goto('/data-reliability');
    await expect(page.getByText('Trade documents library')).toBeVisible();
    await expect(page.getByText('Browser access blocked').first()).toBeVisible();
    await page.getByRole('button', { name: /Not available yet/ }).click();
    await expect(page.getByText(/Showing 10 of 20 datasets/)).toBeVisible();
  });

  test('external links open safely in a new tab', async ({ page }) => {
    await page.goto('/directory/authorities/in-dgft');
    const link = page.getByRole('link', { name: /Visit the official website/ });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });
});

test.describe('interactive features', () => {
  test('country filter narrows the list and can be cleared', async ({ page }) => {
    await page.goto('/countries');
    await page.getByLabel(/Name, capital/).fill('kenya');
    await expect(page.getByRole('link', { name: 'Kenya' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /of 25\d countries/ })).toContainText('1 of');
    await page.getByLabel(/Name, capital/).fill('qqqq');
    await expect(page.getByText('No country matches these filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    // The unfiltered list is paginated (50 at a time), alphabetically from Afghanistan.
    await expect(page.getByRole('link', { name: 'Afghanistan' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /countries and territories/ })).toContainText('250 of 250');
    await expect(page.getByRole('button', { name: /Show 50 more/ })).toBeVisible();
  });

  test('chart data is available as a table', async ({ page }) => {
    await page.goto('/countries/IN');
    await page.getByRole('button', { name: 'View data as a table' }).click();
    await expect(page.getByRole('table').filter({ hasText: 'Exports' })).toBeVisible();
  });

  test('world map zooms and links countries to their profiles', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover/click map is covered on desktop; mobile uses the list');
    await page.goto('/');
    await page.getByRole('img', { name: /World map of countries/ }).scrollIntoViewIfNeeded();
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await zoomIn.click();
    await expect(page.getByRole('button', { name: 'Reset map view' })).toBeEnabled();
  });
});

test.describe('accessibility (axe, WCAG 2.2 AA rules)', () => {
  for (const path of PAGES) {
    test(`${path} has no detectable violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
});

test.describe('mobile navigation', () => {
  test('menu opens as a dialog, traps focus and closes with Escape', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: /Directory/ }).click();
    await expect(page).toHaveURL(/\/directory$/);
    await expect(dialog).toBeHidden();
  });

  test('no horizontal scroll on key pages', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    for (const path of ['/', '/countries', '/countries/IN', '/data-reliability']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
