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
  const cors = { 'access-control-allow-origin': '*' };
  // Public holidays: Germany has data (dates in the current and next year), everything else answers 204 like India does.
  await page.route('https://date.nager.at/**', (route) => {
    const m = /\/PublicHolidays\/(\d{4})\/([A-Z]{2})$/.exec(route.request().url());
    if (m?.[2] !== 'DE') return route.fulfill({ status: 204, headers: cors });
    const y = m[1];
    return route.fulfill({
      json: [
        { date: `${y}-01-01`, localName: 'Neujahr', name: "New Year's Day", global: true, types: ['Public'] },
        { date: `${y}-05-01`, localName: 'Tag der Arbeit', name: 'Labour Day', global: true, types: ['Public'] },
        { date: `${y}-10-03`, localName: 'Tag der Deutschen Einheit', name: 'German Unity Day', global: true, types: ['Public'] },
        { date: `${y}-12-25`, localName: 'Weihnachtstag', name: 'Christmas Day', global: true, types: ['Public'] },
        { date: `${y}-12-26`, localName: 'Zweiter Weihnachtstag', name: "St. Stephen's Day", global: true, types: ['Public'] },
      ],
      headers: cors,
    });
  });
  // YouTube is never contacted by tests; the requests are still observable, so tests can prove nothing loads before play.
  await page.route(/youtube(-nocookie)?\.com|ytimg\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>video</body></html>' }));
  await page.route('https://en.wikipedia.org/**', (route) =>
    route.fulfill({
      json: {
        query: {
          pages: [
            { pageid: 1, title: 'Incoterms', index: 1, extract: 'Pre-defined commercial terms published by the International Chamber of Commerce.' },
            { pageid: 2, title: 'Bill of lading', index: 2, extract: 'A document issued by a carrier to acknowledge receipt of cargo.' },
          ],
        },
      },
      headers: cors,
    }),
  );
  await page.route('https://api.gdeltproject.org/**', (route) =>
    route.fulfill({
      json: { articles: [{ url: 'https://example.org/story', title: 'Container shipping faces pressure as orderbook arrives', seendate: '20261113T180000Z', domain: 'example.org', language: 'English' }] },
      headers: cors,
    }),
  );
});

const PAGES = [
  '/',
  '/countries',
  '/countries/IN',
  '/countries/DE',
  '/countries/GI', // no outline in the map data: exercises the marker fallback
  '/regions/asia',
  '/regions/africa',
  '/trade',
  '/trade/IN/DE',
  '/academy/incoterms',
  '/academy/documents',
  '/academy/glossary',
  '/academy/videos',
  '/directory/organizations',
  '/directory/organizations/wto',
  '/directory/authorities',
  '/directory/authorities/in-dgft',
  '/intelligence',
  '/intelligence/news',
  '/academy',
  '/data-reliability',
  '/contact',
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
    await expect(page.getByRole('listbox').getByRole('option', { name: /Germany/ })).toBeVisible();
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
    await expect(page.getByText('Nothing on eport matched that search')).toBeVisible();
  });

  test('remembers recent searches and clears them', async ({ page }) => {
    await page.goto('/search?q=India');
    await page.locator('#page-search').fill('India');
    await page.locator('#page-search').press('Enter');
    await page.goto('/');
    await page.locator('#hero-search').focus();
    await expect(page.getByRole('listbox').getByRole('option', { name: 'India' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('listbox').getByRole('option', { name: 'India' })).toHaveCount(0);
  });
});

