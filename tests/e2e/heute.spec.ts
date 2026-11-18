import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setView } from './view-helpers';

test.use({ baseURL: 'http://localhost:5173' });

async function open(page: Page, state: string, theme = 'light', lang = 'de') {
  await page.goto('/dev/heute');
  await page.getByLabel('Zustand').selectOption({ label: state });
  await page.getByText('Ansicht einstellen').click();
  await page.locator('#settings-title').waitFor();
  await setView(page, lang, theme);
}

const STATES = ['Es gibt einen Plan', 'Alles erledigt', 'Noch kein Material'];

for (const state of STATES) {
  for (const [theme, lang] of [
    ['light', 'de'],
    ['dark', 'de'],
    ['contrast', 'de'],
    ['light', 'ar'],
  ] as const) {
    test(`axe Heute: ${state} / ${theme} / ${lang}`, async ({ page }) => {
      await open(page, state, theme, lang);
      const res = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      expect(res.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`)).toEqual([]);
    });
  }
}

test('Abstände: gestapelte Elemente haben überall mindestens den Stack-Abstand', async ({
  page,
}) => {
  await page.goto('/dev/components');
  const bad = await page.evaluate(() => {
    const min = 8; // kleinster erlaubter Abstand (--space-tight)
    const out: string[] = [];
    document.querySelectorAll('.stack').forEach((st) => {
      const kids = Array.from(st.children).filter(
        (c) => (c as HTMLElement).offsetHeight > 0,
      ) as HTMLElement[];
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1]!.getBoundingClientRect();
        const b = kids[i]!.getBoundingClientRect();
        if (b.top - a.bottom < min - 0.5)
          out.push(`${kids[i - 1]!.className} → ${kids[i]!.className}`);
      }
    });
    return out;
  });
  expect(bad).toEqual([]);
});

for (const w of [320, 400]) {
  test(`Heute bei ${w} px und 200 % Text ohne horizontales Scrollen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 700 });
    await open(page, 'Es gibt einen Plan');
    await page.locator('.settings input[type=range]').fill('200');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  });
}

test('Screenshots', async ({ page }, info) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await open(page, 'Es gibt einen Plan');
  await page.screenshot({ path: 'test-results/heute-plan.png', fullPage: true });
  await open(page, 'Alles erledigt', 'dark');
  await page.screenshot({ path: 'test-results/heute-done-dark.png', fullPage: true });
  await open(page, 'Noch kein Material', 'light', 'ar');
  await page.screenshot({ path: 'test-results/heute-empty-ar.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, 'Es gibt einen Plan');
  await page.screenshot({ path: 'test-results/heute-desktop.png', fullPage: true });
  void info;
});
