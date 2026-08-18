const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, 'SupaMobily.png');
const RES = path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'res');

// legacy launcher px size, adaptive icon canvas px size (1.5x legacy, standard Android ratio)
const DENSITIES = {
  'mipmap-mdpi':    { legacy: 48,  adaptive: 108 },
  'mipmap-hdpi':    { legacy: 72,  adaptive: 162 },
  'mipmap-xhdpi':   { legacy: 96,  adaptive: 216 },
  'mipmap-xxhdpi':  { legacy: 144, adaptive: 324 },
  'mipmap-xxxhdpi': { legacy: 192, adaptive: 432 },
};

// Foreground: full-bleed, same crop as the legacy icon. The source has no
// transparency (its gradient background is baked in), so padding it onto a
// transparent canvas at 66% left a visible hard-edged rectangle floating in
// the middle of the mask -- tried it, looked broken. Full-bleed matches the
// legacy icon and crops cleanly under every mask shape since there's no
// seam between "logo" and "canvas" to expose.
async function makeForeground(size) {
  return sharp(SRC).resize(size, size).png().toBuffer();
}

async function main() {
  for (const [dir, { legacy, adaptive }] of Object.entries(DENSITIES)) {
    const outDir = path.join(RES, dir);
    fs.mkdirSync(outDir, { recursive: true });

    // Legacy square + round: full image, no padding -- these are never
    // masked by the OS, so the complete design (including the wordmark)
    // shows exactly as designed.
    await sharp(SRC).resize(legacy, legacy).png().toFile(path.join(outDir, 'ic_launcher.png'));
    await sharp(SRC).resize(legacy, legacy).png().toFile(path.join(outDir, 'ic_launcher_round.png'));

    // Adaptive icon foreground (background is a solid @color resource,
    // updated separately below -- not per-density images)
    const fg = await makeForeground(adaptive);
    fs.writeFileSync(path.join(outDir, 'ic_launcher_foreground.png'), fg);

    console.log(`${dir}: legacy=${legacy}px adaptive=${adaptive}px done`);
  }

  // Google Play Store listing icon: 512x512, flat, no transparency, no
  // pre-applied rounding -- Google does its own masking in the listing UI.
  await sharp(SRC).resize(512, 512).flatten({ background: '#1e2f8a' }).png()
    .toFile(path.join(__dirname, 'playstore-icon-512.png'));
  console.log('playstore-icon-512.png done');

  // Adaptive icon background color -- solid fill sitting behind the padded,
  // transparent-margin foreground layer above. Approximates the source
  // image's own gradient midpoint so there's no jarring seam.
  const colorXmlPath = path.join(RES, 'values', 'ic_launcher_background.xml');
  fs.writeFileSync(colorXmlPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#572E9C</color>
</resources>
`);
  console.log('updated ic_launcher_background color');
}

main().catch((e) => { console.error(e); process.exit(1); });
