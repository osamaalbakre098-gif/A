import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

test.use({ baseURL: 'http://localhost:5173' });

async function open(page: Page, theme: string, lang: string) {
  await page.goto('/dev/heute');
  await page.getByText('Ansicht einstellen').click();
  await page.locator('#settings-title').waitFor();
  const sel = page.locator('.settings select');
  await sel.nth(0).selectOption(lang);
  await sel.nth(1).selectOption(theme);
  await page
    .getByText(/Ansicht einstellen|عرض/)
    .first()
    .click()
    .catch(() => {});
}

/** Dunkelster Pixel in der Umgebung von (x, y): fängt Rundungs- und Kantenglättung ab. */
function darkestNear(png: PNG, x: number, y: number, r = 2): number {
  let min = 255;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const i = (png.width * py + px) << 2;
      const lum = 0.2126 * png.data[i]! + 0.7152 * png.data[i + 1]! + 0.0722 * png.data[i + 2]!;
      min = Math.min(min, lum);
    }
  }
  return min;
}

for (const [theme, lang] of [
  ['contrast', 'de'],
  ['contrast', 'ar'],
] as const) {
  test(`Hoher Kontrast (${lang}): Rahmen an allen vier Ecken jeder Karte geschlossen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await open(page, theme, lang);
    const count = await page.locator('.card').count();
    expect(count).toBeGreaterThan(3);
    for (let n = 0; n < count; n++) {
      const card = page.locator('.card').nth(n);
      await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const m = await card.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          radii: [
            cs.borderTopLeftRadius,
            cs.borderTopRightRadius,
            cs.borderBottomRightRadius,
            cs.borderBottomLeftRadius,
          ].map(parseFloat),
          clip: cs.clipPath,
        };
      });
      expect(m.clip, 'keine Schnittecke').toBe('none');
      expect(new Set(m.radii).size, 'vier gleiche Rundungen').toBe(1);
      const R = m.radii[0]!;
      const png = PNG.sync.read(await page.screenshot());
      const k = (R - 1) * Math.SQRT1_2;
      const L = m.x + 1,
        T = m.y + 1,
        Rt = m.x + m.w - 2,
        B = m.y + m.h - 2;
      const probes: [string, number, number][] = [
        // je Ecke: Kante nahe der Ecke (zwei Seiten) und Mitte des Bogens
        ['oben links: links', L, m.y + R + 6],
        ['oben links: oben', m.x + R + 6, T],
        ['oben links: Bogen', m.x + R - k, m.y + R - k],
        ['oben rechts: rechts', Rt, m.y + R + 6],
        ['oben rechts: oben', m.x + m.w - R - 6, T],
        ['oben rechts: Bogen', m.x + m.w - R + k, m.y + R - k],
        ['unten rechts: rechts', Rt, m.y + m.h - R - 6],
        ['unten rechts: unten', m.x + m.w - R - 6, B],
        ['unten rechts: Bogen', m.x + m.w - R + k, m.y + m.h - R + k],
        ['unten links: links', L, m.y + m.h - R - 6],
        ['unten links: unten', m.x + R + 6, B],
        ['unten links: Bogen', m.x + R - k, m.y + m.h - R + k],
      ];
      for (const [name, px, py] of probes) {
        expect(darkestNear(png, px, py), `Karte ${n + 1}, ${name}`).toBeLessThan(110);
      }
    }
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: keine Schnittecke, vier gleiche Rundungen`, async ({ page }) => {
    await open(page, theme, 'de');
    const bad = await page.evaluate(
      () =>
        [...document.querySelectorAll('.card')].filter((el) => {
          const cs = getComputedStyle(el);
          const r = [
            cs.borderTopLeftRadius,
            cs.borderTopRightRadius,
            cs.borderBottomRightRadius,
            cs.borderBottomLeftRadius,
          ];
          return cs.clipPath !== 'none' || new Set(r).size !== 1;
        }).length,
    );
    expect(bad).toBe(0);
  });
}
