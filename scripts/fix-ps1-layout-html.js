require('dotenv').config({ path: __dirname + '/../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const SITE = 'Shah Alam';
const PRODUCT_NAME = 'MP3-2F-PS1';

const LEVELS = [
  { code: '08' }, { code: '07' }, { code: '06' }, { code: '05' },
  { code: '3A' }, { code: '03' }, { code: '02' }, { code: '01' },
];

// Wall-header stat = real lots per wall summed across ALL levels (was
// wrongly counted as just one row's worth -- RS1 never exposed this bug
// since its walls are single-level).
const WALLS = [
  { name: 'DA,SA', cols: ['DA-08', 'DA-18', 'DA-28', 'SA-38', 'gap'] },
  { name: 'DB,SB', cols: ['gap', 'SB-18', 'SB-28', 'DB-38', 'DB-68', 'DB-78', 'DB-88'] },
  { name: 'DD',    cols: ['DD-08', 'DD-18', 'DD-28', 'DD-38', 'DD-68', 'DD-78', 'DD-88', 'DD-98', 'DD-108', 'DD-118', 'DD-128', 'DD-138', 'DD-168', 'gap'] },
  { name: 'DE,SE', cols: ['DE-08', 'DE-18', 'DE-28', 'DE-38', 'SE-68', 'SE-78', 'gap'] },
  { name: 'DF,SF', cols: ['SF-08', 'SF-18', 'SF-28', 'SF-38', 'DF-68', 'DF-78', 'gap'] },
];

(async () => {
  const { data: availData, error: availErr } = await sb
    .from('product_availability')
    .select('lot_code,available')
    .eq('site', SITE).eq('zone', PRODUCT_NAME);
  if (availErr) { console.error(availErr); process.exit(1); }
  const availByCode = {};
  availData.forEach(r => { availByCode[r.lot_code] = r.available; });

  let html = '<table>\n';
  for (const wall of WALLS) {
    const realCols = wall.cols.filter(c => c !== 'gap');
    const total = realCols.length * LEVELS.length;
    const availCount = LEVELS.reduce((sum, lvl) => sum + realCols.filter(col => {
      const [type, colNum] = col.split('-');
      return availByCode[`${type}-${lvl.code}-${colNum}`] !== false;
    }).length, 0);

    html += `<tr class="nz-wall-header"><td colspan="999" class="nz-wall-cell"><span class="nz-wall-name">${wall.name}</span><span class="nz-wall-stat">${availCount} available · ${total} total</span></td></tr>\n`;
    for (const lvl of LEVELS) {
      html += '<tr><td class=noborder width=100 class="nz-empty"></td>';
      for (const col of wall.cols) {
        if (col === 'gap') {
          html += '<td class=noborder width=100 bgcolor=#DBDBDB class="nz-gap"></td>';
          continue;
        }
        const [type, colNum] = col.split('-');
        const lotCode = `${type}-${lvl.code}-${colNum}`;
        const isAvail = availByCode[lotCode] !== false;
        const cls = isAvail ? 'nz-avail' : 'nz-sold';
        const bgAttr = isAvail ? '' : ' bgcolor=#FF5E00';
        html += `<td nowrap${bgAttr} colspan= 4 width= 400 rowspan= 4  class="${cls}" data-lot="${lotCode}">${lotCode}</td>`;
      }
      html += '<td class=noborder width=100 class="nz-empty"></td></tr>\n';
    }
  }
  html += '</table>';

  const { error: upErr } = await sb.from('zone_layouts').upsert(
    { site_code: SITE, zone: PRODUCT_NAME, layout_html: html, synced_at: new Date().toISOString() },
    { onConflict: 'site_code,zone' }
  );
  if (upErr) { console.error(upErr); process.exit(1); }
  console.log('Fixed and re-uploaded PS1 layout_html.');
})();
