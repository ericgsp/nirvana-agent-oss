(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────
  var _options         = [];   // bundle options for current site+product
  var _currentSite     = '';
  var _currentProduct  = '';
  var _active          = false;
  var _slot1Opt        = null;  // option_name string for first NLP selection
  var _slot1Qty        = 1;     // 1x or 2x (2x = both columns same NLP)
  var _slot2Opt        = null;  // option_name string for second NLP (slot1Qty=1 and maxQty>=2)
  var _nlpDpPct        = 10;    // NLP DP tier — independent of main product DP

  // product categories that never get bundle promo
  var EXCLUDE_CATEGORIES = ['pedestal', 'pet niche', 'ebl'];

  // ── Helpers ────────────────────────────────────────────────────
  function fmt(n) {
    if (n == null || isNaN(n) || n === '') return '—';
    return 'RM ' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fmtNeg(n) {
    if (!n || n <= 0) return '—';
    return '<span style="color:#dc2626">(' + fmt(n) + ')</span>';
  }
  function _isExcluded(category) {
    var cat = (category || '').toLowerCase();
    return EXCLUDE_CATEGORIES.some(function (x) { return cat.indexOf(x) >= 0; });
  }
  function _isChristian() {
    var religion = (_options[0] && _options[0].product_religion) || '';
    return religion.toLowerCase() === 'christian';
  }

  // ── Load bundle options when product loads ─────────────────────
  function loadOptions(site, product) {
    if (site === _currentSite && product === _currentProduct) return;
    _options        = [];
    _active         = false;
    _slot1Opt       = null;
    _slot1Qty       = 1;
    _slot2Opt       = null;
    _nlpDpPct       = 10;
    _currentSite    = site;
    _currentProduct = product;

    fetch('/api/agent/bundle-options?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(product))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (site !== _currentSite || product !== _currentProduct) return; // stale
        _options = d.options || [];
        if (_options.length) {
          if (typeof window._agentColorCells === 'function') window._agentColorCells();
          if (typeof window._agentRenderQuoteSection === 'function') window._agentRenderQuoteSection();
        }
      })
      .catch(function () {});
  }

  // ── Check if any selected lot has bundle options ───────────────
  function hasBundleLot(lotQuotes) {
    if (!_options.length || !lotQuotes.length) return false;
    var category = (lotQuotes[0].siteInfo && lotQuotes[0].siteInfo.product_category) || '';
    if (_isExcluded(category)) return false;
    return _uniqueOpts(lotQuotes).length > 0;
  }

  function isBundleActive() {
    return _active && !!_slot1Opt;
  }

  // ── Resolve the best-matching row for an option name + dpPct ──
  // Picks the row with the highest min_down_payment_pct that is <= dpPct.
  // Falls back to the lowest available row if dpPct is below all tiers.
  function _resolveRow(optName, dpPct) {
    var candidates = _options.filter(function (o) { return o.option_name === optName; });
    if (!candidates.length) return null;
    var eligible = candidates.filter(function (o) { return (o.min_down_payment_pct || 0) <= dpPct; });
    if (eligible.length) {
      return eligible.reduce(function (best, o) {
        return (o.min_down_payment_pct || 0) > (best.min_down_payment_pct || 0) ? o : best;
      });
    }
    return candidates[0]; // fallback: lowest tier
  }

  // First row for a given option name (used for metadata: badge, dates)
  function _firstRow(optName) {
    return _options.find(function (o) { return o.option_name === optName; }) || null;
  }

  // ── Filtered + deduped options for the selector ────────────────
  function _uniqueOpts(lotQuotes) {
    var lotType  = (lotQuotes && lotQuotes[0] && lotQuotes[0].levelData && lotQuotes[0].levelData.lot_type) || '';
    var christian = _isChristian();

    var seen = {};
    return _options.filter(function (o) {
      // lot_type filter
      if (o.lot_type && lotType && o.lot_type.toLowerCase() !== lotType.toLowerCase()) return false;
      // is_christian filter (only for enlightenment; new_launch rows have is_christian=null/false for all)
      if (o.bundle_type === 'enlightenment') {
        if (christian && !o.is_christian) return false;
        if (!christian && o.is_christian)  return false;
      }
      // deduplicate by option_name
      if (seen[o.option_name]) return false;
      seen[o.option_name] = true;
      return true;
    });
  }

  // Max NLP qty allowed for this lot
  function _maxQty(lotQuotes) {
    var opts = _uniqueOpts(lotQuotes);
    if (!opts.length) return 1;
    // For enlightenment bundle: explicit single=1, everything else (double/family/niche/unknown)=2
    if (opts[0].bundle_type === 'enlightenment') {
      var lotType = ((lotQuotes[0] && lotQuotes[0].levelData && lotQuotes[0].levelData.lot_type) || '').toLowerCase();
      return lotType === 'single' ? 1 : 2;
    }
    return Math.max.apply(null, opts.map(function (o) { return o.max_quantity || 1; }));
  }

  // ── Colour layout cells (light blue for bundle-eligible lots) ──
  function colorCell(td, lot, isAvail) {
    if (!_options.length) return;
    if (td.className.indexOf('nz-combo') >= 0) return;
    if (isAvail) td.className = 'nz-avail nz-bundle';
  }

  // ── Build NLP calc values from resolved row ────────────────────
  function _calcNlp(optName, dpPct) {
    var opt = _resolveRow(optName, dpPct);
    if (!opt) return null;
    var nlpAsNeedPrice  = Number(opt.nlp_as_need_price  ?? opt.option_pre_need_price) || 0;
    var nlpPreNeedPrice = Number(opt.nlp_pre_need_price ?? opt.option_pre_need_price) || 0;
    var nlpPreNeedRebate = Math.max(0, nlpAsNeedPrice - nlpPreNeedPrice);
    var nlpSpecDisc  = Number(opt.option_special_discount)    || 0;
    var nlpAddDisc   = Number(opt.option_additional_discount) || 0;
    var nlpNetPrice  = nlpPreNeedPrice - nlpSpecDisc - nlpAddDisc;
    var nlpTrust     = Number(opt.nlp_trust_account    ?? opt.option_trust_account)    || 0;
    var nlpMonths    = Number(opt.nlp_max_instalment_months ?? opt.max_instalment_months) || 0;
    var nlpBase      = nlpPreNeedPrice + nlpTrust;   // DP calculated on pre-need price (before discounts)
    var nlpDpAmt     = Math.round(nlpBase * dpPct / 100);
    var nlpBalance   = nlpBase - nlpDpAmt;
    var nlpInstAmt   = nlpBalance - nlpSpecDisc - nlpAddDisc;  // discounts off balance, like niche
    var nlpMonthly   = nlpMonths > 0 ? Math.ceil(nlpInstAmt / nlpMonths) : 0;
    var nlpLast      = nlpMonths > 1 ? nlpInstAmt - nlpMonthly * (nlpMonths - 1) : nlpInstAmt;
    var nlpNetTotal  = nlpNetPrice + nlpTrust;       // net total price for bottom row
    return { nlpAsNeedPrice: nlpAsNeedPrice, nlpPreNeedPrice: nlpPreNeedPrice,
             nlpPreNeedRebate: nlpPreNeedRebate,
             nlpSpecDisc: nlpSpecDisc, nlpAddDisc: nlpAddDisc,
             nlpNetPrice: nlpNetPrice, nlpTrust: nlpTrust, nlpMonths: nlpMonths,
             nlpBase: nlpBase, nlpDpAmt: nlpDpAmt, nlpBalance: nlpBalance,
             nlpInstAmt: nlpInstAmt, nlpNetTotal: nlpNetTotal,
             nlpMonthly: nlpMonthly, nlpLast: nlpLast };
  }

  // ── Build matrix HTML ──────────────────────────────────────────
  function buildMatrixHtml(calcs, dpPct) {
    if (!_slot1Opt || !calcs.length) return '';
    var info    = calcs[0].q.siteInfo || {};
    var dp      = dpPct || 10;

    // Meta from first row of each selected option
    var row1    = _firstRow(_slot1Opt);
    var _bundleType = (row1 && row1.bundle_type) || '';
    var _badgeLabel = _bundleType === 'enlightenment'
      ? 'Enlightenment Ceremony 2026 Bundle Offer'
      : _bundleType === 'new_launch'
        ? 'New Launch Bundle Offer'
        : 'Bundle Offer';

    // Determine column 2 option name
    var col2Name  = _slot1Qty === 2 ? _slot1Opt : (_slot2Opt || null);
    var showCol2  = !!col2Name;

    var nl1 = _calcNlp(_slot1Opt, _nlpDpPct);
    var nl2 = col2Name ? _calcNlp(col2Name, _nlpDpPct) : null;
    if (!nl1) return '';

    // Column helpers
    var colspan = showCol2 ? 6 : 5;
    function row(cls, en, zh, nicheVal, col1Val, col2Val, totalVal) {
      var r = '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
        + '<td>' + en + '</td><td>' + zh + '</td>'
        + '<td class="tv">' + nicheVal + '</td>'
        + '<td class="tv">' + col1Val  + '</td>';
      if (showCol2) r += '<td class="tv">' + col2Val + '</td>';
      r += '<td class="tv">' + totalVal + '</td></tr>';
      return r;
    }
    function sep()  { return '<tr class="tsep"><td colspan="' + colspan + '"></td></tr>'; }
    function rule() { return '<tr class="tnet-rule"><td colspan="' + colspan + '"></td></tr>'; }

    // Header
    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += (window._agentRenderZoneSection ? window._agentRenderZoneSection(info) : ('<div class="h-product">' + esc(info.product) + '</div>'));
    h += '<div class="h-promo-badge" style="background:#0284c7">' + esc(_badgeLabel) + '</div>';
    h += '</div>';

    calcs.forEach(function (x) {
      var c   = x.c;
      var q   = x.q;

      var nicheOrigPrice  = c.originalPrice  || 0;
      var nicheRebate     = c.preNeedRebate  || 0;
      var nichePreNeed    = c.preNeedPrice   || 0;
      var nicheSpecRebate = c.specialRebate  || 0;
      var nicheTrust      = c.trust          || 0;
      var nicheBackwall   = c.backwall       || 0;
      var nicheTotalPrice = c.totalPrice     || 0;
      var nicheTenure     = c.tenure         || 0;
      var nicheMonthly    = c.monthly        || 0;
      var nicheLast       = c.lastInstalment || 0;
      var nicheInstAmt    = c.instalmentAmount || 0;
      var nicheNet        = c.netTotalPrice  || 0;

      // Build first-column label: level + lot code for niche, lot code for burial
      var _lvlData = q.levelData || {};
      var _isBurialB = _lvlData.lot_no != null && _lvlData.level == null;
      var _firstColLabel;
      if (_isBurialB) {
        _firstColLabel = esc(q.displayRange || q.lotCode);
      } else {
        var _lcPB = q.lotCode.split('-');
        var _lvRawB = (info.site === 'Nckl' && _lcPB.length === 2) ? (_lcPB[0] || '0') : ((_lcPB.length === 4 ? _lcPB[2] : _lcPB[1]) || '0');
        var _lvB = _lvRawB.replace(/^0+/, '') || _lvRawB;
        _firstColLabel = 'Lvl ' + _lvB + ' · ' + esc(q.lotCode);
      }

      // Column header labels
      var col1Label = esc(_slot1Opt);
      var col2Label = col2Name ? esc(col2Name) : '';

      // Combined totals
      var combinedOrigPrice = nicheOrigPrice + nl1.nlpAsNeedPrice + (nl2 ? nl2.nlpAsNeedPrice : 0);
      var combinedBase      = nicheNet + nl1.nlpBase + (nl2 ? nl2.nlpBase : 0);

      h += '<div class="qt-scroll"><table class="qt"><thead>';
      h += '</thead><tbody>';

      // ── Product Details ───────────────────────────────────────────
      var _pdTnrB = (info.tenure) || null;
      var _pdDirB = (info.direction) || null;
      var _bcmRB  = info.bury_capacity_map || {}; var _pdBcMB = {}; Object.keys(_bcmRB).forEach(function(k){ _pdBcMB[k.toLowerCase()] = _bcmRB[k]; });
      var _pdCatLB = (info.product_category || '').toLowerCase();
      var _pdIsLandB = _pdCatLB.indexOf('burial') >= 0 || _pdCatLB === 'urn burial' || _pdCatLB === 'land';
      var _pdHasDirB = _pdIsLandB && _pdDirB && _pdDirB !== 'N/A' && _pdDirB !== 'sold out';
      var _pdLvlB = (q.levelData) || {};
      var _pdHasSizeB = !!_pdLvlB.size_description;
      var _pdLtB = ((_pdLvlB.lot_type) || info.lot_type || '').toLowerCase();
      var _pdHasCapB = !!_pdBcMB[_pdLtB];
      var _dirZhB = { 'North': '北', 'South': '南', 'East': '东', 'West': '西', 'North East': '东北', 'Northeast': '东北', 'North West': '西北', 'Northwest': '西北', 'South East': '东南', 'Southeast': '东南', 'South West': '西南', 'Southwest': '西南' };
      var _tnrZhB = { 'Freehold': '永久地契', 'Leasehold': '有期地契' };
      function rowPdB(en, zh, val) {
        return '<tr class="tinfo"><td>' + en + '</td><td>' + zh + '</td><td class="tv" colspan="' + (colspan - 2) + '">' + val + '</td></tr>';
      }
      if (_pdTnrB || _pdHasDirB || _pdHasSizeB || _pdHasCapB) {
        h += '<tr class="tsection-hdr"><td colspan="' + colspan + '">Product Details 产品资料</td></tr>';
        if (_pdTnrB) { var _zhB = _tnrZhB[_pdTnrB] || ''; h += '<tr class="tinfo no-print"><td>Tenure</td><td>地契性质</td><td class="tv" colspan="' + (showCol2 ? 4 : 3) + '">' + esc(_pdTnrB + (_zhB ? ' ' + _zhB : '')) + '</td></tr>'; }
        if (_pdHasDirB) { var _zhB2 = _dirZhB[_pdDirB] || ''; h += rowPdB('Direction', '朝向', esc(_pdDirB + (_zhB2 ? ' ' + _zhB2 : ''))); }
        if (_pdHasSizeB) h += rowPdB('Size', '面积', esc(_pdLvlB.size_description));
        if (_pdHasCapB) { var _capB = _pdBcMB[_pdLtB]; h += rowPdB('Capacity', '可安葬人数', _capB + ' 位' + (_pdLtB === 'super double' ? ' (2 land + 2 niche)' : '')); }
      }
      h += '<tr class="tsection-hdr"><td colspan="2">Description 描述</td><td style="text-align:center">' + _firstColLabel + '</td><td style="text-align:center">' + col1Label + '</td>' + (showCol2 ? '<td style="text-align:center">' + col2Label + '</td>' : '') + '<td style="text-align:center">Total 总计</td></tr>';
      // ─────────────────────────────────────────────────────────────

      // Original Price (as-need)
      h += row('', 'Original Price', '原价',
        fmt(nicheOrigPrice), fmt(nl1.nlpAsNeedPrice),
        nl2 ? fmt(nl2.nlpAsNeedPrice) : '—', fmt(combinedOrigPrice));

      // NLP Pre-Need Rebate (as-need → pre-need)
      var showNlp1Rebate = nl1.nlpPreNeedRebate > 0;
      var showNlp2Rebate = nl2 && nl2.nlpPreNeedRebate > 0;
      if (nicheRebate > 0 || showNlp1Rebate) {
        h += row('tred', 'Pre Need Rebate', '事前规划回扣',
          nicheRebate > 0 ? fmtNeg(nicheRebate) : '—',
          showNlp1Rebate  ? fmtNeg(nl1.nlpPreNeedRebate) : '—',
          nl2 ? (showNlp2Rebate ? fmtNeg(nl2.nlpPreNeedRebate) : '—') : '—',
          fmtNeg((nicheRebate || 0) + (showNlp1Rebate ? nl1.nlpPreNeedRebate : 0) + (showNlp2Rebate ? nl2.nlpPreNeedRebate : 0)));
        h += row('tbold tpnp', 'Pre Need Price', '价格',
          fmt(nichePreNeed || nicheOrigPrice),
          fmt(nl1.nlpPreNeedPrice),
          nl2 ? fmt(nl2.nlpPreNeedPrice) : '—',
          fmt((nichePreNeed || nicheOrigPrice) + nl1.nlpPreNeedPrice + (nl2 ? nl2.nlpPreNeedPrice : 0)));
      }

      // Trust Account
      if (nicheTrust > 0 || nl1.nlpTrust > 0) {
        h += row('', 'Trust Account 3 &amp; Facility Cost', '储托账戸3及设施款项',
          fmt(nicheTrust),
          nl1.nlpTrust ? fmt(nl1.nlpTrust) : '—',
          nl2 ? (nl2.nlpTrust ? fmt(nl2.nlpTrust) : '—') : '—',
          fmt(nicheTrust + nl1.nlpTrust + (nl2 ? nl2.nlpTrust : 0)));
      }

      // Backwall
      if (nicheBackwall > 0) {
        h += row('', 'Backwall Cost', '后壁费用',
          fmt(nicheBackwall), '—', '—', fmt(nicheBackwall));
      }

      // Total Price = pre-need + trust (before special/additional discounts)
      var col1TotalBefore = nl1.nlpPreNeedPrice + nl1.nlpTrust;
      var col2TotalBefore = nl2 ? nl2.nlpPreNeedPrice + nl2.nlpTrust : 0;
      h += row('tbold', 'Total Price', '总价',
        fmt(nicheTotalPrice),
        fmt(col1TotalBefore),
        nl2 ? fmt(col2TotalBefore) : '—',
        fmt(nicheTotalPrice + col1TotalBefore + col2TotalBefore));

      // Instalment section
      var fullPmt      = dp === 100;
      var hasNicheInst = !fullPmt && nicheTenure > 0;
      var hasNlp1Inst  = !fullPmt && nl1.nlpMonths > 0;
      var hasNlp2Inst  = nl2 && !fullPmt && nl2.nlpMonths > 0;

      h += sep();

      if (!fullPmt) {
        // Down Payment
        var totalDp = (hasNicheInst ? c.downPayment : 0)
          + (hasNlp1Inst ? nl1.nlpDpAmt : 0)
          + (hasNlp2Inst ? nl2.nlpDpAmt : 0);
        var dpLabel = (dp !== _nlpDpPct && (hasNlp1Inst || hasNlp2Inst))
          ? 'Down Payment<br><span style="font-size:9px;font-weight:400;opacity:0.8">Niche/Land ' + dp + '% &nbsp;|&nbsp; NLP ' + _nlpDpPct + '%</span>'
          : '<strong>' + dp + '%</strong> Down Payment';
        h += row('', dpLabel, '头期',
          hasNicheInst ? fmt(c.downPayment) : '—',
          hasNlp1Inst  ? fmt(nl1.nlpDpAmt)  : '—',
          nl2 ? (hasNlp2Inst ? fmt(nl2.nlpDpAmt) : '—') : '—',
          fmt(totalDp));

        // Balance
        var totalBal = (hasNicheInst ? c.balance : 0)
          + (hasNlp1Inst ? nl1.nlpBalance : 0)
          + (hasNlp2Inst ? nl2.nlpBalance : 0);
        h += row('', 'Balance', '余额',
          hasNicheInst ? fmt(c.balance)      : '—',
          hasNlp1Inst  ? fmt(nl1.nlpBalance) : '—',
          nl2 ? (hasNlp2Inst ? fmt(nl2.nlpBalance) : '—') : '—',
          fmt(totalBal));

      }

      // Discounts — always shown (full payment or instalment)
      if (nicheSpecRebate > 0) {
        h += row('tred', 'Special Rebate', '特别回扣',
          fmtNeg(nicheSpecRebate), '—', '—', fmtNeg(nicheSpecRebate));
      }
      // NLP discounts — always shown
      if (nl1.nlpSpecDisc > 0) {
        h += row('tred', 'Special Discount', '特别折扣',
          '—', fmtNeg(nl1.nlpSpecDisc),
          nl2 ? (nl2.nlpSpecDisc > 0 ? fmtNeg(nl2.nlpSpecDisc) : '—') : '—',
          fmtNeg(nl1.nlpSpecDisc + (nl2 ? nl2.nlpSpecDisc : 0)));
      }
      if (nl1.nlpAddDisc > 0) {
        h += row('tred', 'Additional Discount', '额外折扣',
          '—', fmtNeg(nl1.nlpAddDisc),
          nl2 ? (nl2.nlpAddDisc > 0 ? fmtNeg(nl2.nlpAddDisc) : '—') : '—',
          fmtNeg(nl1.nlpAddDisc + (nl2 ? nl2.nlpAddDisc : 0)));
      }

      if (!fullPmt) {
        // Instalment Amount (after discounts deducted from balance)
        var totalInstAmt = (hasNicheInst ? nicheInstAmt : 0)
          + (hasNlp1Inst ? nl1.nlpInstAmt : 0)
          + (hasNlp2Inst ? nl2.nlpInstAmt : 0);
        h += row('tbold tinst', 'Instalment Amount', '供期余额',
          hasNicheInst ? fmt(nicheInstAmt)    : '—',
          hasNlp1Inst  ? fmt(nl1.nlpInstAmt)  : '—',
          nl2 ? (hasNlp2Inst ? fmt(nl2.nlpInstAmt) : '—') : '—',
          fmt(totalInstAmt));

        // Instalment Tenure
        var nT      = hasNicheInst ? nicheTenure    : 0;
        var l1T     = hasNlp1Inst  ? nl1.nlpMonths  : 0;
        var l2T     = hasNlp2Inst  ? nl2.nlpMonths  : 0;
        var longer  = Math.max(nT, l1T, l2T);
        h += row('ttenure', 'Instalment Tenure', '分期付款期限',
          hasNicheInst ? String(nicheTenure)    : '—',
          hasNlp1Inst  ? String(nl1.nlpMonths)  : '—',
          nl2 ? (hasNlp2Inst ? String(nl2.nlpMonths) : '—') : '—',
          String(longer));

        // Monthly breakdown
        var shorter = Math.min(nT || Infinity, l1T || Infinity);
        if (shorter > 1) {
          var commonMonthly = (nT ? nicheMonthly : 0) + (l1T ? nl1.nlpMonthly : 0) + (l2T ? nl2.nlpMonthly : 0);
          h += row('', '1st – ' + (shorter - 1) + 'th', '',
            nT  ? fmt(nicheMonthly)   : '—',
            l1T ? fmt(nl1.nlpMonthly) : '—',
            nl2 ? (l2T ? fmt(nl2.nlpMonthly) : '—') : '—',
            fmt(commonMonthly));
        }
        if (nT === l1T && nT > 0) {
          h += row('', nT + 'th', '',
            fmt(nicheLast), fmt(nl1.nlpLast),
            nl2 ? fmt(nl2.nlpLast) : '—',
            fmt(nicheLast + nl1.nlpLast + (nl2 ? nl2.nlpLast : 0)));
        } else if (shorter > 0 && shorter !== Infinity) {
          var nicheIsLonger = nT >= l1T;
          h += row('', shorter + 'th', '',
            nicheIsLonger ? fmt(nicheMonthly) : fmt(nicheLast),
            nicheIsLonger ? fmt(nl1.nlpLast)  : fmt(nl1.nlpMonthly),
            nl2 ? (l2T ? (nicheIsLonger ? fmt(nl2.nlpLast) : fmt(nl2.nlpMonthly)) : '—') : '—',
            fmt((nicheIsLonger ? nicheMonthly : nicheLast)
              + (nicheIsLonger ? nl1.nlpLast : nl1.nlpMonthly)
              + (nl2 && l2T ? (nicheIsLonger ? nl2.nlpLast : nl2.nlpMonthly) : 0)));
          if (longer > shorter + 1) {
            h += row('', (shorter + 1) + 'th – ' + (longer - 1) + 'th', '',
              nicheIsLonger ? fmt(nicheMonthly) : '—',
              nicheIsLonger ? '—' : fmt(nl1.nlpMonthly),
              nl2 ? (l2T && !nicheIsLonger ? fmt(nl2.nlpMonthly) : '—') : '—',
              fmt((nicheIsLonger ? nicheMonthly : 0)
                + (!nicheIsLonger ? nl1.nlpMonthly : 0)
                + (nl2 && l2T && !nicheIsLonger ? nl2.nlpMonthly : 0)));
          }
          h += row('', longer + 'th', '',
            nicheIsLonger ? fmt(nicheLast) : '—',
            nicheIsLonger ? '—' : fmt(nl1.nlpLast),
            nl2 ? (l2T && !nicheIsLonger ? fmt(nl2.nlpLast) : '—') : '—',
            fmt((nicheIsLonger ? nicheLast : 0)
              + (!nicheIsLonger ? nl1.nlpLast : 0)
              + (nl2 && l2T && !nicheIsLonger ? nl2.nlpLast : 0)));
        }
      } // end !fullPmt instalment section

      h += rule();
      var combinedNet = nicheNet + nl1.nlpNetTotal + (nl2 ? nl2.nlpNetTotal : 0);
      h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
        + '<td class="tv">' + fmt(nicheNet)          + '</td>'
        + '<td class="tv">' + fmt(nl1.nlpNetTotal)   + '</td>';
      if (showCol2) h += '<td class="tv">' + fmt(nl2 ? nl2.nlpNetTotal : 0) + '</td>';
      h += '<td class="tv">' + fmt(combinedNet) + '</td></tr>' + rule();

      h += '</tbody></table></div>';
    });

    // Footer
    h += '<div class="qt-footer">';
    if (row1 && row1.promo_end_date) {
      h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(row1.promo_end_date) + '</p>';
    }
    h += '<p>1. Only NEW Pre-Need sale confirmed during the promotion period is eligible to this promotion.</p>';
    h += '<p>2. NLP (NV Life Plan) is an insurance product offered as a bundle with the niche/burial purchase.</p>';
    h += '<p>3. Bundle promo is subject to final approval and confirmation by management.</p>';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';

    return h;
  }

  // ── After renderQuoteSection: inject the selector UI ──────────
  function afterRender(container, lotQuotes, rerender) {
    if (!hasBundleLot(lotQuotes)) return;

    var opts      = _uniqueOpts(lotQuotes);
    var maxQty    = _maxQty(lotQuotes);
    var allowCol2 = maxQty >= 2;

    var wrap   = document.createElement('div');
    var slot   = document.getElementById('bundle-slot');
    var target = slot || container;

    if (!_active || !_slot1Opt) {
      wrap.className = 'bundle-trigger no-print';
      wrap.innerHTML = '<button class="bundle-add-btn" id="bundle-add-btn">＋ Add Bundle Promo 同步购买</button>';
      target.appendChild(wrap);
      wrap.querySelector('#bundle-add-btn').addEventListener('click', function () {
        _active   = true;
        _slot1Opt = opts[0] ? opts[0].option_name : null;
        _slot1Qty = 1;
        _slot2Opt = null;
        rerender();
      });
      return;
    }

    // Active: show selector bar
    wrap.className = 'bundle-section no-print';
    var html = '<div class="bundle-section-header">'
      + '<span class="bundle-section-title">Bundle: Purchase with Purchase 同步购买</span>'
      + '<button class="bundle-close-btn" id="bundle-close-btn">✕ Remove Bundle</button>'
      + '</div>';

    html += '<div class="bundle-select-row">';

    // Slot 1: NLP dropdown (always a select so agent can see all available options)
    html += '<label class="bundle-select-label">NLP 1:</label>';
    html += '<select class="bundle-select" id="bundle-slot1-select">';
    opts.forEach(function (o) {
      var sel = _slot1Opt === o.option_name ? ' selected' : '';
      var displayPrice = o.nlp_as_need_price || o.option_pre_need_price || o.option_net_price;
      html += '<option value="' + esc(o.option_name) + '"' + sel + '>'
        + esc(o.option_name) + '  —  ' + fmt(displayPrice) + '</option>';
    });
    html += '</select>';

    // Qty pills (only when maxQty >= 2)
    if (allowCol2) {
      html += '<label class="bundle-select-label" style="margin-left:16px">Qty:</label>';
      html += '<div style="display:flex;gap:6px;flex-shrink:0">';
      html += '<div class="dp-pill' + (_slot1Qty === 1 ? ' on' : '') + '" id="bundle-qty-1" style="cursor:pointer">1×</div>';
      html += '<div class="dp-pill' + (_slot1Qty === 2 ? ' on' : '') + '" id="bundle-qty-2" style="cursor:pointer">2×</div>';
      html += '</div>';
    }

    html += '</div>';

    // Slot 2: only shown when slot1Qty=1 and maxQty>=2
    if (allowCol2 && _slot1Qty === 1) {
      html += '<div class="bundle-select-row" style="margin-top:6px">';
      html += '<label class="bundle-select-label">NLP 2:</label>';
      html += '<select class="bundle-select" id="bundle-slot2-select">';
      html += '<option value="">— None —</option>';
      opts.forEach(function (o) {
        var sel = _slot2Opt === o.option_name ? ' selected' : '';
        var displayPrice = o.nlp_as_need_price || o.option_pre_need_price || o.option_net_price;
        html += '<option value="' + esc(o.option_name) + '"' + sel + '>'
          + esc(o.option_name) + '  —  ' + fmt(displayPrice) + '</option>';
      });
      html += '</select>';
      html += '</div>';
    }

    // NLP DP tier selector — independent of main product DP
    // Derive tiers from all _options (opts is deduped per option_name, missing the second DP tier row)
    var nlpDpTiers = [];
    _options.forEach(function (o) { if (o.min_down_payment_pct != null && nlpDpTiers.indexOf(o.min_down_payment_pct) < 0) nlpDpTiers.push(o.min_down_payment_pct); });
    nlpDpTiers.sort(function (a, b) { return a - b; });
    if (nlpDpTiers.length > 1) {
      html += '<div class="bundle-select-row" style="margin-top:6px">';
      html += '<label class="bundle-select-label">NLP DP:</label>';
      html += '<div style="display:flex;gap:6px;flex-shrink:0">';
      nlpDpTiers.forEach(function (p) {
        html += '<div class="dp-pill' + (_nlpDpPct === p ? ' on' : '') + '" data-nlp-dp="' + p + '" style="cursor:pointer">' + p + '%</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    wrap.innerHTML = html;
    target.appendChild(wrap);

    // Event: close
    var closeBtn = wrap.querySelector('#bundle-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      _active = false; _slot1Opt = null; _slot1Qty = 1; _slot2Opt = null; rerender();
    });

    // Event: slot 1 select
    var sel1 = wrap.querySelector('#bundle-slot1-select');
    if (sel1) sel1.addEventListener('change', function () {
      _slot1Opt = sel1.value || null; _slot2Opt = null; rerender();
    });

    // Event: qty pills
    var q1 = wrap.querySelector('#bundle-qty-1');
    var q2 = wrap.querySelector('#bundle-qty-2');
    if (q1) q1.addEventListener('click', function () { _slot1Qty = 1; _slot2Opt = null; rerender(); });
    if (q2) q2.addEventListener('click', function () { _slot1Qty = 2; _slot2Opt = null; rerender(); });

    // Event: slot 2 select
    var sel2 = wrap.querySelector('#bundle-slot2-select');
    if (sel2) sel2.addEventListener('change', function () {
      _slot2Opt = sel2.value || null; rerender();
    });

    // Event: NLP DP tier pills
    wrap.querySelectorAll('[data-nlp-dp]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        _nlpDpPct = parseInt(pill.dataset.nlpDp); rerender();
      });
    });
  }

  // ── Public API ─────────────────────────────────────────────────
  window.AgentBundle = {
    loadOptions:     loadOptions,
    hasBundleLot:    hasBundleLot,
    isBundleActive:  isBundleActive,
    colorCell:       colorCell,
    afterRender:     afterRender,
    buildMatrixHtml: buildMatrixHtml,
  };

})();
