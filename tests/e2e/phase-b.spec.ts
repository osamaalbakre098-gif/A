import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Phase B: alle Innenbildschirme (Heute, Fächer, Fach, Leser, Aufträge, Daten, Einstellungen, Sitzung)
 * mit echten Daten: kein waagerechter Überlauf (320 pt, 100/200 %, de/ar), Tippflächen ≥ 44 px,
 * axe in drei Erscheinungsbildern, Hauptaktion ohne Scrollen erreichbar.
 */
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const TEXT = `# Vektoren\n\nEin Vektor hat Betrag und Richtung. ${'Die Geschwindigkeit ist ein Vektor. '.repeat(8)}\n\n## Addition\n\nVektoren addiert man komponentenweise. ${'Kräfte addiert man ebenso. '.repeat(8)}\n`;

async function prepare(page: Page, o: { lang?: string; theme?: string; scale?: number }) {
  await page.addInitScript((v) => {
    localStorage.setItem(
      'madar.settings.v1',
      JSON.stringify({
        language: v.lang ?? 'de',
        theme: v.theme ?? 'light',
        textScale: v.scale ?? 100,
        reducedMotion: true,
      }),
    );
  }, o);
  await page.clock.setFixedTime(new Date('2026-03-02T10:00:00'));
  await page.goto('/#subjects');
  await page
    .locator('button, a')
    .filter({ hasText: /Fach anlegen|إضافة مادة/ })
    .first()
    .click();
  await page.locator('dialog[open] input').fill('Physik');
  await page.locator('dialog[open] form').evaluate((f) => (f as HTMLFormElement).requestSubmit());
  await page.locator('a.listrow[href^="#subject/"]').first().click();
  await page
    .locator('.listrow')
    .filter({ hasText: /Material hinzufügen|إضافة مواد/ })
    .first()
    .click();
  await page
    .locator('dialog[open] button')
    .filter({ hasText: /Text einfügen|لصق/ })
    .first()
    .click();
  await page.locator('dialog[open] textarea').fill(TEXT);
  await page
    .locator('dialog[open] button')
    .filter({ hasText: /Speichern|حفظ/ })
    .last()
    .click();
  await expect(page.locator('a.listrow[href^="#doc/"]')).toHaveCount(1);
  const href = await page
    .locator('a.listrow[href^="#subject/"], a.listrow[href^="#doc/"]')
    .first()
    .getAttribute('href');
  expect(href).toBeTruthy();
  const hash = await page.evaluate(() => location.hash);
  const docHref = (await page.locator('a.listrow[href^="#doc/"]').first().getAttribute('href'))!;
  await page.evaluate(
    () =>
      new Promise<void>((res, rej) => {
        const o = indexedDB.open('madar');
        o.onerror = () => rej(o.error);
        o.onsuccess = () => {
          const db = o.result;
          const g = db.transaction('skills').objectStore('skills').getAll();
          g.onsuccess = () => {
            const sk = g.result[0];
            if (!sk) return res();
            const tx = db.transaction('items', 'readwrite');
            for (let i = 0; i < 3; i++)
              tx.objectStore('items').put({
                id: 'it' + i,
                skillId: sk.id,
                subtype: 'kurz',
                prompt: `Frage ${i + 1}?`,
                answer: ['x'],
                hints: [],
                distractors: [],
                rubric: {},
                sourceRefs: [],
                bloom: 'erinnern',
                difficulty: 0.2 + i / 20,
                status: 'active',
                createdBy: 'ai',
              });
            tx.oncomplete = () => res();
          };
        };
      }),
  );
  return { subjectHash: hash, docHash: docHref };
}

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function visit(page: Page, hash: string) {
  await page.goto('/' + hash);
  await page.reload();
  await page.waitForTimeout(500);
}

