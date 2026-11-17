// Erzeugt die PNG-Icons aus public/icon.svg (einmalig ausführen: node scripts/make-icons.cjs).
const { chromium } = require('playwright');
const { readFileSync, existsSync } = require('node:fs');

const svg = readFileSync('public/icon.svg', 'utf8');
const exe = existsSync('/opt/pw-browsers/chromium')
  ? { executablePath: '/opt/pw-browsers/chromium' }
  : {};
const sizes = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-maskable-512.png': 512,
  'apple-touch-icon.png': 180,
};

(async () => {
  const b = await chromium.launch(exe);
  for (const [name, size] of Object.entries(sizes)) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    // Maskierbar: Inhalt etwas kleiner, Hintergrund bis zum Rand (Safe-Zone 80 %).
    const inner = name.includes('maskable')
      ? svg
          .replace(
            '<circle cx="256" cy="256" r="140"',
            '<g transform="translate(256 256) scale(.8) translate(-256 -256)"><circle cx="256" cy="256" r="140"',
          )
          .replace('</svg>', '</g></svg>')
      : svg;
    await p.setContent(
      `<body style="margin:0">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
    );
    await p.screenshot({ path: `public/icons/${name}`, omitBackground: false });
    await p.close();
  }
  await b.close();
})();
