const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, 'SupaMobily.png');
const RES = path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'res');

// Standard Capacitor/Android splash screen resource sizes.
const SIZES = {
  'drawable': { w: 480, h: 320 }, // fallback used when no orientation/density match
  'drawable-land-mdpi':    { w: 480,  h: 320 },
  'drawable-land-hdpi':    { w: 800,  h: 480 },
  'drawable-land-xhdpi':   { w: 1280, h: 720 },
  'drawable-land-xxhdpi':  { w: 1600, h: 960 },
  'drawable-land-xxxhdpi': { w: 1920, h: 1280 },
  'drawable-port-mdpi':    { w: 320,  h: 480 },
  'drawable-port-hdpi':    { w: 480,  h: 800 },
  'drawable-port-xhdpi':   { w: 720,  h: 1280 },
  'drawable-port-xxhdpi':  { w: 960,  h: 1600 },
  'drawable-port-xxxhdpi': { w: 1280, h: 1920 },
};

// Background: solid color, not a gradient. The logo has its own baked-in
// gradient at full opacity, so trying to match a canvas-wide gradient behind
// it would only line up correctly at one exact spot -- same seam problem as
// the earlier adaptive-icon attempt. A solid brand color behind a centered
// logo square is the standard, clean way to do this (same tone as the
// adaptive icon's own background color).
async function makeCanvas(w, h) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#572E9C"/></svg>`);
  return sharp(svg).png().toBuffer();
}

async function main() {
  for (const [dir, { w, h }] of Object.entries(SIZES)) {
    const logoSize = Math.round(Math.min(w, h) * 0.5);
    const logoBuf = await sharp(SRC).resize(logoSize, logoSize).toBuffer();
    const canvas = await makeCanvas(w, h);
    const outPath = path.join(RES, dir, 'splash.png');
    await sharp(canvas).composite([{ input: logoBuf, gravity: 'center' }]).png().toFile(outPath);
    console.log(`${dir}/splash.png (${w}x${h}, logo ${logoSize}px) done`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
