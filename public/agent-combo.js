(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────
  var _comboRanges = [];   // active combo promo rows for current zone
  var _currentSite = '';
  var _currentZone = '';
  var _comboZones  = {};   // site|zone → true, persists across zone switches

  // ── Helpers ────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmt(n) {
    if (n == null || isNaN(n) || n === '') return '—';
    return 'RM ' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ── Section sequence helpers ───────────────────────────────────
  function nextSection(sec) {
    var chars = sec.split('');
    var i = chars.length - 1;
    while (i >= 0) {
      if (chars[i] < 'Z') { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
      chars[i] = 'A';
      i--;
    }
    return chars.join('');
  }

  function expandSectionRange(from, to) {
    var sections = [];
    var cur = from.toUpperCase();
    var end = to.toUpperCase();
    var safety = 0;
    while (cur <= end && safety++ < 300) {
      sections.push(cur);
      cur = nextSection(cur);
    }
    return sections;
  }

  // Parse a lot_range string and test if a lot code matches
  // Supports: "DAB(218&228)", "DA(88~208)", "RA~RD", "RA~RD(8~228)"
  function lotMatchesRange(lotCode, rangeStr) {
    if (!rangeStr || !lotCode) return false;
    var upper = rangeStr.toUpperCase().trim();
    var parenIdx = upper.indexOf('(');
    var secPart  = parenIdx >= 0 ? upper.slice(0, parenIdx).trim() : upper;
    var lotPart  = parenIdx >= 0 ? upper.slice(parenIdx + 1).replace(')', '').trim() : null;

    var parts    = lotCode.split('-');
    var cellSec  = (parts[0] || '').toUpperCase();
    var cellNum  = parts[1] ? parseInt(parts[1], 10) : (parseInt(cellSec.replace(/^[A-Z]+/i, ''), 10) || null);

    // Section match — supports range (RA~RD) or exact
    var secOk = false;
    if (secPart.indexOf('~') >= 0) {
      var rng = secPart.split('~');
      var secs = expandSectionRange(rng[0], rng[1]);
      var cellSecAlpha = cellSec.replace(/[0-9]/g, '');
      secOk = secs.indexOf(cellSecAlpha || cellSec) >= 0 || secs.indexOf(cellSec) >= 0;
    } else {
      secOk = cellSec === secPart || cellSec.replace(/[0-9]/g, '') === secPart;
    }
    if (!secOk) return false;
    if (!lotPart || cellNum == null) return true;

    // Lot number match
    if (lotPart.indexOf('&') >= 0) {
      return lotPart.split('&').some(function (s) { return parseInt(s.trim(), 10) === cellNum; });
    }
    if (lotPart.indexOf('~') >= 0) {
      var rp = lotPart.split('~');
      return cellNum >= parseInt(rp[0].trim(), 10) && cellNum <= parseInt(rp[1].trim(), 10);
    }
    return parseInt(lotPart, 10) === cellNum;
  }

  function findComboRow(lotCode) {
    for (var i = 0; i < _comboRanges.length; i++) {
      var r = _comboRanges[i];
      if (!r.lot_range || lotMatchesRange(lotCode, r.lot_range)) return r;
    }
    return null;
  }

  function isComboLot(lotCode) {
    return !!findComboRow(lotCode);
  }

  function isComboSection(prefix) {
    if (!_comboRanges.length || !prefix) return false;
    var p = prefix.toUpperCase();
    for (var i = 0; i < _comboRanges.length; i++) {
      var rangeStr = (_comboRanges[i].lot_range || '').toUpperCase();
      // Extract section part before "(" e.g. "DAB(238~278)" → "DAB", "DA~DD (8~228)" → "DA~DD"
      var sec = rangeStr.indexOf('(') >= 0 ? rangeStr.slice(0, rangeStr.indexOf('(')).trim() : rangeStr.trim();
      if (sec === p) return true;
      if (sec.indexOf('~') >= 0) {
        // Range like "DA~DD" — check if either end starts with the lot-type prefix
        var parts = sec.split('~');
        if (parts[0].indexOf(p) === 0 || parts[1].indexOf(p) === 0) return true;
      } else if (sec.indexOf(p) === 0) {
        // Single section like "DAB" — check if it starts with the prefix
        return true;
      }
    }
    return false;
  }

  // ── Hook 3: load combo ranges for a zone ───────────────────────
  function loadRanges(site, zone) {
    _currentSite = site;
    _currentZone = zone;
    _comboRanges = [];
    fetch('/api/agent/combo-ranges?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(zone))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (site !== _currentSite || zone !== _currentZone) return; // stale
        _comboRanges = d.ranges || [];
        if (_comboRanges.length) {
          _comboZones[site + '|' + zone] = true;
          // Re-render zone dropdown so the Combo Lot badge appears
          if (typeof window._agentRenderZoneDropdown === 'function') window._agentRenderZoneDropdown();
        }
        // Re-colour cells now that combo ranges are known
        if (typeof window._agentColorCells === 'function') window._agentColorCells();
        // Badge row headers for rows that contain combo lots
        addComboRowBadges();
        // Add Combo label to section picker options
        updateSectionPicker();
        // Re-render drawer so step 4 combo badges appear immediately
        if (typeof window._agentRenderDrawer === 'function') window._agentRenderDrawer();
      })
      .catch(function () {});
  }

  function addComboRowBadges() {
    var card = document.getElementById('layout-card');
    if (!card) return;
    // Remove any stale badges from a previous zone load
    card.querySelectorAll('.combo-row-badge').forEach(function (b) { b.parentNode.removeChild(b); });
    if (!_comboRanges.length) return;
    // Find every row header cell (first td/th in a tr that has no data-lot attribute)
    card.querySelectorAll('tr').forEach(function (tr) {
      // Check if this row contains at least one combo lot cell
      var hasCombo = false;
      tr.querySelectorAll('[data-lot]').forEach(function (td) {
        if (!hasCombo && isComboLot(td.dataset.lot)) hasCombo = true;
      });
      if (!hasCombo) return;
      // Find the row header cell (first cell without data-lot)
      var hdrCell = tr.querySelector('td:not([data-lot]), th:not([data-lot])');
      if (!hdrCell) return;
      var badge = document.createElement('span');
      badge.className = 'combo-row-badge';
      badge.textContent = 'Combo Lot';
      hdrCell.appendChild(badge);
    });
  }

  // ── Hook 1: colour a single cell ──────────────────────────────
  function colorCell(td, lot, isAvail) {
    var base = isAvail ? 'nz-avail' : 'nz-sold';
    if (_comboRanges.length && isComboLot(lot)) {
      td.className = base + ' nz-combo';
    } else {
      td.className = base;
    }
  }

  // ── Hook 2a: detect if any selected lot is a combo lot ─────────
  function hasComboLot(lotQuotes) {
    if (!_comboRanges.length) return false;
    return lotQuotes.some(function (q) { return isComboLot(q.lotCode); });
  }

  // ── Hook 2b: build combo quotation matrix (Land | Tomb | Total) ─
  function buildMatrixHtml(calcs, dpPct) {
    var info = calcs[0].q.siteInfo || {};

    // ── Outer wrapper + header (mirrors regular quotation) ────────
    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += (window._agentRenderZoneSection ? window._agentRenderZoneSection(info) : ('<div class="h-product">' + esc(info.product) + '</div>'));
    h += '<div class="h-category">' + esc((info.lot_type ? info.lot_type + ' ' : '') + ((info.product_category || '').toLowerCase().indexOf('burial') >= 0 ? 'Plot' : (info.product_category || ''))) + '</div>';
    h += '<div class="h-promo-badge">Combo Lot Promo</div>';
    h += '</div>';

    // ── One 3-column table per selected combo lot ─────────────────
    calcs.forEach(function (x) {
      var q          = x.q;
      var lvl        = q.levelData;
      var comboRow   = findComboRow(q.lotCode) || {};
      var comboTotal        = Number(comboRow.combo_total_price) || 0;
      var tombPrice         = Number(comboRow.combo_product_price) || 0;
      var tombOriginalPrice = Number(comboRow.combo_product_original_price) || tombPrice;
      var tombName          = comboRow.combo_product_name || 'Standard Tomb';
      var trust             = Number(lvl.trust_account_facility) || 0;
      var backwall          = Number(lvl.backwall_cost) || 0;
      var excavation        = Number(comboRow.combo_excavation_price) || 0;

      // Land component = combo total minus tomb, trust, backwall, excavation
      var landOriginal = Number(lvl.pre_need_price || lvl.as_need_price) || 0;
      var landNet      = comboTotal - trust - backwall - tombPrice - excavation;

      // Discounts
      var landRebate    = landOriginal - landNet;
      var tombDiscount  = tombOriginalPrice - tombPrice;
      var totalOriginal = landOriginal + trust + backwall + tombOriginalPrice + excavation;
      var totalDiscount = landRebate + tombDiscount;

      // DR Plus
      var drEligible = !!comboRow.dr_plus_eligible;
      var drUnits    = drEligible
        ? (comboRow.dr_plus_type === 'fixed'
            ? Number(comboRow.dr_plus_fixed_units) || 0
            : Math.round(landNet / 10000))
        : 0;

      // Payment — pick months from instalment_tiers based on balance
      var landTotal  = (window._agentAsNeedMode ? landOriginal : landNet) + trust + backwall + excavation;
      var tombTotal  = window._agentAsNeedMode ? tombOriginalPrice : tombPrice;
      var dpAmt      = Math.round(comboTotal * dpPct / 100);
      var landDpAmt  = Math.round(landTotal  * dpPct / 100);
      var tombDpAmt  = Math.round(tombTotal  * dpPct / 100);
      var balance    = comboTotal - dpAmt;
      var landBal    = landTotal  - landDpAmt;
      var tombBal    = tombTotal  - tombDpAmt;
      var months  = 0;
      var tiers   = comboRow.instalment_tiers || [];
      if (tiers.length) {
        // find the tier whose price range contains the balance
        for (var ti = 0; ti < tiers.length; ti++) {
          var t = tiers[ti];
          var aboveMin = t.min_price == null || balance >= t.min_price;
          var belowMax = t.max_price == null || balance <= t.max_price;
          if (aboveMin && belowMax) { months = t.months; break; }
        }
      }
      if (!months) months = Number(comboRow.max_instalment_months || 0);
      var monthly  = months > 0 ? Math.ceil(balance / months) : 0;
      var lastInst = months > 0 ? balance - monthly * (months - 1) : 0;

      // Column header label for the land lot
      var isBurial = lvl.lot_no != null && lvl.level == null;
      var rowLabel = q.displayRange || q.section;
      var lotSub = q.displayRange ? '' : '<div style="font-size:9px;opacity:0.7">' + (isBurial ? 'Lot ' : '') + esc(q.lotCode) + '</div>';
      var landLabel = isBurial
        ? lotSub
        : 'Wall ' + esc(rowLabel) + lotSub;

      function row3(cls, en, zh, landVal, tombVal, totalVal) {
        return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
          + '<td>' + en + '</td><td>' + zh + '</td>'
          + '<td class="tv">' + landVal + '</td>'
          + '<td class="tv">' + tombVal + '</td>'
          + '<td class="tv">' + totalVal + '</td>'
          + '</tr>';
      }
      function fmtNeg(n) {
        if (!n || n <= 0) return '—';
        return '<span style="color:#dc2626">(' + fmt(n) + ')</span>';
      }
      function sep3()  { return '<tr class="tsep"><td colspan="5"></td></tr>'; }
      function rule3() { return '<tr class="tnet-rule"><td colspan="5"></td></tr>'; }

      h += '<div class="qt-scroll"><table class="qt"><thead>';
      h += '</thead><tbody>';

      // ── Product Details ───────────────────────────────────────────
      var _pdTnr = (info.tenure) || null;
      var _pdDir = (info.direction) || null;
      var _bcmR  = info.bury_capacity_map || {}; var _pdBcM = {}; Object.keys(_bcmR).forEach(function(k){ _pdBcM[k.toLowerCase()] = _bcmR[k]; });
      var _pdCatL = (info.product_category || '').toLowerCase();
      var _pdIsLand = _pdCatL.indexOf('burial') >= 0 || _pdCatL === 'urn burial' || _pdCatL === 'land';
      var _pdHasDir = _pdIsLand && _pdDir && _pdDir !== 'N/A' && _pdDir !== 'sold out';
      var _pdHasSize = !!(lvl && lvl.size_description);
      var _bcKeysC = Object.keys(_pdBcM); var _bcFallbackC = _bcKeysC.length === 1 ? _bcKeysC[0] : '';
      var _pdLt = ((lvl && lvl.lot_type) || info.lot_type || _bcFallbackC).toLowerCase();
      var _pdHasCap = !!_pdBcM[_pdLt];
      var _dirZh = { 'North': '北', 'South': '南', 'East': '东', 'West': '西', 'North East': '东北', 'Northeast': '东北', 'North West': '西北', 'Northwest': '西北', 'South East': '东南', 'Southeast': '东南', 'South West': '西南', 'Southwest': '西南' };
      var _tnrZh = { 'Freehold': '永久地契', 'Leasehold': '有期地契' };
      function rowPd(en, zh, val) {
        return '<tr class="tinfo"><td>' + en + '</td><td>' + zh + '</td><td class="tv" colspan="3">' + val + '</td></tr>';
      }
      if (_pdTnr || _pdHasDir || _pdHasSize || _pdHasCap) {
        h += '<tr class="tsection-hdr"><td colspan="5">Product Details 产品资料</td></tr>';
        if (_pdTnr) { var _zh = _tnrZh[_pdTnr] || ''; h += '<tr class="tinfo no-print"><td>Tenure</td><td>地契性质</td><td class="tv" colspan="3">' + esc(_pdTnr + (_zh ? ' ' + _zh : '')) + '</td></tr>'; }
        if (_pdHasDir) { var _zh2 = _dirZh[_pdDir] || ''; h += rowPd('Direction', '朝向', esc(_pdDir + (_zh2 ? ' ' + _zh2 : ''))); }
        if (_pdHasSize) h += rowPd('Size', '面积', esc(lvl.size_description));
        if (_pdHasCap) { var _cap = _pdBcM[_pdLt]; h += rowPd('Capacity', '可安葬人数', _cap + ' 位' + (_pdLt === 'super double' ? ' (2 land + 2 niche)' : '')); }
      }
      h += '<tr class="tsection-hdr"><td colspan="2">Description 描述</td><td style="text-align:center">Land 土地<br><div style="font-size:9px;font-weight:400">' + landLabel + '</div></td><td style="text-align:center">Tomb 墓碑<br><div style="font-size:9px;font-weight:400;opacity:0.8">' + esc(tombName) + '</div></td><td style="text-align:center">Total 总计</td></tr>';
      // ─────────────────────────────────────────────────────────────

      var anm = !!window._agentAsNeedMode;
      var asNeedTotal = landOriginal + tombOriginalPrice + trust + backwall + excavation;
      h += row3('', 'Original Price', '原价',
        fmt(landOriginal), fmt(tombOriginalPrice), fmt(totalOriginal));
      if (!anm) h += row3('tred', 'Combo Lot Discount', '配套折扣',
        fmtNeg(landRebate), fmtNeg(tombDiscount), fmtNeg(totalDiscount));
      if (!anm) h += row3('tbold tpnp', 'Pre Need Price', '价格',
        fmt(landNet), fmt(tombPrice), fmt(landNet + tombPrice));
      h += row3('', 'Trust Account 3 &amp; Facility Cost', '储托账戸3及设施款项',
        fmt(trust), '—', fmt(trust));
      if (backwall > 0) {
        h += row3('', 'Backwall Cost', '后壁费用', fmt(backwall), '—', fmt(backwall));
      }
      if (excavation > 0) {
        h += row3('', 'Hole Excavation', '挖穴费', fmt(excavation), '—', fmt(excavation));
      }
      h += row3('tbold', 'Total Price', '总价',
        anm ? fmt(landOriginal + trust + backwall + excavation) : fmt(landNet + trust + backwall + excavation),
        anm ? fmt(tombOriginalPrice) : fmt(tombPrice),
        anm ? fmt(asNeedTotal) : fmt(comboTotal));
      if (!anm) {
        var fullPmt = dpPct === 100;
        if (!fullPmt) {
          var landMonthly  = months > 0 ? Math.ceil(landBal / months) : 0;
          var tombMonthly  = months > 0 ? Math.ceil(tombBal / months) : 0;
          var landLastInst = months > 0 ? landBal - landMonthly * (months - 1) : 0;
          var tombLastInst = months > 0 ? tombBal - tombMonthly * (months - 1) : 0;
          h += sep3();
          h += row3('', '<strong>' + dpPct + '%</strong> Down Payment', '头期',
            fmt(landDpAmt), fmt(tombDpAmt), fmt(dpAmt));
          h += row3('', 'Balance', '余额', fmt(landBal), fmt(tombBal), fmt(balance));
          if (months > 0) {
            h += row3('tbold tinst', 'Instalment Amount', '供期余额', fmt(landBal), fmt(tombBal), fmt(balance));
            h += row3('ttenure', 'Instalment Tenure', '分期付款期限', String(months), String(months), String(months));
            h += row3('', '1st – ' + (months - 1) + 'th', '', fmt(landMonthly), fmt(tombMonthly), fmt(monthly));
            h += row3('', months + 'th', '', fmt(landLastInst), fmt(tombLastInst), fmt(lastInst));
          }
        }
      }
      h += rule3();
      h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
        + '<td class="tv">' + fmt(landTotal) + '</td>'
        + '<td class="tv">' + fmt(tombTotal) + '</td>'
        + '<td class="tv">' + fmt(anm ? asNeedTotal : comboTotal) + '</td>'
        + '</tr>' + rule3();
      if (drEligible && drUnits > 0) {
        h += '<tr class="tdrplus"><td>Entitled Unit DRPlus</td><td>DRPlus 有权单位</td>'
          + '<td class="tv">—</td><td class="tv">—</td><td class="tv">' + drUnits + '</td>'
          + '</tr>';
      }

      h += '</tbody></table></div>';
    });

    // ── Footer ────────────────────────────────────────────────────
    var firstCombo = findComboRow(calcs[0].q.lotCode) || {};
    h += '<div class="qt-footer">';
    if (firstCombo.promo_end_date) {
      h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(firstCombo.promo_end_date) + '</p>';
    }
    if (firstCombo.remarks) {
      h += '<p style="font-style:italic;color:#6b7280">* ' + esc(firstCombo.remarks) + '</p>';
    }
    h += '<p>1. Only NEW Pre-Need sale confirmed during the promotion period is eligible to this promotion.</p>';
    h += '<p>2. Purchasers are required to submit the balance payment documents support upon sales confirmation.</p>';
    h += '<p>3. No Booking and Reservation allowed for products with 35% discount and above.</p>';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';

    return h;
  }

  // ── Hook 4: append combo promo section to promo view ──────────
  function appendPromoSection(pv) {
    if (!_comboRanges.length) return;

    // Group rows by combo_total_price + lot number (merge sections with same price & lot number)
    var groups = [];
    _comboRanges.forEach(function (r) {
      // Parse "FC(108)" → section="FC", lotNum="108"
      var match = (r.lot_range || '').match(/^([A-Z]+)\((.+)\)$/);
      var section = match ? match[1] : (r.lot_range || '');
      var lotNum  = match ? match[2] : '';
      var key = (Number(r.combo_total_price) || 0) + '|' + lotNum + '|' + (r.lot_type || '');

      var existing = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].key === key) { existing = groups[i]; break; }
      }
      if (existing) {
        existing.sections.push(section);
      } else {
        groups.push({ key: key, sections: [section], lotNum: lotNum, row: r,
          comboTotal: Number(r.combo_total_price) || 0,
          discount: Math.max(0, (Number(r.combo_product_original_price) || Number(r.combo_product_price) || 0) - (Number(r.combo_product_price) || 0))
        });
      }
    });

    groups.forEach(function (g) {
      var secs = g.sections;
      var rangeLabel = secs.length > 1
        ? secs[0] + '~' + secs[secs.length - 1] + (g.lotNum ? ' (' + g.lotNum + ')' : '')
        : (g.row.lot_range || '');

      var card = document.createElement('div');
      card.className = 'promo-card';

      var top = '<div class="promo-card-top">';
      top += '<div class="promo-card-info">';
      top += '<div class="promo-card-section">' + esc(g.row.lot_type || 'Double') + '</div>';
      if (rangeLabel) top += '<div class="promo-card-levels">Row ' + esc(rangeLabel) + '</div>';
      top += '</div>';
      top += '<div class="promo-card-right" style="text-align:right">';
      top += '<div style="font-size:13px;font-weight:700;color:#16a34a">RM ' + g.comboTotal.toLocaleString('en-MY') + '</div>';
      top += '<div style="font-size:10px;color:#94a3b8">combo total</div>';
      top += '</div></div>';

      var bar = '<div class="promo-badge-bar" style="background:#F59E0B">';
      bar += '<span class="promo-badge-name">' + esc(g.row.promo_name || 'Combo Lot Promo') + '</span>';
      if (g.discount > 0) bar += '<span class="promo-badge-disc">Save RM ' + g.discount.toLocaleString('en-MY') + '</span>';
      bar += '</div>';

      card.innerHTML = top + bar;
      card.style.cursor = 'pointer';

      // Derive a representative lot code from the first section + first lot number
      var firstSec = g.sections[0];
      var firstLot = g.lotNum ? g.lotNum.split('~')[0] : '';
      var repLotCode = firstSec + firstLot;

      card.addEventListener('click', function () {
        if (window._agentTriggerComboQuotation) {
          window._agentTriggerComboQuotation(repLotCode, rangeLabel);
        }
      });

      pv.appendChild(card);
    });
  }

  function getFirstComboEndDate(lotQuotes) {
    for (var i = 0; i < lotQuotes.length; i++) {
      var row = findComboRow(lotQuotes[i].lotCode);
      if (row && row.promo_end_date) return row.promo_end_date;
    }
    return null;
  }

  function getFirstComboRow(lotQuotes) {
    for (var i = 0; i < lotQuotes.length; i++) {
      var row = findComboRow(lotQuotes[i].lotCode);
      if (row) return row;
    }
    return null;
  }

  function updateSectionPicker() {
    var sel = document.getElementById('section-sel');
    if (!sel || !_comboRanges.length) return;
    sel.querySelectorAll('option[value]').forEach(function (opt) {
      var sec = opt.value;
      if (!sec) return;
      if (isComboSection(sec) && opt.textContent.indexOf('🎁') < 0) {
        opt.textContent += ' 🎁 Combo';
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────
  window.AgentCombo = {
    loadRanges:            loadRanges,
    colorCell:             colorCell,
    hasComboLot:           hasComboLot,
    buildMatrixHtml:       buildMatrixHtml,
    isComboLot:            isComboLot,
    isComboSection:        isComboSection,
    appendPromoSection:    appendPromoSection,
    getFirstComboEndDate:  getFirstComboEndDate,
    getFirstComboRow:      getFirstComboRow,
    hasComboZone:          function(site, zone) { return !!_comboZones[site + '|' + zone]; },
    updateSectionPicker:   updateSectionPicker,
  };

})();
