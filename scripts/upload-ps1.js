require('dotenv').config({ path: __dirname + '/../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const SITE = 'Shah Alam';
const PRODUCT_NAME = 'MP3-2F-PS1';
const WEF_DATE = '2026-07-27';

// codeLevel (used in lot_code) -> priceLevel (used in product_price_list.level field, matches RS1 convention of no leading zero)
const LEVELS = [
  { code: '08', price: '8' },
  { code: '07', price: '7' },
  { code: '06', price: '6' },
  { code: '05', price: '5' },
  { code: '3A', price: '3A' },
  { code: '03', price: '3' },
  { code: '02', price: '2' },
  { code: '01', price: '1' },
];

const DOUBLE_SIZE = '56(W) x 36(H) x 40(D) CM';
const SINGLE_SIZE = '38.8(W) x 36(H) x 40(D) CM';

function priceFor(priceLevel, tier) {
  const DD = {
    '8': [88800, 73800], '7': [88800, 73800], '6': [98800, 83800], '5': [118800, 103800],
    '3A': [118800, 103800], '3': [118800, 103800], '2': [98800, 83800], '1': [98800, 83800],
  };
  const DOUBLE = {
    '8': [83800, 68800], '7': [83800, 68800], '6': [93800, 78800], '5': [113800, 98800],
    '3A': [113800, 98800], '3': [113800, 98800], '2': [93800, 78800], '1': [93800, 78800],
  };
  const SINGLE = {
    '8': [48800, 41800], '7': [48800, 41800], '6': [53800, 46800], '5': [63800, 56800],
    '3A': [63800, 56800], '3': [63800, 56800], '2': [53800, 46800], '1': [53800, 46800],
  };
  const table = tier === 'DD' ? DD : tier === 'DOUBLE' ? DOUBLE : SINGLE;
  const [asNeed, preNeed] = table[priceLevel];
  const trust = tier === 'SINGLE' ? 3000 : 5000;
  return { as_need_price: asNeed, pre_need_price: preNeed, trust_account_facility: trust, total_pre_need_price: preNeed + trust };
}

// type code -> { tier, lotType, size }
const TYPES = {
  DA: { tier: 'DOUBLE', lotType: 'Double', size: DOUBLE_SIZE },
  DB: { tier: 'DOUBLE', lotType: 'Double', size: DOUBLE_SIZE },
  DD: { tier: 'DD',     lotType: 'Double', size: DOUBLE_SIZE },
  DE: { tier: 'DOUBLE', lotType: 'Double', size: DOUBLE_SIZE },
  DF: { tier: 'DOUBLE', lotType: 'Double', size: DOUBLE_SIZE },
  SA: { tier: 'SINGLE', lotType: 'Single', size: SINGLE_SIZE },
  SB: { tier: 'SINGLE', lotType: 'Single', size: SINGLE_SIZE },
  SE: { tier: 'SINGLE', lotType: 'Single', size: SINGLE_SIZE },
  SF: { tier: 'SINGLE', lotType: 'Single', size: SINGLE_SIZE },
};

// Each wall/section as printed in the source PDFs -- ordered columns, 'gap' marks the
// blocked "Future Development" cell (no lot, no data-lot, rendered as a grey filler cell).
const WALLS = [
  { name: 'DA,SA', cols: ['DA-08', 'DA-18', 'DA-28', 'SA-38', 'gap'] },
  { name: 'DB,SB', cols: ['gap', 'SB-18', 'SB-28', 'DB-38', 'DB-68', 'DB-78', 'DB-88'] },
  { name: 'DD',    cols: ['DD-08', 'DD-18', 'DD-28', 'DD-38', 'DD-68', 'DD-78', 'DD-88', 'DD-98', 'DD-108', 'DD-118', 'DD-128', 'DD-138', 'DD-168', 'gap'] },
  { name: 'DE,SE', cols: ['DE-08', 'DE-18', 'DE-28', 'DE-38', 'SE-68', 'SE-78', 'gap'] },
  { name: 'DF,SF', cols: ['SF-08', 'SF-18', 'SF-28', 'SF-38', 'DF-68', 'DF-78', 'gap'] },
];

const allTypes = [...new Set(WALLS.flatMap(w => w.cols.filter(c => c !== 'gap').map(c => c.split('-')[0])))];
const combinedSection = allTypes.join(',');

// ── Build product_price_list rows (one per type x level) ───────────────────
const priceRows = [];
for (const type of allTypes) {
  const def = TYPES[type];
  for (const lvl of LEVELS) {
    const p = priceFor(lvl.price, def.tier);
    priceRows.push({
      site_code: SITE,
      product_category: 'Niche',
      product_name: PRODUCT_NAME,
      block: null,
      floor: null,
      section_group: type,
      niche_type: def.lotType,
      level: lvl.price,
      lot_no: null,
      size_description: def.size,
      as_need_price: p.as_need_price,
      pre_need_price: p.pre_need_price,
      trust_account_facility: p.trust_account_facility,
      total_pre_need_price: p.total_pre_need_price,
      wef_date: WEF_DATE,
      religion_use: 'Buddhist/All',
      active: true,
      lot_type: def.lotType,
      bury_capacity: def.lotType === 'Double' ? 2 : 1,
    });
  }
}

// ── Build product_availability rows + layout_html (one per real lot) ───────
const availRows = [];
let html = '<table>\n';
for (const wall of WALLS) {
  const realCols = wall.cols.filter(c => c !== 'gap').length;
  html += `<tr class="nz-wall-header"><td colspan="999" class="nz-wall-cell"><span class="nz-wall-name">${wall.name}</span><span class="nz-wall-stat">${realCols} available · ${realCols} total</span></td></tr>\n`;
  for (const lvl of LEVELS) {
    html += '<tr><td class=noborder width=100 class="nz-empty"></td>';
    for (const col of wall.cols) {
      if (col === 'gap') {
        html += '<td class=noborder width=100 bgcolor=#DBDBDB class="nz-gap"></td>';
        continue;
      }
      const [type, colNum] = col.split('-');
      const lotCode = `${type}-${lvl.code}-${colNum}`;
      html += `<td nowrap colspan= 4 width= 400 rowspan= 4  class="nz-avail" data-lot="${lotCode}">${lotCode}</td>`;
      availRows.push({
        site: SITE,
        product_type: 'NICHE',
        zone: PRODUCT_NAME,
        section: combinedSection,
        lot_code: lotCode,
        available: true,
      });
    }
    html += '<td class=noborder width=100 class="nz-empty"></td></tr>\n';
  }
}
html += '</table>';

(async () => {
  console.log(`Types: ${allTypes.join(', ')}`);
  console.log(`Price rows: ${priceRows.length}`);
  console.log(`Availability rows: ${availRows.length}`);

  const { error: priceErr } = await sb.from('product_price_list').insert(priceRows);
  if (priceErr) { console.error('PRICE INSERT ERROR:', priceErr); process.exit(1); }
  console.log('Inserted product_price_list rows.');

  const { error: availErr } = await sb.from('product_availability').insert(availRows);
  if (availErr) { console.error('AVAILABILITY INSERT ERROR:', availErr); process.exit(1); }
  console.log('Inserted product_availability rows.');

  const { error: layoutErr } = await sb.from('zone_layouts').upsert(
    { site_code: SITE, zone: PRODUCT_NAME, layout_html: html, synced_at: new Date().toISOString() },
    { onConflict: 'site_code,zone' }
  );
  if (layoutErr) { console.error('LAYOUT UPSERT ERROR:', layoutErr); process.exit(1); }
  console.log('Upserted zone_layouts row.');

  console.log('Done.');
})();