test.describe('trust and honesty', () => {
  test('country without published guidance says absence does not mean no requirement', async ({ page }) => {
    await page.goto('/countries/DE');
    await expect(page.getByText(/does not mean no requirement exists/)).toBeVisible();
  });

  test('India shows what is published and what is still pending', async ({ page }) => {
    await page.goto('/countries/IN');
    await expect(page.getByRole('heading', { name: /Published for India now/ })).toBeVisible();
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
    await expect(page.getByText(/Showing [1-9]\d* of \d+ datasets — select the highlighted card/)).toBeVisible();
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
  // Every page is checked in both colour schemes: dark mode must meet the same contrast rules as light.
  for (const scheme of ['light', 'dark'] as const)
    for (const path of [...PAGES, '/search?q=incoterms']) {
    test(`${path} has no detectable violations (${scheme})`, async ({ page }) => {
      // Reveal/entrance animations are off under reduced motion, so axe measures final colours, not mid-fade ones.
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
});

test.describe('global trade', () => {
  test('the Trade Explorer shows both directions and explains the gap between reports', async ({ page }) => {
    await page.goto('/trade/IN/DE');
    const main = page.getByRole('main');
    await expect(main.getByText('Exports of goods, as reported by India')).toBeVisible();
    await expect(main.getByText('Exports of goods, as reported by Germany')).toBeVisible();
    await expect(main.getByText(/The two reports differ by/).first()).toBeVisible();
    await expect(main.getByText(/does not measure overall economic benefit|not a measure of overall economic benefit/i)).toBeVisible();
  });

  test('a country with no report is explained rather than shown as zero', async ({ page }) => {
    await page.goto('/trade/DZ/DE');
    await expect(page.getByRole('main').getByText(/Algeria has no 2023 report in WITS/).first()).toBeVisible();
  });

  test('swapping the two countries updates the address', async ({ page }) => {
    await page.goto('/trade/IN/DE');
    await page.getByRole('button', { name: /swap/i }).click();
    await expect(page).toHaveURL(/\/trade\/DE\/IN$/);
  });

  test('a country page lists its partners and links into the Explorer', async ({ page }) => {
    await page.goto('/countries/IN');
    const panel = page.locator('#partners');
    await expect(panel.getByRole('heading').first()).toBeVisible();
    await panel.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/trade\/IN\/[A-Z]{2}$/);
  });

  test('region pages cover every region and unknown ones say so', async ({ page }) => {
    for (const r of ['africa', 'americas', 'asia', 'europe', 'oceania']) {
      await page.goto(`/regions/${r}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(`Trade in ${r[0]!.toUpperCase()}${r.slice(1)}`);
    }
    await page.goto('/regions/atlantis');
    await expect(page.getByText(/There is no region called/)).toBeVisible();
  });
});

test.describe('learning centre', () => {
  test('Incoterms can be filtered by mode and every rule is explained', async ({ page }) => {
    await page.goto('/academy/incoterms');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('rules, explained');
    await expect(page.locator('article')).toHaveCount(11);
    await page.getByRole('button', { name: /Sea and inland waterway only/ }).click();
    await expect(page.locator('article')).toHaveCount(4);
    await expect(page.getByRole('status').filter({ hasText: '4 of 11 rules shown' })).toBeVisible();
    // Only DDP puts import clearance on the seller.
    await page.getByRole('button', { name: /All 11 rules/ }).click();
    const ddp = page.getByRole('row', { name: /DDP/ });
    await expect(ddp.getByRole('cell').last()).toContainText('Seller');
    await expect(page.getByText(/not affiliated with the ICC/)).toBeVisible();
  });

  test('documents show what draws on what, and filter by type', async ({ page }) => {
    await page.goto('/academy/documents');
    await expect(page.getByRole('heading', { name: 'What to prepare first' })).toBeVisible();
    const invoice = page.locator('#doc-commercial-invoice');
    await expect(invoice.getByText('Feeds into')).toBeVisible();
    await page.getByRole('button', { name: 'Certificates' }).click();
    await expect(page.locator('article')).toHaveCount(2);
    await expect(page.locator('#doc-bill-of-lading')).toHaveCount(0);
  });

  test('the glossary filters as you type and cross-references work', async ({ page }) => {
    await page.goto('/academy/glossary');
    await page.getByLabel('Filter terms').fill('origin');
    await expect(page.getByRole('term').filter({ hasText: 'Rules of origin' })).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: 'TEU' })).toHaveCount(0);
    await page.getByLabel('Filter terms').fill('zzzz');
    await expect(page.getByText(/No term matches/)).toBeVisible();
  });

  test('every country page carries the worldwide guide and only verified official pages', async ({ page }) => {
    await page.goto('/countries/BR');
    const guide = page.locator('#guide');
    await expect(guide.getByRole('heading', { name: /Official pages for Brazil/ })).toBeVisible();
    await expect(guide.getByRole('link', { name: /WTO trade profile/ })).toHaveAttribute('href', /trade_profiles\/BR_e\.pdf/);
    await expect(guide.getByText('10 of 10 stages shown')).toBeVisible();
    await guide.getByRole('button', { name: 'Importing' }).click();
    await expect(guide.getByText(/stages shown/)).toBeVisible();
    // A territory the sources do not cover gets no invented link.
    await page.goto('/countries/BV');
    await expect(page.locator('#guide').getByText(/No country-specific official page could be confirmed/)).toBeVisible();
  });
});

test.describe('contact and ownership', () => {
  test('footer and about page state ownership and the support address', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Who runs eport' })).toBeVisible();
    // The sentence contains a link with a screen-reader notice, so match its two halves.
    const about = page.getByRole('main');
    await expect(about.getByText(/eport is a subsidiary of/)).toBeVisible();
    await expect(about.getByText(/and is managed by Dhurta Group\./)).toBeVisible();
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByText(/A subsidiary of/)).toBeVisible();
    await expect(footer.getByText(/Managed by Dhurta Group/)).toBeVisible();
    await expect(footer.getByRole('link', { name: 'support@dhurta.org' })).toHaveAttribute('href', 'mailto:support@dhurta.org');
    await expect(footer.getByRole('link', { name: /Dhurta\.org/ })).toHaveAttribute('href', 'https://dhurta.org');
  });

  test('home page has a contact section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contact').getByRole('heading', { name: 'Talk to the eport team' })).toBeAttached();
    await expect(page.locator('#contact').getByRole('link', { name: 'support@dhurta.org' })).toHaveAttribute('href', 'mailto:support@dhurta.org');
  });

  test('the form validates, then composes an email without claiming it was sent', async ({ page }) => {
    await page.addInitScript(() => {
      window.__eportMailtoSink = [];
    });
    await page.goto('/contact');
    await page.getByRole('button', { name: /Compose email/ }).click();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText(/at least 10 characters/)).toBeVisible();

    await page.getByLabel('Your name').fill('Asha Verma');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Email address').blur();
    await expect(page.getByText(/valid email address/)).toBeVisible();
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByLabel('Topic').selectOption('correction');
    await page.getByLabel('Message').fill('The DGFT summary should link to the current IEC procedure page.');
    await page.getByRole('button', { name: /Compose email/ }).click();

    await expect(page.getByText('Your email app should now be open')).toBeVisible();
    const href = await page.evaluate(() => window.__eportMailtoSink?.[0] ?? '');
    expect(href.startsWith('mailto:support@dhurta.org?subject=')).toBe(true);
    const params = new URL(href).searchParams;
    expect(params.get('subject')).toContain('Report an error');
    expect(params.get('body')).toContain('The DGFT summary should link');
    expect(params.get('body')).toContain('asha@example.com');
    await expect(page.getByText(/nothing is sent until you press send/i)).toBeVisible();
  });
});

test.describe('motion', () => {
  test('animation is on by default and the hero globe is decorative', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion/);
    await expect(page.locator('canvas[aria-hidden="true"]')).toBeAttached();
  });

  test('reduced motion turns animation off and shows all content', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/motion/);
    const faded = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity !== '1').length);
    expect(faded).toBe(0);
  });

  test('sections reveal as they scroll into view', async ({ page, isMobile }) => {
    test.skip(isMobile, 'scroll-position assertions are covered on desktop');
    await page.goto('/');
    const contact = page.locator('#contact .reveal').first();
    await expect(contact).toHaveAttribute('data-reveal', 'out');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(contact).toHaveAttribute('data-reveal', 'in');
  });

  test('static shell carries organization structured data naming the parent', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('"parentOrganization"');
    expect(html).toContain('support@dhurta.org');
  });
});

test.describe('theme', () => {
  const bg = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('follows the device colour scheme by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/about');
    await expect.poll(() => bg(page)).toBe('rgb(6, 18, 31)');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => bg(page)).toBe('rgb(255, 255, 255)');
  });

  test('the toggle cycles automatic, light, dark and remembers the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/about');
    const toggle = () => page.locator('[data-theme-toggle]').first();
    await expect(toggle()).toHaveAttribute('data-theme-toggle', 'system');
    await toggle().click(); // → light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => bg(page)).toBe('rgb(255, 255, 255)'); // explicit Light beats the dark device preference
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light'); // remembered, applied before paint
    await toggle().click(); // → dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await toggle().click(); // → automatic
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('the toggle announces the current theme and what it will switch to', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('[data-theme-toggle]').first()).toHaveAccessibleName(/Colour theme: Automatic.*Switch to Light/);
  });

  test('the map and chart follow the theme', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop check');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const sea = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--map-sea').trim());
    expect(sea).toBe('#0a1d30');
  });
});

test.describe('home page sections', () => {
  test('there is no top banner declaring independence; the statement lives in footer, FAQ and about', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Independent platform. Not a government, customs, port or regulatory service.')).toHaveCount(0);
    await expect(page.getByRole('contentinfo').getByText(/independent information platform/)).toBeVisible();
    await expect(page.getByText('Is eport a government or official body?')).toBeAttached();
  });

  test('the reference strip shows organization logos with a trademark notice, and national flags', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="refs-heading"]');
    await expect(section.getByText(/References only — not partners or endorsements/)).toBeVisible();
    await expect(section.getByText(/Logos are trademarks of their respective owners/)).toBeVisible();
    await expect.poll(() => section.locator('img[src*="/images/logos/"]').count()).toBeGreaterThan(5);
    await expect(section.locator('img[src*="/images/logos/"]').first()).toHaveAttribute('alt', /logo$/);
    await expect.poll(() => section.locator('img[alt=""][src*=".svg"]').count()).toBeGreaterThan(0);
  });

  test('choosing a region zooms the home map and links to its overview', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="map-heading"]');
    await section.scrollIntoViewIfNeeded();
    await section.getByRole('button', { name: /^Asia/ }).click();
    await expect(section.getByRole('button', { name: /^Asia/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('img', { name: /zoomed to Asia/ })).toBeAttached();
    await section.getByRole('link', { name: /Asia trade overview/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Trade in Asia' })).toBeVisible();
  });

  test('solutions blocks are built from real data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Every market, one clear profile' })).toBeAttached();
    await expect(page.locator('svg[aria-label^="Diagram: India connects to"]')).toBeAttached();
  });

  test('quick finder lists real authorities and says so honestly when there are none', async ({ page }) => {
    await page.goto('/');
    const finder = page.locator('section[aria-labelledby="finder-heading"]');
    await expect(finder.getByRole('link', { name: /DGFT — Directorate General of Foreign Trade/ })).toBeVisible();
    await expect(finder.getByRole('link', { name: /FSSAI/ })).toHaveCount(0);
    await finder.getByText('Import goods').click();
    await expect(finder.getByRole('link', { name: /FSSAI/ })).toBeVisible();
    await finder.getByLabel(/Importing into/).selectOption('DE');
    await expect(finder.getByText('No authorities are published for Germany yet')).toBeVisible();
    await expect(finder.getByText(/starting points, not a list of requirements/)).toBeVisible();
  });

  test('FAQ opens one answer at a time', async ({ page }) => {
    await page.goto('/');
    const first = page.getByRole('button', { name: 'Is eport a government or official body?' });
    const second = page.getByRole('button', { name: 'How current is the information?' });
    await first.scrollIntoViewIfNeeded();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/subsidiary of Dhurta\.org, managed by Dhurta Group/).first()).toBeVisible();
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    await expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  test('flags appear on country pages and the country list', async ({ page }) => {
    await page.goto('/countries/IN');
    await expect.poll(() => page.locator('header img[src*=".svg"]').count()).toBeGreaterThan(0);
    await page.goto('/countries');
    await expect.poll(() => page.locator('tbody img[src*=".svg"]').count()).toBeGreaterThan(10);
  });
});

test.describe('news', () => {
  test('home shows headlines from several publishers, each linking out safely', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="news-heading"]');
    await expect(section.getByRole('heading', { name: 'What the official sources are publishing' })).toBeVisible();
    const links = section.locator('article h3 a');
    await expect(links).toHaveCount(6);
    await expect(links.first()).toHaveAttribute('target', '_blank');
    await expect(links.first()).toHaveAttribute('rel', /noopener/);
    const publishers = await section.locator('article p:first-child span.font-medium').allTextContents();
    expect(new Set(publishers).size).toBeGreaterThan(2);
    await expect(section.getByText(/Topic tags are applied automatically/)).toBeVisible();
  });

  test('news page filters by topic and publisher and shows feed status', async ({ page }) => {
    await page.goto('/intelligence/news');
    const total = await page.getByRole('status').filter({ hasText: /of \d+ headlines/ }).textContent();
    expect(total).toMatch(/of \d+ headlines/);
    await page.getByRole('combobox', { name: /^Publisher/ }).selectOption({ index: 1 });
    await expect(page.getByRole('status').filter({ hasText: /of \d+ headlines/ })).not.toHaveText(total ?? '');
    await page.getByText('Feed status').click();
    await expect(page.getByText(/Updated|Using previous items/).first()).toBeVisible();
  });

  test('live headline search shows unverified web headlines with attribution', async ({ page }) => {
    await page.goto('/intelligence/news');
    await expect(page.getByText('Container shipping faces pressure as orderbook arrives')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Unverified web content')).toBeVisible();
    await expect(page.getByText(/via the GDELT Project/)).toBeVisible();
  });
});

test.describe('search with live web results', () => {
  test('shows a top match, eport records first, and live web panels beside them', async ({ page }) => {
    await page.goto('/search?q=India');
    await expect(page.getByText(/Top match · Country/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'On eport' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'From the web — live' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Incoterms/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live news headlines' })).toBeVisible();
    await expect(page.getByText('Container shipping faces pressure as orderbook arrives')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Unverified web content').first()).toBeVisible();
    await expect(page.getByText(/CC BY-SA 4\.0/)).toBeVisible();
  });

  test('can be switched off, which sends no web requests, and the choice is remembered', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => /wikipedia\.org|gdeltproject\.org/.test(r.url()) && external.push(r.url()));
    await page.goto('/search?q=India');
    await expect(page.getByRole('heading', { name: 'From the web — live' })).toBeVisible();
    await page.getByRole('switch', { name: 'Include live web results' }).click();
    await expect(page.getByText('Live web results are off')).toBeVisible();
    external.length = 0;
    await page.goto('/search?q=Germany');
    await expect(page.getByText('Live web results are off')).toBeVisible();
    expect(external).toEqual([]);
  });

  test('explains a rate-limited news service instead of failing silently', async ({ page }) => {
    await page.route('https://api.gdeltproject.org/**', (route) => route.fulfill({ status: 429, body: 'Please limit requests to one every 5 seconds', headers: { 'access-control-allow-origin': '*' } }));
    await page.goto('/search?q=tariffs');
    await expect(page.getByText(/limiting requests right now/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'From the web — live' })).toBeVisible();
  });

  test('keeps eport results when the web is unavailable', async ({ page }) => {
    await page.route('https://en.wikipedia.org/**', (route) => route.abort());
    await page.goto('/search?q=India');
    await expect(page.getByText('Web results are unavailable')).toBeVisible();
    await expect(page.getByRole('link', { name: /India/ }).first()).toBeVisible();
  });

  test('says live headlines need real words for very short queries', async ({ page }) => {
    await page.goto('/search?q=IN');
    await expect(page.getByText(/three or more letters/)).toBeVisible();
  });
});

test.describe('mega menus', () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, 'the desktop navigation bar is hidden on small screens'));

  test('Countries: regions, flags, featured economies and helpful resources', async ({ page }) => {
    await page.goto('/about');
    const trigger = page.locator('[data-division="countries"]');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('#division-panel');
    await expect(panel.getByRole('button', { name: /^Asia/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('link', { name: /^India Exports/ })).toBeVisible();
    await expect.poll(() => panel.locator('img[src*=".svg"]').count()).toBeGreaterThan(8);
    await expect(panel.getByRole('link', { name: /View all \d+ in Asia/ })).toBeVisible();
    await expect(panel.getByRole('complementary', { name: 'Helpful resources' }).getByRole('link', { name: /India: export and import process guide/ })).toBeVisible();
    // Switching region changes the list.
    await panel.getByRole('button', { name: /^Europe/ }).click();
    await expect(panel.getByRole('link', { name: /^Germany/ })).toBeVisible();
    await expect(panel.getByRole('link', { name: /^India Exports/ })).toHaveCount(0);
    // Choosing a country navigates and closes the menu.
    await panel.getByRole('link', { name: /^Germany/ }).click();
    await expect(page).toHaveURL(/\/countries\/DE$/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes a menu and returns focus to its button', async ({ page }) => {
    await page.goto('/about');
    const trigger = page.locator('[data-division="countries"]');
    await trigger.click();
    await expect(page.locator('#division-panel').getByRole('button', { name: /^Asia/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('moving between menu buttons with the mouse switches menus once one is open', async ({ page }) => {
    await page.goto('/about');
    await page.locator('[data-division="countries"]').click();
    await page.locator('[data-division="resources"]').hover();
    await expect(page.locator('[data-division="resources"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#division-panel').getByText('Latest news | Official publishers')).toBeVisible();
  });

  test('Resources: latest news, videos and guides', async ({ page }) => {
    await page.goto('/about');
    await page.locator('[data-division="resources"]').click();
    const panel = page.locator('#division-panel');
    await expect(panel.getByRole('link', { name: /opens in a new tab/ }).first()).toHaveAttribute('target', '_blank');
    await panel.getByRole('button', { name: 'Videos' }).click();
    await expect(panel.getByRole('link', { name: /WTO explained/ })).toBeVisible();
    await panel.getByRole('button', { name: 'Guides' }).click();
    await expect(panel.getByRole('link', { name: /India: export and import process/ })).toBeVisible();
  });

  test('the navigation bar never overlaps the controls beside it', async ({ page }) => {
    await page.goto('/');
    const gap = await page.evaluate(() => {
      const nav = document.querySelector('header nav ul')!.getBoundingClientRect();
      const toggle = document.querySelector('[data-theme-toggle]')!.getBoundingClientRect();
      return toggle.left - nav.right;
    });
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  test('is accessible with a menu open (light and dark)', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme });
      await page.goto('/about');
      await page.locator('[data-division="countries"]').click();
      await expect(page.locator('#division-panel').getByRole('link', { name: /^India Exports/ })).toBeVisible();
      const results = await new AxeBuilder({ page }).include('header').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${scheme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')}`)).toEqual([]);
    }
  });
});

test.describe('country page', () => {
  test('hero: status, flag, summary, highlighted map and key facts', async ({ page }) => {
    await page.goto('/countries/IN');
    const hero = page.locator('header', { has: page.getByRole('heading', { level: 1, name: 'India' }) });
    await expect(hero.getByText('Operational guidance in progress')).toBeVisible();
    await expect(hero.getByText('India is a coastal UN member state in Southern Asia.')).toBeVisible();
    const map = hero.locator('svg[aria-label^="Map highlighting India"]');
    await expect(map).toBeVisible({ timeout: 20_000 });
    await expect(map.locator('path.map-selected')).toHaveCount(1);
    expect(await map.locator('path.map-neighbour').count()).toBeGreaterThan(2);
    await expect(hero.getByText('English, Hindi, Tamil')).toBeVisible();
    await expect(hero.getByText('Indian rupee (INR)')).toBeVisible();
    await expect(hero.getByText('Typical weekend')).toBeVisible();
    await expect(hero.getByText('No holiday data for this country')).toBeVisible();
    await expect(hero.getByText('6 land neighbours')).toBeVisible();
  });

  test('a territory without an outline gets a marker on a regional map', async ({ page }) => {
    await page.goto('/countries/GI');
    await expect(page.locator('svg[aria-label="Regional map with Gibraltar marked"]')).toBeVisible({ timeout: 20_000 });
  });

  test('a country with holiday data shows the next holiday in the hero and the working-days section', async ({ page }) => {
    await page.goto('/countries/DE');
    await expect(page.getByText('Reference record', { exact: true })).toBeVisible();
    const calendar = page.locator('#calendar');
    await expect(calendar.getByText('Upcoming public holidays')).toBeVisible();
    await expect(calendar.getByRole('listitem').first()).toBeVisible();
    await expect(calendar.getByText(/Public holidays via/)).toBeVisible();
    await expect(page.getByText('Next public holiday')).toBeVisible();
    await expect(page.getByText('No holiday data for this country')).toHaveCount(0);
  });

  test('a country without holiday data says so instead of guessing', async ({ page }) => {
    await page.goto('/countries/IN');
    await expect(page.locator('#calendar').getByText('No public-holiday data for India')).toBeVisible();
  });

  test('section tabs jump to sections and track the one in view', async ({ page }) => {
    await page.goto('/countries/IN');
    const nav = page.getByRole('navigation', { name: 'On this page' });
    await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'true');
    await nav.getByRole('link', { name: 'Process guide' }).click();
    await expect(nav.getByRole('link', { name: 'Process guide' })).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('heading', { name: 'Exporting and importing: India' })).toBeInViewport();
  });

  test('a deep link to #guide lands on the guide', async ({ page }) => {
    await page.goto('/countries/IN#guide');
    await expect(page.getByRole('heading', { name: 'Exporting and importing: India' })).toBeInViewport({ timeout: 15_000 });
  });

  test('the India guide is labelled as an unreviewed overview and can be filtered by direction', async ({ page }) => {
    await page.goto('/countries/IN');
    const guide = page.locator('#guide').getByRole('group', { name: 'Show steps for India' }).locator('xpath=ancestor::div[1]');
    await expect(page.locator('#guide').getByText('Needs review').first()).toBeVisible();
    await expect(guide.getByText(/Read this first/)).toBeVisible();
    await expect(guide.getByText(/not a checklist of requirements/i)).toBeVisible();
    await expect(guide.getByText('10 of 10 steps shown')).toBeVisible();
    await guide.getByRole('button', { name: 'Exporting' }).click();
    await expect(guide.getByText('8 of 10 steps shown')).toBeVisible();
    await expect(guide.getByRole('heading', { name: /Declare exports to Customs/ })).toBeVisible();
    await expect(guide.getByRole('heading', { name: /Declare imports to Customs/ })).toHaveCount(0);
    await guide.getByRole('button', { name: 'Importing' }).click();
    await expect(guide.getByRole('heading', { name: /Declare imports to Customs/ })).toBeVisible();
    // Each step links to the responsible authority's directory page and official site.
    await expect(guide.getByRole('link', { name: 'DGFT' }).first()).toHaveAttribute('href', '/directory/authorities/in-dgft');
    await expect(guide.getByRole('link', { name: /DGFT official website/ }).first()).toHaveAttribute('target', '_blank');
  });

  test('countries without a guide say so, and show no empty authority list', async ({ page }) => {
    await page.goto('/countries/DE');
    await expect(page.locator('#guide').getByText(/has not yet published export or import procedures/)).toBeVisible();
    // Only the worldwide framework appears, and it says it is a framework rather than Germany's rules.
    await expect(page.getByText('Read this first')).toHaveCount(1);
    await expect(page.locator('#guide').getByText(/eport has not yet published Germany’s own procedures/)).toBeVisible();
    await expect(page.locator('#authorities').getByText('No authorities are published for Germany yet')).toBeVisible();
  });

  test('India lists its published authorities as cards', async ({ page }) => {
    await page.goto('/countries/IN');
    await expect(page.locator('#authorities article')).toHaveCount(16);
    await expect(page.locator('#authorities').getByRole('link', { name: /Official website · dgft\.gov\.in/ })).toHaveAttribute('target', '_blank');
  });
});

test.describe('videos', () => {
  test('nothing is requested from YouTube until play, then it loads privacy-enhanced', async ({ page }) => {
    const youtube: string[] = [];
    page.on('request', (r) => /youtube|ytimg/.test(r.url()) && youtube.push(r.url()));
    await page.goto('/countries/DE');
    const shelf = page.locator('#videos');
    await expect(shelf.getByRole('button', { name: /^Play video:/ })).toHaveCount(3);
    await expect(shelf.getByText('Plays from YouTube when you press play').first()).toBeVisible();
    expect(youtube).toEqual([]);
    await shelf.getByRole('button', { name: /^Play video:/ }).first().click();
    const frame = shelf.locator('iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1&rel=0$/);
    await expect(frame).toHaveAttribute('title', /.+/);
  });

  test('the videos page lists official-channel videos, filters by topic and explains privacy', async ({ page }) => {
    await page.goto('/academy/videos');
    await expect(page.getByRole('heading', { level: 1, name: 'Official explainer videos' })).toBeVisible();
    await expect(page.getByText(/13 of 13 videos/)).toBeVisible();
    await expect(page.getByText('Channel: World Trade Organization').first()).toBeVisible();
    await expect(page.getByText('Channel: IMOHQ').first()).toBeVisible();
    await page.getByRole('button', { name: /^Incoterms/ }).click();
    await expect(page.getByText(/2 of 13 videos/)).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByText(/Nothing is requested from YouTube until you press play/)).toBeVisible();
  });
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
    // A page that overflows makes a mobile browser widen its layout viewport, so comparing the page with
    // innerWidth would always pass. Compare with the device width (clientWidth) and list real offenders.
    for (const path of ['/', '/countries', '/countries/IN', '/countries/GI', '/academy/videos', '/intelligence/news', '/search?q=India', '/contact', '/data-reliability']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const result = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            // Shapes inside an <svg> are clipped by it and cannot widen the page; the <svg> element itself is still checked.
            const insideSvg = e.tagName.toLowerCase() !== 'svg' && e.closest('svg') !== null;
            return r.width > 0 && r.right > vw + 1 && !insideSvg && !e.closest('.marquee, canvas, .sr-only, .overflow-x-auto, [aria-hidden="true"], dialog');
          })
          .slice(0, 5)
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 50)}`);
        return { widened: window.innerWidth - vw, scroll: document.documentElement.scrollWidth - vw, offenders };
      });
      expect(result, path).toEqual({ widened: 0, scroll: 0, offenders: [] });
    }
  });
});
