import { chromium } from "playwright-core";
import * as fs from "fs";
import * as path from "path";

function iconHtml(size: number) {
  return `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{width:${size}px;height:${size}px;overflow:hidden}</style></head><body>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const s = ${size};

ctx.fillStyle = '#075E54';
ctx.fillRect(0,0,s,s);

const grad = ctx.createRadialGradient(s*.3,s*.2,0,s*.5,s*.5,s*.75);
grad.addColorStop(0,'rgba(255,255,255,0.10)');
grad.addColorStop(1,'rgba(0,0,0,0.18)');
ctx.fillStyle = grad;
ctx.fillRect(0,0,s,s);

ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

const fontSizeMain = s * 0.38;
ctx.font = '800 ' + fontSizeMain + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
ctx.shadowColor = 'rgba(0,0,0,0.45)';
ctx.shadowBlur = s * 0.06;
ctx.shadowOffsetX = s * 0.02;
ctx.shadowOffsetY = s * 0.025;
ctx.fillText('SAA', s*0.5, s*0.44);
ctx.shadowColor = 'transparent';

const barW = s*0.42, barH = s*0.045, barX = (s-s*0.42)/2, barY = s*0.65, r = s*0.045/2;
ctx.beginPath();
ctx.moveTo(barX+r,barY);
ctx.lineTo(barX+barW-r,barY);
ctx.quadraticCurveTo(barX+barW,barY,barX+barW,barY+r);
ctx.lineTo(barX+barW,barY+barH-r);
ctx.quadraticCurveTo(barX+barW,barY+barH,barX+barW-r,barY+barH);
ctx.lineTo(barX+r,barY+barH);
ctx.quadraticCurveTo(barX,barY+barH,barX,barY+barH-r);
ctx.lineTo(barX,barY+r);
ctx.quadraticCurveTo(barX,barY,barX+r,barY);
ctx.closePath();
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.fill();

const fontSizeSub = s*0.10;
ctx.font = '600 ' + fontSizeSub + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(255,255,255,0.70)';
ctx.fillText('1228', s*0.5, s*0.82);

document.title = 'done';
</script></body></html>`;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const publicDir = path.join(process.cwd(), "public");

  for (const size of [192, 512]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(iconHtml(size));
    await page.waitForFunction(() => document.title === "done");
    const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
    const outPath = path.join(publicDir, `agent-icon-${size}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log("Done.");
}

main();
