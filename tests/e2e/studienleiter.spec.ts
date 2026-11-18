import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

const TEXT = `# Vektoren\n\nEin Vektor hat Betrag und Richtung. ${'Die Geschwindigkeit ist ein Vektor. '.repeat(8)}\n\n## Addition\n\nVektoren addiert man komponentenweise. ${'Kräfte addiert man ebenso. '.repeat(8)}\n`;

async function idb<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (s) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('madar');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction(s).objectStore(s).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  ) as Promise<T[]>;
}

async function addItems(page: Page, skillId: string, n: number) {
  await page.evaluate(
    ([sid, count]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('madar');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('items', 'readwrite');
          for (let i = 0; i < (count as number); i++)
            tx.objectStore('items').put({
              id: `e2e-${i}`,
              skillId: sid,
              kind: 'karte',
              subtype: 'karte',
              prompt: `Frage ${i + 1}?`,
              answer: 'x',
              sourceRefs: [],
              bloom: 'erinnern',
              difficulty: 0.2 + i / 20,
              status: 'active',
              createdBy: 'ai',
            });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [skillId, n] as const,
  );
}

test('Heute: leer → Material → echter Plan → Sitzung → beendet', async ({ page }) => {
  // Feste Uhrzeit (10 Uhr), damit der Test nicht von der echten Tageszeit abhängt
  await page.clock.setFixedTime(new Date('2026-03-02T10:00:00'));
  await page.goto('/#today');
  await expect(page.getByRole('heading', { name: 'Lade dein erstes Material hoch' })).toBeVisible();

  await page.goto('/#subjects');
  await page.getByRole('button', { name: 'Fach anlegen' }).click();
  await page.getByLabel('Name des Fachs').fill('Physik');
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await page.getByRole('link', { name: /Physik/ }).click();
  await page.getByRole('button', { name: 'Text einfügen' }).click();
  await page.getByLabel(/Text/).last().fill(TEXT);
  await page
    .getByRole('button', { name: /Speichern|Hinzufügen/ })
    .first()
    .click();
  await expect(page.getByText('Addition verstehen').first()).toBeVisible();

  // Ohne Aufgaben: Plan sagt ehrlich „im Material lesen", und weist auf Aufträge hin
  await page.goto('/#today');
  await expect(page.getByRole('link', { name: 'Starten', exact: true })).toBeVisible();
  await expect(page.getByText(/noch keine Aufgaben/)).toBeVisible();
  await page.getByRole('button', { name: 'Warum?' }).click();
  await expect(page.getByText(/Aufgaben/).first()).toBeVisible();

  // Aufgaben dazugeben (so wie sie ein Auftrag liefern würde)
  const skills = await idb<{ id: string; title: string }>(page, 'skills');
  const first = skills.find((s) => s.title.startsWith('Addition'))!;
  await addItems(page, first.id, 3);
  await page.goto('/#session');
  await page.reload();
  await page.goto('/#today');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Starten', exact: true })).toBeVisible();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(r.violations).toEqual([]);

  await page.getByRole('link', { name: 'Starten', exact: true }).click();
  await expect(page).toHaveURL(/#session/);
  // Drei Karten beantworten
  for (let k = 0; k < 3; k++) {
    await expect(page.getByText(/^Frage \d\?$/)).toBeVisible();
    await page.getByLabel('Deine Antwort').fill('x');
    await page.getByRole('button', { name: 'Prüfen' }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /Richtig|Nicht ganz|richtig|falsch/ })
        .first(),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Weiter|Fertig|Abschließen/ })
      .first()
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Abschluss', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Fertig für heute' }).click();
  await expect(page.getByRole('heading', { name: 'Sitzung beendet' })).toBeVisible();

  const attempts = await idb(page, 'attempts');
  expect(attempts.length).toBe(3);
  const cards = await idb<{ fsrs: { reps: number } }>(page, 'cards');
  expect(cards.filter((c) => c.fsrs.reps > 0).length).toBe(3);
  const events = (await idb<{ type: string }>(page, 'events')).map((e) => e.type);
  expect(events).toEqual(
    expect.arrayContaining(['SessionStarted', 'SessionEnded', 'AnswerSubmitted', 'CardReviewed']),
  );
});