test.describe('Phase B bei 320 pt', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  for (const [lang, scale] of [
    ['de', 100],
    ['de', 200],
    ['ar', 100],
    ['ar', 200],
  ] as const) {
    test(`kein waagerechter Überlauf: ${lang} / ${scale} %`, async ({ page }) => {
      const { subjectHash, docHash } = await prepare(page, { lang, scale });
      for (const h of [
        '#today',
        '#subjects',
        subjectHash,
        docHash,
        '#jobs',
        '#data',
        '#settings',
        '#session',
      ]) {
        await visit(page, h);
        expect(await noOverflow(page), `${h} (${lang}, ${scale} %)`).toBe(true);
      }
    });
  }

  test('Tippflächen: Knöpfe, Zeilen und Eingaben sind mindestens 44 px hoch/breit', async ({
    page,
  }) => {
    const { subjectHash } = await prepare(page, {});
    for (const h of ['#today', '#subjects', subjectHash, '#jobs', '#data', '#settings']) {
      await visit(page, h);
      const small = await page.evaluate(() => {
        const bad: string[] = [];
        const sel =
          'button, a.btn, a.listrow, button.listrow, input[type=radio], input[type=checkbox], select, summary';
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (el.closest('dialog:not([open])')) continue;
          if (r.height < 43.5 || r.width < 43.5)
            bad.push(
              `${el.tagName}.${el.className} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent ?? '').trim().slice(0, 30)}"`,
            );
        }
        return bad;
      });
      expect(small, h).toEqual([]);
    }
  });

  test('Hauptaktion auf „Heute" (Plan) liegt bei 200 % im sichtbaren Bereich', async ({ page }) => {
    await prepare(page, { scale: 200 });
    await visit(page, '#today');
    const btn = page.getByRole('link', { name: 'Starten', exact: true });
    await expect(btn).toBeVisible();
    const box = (await btn.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(568);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });

  for (const theme of ['light', 'dark', 'contrast']) {
    test(`axe auf allen Phase-B-Bildschirmen (${theme})`, async ({ page }) => {
      const { subjectHash, docHash } = await prepare(page, { theme });
      for (const h of [
        '#today',
        '#subjects',
        subjectHash,
        docHash,
        '#jobs',
        '#data',
        '#settings',
        '#session',
      ]) {
        await visit(page, h);
        // hohe Ansicht: nichts liegt unter Navigation oder angehefteter Aktion (sonst meldet axe Überdeckung)
        await page.setViewportSize({ width: 320, height: 1600 });
        await page.waitForTimeout(200);
        const res = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();
        expect(res.violations.map((v) => `${h} ${v.id}: ${v.nodes[0]?.html.slice(0, 90)}`)).toEqual(
          [],
        );
      }
    });
  }

  test('Prüfungsdatum mit drei Feldern: ungültig wird erklärt, gültig wird gespeichert und verschoben', async ({
    page,
  }) => {
    const { subjectHash } = await prepare(page, {});
    await visit(page, subjectHash);
    await page.locator('.listrow').filter({ hasText: 'Prüfung eintragen' }).first().click();
    const sheet = page.locator('dialog[open]');
    await sheet.getByLabel('Tag').fill('31');
    await sheet.getByLabel('Monat').fill('2');
    await sheet.getByLabel('Jahr').fill('2030');
    await expect(sheet.getByRole('alert')).toContainText('gibt es nicht');
    await expect(sheet.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    await sheet.getByLabel('Tag').fill('28');
    await expect(sheet.getByRole('alert')).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Speichern' }).click();
    await expect(
      page
        .locator('.listrow')
        .filter({ hasText: /Prüfung am 28\.2\./ })
        .first(),
    ).toBeVisible();
    // verschieben
    await page
      .locator('.listrow')
      .filter({ hasText: /Prüfung am/ })
      .first()
      .click();
    await sheet
      .getByRole('button', {
        name: /2028|2030|Freitag|Donnerstag|Mittwoch|Dienstag|Montag|Samstag|Sonntag/,
      })
      .first()
      .click();
    await expect(sheet.getByLabel('Tag')).toHaveValue('28');
    await sheet.getByLabel('Tag').fill('1');
    await sheet.getByLabel('Monat').fill('3');
    await sheet.getByRole('button', { name: 'Speichern' }).click();
    await expect(
      page
        .locator('.listrow')
        .filter({ hasText: /Prüfung am 1\.3\./ })
        .first(),
    ).toBeVisible();
  });
});
