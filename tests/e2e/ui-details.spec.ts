import { expect, test, type Page } from '@playwright/test';

/**
 * Messbare Prüfungen aus docs/UI_DETAILS.md Abschnitt 13 – bisher für den App-Rahmen und die Phase-A-Bausteine.
 * Die Innenseiten der Bildschirme folgen in Phase B (dort gelten dieselben Prüfungen).
 */
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const set = (page: Page, o: { theme?: string; scale?: number }) =>
  page.addInitScript((v) => {
    localStorage.setItem(
      'madar.settings.v1',
      JSON.stringify({
        theme: v.theme ?? 'light',
        textScale: v.scale ?? 100,
        reducedMotion: true,
      }),
    );
  }, o);

const GALLERY = 'http://localhost:5173/dev/components';

test.describe('1/2: Zielgrößen und Eingabegröße', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('Rahmen und Phase-A-Bausteine: jede Tippfläche ≥ 44×44, jede Eingabe ≥ 16 px', async ({
    page,
  }) => {
    for (const url of ['/#today', '/#settings', GALLERY]) {
      await page.goto(url);
      await page.waitForTimeout(300);
      const small = await page.evaluate(() => {
        const sel = (url) => url;
        void sel;
        const scope = document.querySelector('.gallery')
          ? '.appbar, .tabbar, .banner, .sheet, .toast-region, .btn, .iconbtn'
          : '.appbar, .tabbar';
        return [...document.querySelectorAll(scope)]
          .flatMap((root) => [
            root,
            ...root.querySelectorAll('a, button, [role=button], input, select, summary'),
          ])
          .filter((e) => e.matches('a, button, [role=button], input, select, summary'))
          .filter(
            (e) => (e as HTMLElement).offsetParent !== null && !e.closest('[aria-hidden="true"]'),
          )
          .map((e) => {
            const r = e.getBoundingClientRect();
            return {
              t: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30),
              w: r.width,
              h: r.height,
            };
          })
          .filter((x) => x.w < 44 - 0.5 || x.h < 44 - 0.5);
      });
      expect(small, url).toEqual([]);
      const tiny = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            'input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select',
          ),
        ]
          .map((e) => parseFloat(getComputedStyle(e).fontSize))
          .filter((f) => f < 16),
      );
      expect(tiny, url).toEqual([]);
    }
  });
});

test.describe('3: kein horizontaler Überlauf', () => {
  const widths = [320, 375, 390, 768, 1280];
  test('alle Breiten × Textskala 100/150/200 (hell); 320 pt zusätzlich dunkel und Hoher Kontrast', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const combos: { w: number; scale: number; theme: string }[] = [];
    for (const w of widths)
      for (const scale of [100, 150, 200]) combos.push({ w, scale, theme: 'light' });
    for (const theme of ['dark', 'contrast'])
      for (const scale of [100, 150, 200]) combos.push({ w: 320, scale, theme });
    const bad: string[] = [];
    for (const c of combos) {
      const ctx = await browser.newContext({
        viewport: { width: c.w, height: 800 },
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await set(page, c);
      for (const r of ['/#today', '/#settings']) {
        await page.goto(r);
        await expect(page.locator('#main')).toBeVisible();
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 0.5))
          bad.push(`${r} ${JSON.stringify(c)}`);
      }
      await ctx.close();
    }
    expect(bad).toEqual([]);
  });
});

test.describe('4: Ausrichtung und Raster', () => {
  test('Hinweis: Symbol mittig zur ersten Textzeile (±1 px); Seitenleiste: Symbol mittig zum Text', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const scale of [100, 200]) {
      await page.goto(GALLERY);
      await page.locator('#g-scale').fill(String(scale));
      await page.waitForTimeout(150);
      const banners = await page.locator('.banner').evaluateAll((els) =>
        els.map((b) => {
          const icon = b.querySelector('.banner__icon svg')!.getBoundingClientRect();
          const p = b.querySelector('.banner__body p')!;
          const range = document.createRange();
          range.selectNodeContents(p);
          const first = range.getClientRects()[0]!;
          return Math.abs(icon.top + icon.height / 2 - (first.top + first.height / 2));
        }),
      );
      for (const d of banners) expect(d, `Textskala ${scale}`).toBeLessThanOrEqual(1);
      const side = await page.locator('.tabbar--sidebar .tabbar__link').evaluateAll((els) =>
        els.map((a) => {
          const i = a.querySelector('svg')!.getBoundingClientRect();
          const l = a.querySelector('.tabbar__label')!.getBoundingClientRect();
          return Math.abs(i.top + i.height / 2 - (l.top + l.height / 2));
        }),
      );
      for (const d of side) expect(d).toBeLessThanOrEqual(1);
    }
  });

  test('Feste Bausteine liegen im 4-px-Raster; linke Kanten von Kopfzeile und Inhalt fluchten', async ({
    page,
  }) => {
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/#settings');
      await expect(page.locator('h1')).toBeVisible();
      const m = await page.evaluate(() => {
        const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        const heights = [
          ['appbar', r('.appbar').height],
          ['appbar-btn', r('.appbar__btn').height],
          ...[...document.querySelectorAll('.tabbar__link')].map(
            (e) => ['tab', e.getBoundingClientRect().height] as const,
          ),
        ];
        const screen = document.querySelector('.screen')!;
        const pad = parseFloat(getComputedStyle(screen).paddingInlineStart);
        const appbar = document.querySelector('.appbar')!;
        return {
          heights,
          contentLeft: screen.getBoundingClientRect().left + pad,
          barLeft:
            appbar.getBoundingClientRect().left +
            parseFloat(getComputedStyle(appbar).paddingInlineStart),
          h1Left: r('h1').left,
          pad,
        };
      });
      for (const [name, h] of m.heights)
        expect((h as number) % 4, `${name} ${h} bei ${width}`).toBe(0);
      expect(Math.abs(m.h1Left - m.contentLeft)).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(m.barLeft - m.contentLeft),
        `Kopfzeile fluchtet mit Inhalt bei ${width}`,
      ).toBeLessThanOrEqual(0.5);
      expect(m.pad).toBe(width < 768 ? 16 : width < 1024 ? 20 : 24);
    }
  });

  test('Lesespalte höchstens 640 px, mittig', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#settings');
    const r = await page.locator('.screen').boundingBox();
    expect(r!.width).toBeLessThanOrEqual(640);
    const main = (await page.locator('#main').boundingBox())!;
    expect(Math.abs(r!.x - main.x - (main.width - r!.width) / 2)).toBeLessThanOrEqual(1);
  });
});

test.describe('5: Tab-Leiste', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('eine Zeile bei 320 pt und 200 %; Safe Area unten (simuliert 34 px) wird freigehalten', async ({
    page,
  }) => {
    await set(page, { scale: 200 });
    await page.goto('/#today');
    await page.addStyleTag({ content: ':root{--sab:34px}' });
    const info = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.tabbar__link')].map((a) =>
        a.getBoundingClientRect(),
      );
      const labels = [...document.querySelectorAll('.tabbar__label')].map((l) => ({
        h: l.getBoundingClientRect().height,
        lh: parseFloat(getComputedStyle(l).lineHeight),
        cut: (l as HTMLElement).scrollWidth > (l as HTMLElement).clientWidth + 0.5,
      }));
      const nav = document.querySelector('.tabbar')!;
      return {
        tops: links.map((r) => Math.round(r.top)),
        maxBottom: Math.max(...links.map((r) => r.bottom)),
        labels,
        pad: parseFloat(getComputedStyle(nav).paddingBottom),
        vh: innerHeight,
      };
    });
    expect(new Set(info.tops).size).toBe(1);
    for (const l of info.labels) {
      expect(l.h).toBeLessThan(l.lh * 1.5);
      expect(l.cut).toBe(false); // Beschriftung vollständig sichtbar
    }
    expect(info.pad).toBe(34);
    expect(info.maxBottom).toBeLessThanOrEqual(info.vh - 34 + 0.5);
  });
});

test.describe('8: Texthygiene', () => {
  {
    test('keine technischen Reste im sichtbaren Text', async ({ page }) => {
      await set(page, {});
      for (const r of [
        '/#today',
        '/#subjects',
        '/#progress',
        '/#search',
        '/#settings',
        '/#jobs',
        '/#data',
      ]) {
        await page.goto(r);
        await expect(page.locator('#main')).toBeVisible();
        await page.waitForTimeout(250);
        const text = await page.evaluate(() => document.body.innerText);
        expect(text, r).not.toMatch(/NaN|undefined|\bnull\b|\[object/);
        expect(text, r).not.toMatch(/\b[AFR]\d{2,3}\b/); // rohe Kurz-IDs aus dem Auftragsformat
        expect(text, r).not.toMatch(/\b(Oops|Error)\b/);
        expect(text, r).not.toMatch(/\b(Loading|Cancel|Settings|Back|Close|Today)\b/);
      }
    });
  }
});

test.describe('10: Bewegung', () => {
  test('Mit „Bewegung reduzieren" dauert kein Übergang länger als 120 ms; Seitenwechsel ohne Layout-Sprung', async ({
    page,
  }) => {
    await page.goto('/#today');
    await expect(page.locator('#main')).toBeVisible();
    const long = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .map((e) => {
          const cs = getComputedStyle(e);
          const ms = (v: string) =>
            Math.max(
              ...v.split(',').map((x) => parseFloat(x) * (x.trim().endsWith('ms') ? 1 : 1000)),
            );
          return {
            e: e.className.toString().slice(0, 40),
            t: ms(cs.transitionDuration),
            a: cs.animationName === 'none' ? 0 : ms(cs.animationDuration),
          };
        })
        .filter((x) => x.t > 120 || x.a > 120),
    );
    expect(long).toEqual([]);
    await page.evaluate(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: false });
    });
    // wie im echten Gebrauch: Tippen auf die Navigation (danach darf sich nichts mehr verschieben)
    for (const name of ['Fächer', 'Suche', 'Heute']) {
      await page.locator('.tabbar').getByRole('link', { name }).click();
      await page.waitForTimeout(700);
    }
    await page.locator('.appbar__btn[href="#settings"]').click();
    await page.waitForTimeout(700);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThanOrEqual(0.001);
  });
});

test.describe('11: Visuelle Regression (Rahmen und Phase-A-Bausteine)', () => {
  for (const theme of ['light', 'dark', 'contrast']) {
    for (const width of [320, 390]) {
      test(`Einstellungen ${theme} ${width}`, async ({ page }) => {
        await set(page, { theme });
        await page.setViewportSize({ width, height: 700 });
        await page.goto('/#settings');
        await expect(page.locator('h1')).toBeVisible();
        await page.waitForTimeout(300);
        await expect(page).toHaveScreenshot(`einstellungen-${theme}-${width}.png`, {
          maxDiffPixelRatio: 0.001,
        });
      });
    }
    test(`Galerie Navigation und Hinweise ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(GALLERY);
      await page.getByRole('button', { name: theme, exact: true }).click();
      await page.waitForTimeout(200);
      for (const id of ['g-nav', 'g-banner', 'g-btn']) {
        await expect(page.locator(`section[aria-labelledby="${id}"]`)).toHaveScreenshot(
          `galerie-${id}-${theme}.png`,
          { maxDiffPixelRatio: 0.001 },
        );
      }
    });
  }
});
