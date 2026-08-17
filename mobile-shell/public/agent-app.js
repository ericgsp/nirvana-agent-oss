/* Agent App — vanilla JS, no React, works on all mobile browsers */
(function () {
  'use strict';

  // ── Debug logging (remove after debugging) ────────────────────
  function dbg(msg) { console.log('[AGENT] ' + new Date().toISOString().slice(11,19) + ' ' + msg); }
  window.onerror = function(msg, src, line) { dbg('ERROR: ' + msg + ' L' + line); return false; };
  window.addEventListener('unhandledrejection', function(e) {
    dbg('PROMISE ERR: ' + (e.reason && e.reason.message || e.reason));
  });
  document.addEventListener('click', function(e) { dbg('click on: ' + (e.target && e.target.id)); }, { capture: true });
  dbg('JS loaded v2');

  // Every /api/agent/* call below is prefixed with this. When this script is
  // served from the Vercel domain itself (the main app, remote-loaded),
  // that's a same-origin absolute URL -- functionally identical to a
  // relative fetch. When it's running from the locally-bundled mobile shell
  // (capacitor://localhost), this is what makes the calls actually reach
  // the API instead of 404ing against the local bundle. One file works
  // correctly in both places.
  var API_BASE = 'https://nirvana-agent-oss.vercel.app';
  window.__API_BASE__ = API_BASE;

  // Cross-origin fetches (mobile shell -> Vercel API) drop cookies by default;
  // only calls that explicitly pass credentials:'include' send the session cookie.
  // Patch fetch once here instead of touching every call site individually.
  (function () {
    var _origFetch = window.fetch.bind(window);
    window.fetch = function (url, opts) {
      opts = opts || {};
      if (typeof url === 'string' && url.indexOf(API_BASE) === 0 && !opts.credentials) {
        opts = Object.assign({}, opts, { credentials: 'include' });
      }
      return _origFetch(url, opts);
    };
  })();

  // Read sites from data attribute (works on both hard load and Next.js soft nav).
  // Inline <script> tags are ignored by React on client navigation, data attrs are not.
  // On the main app this is already correct (server-rendered). On the
  // locally-bundled mobile shell the attribute starts empty (no server to
  // render it) -- refreshSitesFromApi() below fills it in asynchronously a
  // moment later, same pattern as every other piece of data in this file.
  var _cfg = document.getElementById('agent-config');
  var SITES = (_cfg && _cfg.dataset.sites) ? JSON.parse(_cfg.dataset.sites) : (window.AGENT_SITES || []);
  var MAX_LOTS = 9;
  var CAT_LABELS = { 'Burial': 'Land', 'Niche': 'Niche', 'Pedestal': 'Pedestal', 'Package Plot': 'Package Plot', 'EBL': 'EBL', 'NLP': 'NLP' };

  // Site dropdown custom state
  var siteDropdownIsOpen = false;
  var openSiteGroup      = null;   // which site group is expanded

  // Zone dropdown custom state
  var openCategory        = null;   // which category header is expanded
  var currentZoneGroupKey = '';     // D2 selection (group key or zone name)
  var zoneDropdownIsOpen  = false;

  // Quick Select stepper — 1 = Site, 2 = Zone
  var qsStep = 1;

  // Derive lot type prefix from a section code — longest known prefix wins
  // e.g. "DL" → "D", "SF3" → "SF", "D1" → "D", "TDA" → "TD"
  var _LOT_PFXS = ['SF','TD','F','S','D','R','A'];
  function deriveLotPrefix(sec) {
    var u = (sec || '').toUpperCase();
    for (var i = 0; i < _LOT_PFXS.length; i++) { if (u.startsWith(_LOT_PFXS[i])) return _LOT_PFXS[i]; }
    return u.replace(/[0-9].*$/, '') || u;
  }

  // ── Assets panel state ────────────────────────────────────────
  var _assetsCache = {};
  var _assetsOpen  = false;
  var _assetsTab   = 'photos';


  // ── State ──────────────────────────────────────────────────────
  var site = '';
  var product = '';
  var productOpts = [];
  var zoneLayouts = [];
  var availMap = {};
  var promoMap = {};
  var lotMeta = {};
  // Display-only zone name overrides — raw values are preserved for all API calls and matching
  var ZONE_DISPLAY_NAMES = {
    'Semenyih-NMG': { 'NV': 'Zone NV' }
  };
  function displayZone(siteName, zoneName) {
    var m = ZONE_DISPLAY_NAMES[siteName];
    return (m && m[zoneName]) || zoneName;
  }
  // Render Zone / Section / Row lines in the quotation header.
  // For sub-zone products (e.g. 'BK-A-LG1-HB-S3A-D6, D7, D8, D9, D10') split into base zone + section list.
  // For niches show "Section: X", for burial/package plot show "Row: X", for misc skip the second line.
  function renderZoneSection(info) {
    var cat = (info.product_category || '').toLowerCase();
    var isNiche  = cat === 'niche';
    var isBurial = cat === 'package plot' || cat === 'urn burial' || cat.indexOf('burial') >= 0;
    var lbl = '<span style="font-weight:400;opacity:0.65">';

    if (info.product && info.product.indexOf(',') >= 0) {
      var baseZone = info.product.replace(/-[^-,]+(?:,.*)?$/, '');
      if (baseZone !== info.product) {
        var sectionPart = info.product.slice(baseZone.length + 1);
        var selectedSec = (info.section || '').trim();
        var sectionHtml = sectionPart.split(',').map(function (s) {
          var t = s.trim();
          return t === selectedSec
            ? '<span style="color:#e02020;font-weight:700">' + esc(t) + '</span>'
            : esc(t);
        }).join(', ');
        return '<div class="h-product">' + lbl + 'Zone:</span> ' + esc(baseZone) + '</div>'
             + '<div class="h-product">' + lbl + 'Section:</span> ' + sectionHtml + '</div>';
      }
    }

    var h = '<div class="h-product">' + lbl + 'Zone:</span> ' + esc(displayZone(info.site, info.product)) + '</div>';
    if ((isNiche || isBurial) && info.section) {
      var sectionLabel = isBurial ? 'Plot' : 'Section';
      var sectionHtml;
      if (info.section.indexOf('/') >= 0) {
        // Slash-delimited section group (e.g. 'D2/D3/D3A/D5/D7/D8/D9/D10') — highlight active sub-section
        var activeSec = (window._drawerSectionFilter || '').trim();
        sectionHtml = info.section.split('/').map(function (s) {
          var t = s.trim();
          return (activeSec && t === activeSec)
            ? '<span style="color:#e02020;font-weight:700">' + esc(t) + '</span>'
            : esc(t);
        }).join('/');
      } else {
        sectionHtml = '<span style="color:#e02020;font-weight:700">' + esc(info.section) + '</span>';
      }
      h += '<div class="h-product">' + lbl + sectionLabel + ':</span> ' + sectionHtml + '</div>';
    }
    return h;
  }
  window._agentRenderZoneSection = renderZoneSection;

  var hiddenCols = {}; // lotCode → true when column unchecked by user
  var selectedLots = [];
  var lotQuotes = [];
  var _pwpBundleActive = false; // true when PWP bundle is fully active (both levels selected + Level 2 re-fetched)
  var _pwpLevel2Data   = null;  // { levelData, siteInfo } for Level 2 re-fetched with purchase_with_purchase promo
  var _pwpHasOption    = false; // true when current site+product has a PWP promo row
  var _pwpFetching     = false; // guard against re-entrant Level-2 PWP fetch
  var worshipPlans = [];
  var nlpPromos = [];
  var dpPct = 20;
  var _dpFixedRm = null;    // non-null = fixed RM down payment (e.g. RM4,000 for OV6-1F-AT)
  var _tombType  = null;    // selected tomb code for tomb-bundle zones (e.g. Melaka Zone B)
  // Southern Region sites — Central/Combo promos from other regions must never apply here.
  // Add new Southern sites here only when user confirms the site is Southern Region.
  var SOUTHERN_SITES = { 'melaka': true };
  var asNeedMode = false;
  var dpAutoSet = false;    // true once dpPct has been auto-set from promo for the current product
  var _virtualBlk = null, _virtualSec = null; // tracks active virtual-section card for DP re-filtering
  var layoutLoading = false;
  var layoutScrollLeft = 0;  // persisted scroll position of the portal layout
  var layoutMode = 'grid';   // 'grid' | 'promos'

  // Qty-tier DP state: keyed by site+product, set when first qty-tier response arrives
  var _qtyTiersMap = {};      // site|product → { tiers: [...], baseDp: N }

  // Called whenever lot count changes (add or remove). Looks up stored qty_tiers for the
  // current product and auto-updates dpPct if the quantity crossed a tier boundary.
  // When dpPct changes, re-fetches all existing lot quotes with the new dp+qty values.
  // Returns true if a re-fetch was triggered (caller must NOT call renderQuoteSection).
  function _applyQtyTierDp(newQty) {
    var key = site + '|' + product;
    var info = _qtyTiersMap[key];
    if (!info || !info.tiers || !info.tiers.length) return false;
    var matched = null;
    for (var i = 0; i < info.tiers.length; i++) {
      if (newQty >= info.tiers[i].min_quantity) { matched = info.tiers[i]; break; }
    }
    var targetDp = matched ? matched.min_dp : info.baseDp;
    if (!targetDp || dpPct === targetDp) return false;
    dpPct = targetDp;
    dpAutoSet = false;
    if (lotQuotes.length === 0) return false;
    // Re-fetch all lot quotes with new dp + qty
    var prevQuotes = lotQuotes.slice();
    lotQuotes = [];
    quotationCache = {};
    var done = 0;
    prevQuotes.forEach(function (q) {
      var blk = q._block || product;
      var sec = q._section || '';
      var lvl = (q.levelData && q.levelData.level) ? String(q.levelData.level) : '';
      if (!sec) { done++; if (done === prevQuotes.length) { saveSession(); renderQuoteSection(); } return; }
      fetch(API_BASE + '/api/agent/quotation'
        + '?site='    + encodeURIComponent(site)
        + '&product=' + encodeURIComponent(product)
        + '&block='   + encodeURIComponent(blk)
        + '&section=' + encodeURIComponent(sec)
        + (lvl ? '&levels=' + encodeURIComponent(lvl) : '')
        + '&dp=' + dpPct
        + '&qty=' + newQty)
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.error && json.levels && json.levels.length) {
          var lvData = json.levels.find(function (l) { return String(l.level) === lvl; }) || json.levels[0];
          lotQuotes.push({ lotCode: q.lotCode, levelData: lvData, section: json.section, siteInfo: json,
            _burialLotNum: q._burialLotNum || null, _block: blk, _section: sec });
        }
        done++;
        if (done === prevQuotes.length) { saveSession(); renderQuoteSection(); }
      })
      .catch(function () {
        done++;
        if (done === prevQuotes.length) { saveSession(); renderQuoteSection(); }
      });
    });
    return true;
  }

  // ── Helpers ────────────────────────────────────────────────────
  function qs(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) { return Number(n).toLocaleString('en-MY'); }

  // Builds a wa.me link from whatever format the phone was typed in --
  // Malaysian numbers typed with a leading 0 get it swapped for the 60
  // country code; anything else is assumed to already include one.
  function toWaLink(phone) {
    var digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.charAt(0) === '0') digits = '60' + digits.slice(1);
    return 'https://wa.me/' + digits;
  }

  // ── calcMatrix (same logic as React version) ───────────────────
  function calcMatrix(row, dp) {
    var isPedestal  = !row.pre_need_price && !!row.pre_launch_price;
    // NCKL SSD pedestal: has pre_need_price (pre-launch) AND total_pre_need_price (special promo).
    // Special promo is the actual selling price — use it as the base for DP/instalment.
    var hasSpecialPromo = !isPedestal && !!row.total_pre_need_price && (row.product_category || '') === 'Pedestal';
    var originalPrice = isPedestal ? (row.original_price || 0) : (row.as_need_price || 0);
    var preNeedPrice  = isPedestal ? (row.pre_launch_price || 0)
      : hasSpecialPromo ? (row.total_pre_need_price || 0)
      : (row.pre_need_price || 0);
    var preNeedRebate = originalPrice - preNeedPrice;
    var trust    = row.trust_account_facility || 0;
    var backwall = row.backwall_cost || 0;
    var promo    = row.promo;

    // As Need Promo: base price is as_need_price, full payment only (no DP, no instalment)
    var isAsNeed  = !!(promo && promo.purchase_condition === 'as_need');
    var basePrice = isAsNeed ? (row.as_need_price || 0) : preNeedPrice;

    var totalPrice  = basePrice + trust + backwall;
    var _effectiveDpRm = (promo && promo.min_dp_rm != null) ? promo.min_dp_rm : _dpFixedRm;
    var downPayment = isAsNeed ? 0 : (_effectiveDpRm != null ? _effectiveDpRm : Math.round(totalPrice * dp / 100));
    var balance     = isAsNeed ? 0 : (totalPrice - downPayment);

    var specialRebate = 0;
    if (promo && promo.dp_tiers && promo.dp_tiers.length) {
      var tiers = promo.dp_tiers.filter(function (t) { return t <= dp; });
      var activeTier = tiers.length ? Math.max.apply(null, tiers) : null;
      if (activeTier != null) specialRebate = Math.round(basePrice * activeTier / 100);
    } else if (promo && promo.discount_pct != null) {
      specialRebate = Math.round(basePrice * promo.discount_pct / 100);
    } else if (promo && promo.discount_rm != null) {
      specialRebate = promo.discount_rm;
    }

    var instalmentAmount = isAsNeed ? 0 : (balance - specialRebate);
    var tenure = isAsNeed ? 0 : ((promo && promo.max_instalment_months) || 0);
    var monthly = 0, lastInstalment = 0;
    if (!isAsNeed && tenure > 0 && instalmentAmount > 0) {
      monthly = Math.ceil(instalmentAmount / tenure);
      lastInstalment = instalmentAmount - monthly * (tenure - 1);
    }
    var netTotalPrice = isAsNeed ? (totalPrice - specialRebate) : (downPayment + instalmentAmount);

    var drPlusUnits = 0;
    if (promo && promo.dr_plus_eligible) {
      drPlusUnits = (promo.dr_plus_type === 'calculate' || promo.dr_plus_type === 'calc')
        ? Math.round((basePrice - specialRebate) / 10000)
        : (promo.dr_plus_fixed_units || 0);
    }
    return { originalPrice: originalPrice, preNeedRebate: preNeedRebate, preNeedPrice: preNeedPrice,
      trust: trust, backwall: backwall, totalPrice: totalPrice, downPayment: downPayment,
      balance: balance, specialRebate: specialRebate, instalmentAmount: instalmentAmount,
      tenure: tenure, monthly: monthly, lastInstalment: lastInstalment,
      netTotalPrice: netTotalPrice, drPlusUnits: drPlusUnits, isAsNeed: isAsNeed };
  }
  window._calcMatrix = calcMatrix;

  // ── Burial section extraction (per-site) ─────────────────────
  // General rule: strip trailing digits to get the alpha section prefix (e.g. DA138 → DA).
  // Each site has its own explicit block so future format changes are isolated.
  function extractBurialSection(lot, s) {
    if (s === 'Klang')        return lot.replace(/[0-9].*$/, '');
    if (s === 'Semenyih-NMG') return lot.replace(/[0-9].*$/, '');
    if (s === 'Semenyih-NMP') return lot.replace(/[0-9].*$/, '');
    if (s === 'Shah Alam')    return lot.replace(/[0-9].*$/, '');
    if (s === 'NCKL')         return lot.replace(/[0-9].*$/, '');
    if (s === 'NV-S')         return lot.replace(/[0-9].*$/, '');
    if (s === 'NV-P')         return lot.replace(/[0-9].*$/, '');
    // General fallback for any unrecognised site
    return lot.replace(/[0-9].*$/, '') || lot.split('-')[0] || '';
  }

  // ── Zone group builder ────────────────────────────────────────
  // Returns array of group objects from productOpts:
  //   { key, display, type: 'group'|'subsections'|'standalone', members: [...] }
  // 'group'      → D2 shows prefix (e.g. SSD), D3 shows suffixes (A, J, Q)
  // 'subsections'→ D2 shows full zone name, D3 shows sub-section items
  // 'standalone' → D2 shows full zone name, D3 hidden
  function buildZoneGroups() {
    var groups = [];
    var seen   = {};
    productOpts.forEach(function (p) {
      if (seen[p.name]) return;
      var dashIdx  = p.name.indexOf('-');
      var prefix   = dashIdx > 0 ? p.name.slice(0, dashIdx) : p.name;
      var siblings = productOpts.filter(function (x) { return x.name.indexOf(prefix + '-') === 0; });
      var anyHasSubsections = siblings.some(function (s) { return s.subsections && s.subsections.length > 0; });
      if (siblings.length > 1 && !anyHasSubsections && !groups.find(function (g) { return g.key === prefix; })) {
        groups.push({ key: prefix, display: prefix, type: 'group', members: siblings });
        siblings.forEach(function (s) { seen[s.name] = true; });
      } else if (!seen[p.name]) {
        if (p.subsections && p.subsections.length > 0) {
          groups.push({ key: p.name, display: p.name, type: 'subsections', members: p.subsections });
        } else {
          groups.push({ key: p.name, display: p.name, type: 'standalone', members: [] });
        }
        seen[p.name] = true;
      }
    });
    return groups;
  }

  // ── Select population ─────────────────────────────────────────
  var SITE_GROUPS = [
    { label: 'NLP',      filter: function (s) { return s === 'Nirvana Life Planning'; } },
    { label: 'Central',  filter: function (s) { return s !== 'Nirvana Life Planning' && s !== 'Melaka'; } },
    { label: 'Southern', filter: function (s) { return s === 'Melaka'; } },
  ];

  function renderSiteDropdownPanel() {
    var panel = qs('site-dd-panel');
    if (!panel) return;
    var html = '';
    SITE_GROUPS.forEach(function (grp) {
      var members = SITES.filter(grp.filter);
      if (!members.length) return;
      var isOpen = openSiteGroup === grp.label;
      html += '<div class="f-dd-cat' + (isOpen ? ' f-dd-cat-open' : '') + '" data-sitecat="' + grp.label + '">' + grp.label + '<span>' + (isOpen ? '▲' : '▼') + '</span></div>';
      if (isOpen) {
        members.forEach(function (s) {
          html += '<div class="f-dd-zone' + (s === site ? ' f-dd-zone-sel' : '') + '" data-siteitem="' + esc(s) + '"><span class="f-dd-zone-name">' + esc(s) + '</span><span class="f-dd-zone-chev">›</span></div>';
        });
      }
    });
    panel.innerHTML = html;
  }

  // ── Quick Select stepper shell (Site → Zone → Section, one full-screen
  // step at a time — Section step is skipped visually to a "ready" note
  // when the zone has no sections, but still counts as step 3) ──
  var QS_TOTAL_STEPS = 3;
  var QS_STEP_TITLES = ['Choose a Site', 'Choose a Zone', 'Choose a Section'];

  function renderQsStepperShell() {
    var back  = qs('qs-stepper-back');
    var title = qs('qs-stepper-title');
    var count = qs('qs-stepper-step-count');
    var dots  = qs('qs-stepper-dots');
    if (title) title.textContent = QS_STEP_TITLES[qsStep - 1] || '';
    if (count) count.textContent = 'Step ' + qsStep + ' of ' + QS_TOTAL_STEPS;
    if (back) back.style.visibility = qsStep <= 1 ? 'hidden' : 'visible';
    if (dots) {
      var html = '';
      for (var i = 1; i <= QS_TOTAL_STEPS; i++) {
        html += '<div class="qs-dot' + (i < qsStep ? ' done' : i === qsStep ? ' now' : '') + '"></div>';
      }
      dots.innerHTML = html;
    }
  }

  function showQsStep(n) {
    qsStep = n;
    var sitePanel    = qs('site-dd-panel');
    var zonePanel    = qs('zone-dd-panel');
    var sectionPanel = qs('qs-section-panel');
    if (sitePanel)    sitePanel.style.display    = n === 1 ? '' : 'none';
    if (zonePanel)    zonePanel.style.display    = n === 2 ? '' : 'none';
    if (sectionPanel) sectionPanel.style.display = n === 3 ? '' : 'none';
    renderQsStepperShell();
    if (n === 1) {
      siteDropdownIsOpen = true;
      zoneDropdownIsOpen = false;
      renderSiteDropdownPanel();
    } else if (n === 2) {
      siteDropdownIsOpen = false;
      zoneDropdownIsOpen = true;
      if (!productOpts.length) {
        if (zonePanel) zonePanel.innerHTML = '<div style="padding:24px 18px;font-size:12.5px;color:#94a3b8;text-align:center">Loading zones…</div>';
      } else {
        renderZoneDropdownPanel();
      }
    } else {
      siteDropdownIsOpen = false;
      zoneDropdownIsOpen = false;
      renderQsSectionPanel();
    }
  }

  function renderQsSectionPanel() {
    var panel = qs('qs-section-panel');
    if (!panel) return;
    var g = null;
    if (currentZoneGroupKey && _cachedCatGroups) {
      _cachedCatGroups.forEach(function (cat) {
        cat.groups.forEach(function (gr) { if (gr.key === currentZoneGroupKey) g = gr; });
      });
    }
    if (!g || g.members.length === 0) {
      panel.innerHTML = '<div class="qs-confirm-note">This zone has no sections to narrow down — you\'re ready to view the layout.</div>'
        + '<button class="qs-confirm-cta" data-qsfinish="1">View layout →</button>';
      return;
    }
    var html = '';
    if (g.type === 'group') {
      g.members.forEach(function (m) {
        var label = m.name.slice(g.key.length + 1);
        html += '<div class="f-dd-zone" data-section="' + esc(m.name) + '"><span class="f-dd-zone-name">' + esc(label) + '</span><span class="f-dd-zone-right"><span class="f-dd-zone-chev">›</span></span></div>';
      });
    } else if (g.type === 'subsections') {
      g.members.forEach(function (sub) {
        var isCombo = window.AgentCombo && window.AgentCombo.isComboSection && window.AgentCombo.isComboSection(sub.section);
        var badges = '';
        if (sub.instant_case) badges += '<span class="f-dd-badge-amber">Instant</span>';
        if (isCombo) badges += '<span class="f-dd-badge-green">🎁 Combo</span>';
        var availPill = sub.available != null ? '<span class="f-dd-avail' + (sub.available < 15 ? ' f-dd-avail-low' : '') + '">' + sub.available + ' left</span>' : '';
        html += '<div class="f-dd-zone" data-section="' + esc(sub.section) + '"><span class="f-dd-zone-name">' + esc(sub.section) + badges + '</span><span class="f-dd-zone-right">' + availPill + '<span class="f-dd-zone-chev">›</span></span></div>';
      });
    }
    html += '<button class="qs-confirm-cta qs-confirm-cta-secondary" data-qsfinish="1">Skip — view full layout →</button>';
    panel.innerHTML = html;
  }

  function openQsStepper(startStep) {
    var el = qs('qs-stepper');
    if (!el) return;
    if (startStep === 1 && !openSiteGroup) {
      // Auto-expand the group containing the current site
      SITE_GROUPS.forEach(function (grp) {
        if (site && SITES.filter(grp.filter).indexOf(site) !== -1) openSiteGroup = grp.label;
      });
    }
    el.classList.add('open');
    showQsStep(startStep || 1);
  }

  function closeQsStepper() {
    var el = qs('qs-stepper');
    if (el) el.classList.remove('open');
    siteDropdownIsOpen = false;
    zoneDropdownIsOpen = false;
  }

  // Back-compat aliases — same open/close entry points, now backed by the
  // single full-screen stepper instead of two separate drawers.
  function openSiteDropdown() { openQsStepper(1); }
  function closeSiteDropdown() { if (qsStep === 1) closeQsStepper(); }

  function updateSiteDropdownBtn() {
    var btn = qs('site-dd-btn');
    var val = qs('site-dd-val');
    if (!btn || !val) return;
    if (!site) { val.textContent = 'Select site…'; btn.classList.add('placeholder'); }
    else { val.textContent = site; btn.classList.remove('placeholder'); }
  }

  function populateSiteSelect() {
    updateSiteDropdownBtn();
    // Ensure section starts as N/A until a zone with sections is picked
    var secSel = qs('section-sel');
    if (secSel && !secSel.options.length) {
      secSel.innerHTML = '<option value="">Not applicable</option>';
      secSel.disabled = true;
    }
  }

  function populateZoneDropdown() {
    var btn = qs('zone-dd-btn');
    if (!btn) return;
    btn.disabled = !site;
    renderZoneDropdownPanel();
    updateSectionSelect();
  }

  // Groups productOpts by category; within each category applies buildZoneGroups logic
  function buildCategoryGroups() {
    var CAT_ORDER = ['Niche', 'Land', 'Urn Plot', 'Pedestal', 'Package Plot', 'EBL', 'NLP'];
    var byCategory = {};
    productOpts.forEach(function (p) {
      var cat = (p.category) ? p.category : 'Other';
      if (cat === 'Burial' || cat === 'Burial Plot' || cat === 'Burial Plot (Christian)') cat = 'Land';
      if (cat === 'Urn Burial' || cat === 'Urn Burial Plot' || cat === 'URN BURIAL PLOT') cat = 'Urn Plot';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    });
    var result = [];
    CAT_ORDER.forEach(function (catLabel) {
      if (!byCategory[catLabel]) return;
      var opts = byCategory[catLabel];
      // Build zone groups within this category
      var groups = [];
      var seen   = {};
      opts.forEach(function (p) {
        if (seen[p.name]) return;
        var lastDash = p.name.lastIndexOf('-');
        var prefix   = lastDash > 0 ? p.name.slice(0, lastDash) : p.name;
        var siblings = opts.filter(function (x) { return x.name.indexOf(prefix + '-') === 0; });
        var anyHasSub = siblings.some(function (s) { return s.subsections && s.subsections.length > 0; });
        if (siblings.length > 1 && !anyHasSub && !groups.find(function (g) { return g.key === prefix; })) {
          groups.push({ key: prefix, display: prefix, type: 'group', members: siblings, category: catLabel });
          siblings.forEach(function (s) { seen[s.name] = true; });
        } else if (!seen[p.name]) {
          if (p.subsections && p.subsections.length > 0) {
            groups.push({ key: p.name, display: p.name, type: 'subsections', members: p.subsections, category: catLabel });
          } else {
            groups.push({ key: p.name, display: p.name, type: 'standalone', members: [], category: catLabel });
          }
          seen[p.name] = true;
        }
      });
      result.push({ label: catLabel, groups: groups });
    });
    // Also catch any categories not in CAT_ORDER
    Object.keys(byCategory).forEach(function (cat) {
      if (CAT_ORDER.indexOf(cat) === -1) {
        result.push({ label: cat, groups: byCategory[cat].map(function (p) {
          if (p.subsections && p.subsections.length > 0) {
            return { key: p.name, display: p.name, type: 'subsections', members: p.subsections, category: cat };
          }
          return { key: p.name, display: p.name, type: 'standalone', members: [], category: cat };
        })});
      }
    });
    return result;
  }

  var _cachedCatGroups = null;

  function renderZoneDropdownPanel() {
    var panel = qs('zone-dd-panel');
    if (!panel) return;
    if (!productOpts.length) { panel.innerHTML = ''; return; }
    _cachedCatGroups = buildCategoryGroups();

    var html = '';
    // Collapsed categories at top (all except openCategory)
    _cachedCatGroups.forEach(function (cat) {
      if (cat.label === openCategory) return; // skip — rendered at bottom
      var isOpen = false;
      html += '<div class="f-dd-cat" data-cat="' + cat.label + '">' + cat.label + '<span>' + (isOpen ? '▲' : '▼') + '</span></div>';
    });
    // Expanded category at bottom
    if (openCategory) {
      var activeCat = _cachedCatGroups.find(function (c) { return c.label === openCategory; });
      if (activeCat) {
        html += '<div class="f-dd-cat f-dd-cat-open" data-cat="' + activeCat.label + '">' + activeCat.label + '<span>▲</span></div>';
        activeCat.groups.forEach(function (g) {
          var isSel = (currentZoneGroupKey === g.key);
          // members may be empty for standalone; check first member's religion or the original productOpt
          var origOpt = productOpts.find(function (p) { return p.name === g.key; });
          var isChristian = origOpt && origOpt.religion === 'Christian';
          var isCombo = window.AgentCombo && window.AgentCombo.hasComboZone && window.AgentCombo.hasComboZone(site, g.key);
          var isNewLaunch = g.key === 'N7-S2' || g.key === 'N12-S6' || g.key === 'JLD-B-GF' || g.key === 'MP3-2F-RS1' || g.key === 'MP3-2F-PS1';
          var badge = isChristian ? '<span class="f-dd-badge">Christian</span>' : '';
          if (isNewLaunch) badge += '<span class="f-dd-badge-green">New Launch</span>';
          if (isCombo) badge += '<span class="f-dd-badge-amber">Combo Lot</span>';
          var availPill = '';
          if (g.type !== 'group' && origOpt && origOpt.available != null) {
            availPill = '<span class="f-dd-avail' + (origOpt.available < 15 ? ' f-dd-avail-low' : '') + '">' + origOpt.available + ' left</span>';
          }
          html += '<div class="f-dd-zone' + (isSel ? ' f-dd-zone-sel' : '') + '" data-zone="' + g.key + '" data-cat="' + activeCat.label + '">'
            + '<span class="f-dd-zone-name">' + g.display + badge + '</span>'
            + '<span class="f-dd-zone-right">' + availPill + '<span class="f-dd-zone-chev">›</span></span>'
            + '</div>';
        });
      }
    }
    panel.innerHTML = html;
  }
  window._agentRenderZoneDropdown = renderZoneDropdownPanel;

  function openZoneDropdown() {
    var btn = qs('zone-dd-btn');
    if (!btn || btn.disabled) return;
    openQsStepper(2);
  }

  function closeZoneDropdown() {
    zoneDropdownIsOpen = false;
  }

  function onZoneSelected(groupKey) {
    currentZoneGroupKey = groupKey;
    if (!_cachedCatGroups) _cachedCatGroups = buildCategoryGroups();
    // Update button label
    updateZoneDropdownBtn();
    // Update section select (kept in sync in the background — still the
    // source of truth the rest of the app reads/writes via its 'change' event)
    updateSectionSelect();
    product = groupKey;
    window._drawerSectionFilter = '';
    window._drawerLevelFilter   = '';
    window._drawerPromoFilter   = '';
    resetLayout(); saveSession(); updateUI();
    loadLayout(site, groupKey);
    renderAssetsPanel();
    // Advance to step 3 — choose a Section, or confirm/skip straight to layout.
    showQsStep(3);
  }

  function findGroupForProduct(prod, groups) {
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.key === prod) return g;
      if (g.type === 'group') {
        for (var j = 0; j < g.members.length; j++) {
          if (g.members[j].name === prod) return g;
        }
      }
    }
    return null;
  }

  function updateSectionSelect() {
    var sel = qs('section-sel');
    if (!sel) return;

    // Find active group using currentZoneGroupKey
    var g = null;
    if (currentZoneGroupKey && _cachedCatGroups) {
      _cachedCatGroups.forEach(function (cat) {
        cat.groups.forEach(function (gr) { if (gr.key === currentZoneGroupKey) g = gr; });
      });
    }

    if (!g || g.members.length === 0) {
      sel.innerHTML = '<option value="">Not applicable</option>';
      sel.disabled = true;
      return;
    }

    sel.disabled = false;
    sel.innerHTML = '<option value="">Select section…</option>';
    if (g.type === 'group') {
      g.members.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name.slice(g.key.length + 1);
        sel.appendChild(opt);
      });
      if (product && product !== g.key) sel.value = product;
    } else if (g.type === 'subsections') {
      g.members.forEach(function (sub) {
        var opt = document.createElement('option');
        var label = sub.available != null ? sub.section + ' (' + sub.available + ' avail)' : sub.section;
        if (sub.instant_case) label += ' ⚡ Instant';
        opt.value = sub.section; opt.textContent = label;
        sel.appendChild(opt);
      });
      if (window._drawerSectionFilter) sel.value = window._drawerSectionFilter;
    }
    // Add Combo labels for sections that have active combo lots (if ranges already loaded)
    if (window.AgentCombo && window.AgentCombo.updateSectionPicker) window.AgentCombo.updateSectionPicker();
  }

  // ── Cache ──────────────────────────────────────────────────────
  var zoneLayoutCache = {};  // key: "site|product" → {layouts, availability, promos}
  var lotMetaCache    = {};  // key: "site|product" → lotMeta object
  var quotationCache  = {};  // key: "site|product|block|section|level" → quotation json
  var zonesCache      = {};  // key: site → array of zone options (prefetched at startup)
  var layoutGen       = 0;   // increments on every reset — stale callbacks compare against this

  // ── Layout loading ─────────────────────────────────────────────
  function loadLayout(s, p) {
    if (p === 'NLP') { layoutLoading = false; renderLayoutArea(); return; }
    var key = s + '|' + p;
    var gen = layoutGen; // snapshot — if resetLayout() is called, layoutGen increments and this goes stale

    if (zoneLayoutCache[key]) {
      zoneLayouts = zoneLayoutCache[key].layouts;
      availMap    = zoneLayoutCache[key].availability;
      promoMap    = zoneLayoutCache[key].promos || {};
      layoutLoading = false;
      updateSyncedAt(zoneLayouts);
      renderLayoutArea();
    } else {
      layoutLoading = true;
      renderLayoutArea();
    }

    if (lotMetaCache[key]) {
      lotMeta = lotMetaCache[key];
    }

    if (!zoneLayoutCache[key]) {
      fetch(API_BASE + '/api/agent/zone-layout?site=' + encodeURIComponent(s) + '&product=' + encodeURIComponent(p))
        .then(function (r) { return r.json(); })
        .then(function (zl) {
          if (gen !== layoutGen) return; // reset happened while fetch was in-flight — discard
          var layouts = (zl.layouts && zl.layouts.length) ? zl.layouts : [];
          var avail   = zl.availability || {};
          var promos  = zl.promo_lots   || {};
          zoneLayoutCache[key] = { layouts: layouts, availability: avail, promos: promos };
          zoneLayouts = layouts;
          availMap    = avail;
          promoMap    = promos;
          layoutLoading = false;
          updateSyncedAt(layouts);
          renderLayoutArea();
          if (!lotMetaCache[key]) loadLotMeta(s, p, key, gen);
        })
        .catch(function () { if (gen === layoutGen) { layoutLoading = false; renderLayoutArea(); } });
    } else if (!lotMetaCache[key]) {
      loadLotMeta(s, p, key, gen);
    }
  }

  function loadLotMeta(s, p, key, gen) {
    fetch(API_BASE + '/api/agent/layout?site=' + encodeURIComponent(s) + '&product=' + encodeURIComponent(p))
      .then(function (r) { return r.json().then(function(j) { if (!r.ok) dbg('layout API error: ' + JSON.stringify(j)); return j; }); })
      .then(function (ld) {
        var meta = {};
        // Columbarium niches
        (ld.sections || []).forEach(function (sec) {
          (sec.levels || []).forEach(function (lvl) {
            (lvl.niches || []).forEach(function (niche) {
              if (niche.lot_code) {
                meta[niche.lot_code] = { block: niche.price_block || p, section_group: niche.price_section_group || null, is_niche: true };
              }
            });
          });
        });
        // Burial plot rows
        dbg('burialSections count=' + (ld.burialSections || []).length);
        (ld.burialSections || []).forEach(function (sec) {
          dbg('burial sec=' + sec.section + ' sg=' + sec.section_group + ' block=' + sec.block + ' lots=' + (sec.lots || []).length);
          (sec.lots || []).forEach(function (lot) {
            meta[lot.lot_code] = {
              block: lot.price_block || sec.block || p,
              section_group: lot.price_section_group || sec.section_group || sec.section,
              is_burial: true,
            };
          });
        });
        dbg('lotMeta keys=' + Object.keys(meta).length);
        // Always populate cache (idempotent) so prefetch results survive a resetLayout() gen increment
        if (!lotMetaCache[key]) lotMetaCache[key] = meta;
        // Only update live state if this fetch is still current
        if (gen !== layoutGen) return;
        lotMeta = meta;
        if (window.AgentCombo)  window.AgentCombo.loadRanges(s, p);
        if (window.AgentBundle) window.AgentBundle.loadOptions(s, p);
        if (layoutMode === 'promos') renderPromoView();
        preloadQuotations(s, p, meta);
      })
      .catch(function (e) { dbg('loadLotMeta err: ' + e); });
  }

  function preloadQuotations(s, p, meta) {
    // Collect unique block+section combos — use same fallbacks as onLayoutClick
    var groups = {};
    Object.keys(availMap).forEach(function (lot) {
      if (!availMap[lot]) return;
      var m = meta[lot] || {};
      var block   = m.block || p;
      var isNicheLot = lot.split('-').length >= 3;
      var section = m.section_group || (isNicheLot ? null : extractBurialSection(lot, s));
      if (!block || !section) return;
      var gk = block + '|' + section;
      if (!groups[gk]) groups[gk] = { block: block, section: section };
    });

    // Fetch each unique block+section (returns all levels) and cache
    Object.keys(groups).forEach(function (gk) {
      var g = groups[gk];
      var url = API_BASE + '/api/agent/quotation'
        + '?site='    + encodeURIComponent(s)
        + '&product=' + encodeURIComponent(p)
        + '&block='   + encodeURIComponent(g.block)
        + '&section=' + encodeURIComponent(g.section);

      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (!json.levels) return;
          // Cache under every level key so onLayoutClick hits cache instantly
          json.levels.forEach(function (lvData) {
            var ck = s + '|' + p + '|' + g.block + '|' + g.section + '|' + lvData.level;
            if (!quotationCache[ck]) quotationCache[ck] = json;
          });
        })
        .catch(function () {});
    });
  }

  // ── Reset ──────────────────────────────────────────────────────
  function resetLayout() {
    layoutGen++;  // invalidates all in-flight loadLayout / loadLotMeta callbacks
    zoneLayouts = []; availMap = {}; lotMeta = {}; hiddenCols = {};
    selectedLots = []; lotQuotes = []; worshipPlans = []; nlpPromos = [];
    dpPct = 20; _dpFixedRm = null; _tombType = null; asNeedMode = false; dpAutoSet = false; _virtualBlk = null; _virtualSec = null;
    _pwpBundleActive = false; _pwpLevel2Data = null; _pwpHasOption = false; _pwpFetching = false;
    layoutLoading = false;
    layoutScrollLeft = 0;
    layoutMode = 'grid';
    quotationCache = {};
    var el = qs('layout-synced-at');
    if (el) el.textContent = '';
  }

  function resetAll() {
    try {
      localStorage.setItem('agent_was_reset', '1');
      localStorage.removeItem('agent_session');
    } catch(e) {}
    site = ''; product = ''; productOpts = []; currentZoneGroupKey = ''; openCategory = null; openSiteGroup = null; _cachedCatGroups = null; resetLayout();
    window._drawerPromoFilter = '';
    closeQsStepper();
    renderAssetsPanel();
    updateUI();
  }

  // ── Cell coloring ──────────────────────────────────────────────
  function colorCells() {
    var card = qs('layout-card');
    if (!card) return;
    var hasAvail = Object.keys(availMap).length > 0;
    var secFilter = window._drawerSectionFilter || '';
    var lvlFilter = window._drawerLevelFilter  || '';
    var matchCells = [];
    card.querySelectorAll('[data-lot]').forEach(function (td) {
      var lot = td.dataset.lot;
      if (selectedLots.indexOf(lot) >= 0) {
        td.className = 'nz-selected';
        return;
      }
      if (secFilter || lvlFilter) {
        var parts   = lot.split('-');
        var lotSec  = parts[0] || '';
        var lotLvl  = parts.length === 4
          ? (parts[2] ? (parts[2].replace(/^0+/, '') || '0') : '')
          : (parts[1] ? (parts[1].replace(/^0+/, '') || '0') : '');
        var lotSecAlpha = lotSec.replace(/[0-9].*$/, '');
        var lotSecNorm = lotSec.replace(/^0+/, '') || lotSec;
        var secFilterNorm2 = secFilter.replace(/^0+/, '') || secFilter;
        var secMatch = !secFilter || lotSec === secFilter || lotSecAlpha === secFilter || deriveLotPrefix(lotSec) === secFilter || lotSecNorm === secFilterNorm2;
        var lvlMatch = !lvlFilter || lvlFilter.split(',').indexOf(lotLvl) >= 0;
        if (!secMatch || !lvlMatch) {
          td.className = 'nz-filtered';
          return;
        }
      }
      if (hasAvail) {
        var isAvail = !!availMap[lot];
        var promoName = promoMap[lot] || '';
        var promoClass = '';
        var promoLabel = '';
        if (promoName) {
          if (promoName.indexOf('Customer') >= 0)                         { promoClass = 'nz-promo-customer'; promoLabel = 'CUST'; }
          else if (promoName.indexOf('DRPlus') >= 0 || promoName.indexOf('DR+') >= 0) { promoClass = 'nz-promo-drplus';   promoLabel = 'DR+'; }
          else if (promoName.indexOf('Central') >= 0)                     { promoClass = 'nz-promo-central';  promoLabel = 'CTR'; }
          else if (promoName.toLowerCase().indexOf('need') >= 0)          { promoClass = 'nz-promo-asneed';   promoLabel = 'AN'; }
          else                                                             { promoClass = 'nz-promo-customer'; promoLabel = promoName.slice(0,4).toUpperCase(); }
        }
        var _cellIsSouthern = SOUTHERN_SITES[(site || '').toLowerCase()];
        if (!_cellIsSouthern && window.AgentCombo) window.AgentCombo.colorCell(td, lot, isAvail);
        else td.className = isAvail ? 'nz-avail' : 'nz-sold';
        if (!_cellIsSouthern && window.AgentBundle) window.AgentBundle.colorCell(td, lot, isAvail);
        if (_pwpHasOption && isAvail) {
          var _pp = lot.split('-');
          var _pl = _pp.length >= 2 ? (_pp[1].replace(/^0+/, '') || _pp[1]) : '';
          if (_pl === '1' || _pl === '2') td.className = 'nz-avail nz-bundle';
        }
        delete td.dataset.promoLabel;
        if (isAvail) matchCells.push(td);
      }
    });
    renderFilterNav(matchCells, secFilter || lvlFilter);
    applyLayoutSectionFilter();
  }

  // When a section is selected, hide all other sections' rows from the layout grid
  // so the agent only sees the relevant wall without needing to scroll past empty sections.
  function applyLayoutSectionFilter() {
    var card = qs('layout-card');
    if (!card) return;
    var secFilter = window._drawerSectionFilter || '';

    if (!secFilter) {
      card.querySelectorAll('tr').forEach(function (tr) { tr.style.display = ''; });
      return;
    }

    // Hide gap rows — not needed when only one section is visible
    card.querySelectorAll('tr.nz-wall-gap').forEach(function (tr) {
      tr.style.display = 'none';
    });

    // Show only the matching wall header, hide others.
    // Also compare with leading zeros stripped so e.g. filter '1' matches wall name '01'.
    var secFilterNorm = secFilter.replace(/^0+/, '') || secFilter;
    card.querySelectorAll('tr.nz-wall-header').forEach(function (tr) {
      var nameEl = tr.querySelector('.nz-wall-name');
      var wallName = nameEl ? nameEl.textContent.trim() : '';
      var wallNorm = wallName.replace(/^0+/, '') || wallName;
      tr.style.display = (wallName === secFilter || wallNorm === secFilterNorm) ? '' : 'none';
    });

    // Hide lot rows where every data-lot cell is filtered out
    card.querySelectorAll('tr:not(.nz-wall-header):not(.nz-wall-gap)').forEach(function (tr) {
      var lots = tr.querySelectorAll('[data-lot]');
      if (!lots.length) return;
      var allFiltered = Array.from(lots).every(function (td) {
        return td.classList.contains('nz-filtered');
      });
      tr.style.display = allFiltered ? 'none' : '';
    });
  }

  // ── Filter navigator ───────────────────────────────────────────
  var _navCells = [];
  var _navIdx   = 0;

  function renderFilterNav(cells, hasFilter) {
    var nav = document.getElementById('filter-nav');
    if (!nav) return;
    _navCells = cells;
    _navIdx   = 0;
    if (!hasFilter || !cells.length) {
      nav.style.display = 'none';
      return;
    }
    nav.style.display = 'flex';
    nav.querySelector('#fn-count').textContent = cells.length + ' unit' + (cells.length !== 1 ? 's' : '') + ' available';
    setTimeout(function() { scrollToNavCell(0); }, 100);
  }

  function scrollToNavCell(idx) {
    if (!_navCells.length) return;
    _navIdx = (idx + _navCells.length) % _navCells.length;
    var td = _navCells[_navIdx];

    // scrollIntoView handles both horizontal and vertical axes
    td.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Pulse highlight
    td.classList.add('nz-pulse');
    setTimeout(function() { td.classList.remove('nz-pulse'); }, 800);

    var nav = document.getElementById('filter-nav');
    if (nav) nav.querySelector('#fn-count').textContent = (_navIdx + 1) + ' / ' + _navCells.length + ' unit' + (_navCells.length !== 1 ? 's' : '');
  }

  // ── Availability drawer ────────────────────────────────────────
  // Sequence: Type → Site → Zone → Lot Type → Level (optional, last step)
  var drawerState = { type: '', site: '', levels: [], sort: 'available', selectedZone: null, selectedPrefix: null, selectedSection: null, _sections: [], selectedPromo: null, _promoTypes: [], _promoTypesLoading: false };

  // Full reset of the Browse wizard's own pill/filter state (Product Type,
  // Site, sort, section/level pills) -- separate from resetAll(), which only
  // clears the site/product/layout selection, not this wizard state.
  function resetDrawerState() {
    drawerState = { type: '', site: '', levels: [], sort: 'available', selectedZone: null, selectedPrefix: null, selectedSection: null, _sections: [], selectedPromo: null, _promoTypes: [], _promoTypesLoading: false };
  }

  var LEVEL_ORDER = ['LG','G','B','1','2','3','3A','5','6','7','8','9','10','11','12'];
  function sortLevels(lvls) {
    return lvls.slice().sort(function(a, b) {
      var ia = LEVEL_ORDER.indexOf(String(a)), ib = LEVEL_ORDER.indexOf(String(b));
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1; if (ib >= 0) return 1;
      return String(a).localeCompare(String(b));
    });
  }
  function formatLevelSummary(levels) {
    if (!levels || !levels.length) return '';
    var sorted = sortLevels(levels);
    var parts = []; var i = 0;
    while (i < sorted.length) {
      var cur = sorted[i], curNum = parseInt(cur, 10);
      if (!isNaN(curNum) && String(curNum) === String(cur)) {
        var j = i + 1;
        while (j < sorted.length) {
          var nNum = parseInt(sorted[j], 10);
          if (!isNaN(nNum) && String(nNum) === String(sorted[j]) && nNum === curNum + (j - i)) j++;
          else break;
        }
        if (j - i >= 3) { parts.push(sorted[i] + '–' + sorted[j-1]); i = j; }
        else { parts.push(cur); i++; }
      } else { parts.push(cur); i++; }
    }
    return parts.join(' · ');
  }

  function openPosterModal(evt) {
    var modalImg    = document.getElementById('poster-modal-img');
    var modalBg     = document.getElementById('poster-modal-backdrop');
    var modalReg    = document.getElementById('poster-modal-register');
    var modalNotice = document.getElementById('poster-modal-notice');
    if (modalImg) modalImg.src = evt.poster;
    if (modalReg)    { modalReg.href = evt.register || '#'; modalReg.style.display = evt.register ? '' : 'none'; }
    if (modalNotice) { modalNotice.textContent = evt.notice || ''; modalNotice.style.display = evt.notice ? '' : 'none'; }
    if (modalBg) modalBg.classList.add('open');
  }

  function openEventPicker(evts) {
    var picker = document.getElementById('evt-picker-backdrop');
    var list   = document.getElementById('evt-picker-list');
    if (!picker || !list) return;
    list.innerHTML = evts.map(function(ev) {
      return '<div class="evt-picker-item" data-evt=\'' + JSON.stringify(ev) + '\'>' +
        '<span class="evt-picker-dot" style="background:' + ev.color + '"></span>' +
        '<span class="evt-picker-title">' + ev.title + '</span>' +
        '</div>';
    }).join('');
    picker.classList.add('open');
  }

  // ── Bottom tab bar ────────────────────────────────────────────
  var TAB_IDS = ['home', 'leads', 'browse', 'team', 'me'];
  var TAB_TITLES = { home: 'Summary', leads: 'Leads', browse: 'Quotation Browsing', team: 'My Team', me: 'Me (Goal)' };
  var _homeSnapshotLoaded = false;
  var _inventoryListLoaded = false;
  var _teamLoaded = false;
  var _meLoaded = false;
  var _leadsLoaded = false;
  var _soldModalRef = null;
  var _editCustomerRef = null;
  var _goalModalUserId = null;
  var _goalModalSelf = false;
  var TIER_COLOR = {
    CBDD: { bg: '#ede9fe', fg: '#5b21b6' },
    BDD: { bg: '#dcfce7', fg: '#15803d' },
    DSD: { bg: '#dbeafe', fg: '#1d4ed8' },
    SD: { bg: '#fef3c7', fg: '#92400e' },
    AGENT: { bg: '#f1f5f9', fg: '#475569' }
  };
  function switchTab(name) {
    if (TAB_IDS.indexOf(name) < 0) return;
    TAB_IDS.forEach(function (t) {
      var panel = document.getElementById('tab-' + t);
      if (panel) panel.classList.toggle('tab-active', t === name);
    });
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    var titleEl = qs('topbar-title');
    if (titleEl) titleEl.textContent = TAB_TITLES[name] || 'Home';
    var scrollBody = document.getElementById('scroll-body');
    if (scrollBody) scrollBody.scrollTop = 0;
    if (name === 'home' && !_homeSnapshotLoaded) {
      _homeSnapshotLoaded = true;
      loadHomeSnapshot();
    }
    if (name === 'browse' && !_inventoryListLoaded) {
      _inventoryListLoaded = true;
      openAvailDrawer();
    }
    if (name === 'team' && !_teamLoaded) {
      _teamLoaded = true;
      loadTeamSnapshot();
    }
    if (name === 'me' && !_meLoaded) {
      _meLoaded = true;
      loadMeSnapshot();
    }
    if (name === 'leads' && !_leadsLoaded) {
      _leadsLoaded = true;
      loadLeadsSnapshot();
    }
    var exportBtn = qs('btn-leads-export');
    if (exportBtn) exportBtn.style.display = name === 'leads' ? '' : 'none';
  }

  var MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // The yearly goal card now tracks Quota, not the raw sales figure --
  // labeled explicitly so it's never mistaken for a sales target. YTD Sales
  // is shown above it as a separate, unmodified reference figure (the raw
  // quotation total), never part of the goal comparison itself.
  function renderYearlyGoalCard(yg, ytdSalesActual) {
    var ytdHtml = '<div class="mgc-ytd">Year to date sales: <strong>RM ' + fmt(ytdSalesActual || 0) + '</strong></div>';

    if (!yg || !yg.yearlyTarget) {
      return ytdHtml + '<button class="me-set-goal-btn me-set-goal-btn-outline" id="btn-set-yearly-goal">Set your yearly quota</button>';
    }
    var now = new Date();
    var curPeriod = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var thisMonth = null;
    (yg.months || []).forEach(function (m) { if (m.period === curPeriod) thisMonth = m; });

    var yPct = yg.yearlyTarget > 0 ? Math.min(100, Math.round(yg.yearlyActual / yg.yearlyTarget * 100)) : 0;
    var mPct = thisMonth && thisMonth.target > 0 ? Math.min(100, Math.round(thisMonth.actual / thisMonth.target * 100)) : 0;

    var bars = (yg.months || []).map(function (m, i) {
      var pct = m.target > 0 ? Math.min(100, Math.round(m.actual / m.target * 100)) : 0;
      var isNow = m.period === curPeriod;
      return '<div class="mgc-bar-col' + (isNow ? ' mgc-bar-now' : '') + '" data-period="' + m.period + '" data-target="' + m.target + '" data-locked="' + (m.locked ? '1' : '') + '">' +
        '<div class="mgc-bar-track"><div class="mgc-bar-fill" style="height:' + pct + '%"></div></div>' +
        '<div class="mgc-bar-label">' + (m.locked ? '📌' : '') + MONTH_ABBR[i] + '</div>' +
      '</div>';
    }).join('');

    return ytdHtml + '<div class="mgc">' +
      '<div class="mgc-cap">Yearly quota · ' + yg.year + '</div>' +
      '<div class="mgc-figs"><div class="mgc-actual">RM ' + fmt(yg.yearlyActual) + '</div><div class="mgc-of">of RM ' + fmt(yg.yearlyTarget) + '</div></div>' +
      '<div class="home-goal-track"><div style="width:' + yPct + '%"></div></div>' +
      '<div class="mgc-month-cap">This month\'s quota (' + esc(curPeriod) + ')</div>' +
      '<div class="mgc-figs"><div class="mgc-actual mgc-actual-sm">RM ' + fmt(thisMonth ? thisMonth.actual : 0) + '</div><div class="mgc-of">of RM ' + fmt(thisMonth ? thisMonth.target : 0) + '</div></div>' +
      '<div class="home-goal-track"><div style="width:' + mPct + '%"></div></div>' +
      '<div class="mgc-bars">' + bars + '</div>' +
      '<div class="mgc-bars-hint">Tap a month to adjust for busy/slow seasons</div>' +
      '<div class="me-goal-btn-row">' +
        '<button class="me-set-goal-btn" id="btn-set-yearly-goal">Edit yearly quota</button>' +
        '<button class="me-set-goal-btn me-goal-btn-danger" id="btn-remove-yearly-goal">Remove</button>' +
      '</div>' +
    '</div>';
  }

  function loadMeSnapshot() {
    fetch(API_BASE + '/api/agent/me-snapshot').then(function (res) { return res.json(); }).then(function (data) {
      var goalCard = document.getElementById('me-goal-card');
      if (goalCard) goalCard.innerHTML = renderYearlyGoalCard(data.yearlyGoal, data.ytdSalesActual);
      maybeShowCarryForwardPrompt(data.yearlyGoal);

      var teamCard = document.getElementById('me-team-card');
      if (teamCard) {
        if (data.team && data.team.goalCount > 0) {
          var tpct = data.team.targetTotal > 0 ? Math.min(100, Math.round(data.team.actualTotal / data.team.targetTotal * 100)) : 0;
          teamCard.innerHTML =
            '<div class="me-team-card">' +
              '<div class="me-team-cap">Your team\'s attainment · ' + data.team.goalCount + ' with goals set</div>' +
              '<div class="me-team-figs"><div class="me-team-actual">RM ' + fmt(data.team.actualTotal) + '</div>' +
                '<div class="me-team-of">of RM ' + fmt(data.team.targetTotal) + '</div></div>' +
              '<div class="me-team-track"><div style="width:' + tpct + '%"></div></div>' +
              '<div class="me-team-note">' + data.team.memberCount + ' team member(s) total</div>' +
            '</div>';
        } else if (data.team) {
          teamCard.innerHTML = '';
        } else {
          teamCard.innerHTML = '';
        }
      }

      renderMeSelfPerfMatrix(data);
    }).catch(function (err) { dbg('me snapshot failed: ' + err); });
  }

  // Year-over-year quota trend -- a line chart comparing monthly quota
  // actuals between a selected year and the one before it, as a simple
  // performance indicator (not a goal-comparison figure). Only shown once
  // a yearly quota exists, same gate as before.
  function renderMeSelfPerfMatrix(data) {
    var el = qs('me-self-perf-matrix');
    if (!el) return;

    if (!data.yearlyGoal) { el.innerHTML = ''; return; }

    var currentYear = new Date().getFullYear();
    var years = [currentYear, currentYear - 1, currentYear - 2];
    el.innerHTML =
      '<div class="tpm-tile tpm-tile-wide">' +
        '<div class="tpm-tile-label">Quota trend</div>' +
        '<div class="qtrend-year-btns">' +
          years.map(function (y, i) {
            return '<button class="qtrend-year-btn' + (i === 0 ? ' active' : '') + '" data-base-year="' + y + '">' + y + ' vs ' + (y - 1) + '</button>';
          }).join('') +
        '</div>' +
        '<div id="qtrend-chart"></div>' +
        '<div class="qtrend-legend">' +
          '<span class="qtrend-legend-item"><span class="qtrend-swatch qtrend-swatch-now"></span>' + currentYear + '</span>' +
          '<span class="qtrend-legend-item"><span class="qtrend-swatch qtrend-swatch-prev"></span>' + (currentYear - 1) + '</span>' +
        '</div>' +
      '</div>';
    loadQuotaHistory(currentYear);
  }

  function loadQuotaHistory(baseYear) {
    var chartEl = qs('qtrend-chart');
    if (chartEl) chartEl.innerHTML = '<div class="home-empty">Loading…</div>';
    fetch(API_BASE + '/api/agent/quota-history?baseYear=' + baseYear).then(function (res) { return res.json(); }).then(function (data) {
      renderQuotaChart(data.pairs || []);
      var legend = document.querySelectorAll('.qtrend-legend-item');
      if (legend[0]) legend[0].lastChild.textContent = ' ' + baseYear;
      if (legend[1]) legend[1].lastChild.textContent = ' ' + (baseYear - 1);
    }).catch(function (err) { dbg('quota history fetch failed: ' + err); });
  }

  // Plain SVG polylines -- no charting library in this app. Two lines (this
  // year, prior year) across 12 months, y-scaled to whichever pair has the
  // higher peak so both are readable on the same axis.
  function renderQuotaChart(pairs) {
    var chartEl = qs('qtrend-chart');
    if (!chartEl) return;
    var nowPair = pairs[0] || { months: new Array(12).fill(0) };
    var prevPair = pairs[1] || { months: new Array(12).fill(0) };
    var allValues = nowPair.months.concat(prevPair.months);
    var maxVal = Math.max.apply(null, allValues.concat([1])); // avoid /0

    var W = 300, H = 110, padL = 4, padR = 4, padT = 8, padB = 16;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    function xAt(i) { return padL + (plotW * i) / 11; }
    function yAt(v) { return padT + plotH - (plotH * v) / maxVal; }

    function pathFor(months) {
      return months.map(function (v, i) { return (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ',' + yAt(v).toFixed(1); }).join(' ');
    }
    function dotsFor(months, cls) {
      return months.map(function (v, i) {
        return '<circle class="' + cls + '" cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(v).toFixed(1) + '" r="2.2"></circle>';
      }).join('');
    }
    var monthLabels = MONTH_ABBR.map(function (m, i) {
      return '<text class="qtrend-axis-label" x="' + xAt(i).toFixed(1) + '" y="' + (H - 2) + '" text-anchor="middle">' + m.charAt(0) + '</text>';
    }).join('');

    chartEl.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="qtrend-svg" preserveAspectRatio="none">' +
        '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (padL + plotW) + '" y2="' + (padT + plotH) + '" class="qtrend-axis-line"></line>' +
        '<path d="' + pathFor(prevPair.months) + '" class="qtrend-line qtrend-line-prev"></path>' +
        '<path d="' + pathFor(nowPair.months) + '" class="qtrend-line qtrend-line-now"></path>' +
        dotsFor(prevPair.months, 'qtrend-dot-prev') +
        dotsFor(nowPair.months, 'qtrend-dot-now') +
        monthLabels +
      '</svg>';
  }

  // Renders one quote row -- status control, Edit, Delete, closed-item
  // breakdown -- shared between the Me tab's flat quote list and the Leads
  // tab's per-lead expanded quote history, so there's exactly one place
  // this markup and its behavior are defined.
  function renderQuoteRow(q) {
    var label = esc(q.product || q.site || 'Quotation');
    var ref = esc((q.site || '') + '|' + (q.product || '') + '|' + (q.section || '') + '|' + q.id);
    var rawName  = q.customer_name || '';
    var rawPhone = q.customer_phone || '';
    var custName  = rawName ? esc(rawName) : 'No customer name';
    var itemsArr = Array.isArray(q.items) ? q.items : [];
    var itemsAttr = esc(JSON.stringify(itemsArr));
    var waLink = toWaLink(rawPhone);
    var phoneHtml = rawPhone
      ? (waLink ? '<a class="mqr-wa-link" href="' + esc(waLink) + '" target="_blank" rel="noopener noreferrer">💬 ' + esc(rawPhone) + '</a>' : esc(rawPhone))
      : '';
    var statusOpts = ['followup', 'lost', 'closed'];
    var statusLabels = { followup: 'Follow-up', lost: 'Lost Sales', closed: 'Close Sales' };
    var effectiveStatus = q.status || 'followup'; // unset quotes default to Follow-up, no blank placeholder
    var isClosed = effectiveStatus === 'closed';
    // Once closed, the status is final -- no reselecting back to Follow-up/Lost,
    // and no Delete, so a real sale record can't be accidentally lost or reopened.
    var statusControl = isClosed
      ? '<span class="mqr-status-sel st-closed mqr-status-locked">' + statusLabels.closed + '</span>'
      : '<select class="mqr-status-sel st-' + effectiveStatus + '" data-ref="' + ref + '" data-label="' + label + '" data-items="' + itemsAttr + '" data-net-total="' + (q.net_total || 0) + '">'
        + statusOpts.map(function (v) {
            return '<option value="' + v + '"' + (effectiveStatus === v ? ' selected' : '') + '>' + statusLabels[v] + '</option>';
          }).join('')
        + '</select>';
    var closedItemsArr = Array.isArray(q.closed_items) ? q.closed_items : [];
    var hasClosedItems = isClosed && closedItemsArr.length > 0;
    var closedTotal = hasClosedItems
      ? closedItemsArr.reduce(function (sum, it) { return sum + (it.amount || 0); }, 0)
      : 0;
    var displayAmount = hasClosedItems ? closedTotal : (q.net_total || 0);
    var line1Parts = [esc(q.site || '')];
    if (!hasClosedItems) {
      if (label) line1Parts.push(label);
      if (q.section) line1Parts.push(esc(q.section));
    }
    var line1 = line1Parts.filter(Boolean).join(' · ') + ' · <span class="mqr-amount">RM ' + fmt(displayAmount) + '</span>';
    var closedItemsHtml = hasClosedItems
      ? '<div class="mqr-closed-items">' + closedItemsArr.map(function (it) {
          return '<div class="mqr-closed-item-row"><span>' + esc(it.label || '') + '</span><span>RM ' + fmt(it.amount || 0) + '</span></div>';
        }).join('') + '</div>'
      : '';
    // Once closed, the date line swaps meaning: the raw created_at/valid_until
    // columns stay untouched (needed elsewhere for audit/sorting) but the
    // agent-facing display shows when the sale actually closed and when the
    // last instalment is due, instead of when the quote was first generated.
    var dateStr, validStr;
    if (isClosed) {
      dateStr = q.closed_at ? 'Closed ' + new Date(q.closed_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      validStr = q.last_instalment_date ? 'Last instalment ' + new Date(q.last_instalment_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    } else {
      dateStr = q.created_at ? new Date(q.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      validStr = q.valid_until ? 'Valid until ' + new Date(q.valid_until).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '';
    }
    var line2 = esc(dateStr) + (validStr ? ' · ' + esc(validStr) : '');
    return '<div class="me-quote-row">' +
      '<div class="mqr-cust">' + custName + '</div>' +
      (phoneHtml ? '<div class="mqr-phone-row">' + phoneHtml + '</div>' : '') +
      '<div class="mqr-main">' + line1 + '</div>' +
      closedItemsHtml +
      '<div class="mqr-meta">' + line2 + '</div>' +
      '<div class="mqr-actions">' +
        '<button class="mqr-edit-btn" data-ref="' + ref + '" data-name="' + esc(rawName) + '" data-phone="' + esc(rawPhone) + '">✎ Edit</button>' +
        '<button class="mqr-view-btn" data-quote-id="' + esc(q.id) + '">📄 View Quote</button>' +
        statusControl +
        (isClosed ? '' : '<button class="mqr-delete-btn" data-ref="' + ref + '">🗑 Delete</button>') +
      '</div>' +
    '</div>';
  }

  // Shows the exact quote table as it was rendered at Share time -- fetched
  // lazily (not part of the list payload, since snapshots can be sizable).
  // Older quotes generated before this feature has no saved copy.
  function openQuoteSnapshotView(quoteId) {
    var backdrop = qs('quote-snapshot-backdrop');
    var body = qs('quote-snapshot-body');
    if (!backdrop || !body) return;
    body.innerHTML = '<div class="home-empty">Loading…</div>';
    backdrop.classList.add('open');
    fetch(API_BASE + '/api/agent/quote-snapshot?id=' + encodeURIComponent(quoteId)).then(function (res) { return res.json(); }).then(function (data) {
      body.innerHTML = data.html
        ? '<div class="qt-scroll">' + data.html + '</div>'
        : '<div class="home-empty">No saved copy for this quote — it was generated before this feature was added.</div>';
    }).catch(function (err) {
      dbg('quote snapshot fetch failed: ' + err);
      body.innerHTML = '<div class="home-empty">Could not load this quote.</div>';
    });
  }

  function closeQuoteSnapshotView() {
    var backdrop = qs('quote-snapshot-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  // ── Print flow ────────────────────────────────────────────────
  // Split out of the old btn-pdf handler so the Customer Info modal can
  // trigger the actual print/PDF step after (optionally) capturing who
  // the quote is for -- printing itself is unchanged either way.
  function doPrintFlow() {
    var prevTitle = document.title;
    document.title = '';
    var pd = qs('print-date');
    if (pd) pd.textContent = new Date().toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' });
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      window.Capacitor.Plugins.NativePrint.print().catch(function (err) {
        dbg('Native print failed: ' + (err && err.message ? err.message : err));
      }).then(function () {
        document.title = prevTitle;
      });
    } else {
      window.print();
      setTimeout(function () { document.title = prevTitle; }, 500);
    }
  }

  function openCustomerInfoModal() {
    var nameEl = qs('customer-info-name');
    var phoneEl = qs('customer-info-phone');
    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    hideCustomerNameSuggestions();
    var backdrop = qs('customer-info-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
    // Fetch fresh each time (cheap) so a lead added moments ago is searchable.
    fetch(API_BASE + '/api/agent/leads-snapshot').then(function (res) { return res.json(); }).then(function (data) {
      _leadsCache = data.leads || [];
    }).catch(function (err) { dbg('leads fetch for autocomplete failed: ' + err); });
  }

  function closeCustomerInfoModal() {
    var backdrop = qs('customer-info-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
    hideCustomerNameSuggestions();
  }

  // Typing a customer name on the Share flow looks it up against the
  // agent's own Leads list -- picking a match auto-fills the phone number
  // instead of the agent having to type/remember it.
  function renderCustomerNameSuggestions(filterText) {
    var listEl = qs('customer-name-suggest-list');
    if (!listEl) return;
    var filt = (filterText || '').trim().toLowerCase();
    if (!filt) { listEl.classList.remove('show'); listEl.innerHTML = ''; return; }
    var matches = _leadsCache.filter(function (l) {
      return (l.name || '').toLowerCase().indexOf(filt) >= 0;
    }).slice(0, 8);
    if (!matches.length) { listEl.classList.remove('show'); listEl.innerHTML = ''; return; }
    listEl.innerHTML = matches.map(function (l) {
      return '<div class="cns-item" data-name="' + esc(l.name || '') + '" data-phone="' + esc(l.phone || '') + '">' +
        esc(l.name || '') + (l.phone ? '<span class="cns-item-phone">' + esc(l.phone) + '</span>' : '') +
      '</div>';
    }).join('');
    listEl.classList.add('show');
  }

  function hideCustomerNameSuggestions() {
    var listEl = qs('customer-name-suggest-list');
    if (listEl) { listEl.classList.remove('show'); listEl.innerHTML = ''; }
  }

  // Customer name/phone are optional -- this always proceeds to log +
  // print, whether the fields were filled in or left blank.
  function confirmCustomerInfoAndShare() {
    var nameEl = qs('customer-info-name');
    var phoneEl = qs('customer-info-phone');
    var customerName = nameEl ? nameEl.value.trim() : '';
    var customerPhone = phoneEl ? phoneEl.value.trim() : '';
    closeCustomerInfoModal();

    // Build the per-item breakdown + real total (was never actually sent
    // before) + earliest promo expiry across the quoted items, from the
    // same data already driving the printed quote table.
    var items = [];
    var total = 0;
    var earliestValidUntil = null;
    lotQuotes.forEach(function (q) {
      var amt = 0;
      try { amt = calcMatrix(q.levelData, dpPct).netTotalPrice; } catch (e) {}
      total += amt;
      var promo = q.levelData && q.levelData.promo;
      // PV commission inputs, captured at quote time off the same levelData
      // used to price the quote -- avoids re-matching a lot code back to a
      // price row later, which is fragile across burial/niche/pedestal/etc.
      items.push({
        label: q.lotCode || '', amount: amt,
        pv: (q.levelData && q.levelData.point_value) || 0,
        preNeedPrice: (q.levelData && q.levelData.pre_need_price) || 0,
        trust: (q.levelData && q.levelData.trust_account_facility) || 0,
        backwall: (q.levelData && q.levelData.backwall_cost) || 0,
        category: (q.levelData && q.levelData.product_category) || '',
        discPct: (promo && promo.discount_pct) || 0,
        discRm: (promo && promo.discount_rm) || 0,
        instalMonths: (promo && promo.max_instalment_months) || 0
      });
      var promoEnd = promo && promo.promo_end_date;
      if (promoEnd && (!earliestValidUntil || promoEnd < earliestValidUntil)) earliestValidUntil = promoEnd;
    });

    // Snapshot the exact rendered quote table -- viewing it later (Me/Leads
    // tab) shows byte-for-byte what the customer actually saw, unaffected
    // by any later pricing/promo/rendering changes.
    var quoteBodyEl = document.getElementById('quote-body');
    var quoteSnapshotHtml = quoteBodyEl ? quoteBodyEl.innerHTML : '';

    fetch(API_BASE + '/api/agent/home-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: site, product: product, section: lotQuotes.length + ' lot(s)',
        netTotal: total, customerName: customerName, customerPhone: customerPhone,
        validUntil: earliestValidUntil, items: items, quoteSnapshotHtml: quoteSnapshotHtml,
      }),
    }).then(function () { _homeSnapshotLoaded = false; }).catch(function (err) { dbg('log quote failed: ' + err); });

    // Share is independent of Print -- the agent already saved a PDF via
    // the separate Print button, in whatever order they chose. This just
    // opens a WhatsApp chat with the given contact so the agent can tap
    // the paperclip and attach the PDF they already have.
    var waLink = toWaLink(customerPhone);
    if (waLink) window.open(waLink, '_blank');
  }

  var _soldModalMode = 'manual'; // 'checklist' when the quote has itemized data, else 'manual'

  // Quotes logged with itemized data show a checklist (pick which items were
  // actually sold, amount sums itself); older quotes logged before that data
  // existed fall back to the original manual-amount entry.
  // Follow-up / Lost are direct status updates (no amount involved); Close
  // goes through the existing Sold checklist instead, since that path needs
  // an amount and already sets status='closed' itself. If the checklist is
  // cancelled, the dropdown's own selection is left as-is on screen until
  // the next refresh reflects the real (unchanged) status -- harmless, since
  // nothing was actually written.
  function applyQuoteStatus(selEl, ref, newStatus) {
    if (newStatus === 'closed') {
      openSoldModal(ref, selEl.dataset.label, parseFloat(selEl.dataset.netTotal) || 0, selEl.dataset.items);
      return;
    }
    selEl.className = 'mqr-status-sel' + (newStatus ? ' st-' + newStatus : '');
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_status', quotationRef: ref, status: newStatus }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      _meLoaded = false;
      loadMeSnapshot();
      _leadsLoaded = false;
      loadLeadsSnapshot();
    }).catch(function (err) { dbg('update status failed: ' + err); });
  }

  function openEditCustomerModal(ref, name, phone) {
    _editCustomerRef = ref;
    var nameEl = qs('edit-customer-name');
    var phoneEl = qs('edit-customer-phone');
    if (nameEl) nameEl.value = name || '';
    if (phoneEl) phoneEl.value = phone || '';
    var backdrop = qs('edit-customer-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeEditCustomerModal() {
    _editCustomerRef = null;
    var backdrop = qs('edit-customer-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function confirmEditCustomer() {
    if (!_editCustomerRef) return;
    var nameEl = qs('edit-customer-name');
    var phoneEl = qs('edit-customer-phone');
    var customerName = nameEl ? nameEl.value.trim() : '';
    var customerPhone = phoneEl ? phoneEl.value.trim() : '';
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_customer', quotationRef: _editCustomerRef, customerName: customerName, customerPhone: customerPhone }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      closeEditCustomerModal();
      _meLoaded = false;
      loadMeSnapshot();
      _leadsLoaded = false;
      loadLeadsSnapshot();
    }).catch(function (err) { dbg('update customer failed: ' + err); });
  }

  function openSoldModal(ref, label, netTotal, itemsJson) {
    _soldModalRef = ref;
    _soldModalSubmitting = false;
    var confirmBtnReset = qs('sold-modal-confirm');
    if (confirmBtnReset) confirmBtnReset.disabled = false;
    var sub = document.getElementById('sold-modal-sub');
    if (sub) sub.textContent = label || '';

    var items = [];
    try { items = JSON.parse(itemsJson || '[]'); } catch (e) {}

    var itemsWrap  = document.getElementById('sold-modal-items-wrap');
    var manualWrap = document.getElementById('sold-modal-manual-wrap');
    var listEl     = document.getElementById('sold-modal-items');

    if (items.length && listEl) {
      _soldModalMode = 'checklist';
      listEl.innerHTML = items.map(function (it, i) {
        var itLabel = it.label || ('Item ' + (i + 1));
        return '<label class="sold-item-row">'
          + '<input type="checkbox" class="sold-item-check" data-amt="' + (it.amount || 0) + '" data-label="' + esc(itLabel)
          + '" data-pv="' + (it.pv || 0) + '" data-pre-need-price="' + (it.preNeedPrice || 0) + '" data-trust="' + (it.trust || 0) + '" data-backwall="' + (it.backwall || 0)
          + '" data-category="' + esc(it.category || '') + '" data-disc-pct="' + (it.discPct || 0) + '" data-disc-rm="' + (it.discRm || 0)
          + '" data-instal-months="' + (it.instalMonths || 0) + '"'
          + ' checked />'
          + '<span class="sold-item-label">' + esc(itLabel) + '</span>'
          + '<span class="sold-item-amt">RM ' + fmt(it.amount || 0) + '</span>'
          + '</label>';
      }).join('');
      if (itemsWrap) itemsWrap.style.display = '';
      if (manualWrap) manualWrap.style.display = 'none';
      updateSoldModalTotal();
    } else {
      _soldModalMode = 'manual';
      var amt = document.getElementById('sold-modal-amount');
      if (amt) amt.value = netTotal ? netTotal : '';
      if (itemsWrap) itemsWrap.style.display = 'none';
      if (manualWrap) manualWrap.style.display = '';
    }

    var backdrop = document.getElementById('sold-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function updateSoldModalTotal() {
    var total = 0;
    document.querySelectorAll('.sold-item-check:checked').forEach(function (cb) {
      total += parseFloat(cb.dataset.amt) || 0;
    });
    var totalEl = document.getElementById('sold-modal-total');
    if (totalEl) totalEl.textContent = 'RM ' + fmt(total);
  }

  function closeSoldModal() {
    _soldModalRef = null;
    var backdrop = document.getElementById('sold-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  var _soldModalSubmitting = false;

  function confirmSold() {
    if (_soldModalSubmitting) return; // guards against a fast double-tap writing the sale twice
    var amount;
    var closedItems = [];
    if (_soldModalMode === 'checklist') {
      amount = 0;
      document.querySelectorAll('.sold-item-check:checked').forEach(function (cb) {
        var amt = parseFloat(cb.dataset.amt) || 0;
        amount += amt;
        closedItems.push({
          label: cb.dataset.label || '', amount: amt,
          pv: parseFloat(cb.dataset.pv) || 0,
          preNeedPrice: parseFloat(cb.dataset.preNeedPrice) || 0,
          trust: parseFloat(cb.dataset.trust) || 0,
          backwall: parseFloat(cb.dataset.backwall) || 0,
          category: cb.dataset.category || '',
          discPct: parseFloat(cb.dataset.discPct) || 0,
          discRm: parseFloat(cb.dataset.discRm) || 0,
          instalMonths: parseFloat(cb.dataset.instalMonths) || 0
        });
      });
      if (!_soldModalRef || !amount || amount <= 0) { alert('Select at least one item.'); return; }
    } else {
      var amt = document.getElementById('sold-modal-amount');
      amount = amt ? parseFloat(amt.value) : NaN;
      if (!_soldModalRef || !amount || amount <= 0) { alert('Enter a valid final amount.'); return; }
    }
    var confirmMsg = 'Are you sure this sale is confirmed?\n\nOnce marked Close Sales, it cannot be edited, changed, or deleted.';
    if (!window.confirm(confirmMsg)) return;
    _soldModalSubmitting = true;
    var confirmBtn = qs('sold-modal-confirm');
    if (confirmBtn) confirmBtn.disabled = true;
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotationRef: _soldModalRef, amount: amount, closedItems: closedItems })
    }).then(function (res) { return res.json(); }).then(function (data) {
      _soldModalSubmitting = false;
      if (confirmBtn) confirmBtn.disabled = false;
      if (data.error) { alert(data.error); return; }
      closeSoldModal();
      _meLoaded = false;
      loadMeSnapshot();
      _leadsLoaded = false;
      loadLeadsSnapshot();
    }).catch(function (err) {
      _soldModalSubmitting = false;
      if (confirmBtn) confirmBtn.disabled = false;
      dbg('mark sold failed: ' + err);
    });
  }

  var _monthGoalPeriod = null;

  function openMonthGoalModal(period, currentTarget, isLocked) {
    _monthGoalPeriod = period;
    var sub = qs('month-goal-modal-sub');
    if (sub) sub.textContent = period;
    var amt = qs('month-goal-modal-amount');
    if (amt) amt.value = currentTarget ? currentTarget : '';
    var unpinBtn = qs('month-goal-modal-unpin');
    if (unpinBtn) unpinBtn.style.display = isLocked ? '' : 'none';
    var backdrop = qs('month-goal-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeMonthGoalModal() {
    _monthGoalPeriod = null;
    var backdrop = qs('month-goal-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function confirmMonthGoal() {
    var amt = qs('month-goal-modal-amount');
    var target = amt ? parseFloat(amt.value) : NaN;
    if (!_monthGoalPeriod || isNaN(target) || target < 0) { alert('Enter a valid target amount.'); return; }
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_month_goal', period: _monthGoalPeriod, target_amount: target }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      closeMonthGoalModal();
      _meLoaded = false;
      loadMeSnapshot();
    }).catch(function (err) { dbg('set month goal failed: ' + err); });
  }

  // Unpins a month and folds it back into the equal-split pool with
  // whatever other months are still unlocked.
  function unpinMonthGoal() {
    if (!_monthGoalPeriod) return;
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlock_month_goal', period: _monthGoalPeriod }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      closeMonthGoalModal();
      _meLoaded = false;
      loadMeSnapshot();
    }).catch(function (err) { dbg('unlock month goal failed: ' + err); });
  }

  // Auto-shown once per load when a past month fell short and hasn't been
  // offered to the agent yet -- doesn't re-open on its own if already open.
  function maybeShowCarryForwardPrompt(yg) {
    var backdrop = qs('carry-forward-modal-backdrop');
    if (!backdrop || !yg || !yg.carryForward) return;
    if (backdrop.classList.contains('open')) return;
    var amtEl = qs('carry-forward-modal-amount');
    if (amtEl) amtEl.textContent = 'RM ' + fmt(yg.carryForward.amount);
    backdrop.classList.add('open');
  }

  function closeCarryForwardModal() {
    var backdrop = qs('carry-forward-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function respondCarryForward(accept) {
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: accept ? 'accept_carry_forward' : 'deny_carry_forward' }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      closeCarryForwardModal();
      if (data.error) { alert(data.error); return; }
      _meLoaded = false;
      loadMeSnapshot();
    }).catch(function (err) { dbg('carry forward response failed: ' + err); });
  }

  function openYearlyGoalModal() {
    var amt = qs('yearly-goal-modal-amount');
    if (amt) amt.value = '';
    var backdrop = qs('yearly-goal-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeYearlyGoalModal() {
    var backdrop = qs('yearly-goal-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function confirmYearlyGoal() {
    var amt = qs('yearly-goal-modal-amount');
    var annual = amt ? parseFloat(amt.value) : NaN;
    if (!annual || annual <= 0) { alert('Enter a valid yearly target amount.'); return; }
    fetch(API_BASE + '/api/agent/me-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_yearly_goal', annual_target: annual }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      closeYearlyGoalModal();
      _meLoaded = false;
      loadMeSnapshot();
    }).catch(function (err) { dbg('set yearly goal failed: ' + err); });
  }

  function openGoalModal(userId, label, isSelf) {
    _goalModalUserId = userId;
    _goalModalSelf = !!isSelf;
    var sub = document.getElementById('goal-modal-sub');
    var amt = document.getElementById('goal-modal-amount');
    if (sub) sub.textContent = label || '';
    if (amt) amt.value = '';
    var backdrop = document.getElementById('goal-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeGoalModal() {
    _goalModalUserId = null;
    _goalModalSelf = false;
    var backdrop = document.getElementById('goal-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function confirmGoal() {
    var amt = document.getElementById('goal-modal-amount');
    var amount = amt ? parseFloat(amt.value) : NaN;
    if ((!_goalModalSelf && !_goalModalUserId) || !amount || amount <= 0) { alert('Enter a valid target amount.'); return; }

    var url = API_BASE + (_goalModalSelf ? '/api/agent/me-snapshot' : '/api/agent/team-snapshot');
    var payload = _goalModalSelf
      ? { action: 'set_goal', target_amount: amount }
      : { user_id: _goalModalUserId, target_amount: amount };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      var wasSelf = _goalModalSelf;
      closeGoalModal();
      if (wasSelf) { _meLoaded = false; loadMeSnapshot(); }
      else { _teamLoaded = false; loadTeamSnapshot(); }
    }).catch(function (err) { dbg('set goal failed: ' + err); });
  }

  var _teamPerfCache = [];

  function loadTeamSnapshot() {
    var banner = document.getElementById('team-scope-banner');
    var listEl = document.getElementById('team-list');
    fetch(API_BASE + '/api/agent/team-snapshot').then(function (res) { return res.json(); }).then(function (data) {
      _teamPerfCache = data.performance || [];
      if (!data.access) {
        if (banner) banner.innerHTML = '';
        if (listEl) listEl.innerHTML = '<div class="home-empty">Team view isn&apos;t set up for your account yet. Ask an admin to assign your tier and leader in /users.</div>';
        return;
      }
      if (banner) {
        banner.textContent = data.scope === 'org'
          ? 'Showing the full organisation'
          : 'Showing your direct team';
      }
      if (listEl) {
        var leaderHtml = '';
        if (data.leaderChain && data.leaderChain.length) {
          leaderHtml = '<div class="team-leader-card">' +
            '<div class="team-leader-label">Reports to</div>' +
            data.leaderChain.map(function (l) {
              var lColor = TIER_COLOR[l.tier] || TIER_COLOR.AGENT;
              var lName = esc(l.display_name || l.agent_code || 'Leader');
              return '<div class="team-leader-row">' +
                '<span class="team-tier-badge" style="background:' + lColor.bg + ';color:' + lColor.fg + '">' + esc(l.tier) + '</span>' +
                '<span class="team-leader-name">' + lName + '</span>' +
                (l.agent_code ? '<span class="team-row-code">' + esc(l.agent_code) + '</span>' : '') +
              '</div>';
            }).join('') +
          '</div>';
        }
        var selfHtml = '';
        if (data.self) {
          var sColor = TIER_COLOR[data.self.tier] || TIER_COLOR.AGENT;
          var sName = esc(data.self.display_name || data.self.agent_code || 'You');
          selfHtml = '<div class="team-self-card">' +
            '<div class="team-leader-label">Your position</div>' +
            '<div class="team-leader-row">' +
              '<span class="team-tier-badge" style="background:' + sColor.bg + ';color:' + sColor.fg + '">' + esc(data.self.tier) + '</span>' +
              '<span class="team-leader-name">' + sName + '</span>' +
              (data.self.agent_code ? '<span class="team-row-code">' + esc(data.self.agent_code) + '</span>' : '') +
              '<span class="team-self-you-tag">You</span>' +
            '</div>' +
          '</div>';
        }
        if (!data.members || !data.members.length) {
          listEl.innerHTML = leaderHtml + selfHtml + '<div class="home-empty">No team members found yet.</div>';
        } else {
          listEl.innerHTML = leaderHtml + selfHtml + '<div class="team-section-label">Your team</div>' +
            data.members.map(function (m) { return renderTeamMemberNode(m); }).join('');
        }
      }
    }).catch(function (err) { dbg('team snapshot failed: ' + err); });
  }

  // A member with their own downline gets an expand/collapse toggle -- their
  // children render into a nested, initially-collapsed container so an SD's
  // whole subtree isn't dumped on screen at once; someone with no downline
  // (base-tier AGENT) has no toggle at all, since there's nothing to expand.
  function renderTeamMemberNode(m) {
    var color = TIER_COLOR[m.tier] || TIER_COLOR.AGENT;
    var name = esc(m.display_name || m.agent_code || 'Agent');
    var badge = '<span class="team-tier-badge" style="background:' + color.bg + ';color:' + color.fg + '">' + esc(m.tier) + '</span>';
    var setGoalBtn = '<button class="team-set-goal-btn" data-user-id="' + esc(m.user_id) + '" data-label="' + name + '">' + (m.goal ? 'Edit Quota' : 'Set Quota') + '</button>';
    var goalHtml;
    if (m.goal) {
      var pct = m.goal.target_amount > 0 ? Math.min(100, Math.round(m.goal.actual_amount / m.goal.target_amount * 100)) : 0;
      goalHtml =
        '<div class="team-goal-cap">Quota · ' + esc(m.goal.period) + '</div>' +
        '<div class="team-goal-figs"><span>RM ' + fmt(m.goal.actual_amount) + '</span><span>of RM ' + fmt(m.goal.target_amount) + '</span></div>' +
        '<div class="team-goal-track"><div style="width:' + pct + '%"></div></div>' +
        '<button class="team-remove-goal-btn" data-user-id="' + esc(m.user_id) + '">Remove quota</button>';
    } else {
      goalHtml = '<div class="team-no-goal">No quota set</div>';
    }
    var hasChildren = m.children && m.children.length > 0;
    var toggle = hasChildren
      ? '<button class="team-expand-toggle" aria-label="Expand team">▸ ' + m.children.length + '</button>'
      : '';
    var childrenHtml = hasChildren
      ? '<div class="team-children">' + m.children.map(function (c) { return renderTeamMemberNode(c); }).join('') + '</div>'
      : '';
    return '<div class="team-row">' +
      '<div class="team-row-top">' + badge +
        '<span class="team-row-name">' + name + '</span>' +
        (m.agent_code ? '<span class="team-row-code">' + esc(m.agent_code) + '</span>' : '') +
        toggle +
        setGoalBtn +
      '</div>' + goalHtml +
    '</div>' + childrenHtml;
  }

  // Team Performance table -- flat, sortable, filterable, printable view of
  // every descendant's sales vs quota and active status. Built from
  // _teamPerfCache (already fetched alongside the tree by loadTeamSnapshot,
  // no extra request needed).
  var _teamPerfSortCol = 'display_name';
  var _teamPerfSortDir = 'asc';

  function openTeamPerfView() {
    var view = qs('team-perf-view');
    if (view) view.classList.add('open');
    renderTeamPerfSalesTile();
    renderTeamPerfTable();
  }

  // Team's combined sales this period -- lives here, not Me tab, since it's
  // team data, not personal data. Summed from the same performance rows the
  // table below already has, no extra fetch needed.
  function renderTeamPerfSalesTile() {
    var el = qs('team-perf-sales-tile');
    if (!el) return;
    var now = new Date();
    var curPeriod = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var teamMonthActual = _teamPerfCache.reduce(function (sum, p) { return sum + (p.actual_amount || 0); }, 0);
    el.innerHTML = '<div class="tpm-tile">' +
      '<div class="tpm-tile-label">Team Quota · ' + esc(curPeriod) + '</div>' +
      '<div class="tpm-tile-value">RM ' + fmt(teamMonthActual) + '</div>' +
    '</div>';
  }

  function closeTeamPerfView() {
    var view = qs('team-perf-view');
    if (view) view.classList.remove('open');
  }

  function renderTeamPerfTable() {
    var tbody = qs('team-perf-tbody');
    if (!tbody) return;
    var searchEl = qs('team-perf-search');
    var tierEl = qs('team-perf-tier-filter');
    var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    var tierFilter = tierEl ? tierEl.value : '';

    var rows = _teamPerfCache.filter(function (r) {
      if (tierFilter && r.tier !== tierFilter) return false;
      if (!q) return true;
      var name = (r.display_name || '').toLowerCase();
      var code = (r.agent_code || '').toLowerCase();
      return name.indexOf(q) >= 0 || code.indexOf(q) >= 0;
    });

    rows = rows.map(function (r) {
      var pct = r.target_amount ? Math.round((r.actual_amount / r.target_amount) * 100) : null;
      return { r: r, pct: pct };
    });

    var col = _teamPerfSortCol;
    var dir = _teamPerfSortDir === 'asc' ? 1 : -1;
    rows.sort(function (a, b) {
      var av, bv;
      if (col === 'pct') { av = a.pct == null ? -1 : a.pct; bv = b.pct == null ? -1 : b.pct; }
      else if (col === 'active') { av = a.r.active ? 1 : 0; bv = b.r.active ? 1 : 0; }
      else if (col === 'actual_amount' || col === 'target_amount') { av = a.r[col] || 0; bv = b.r[col] || 0; }
      else { av = (a.r[col] || '').toString().toLowerCase(); bv = (b.r[col] || '').toString().toLowerCase(); }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px;">No matching team members.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (x) {
        var r = x.r;
        var name = esc(r.display_name || r.agent_code || 'Agent');
        var statusHtml = r.active
          ? '<span class="team-perf-status-active">Active</span>'
          : '<span class="team-perf-status-inactive">Inactive</span>';
        var pctText = x.pct == null ? '—' : x.pct + '%';
        return '<tr>' +
          '<td>' + name + '</td>' +
          '<td>' + esc(r.tier || '') + '</td>' +
          '<td>' + esc(r.agent_code || '—') + '</td>' +
          '<td>' + statusHtml + '</td>' +
          '<td>' + fmt(r.actual_amount || 0) + '</td>' +
          '<td>' + (r.target_amount != null ? fmt(r.target_amount) : '—') + '</td>' +
          '<td>' + pctText + '</td>' +
        '</tr>';
      }).join('');
    }

    document.querySelectorAll('#team-perf-table thead th').forEach(function (th) {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === _teamPerfSortCol) th.classList.add(_teamPerfSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    });
  }

  function printTeamPerf() {
    document.body.classList.add('printing-team-perf');
    window.print();
    setTimeout(function () { document.body.classList.remove('printing-team-perf'); }, 500);
  }

  // Reprint a past quote straight from its saved snapshot -- no need to dig
  // through the phone's own files for the original PDF.
  function printQuoteSnapshot() {
    document.body.classList.add('printing-quote-snapshot');
    window.print();
    setTimeout(function () { document.body.classList.remove('printing-quote-snapshot'); }, 500);
  }

  // Leads tab: a per-agent contact list, either typed in manually or
  // synced from the phone's own contacts via the Contacts native plugin.
  var _leadsCache = [];

  function loadLeadsSnapshot() {
    var listEl = document.getElementById('leads-list');
    fetch(API_BASE + '/api/agent/leads-snapshot').then(function (res) { return res.json(); }).then(function (data) {
      _leadsCache = data.leads || [];
      renderLeadsList();
    }).catch(function (err) { dbg('leads snapshot failed: ' + err); });
  }

  // A lead's status is never stored on the lead itself -- it's derived from
  // its linked quotes every time it's rendered, so there's exactly one
  // source of truth (the quote's own status) and no risk of the two
  // drifting out of sync.
  function deriveLeadStatus(quotes) {
    if (!quotes || !quotes.length) return { label: 'New lead', cls: 'st-new' };
    if (quotes.some(function (q) { return q.status === 'closed'; })) return { label: 'Closed', cls: 'st-closed' };
    if (quotes.every(function (q) { return q.status === 'lost'; })) return { label: 'Lost', cls: 'st-lost' };
    return { label: 'Following up', cls: 'st-followup' };
  }

  var LEAD_LABELS = { prospect: 'Prospect', hot: 'Hot Lead', cold: 'Cold Lead', customer: 'Customer' };
  var QUOTE_STATUS_LABELS = { followup: 'Follow-up', lost: 'Lost Sales', closed: 'Close Sales' };

  function csvField(v) {
    var s = v == null ? '' : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  // One row per lead, or per lead-quote pair if they have quotes -- opens
  // directly as real spreadsheet data in Excel/Google Sheets, not just a
  // printed table, since some agents specifically work that way.
  function exportLeadsCsv() {
    var header = ['Lead Name', 'Phone', 'Label', 'Next Follow-up', 'Notes',
      'Quote Site', 'Quote Zone/Product', 'Quote Lot/Section', 'Quote Price (RM)',
      'Quote Date', 'Valid Until', 'Quote Status'];
    var rows = [header];

    _leadsCache.forEach(function (l) {
      var base = [
        l.name || '', l.phone || '', LEAD_LABELS[l.label] || l.label || '',
        l.next_action_date || '', l.notes || '',
      ];
      var quotes = l.quotes || [];
      if (!quotes.length) {
        rows.push(base.concat(['', '', '', '', '', '', '']));
        return;
      }
      quotes.forEach(function (q) {
        var dateStr = q.created_at ? new Date(q.created_at).toLocaleDateString('en-MY') : '';
        var validStr = q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-MY') : '';
        var statusStr = QUOTE_STATUS_LABELS[q.status || 'followup'] || q.status || '';
        rows.push(base.concat([
          q.site || '', q.product || '', q.section || '', q.net_total || 0,
          dateStr, validStr, statusStr,
        ]));
      });
    });

    var csv = rows.map(function (row) { return row.map(csvField).join(','); }).join('\r\n');
    var filename = 'leads-report-' + new Date().toISOString().slice(0, 10) + '.csv';

    // A plain <a download> click is a no-op inside a bare Capacitor WebView
    // (no browser download manager to catch it) -- write the file to the
    // app's cache via the Filesystem plugin, then hand it to the native
    // Share sheet so the agent can save it to Drive, email it, or open it
    // straight in a spreadsheet app.
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      var Filesystem = window.Capacitor.Plugins.Filesystem;
      var Share = window.Capacitor.Plugins.Share;
      if (Filesystem && Share) {
        Filesystem.writeFile({ path: filename, data: '﻿' + csv, directory: 'CACHE', encoding: 'utf8' })
          .then(function (result) {
            return Share.share({ title: 'Leads Report', url: result.uri });
          })
          .catch(function (err) {
            dbg('export csv failed: ' + (err && err.message ? err.message : err));
            alert('Could not export CSV: ' + (err && err.message ? err.message : err));
          });
        return;
      }
    }

    // Web preview fallback (not used inside the installed app).
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function renderLeadsList() {
    var listEl = document.getElementById('leads-list');
    if (!listEl) return;
    if (!_leadsCache.length) {
      listEl.innerHTML = '<div class="home-empty">No leads yet — add one manually or sync from your phone contacts.</div>';
      return;
    }

    var searchEl = qs('leads-search');
    var labelFilterEl = qs('leads-label-filter');
    var sortEl = qs('leads-sort');
    var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    var labelFilter = labelFilterEl ? labelFilterEl.value : '';
    var sortBy = sortEl ? sortEl.value : 'recent';

    var rows = _leadsCache.filter(function (l) {
      if (labelFilter && (l.label || 'prospect') !== labelFilter) return false;
      if (!q) return true;
      var name = (l.name || '').toLowerCase();
      var phone = (l.phone || '').toLowerCase();
      return name.indexOf(q) >= 0 || phone.indexOf(q) >= 0;
    });

    rows = rows.slice().sort(function (a, b) {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'next_action') {
        var av = a.next_action_date || '9999-99-99';
        var bv = b.next_action_date || '9999-99-99';
        return av < bv ? -1 : av > bv ? 1 : 0;
      }
      return (b.created_at || '').localeCompare(a.created_at || ''); // recent first
    });

    if (!rows.length) {
      listEl.innerHTML = '<div class="home-empty">No leads match your search/filter.</div>';
      return;
    }

    var todayStr = new Date().toISOString().slice(0, 10);
    listEl.innerHTML = rows.map(function (l) {
      var waLink = toWaLink(l.phone || '');
      var phoneHtml = l.phone
        ? (waLink ? '<a class="mqr-wa-link" href="' + esc(waLink) + '" target="_blank" rel="noopener noreferrer">💬 ' + esc(l.phone) + '</a>' : esc(l.phone))
        : '<span class="lead-no-phone">No phone</span>';
      var sourceTag = l.source === 'contact_sync' ? '<span class="lead-source-tag">Synced</span>' : '';
      var lbl = l.label || 'prospect';
      var labelBadge = '<span class="lead-label-badge lbl-' + lbl + '">' + esc(LEAD_LABELS[lbl] || lbl) + '</span>';
      var quotes = l.quotes || [];
      var status = deriveLeadStatus(quotes);
      var statusBadge = '<span class="lead-status-badge ' + status.cls + '">' + status.label + '</span>';
      var nextActionHtml = l.next_action_date
        ? '<div class="lead-next-action' + (l.next_action_date < todayStr ? ' overdue' : '') + '">📅 Follow up ' + esc(new Date(l.next_action_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })) + (l.next_action_date < todayStr ? ' (overdue)' : '') + '</div>'
        : '';
      var notesHtml = l.notes ? '<div class="lead-notes">' + esc(l.notes) + '</div>' : '';
      var toggle = quotes.length
        ? '<button class="lead-expand-toggle" aria-label="Show quotes">▸ ' + quotes.length + ' quote' + (quotes.length > 1 ? 's' : '') + '</button>'
        : '';
      var quotesHtml = quotes.length
        ? '<div class="lead-quotes">' + quotes.map(renderQuoteRow).join('') + '</div>'
        : '';
      // Cross-sell suggestions only make sense once a lead has actually
      // bought something -- nothing to cross-sell against otherwise.
      var suggestBtn = status.cls === 'st-closed'
        ? '<button class="lead-suggest-toggle" data-id="' + esc(l.id) + '">🎯 Suggest Products</button>'
        : '';
      return '<div class="lead-row">' +
        '<div class="lead-row-top">' +
          '<span class="lead-name">' + esc(l.name || '') + '</span>' + sourceTag + labelBadge + statusBadge +
        '</div>' +
        '<div class="lead-phone-row">' + phoneHtml + '</div>' +
        nextActionHtml + notesHtml +
        '<div class="lead-actions-row">' +
          toggle + suggestBtn +
          '<button class="lead-edit-btn" data-id="' + esc(l.id) + '">✎ Edit</button>' +
          '<button class="lead-delete-btn" data-id="' + esc(l.id) + '" aria-label="Delete lead">🗑</button>' +
        '</div>' +
        '<div class="lead-suggestions" id="lead-suggest-' + esc(l.id) + '"></div>' +
      '</div>' + quotesHtml;
    }).join('');
  }

  // Complete pre-plan checklist: NLP/Burial Plot/Niche/Pedestal/EBL are auto-
  // ticked from what's actually been closed for this lead; Tomb and EC have
  // no data source to check against (see route comment) and always show
  // unticked with a note instead of guessing.
  //
  // Always re-fetches on open rather than caching -- the leads list fully
  // re-renders (fresh DOM) whenever a sale's status changes, which would
  // otherwise leave a stale "already loaded" flag pointing at a panel that
  // no longer has any content, showing an empty box on the next click.
  function toggleLeadSuggestions(leadId) {
    var panel = document.getElementById('lead-suggest-' + leadId);
    if (!panel) return;
    var opening = !panel.classList.contains('open');
    panel.classList.toggle('open', opening);
    if (!opening) return;
    panel.innerHTML = '<div class="home-empty">Loading…</div>';
    fetch(API_BASE + '/api/agent/lead-product-suggestions?leadId=' + encodeURIComponent(leadId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var checklist = data.checklist || [];
        if (!checklist.length) {
          panel.innerHTML = '<div class="home-empty">No product data captured for this lead\'s closed sale yet — only sales closed after this feature shipped can be matched.</div>';
          return;
        }
        panel.innerHTML = '<div class="lead-suggest-title">Complete pre-plan checklist</div>' +
          checklist.map(function (c) {
            return '<label class="lead-suggest-row' + (c.trackable ? '' : ' untrackable') + '">' +
              '<input type="checkbox" disabled' + (c.alreadySold ? ' checked' : '') + ' />' +
              '<span class="lead-suggest-label">' + esc(c.label) + '</span>' +
              (c.note ? '<span class="lead-suggest-note">' + esc(c.note) + '</span>' : '') +
            '</label>';
          }).join('');
      }).catch(function (err) {
        dbg('lead suggestions fetch failed: ' + err);
        panel.innerHTML = '<div class="home-empty">Could not load suggestions.</div>';
      });
  }

  // Same modal serves Add and Edit -- passing a leadId pre-fills every field
  // from that lead's current data and switches confirmAddLead() to update
  // instead of insert.
  function openAddLeadModal(leadId) {
    var lead = leadId ? _leadsCache.find(function (l) { return l.id === leadId; }) : null;
    var titleEl = qs('add-lead-modal-title');
    if (titleEl) titleEl.textContent = lead ? 'Edit Lead' : 'Add Lead';
    var idEl = qs('add-lead-edit-id');
    if (idEl) idEl.value = lead ? lead.id : '';
    var nameEl = qs('add-lead-name');
    var phoneEl = qs('add-lead-phone');
    var labelEl = qs('add-lead-label');
    var nextActionEl = qs('add-lead-next-action');
    var notesEl = qs('add-lead-notes');
    if (nameEl) nameEl.value = lead ? (lead.name || '') : '';
    if (phoneEl) phoneEl.value = lead ? (lead.phone || '') : '';
    if (labelEl) labelEl.value = lead ? (lead.label || 'prospect') : 'prospect';
    if (nextActionEl) nextActionEl.value = lead ? (lead.next_action_date || '') : '';
    if (notesEl) notesEl.value = lead ? (lead.notes || '') : '';
    var backdrop = qs('add-lead-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeAddLeadModal() {
    var backdrop = qs('add-lead-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function confirmAddLead() {
    var idEl = qs('add-lead-edit-id');
    var nameEl = qs('add-lead-name');
    var phoneEl = qs('add-lead-phone');
    var labelEl = qs('add-lead-label');
    var nextActionEl = qs('add-lead-next-action');
    var notesEl = qs('add-lead-notes');
    var editId = idEl ? idEl.value : '';
    var name = nameEl ? nameEl.value.trim() : '';
    var phone = phoneEl ? phoneEl.value.trim() : '';
    var label = labelEl ? labelEl.value : 'prospect';
    var nextActionDate = nextActionEl ? nextActionEl.value : '';
    var notes = notesEl ? notesEl.value.trim() : '';
    if (!name) { alert('Enter a name.'); return; }
    fetch(API_BASE + '/api/agent/leads-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: editId ? 'update_lead' : 'add_lead',
        id: editId || undefined,
        name: name, phone: phone, label: label, nextActionDate: nextActionDate, notes: notes,
      }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      closeAddLeadModal();
      loadLeadsSnapshot();
    }).catch(function (err) { dbg('save lead failed: ' + err); });
  }

  // Friction scales with what's actually at risk: an empty synced contact
  // is low-stakes, but a lead with a closed sale carries real customer
  // contact info an agent shouldn't be able to lose with one tap.
  function deleteLead(id) {
    var lead = _leadsCache.find(function (l) { return l.id === id; });
    var quotes = (lead && lead.quotes) || [];
    var hasClosed = quotes.some(function (q) { return q.status === 'closed'; });

    if (hasClosed) {
      alert('This lead has a closed sale on record -- it can\'t be deleted. Use Edit if something needs correcting.');
      return;
    }
    var msg = quotes.length
      ? 'This lead has ' + quotes.length + ' quote' + (quotes.length > 1 ? 's' : '') + ' on record. Deleting the lead removes their contact info -- the quotes themselves stay in Me tab. Continue?'
      : 'Delete this lead?';
    if (!confirm(msg)) return;
    fetch(API_BASE + '/api/agent/leads-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_lead', id: id }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      loadLeadsSnapshot();
    }).catch(function (err) { dbg('delete lead failed: ' + err); });
  }

  // ── Contact sync ──────────────────────────────────────────────────────
  var _pickedContacts = []; // full list fetched from the phone, before selection
  var _contactSelection = {}; // contactId -> boolean

  function syncPhoneContacts() {
    if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
      alert('Contact sync only works inside the installed app, not this preview.');
      return;
    }
    var Contacts = window.Capacitor.Plugins.Contacts;
    if (!Contacts) { alert('Contacts plugin not available.'); return; }
    Contacts.checkPermissions().then(function (status) {
      if (status.contacts === 'granted') return true;
      return Contacts.requestPermissions().then(function (s2) { return s2.contacts === 'granted'; });
    }).then(function (granted) {
      if (!granted) { alert('Contacts permission was denied.'); return; }
      return Contacts.getContacts({ projection: { name: true, phones: true } });
    }).then(function (result) {
      if (!result) return;
      _pickedContacts = (result.contacts || []).filter(function (c) {
        return c.name && c.name.display;
      });
      _contactSelection = {};
      openContactPickerModal();
    }).catch(function (err) {
      var msg = (err && (err.message || err.errorMessage)) || String(err);
      dbg('contact sync failed: ' + msg);
      alert('Could not read contacts: ' + msg);
    });
  }

  function openContactPickerModal() {
    renderContactPickerList('');
    var searchEl = qs('contact-picker-search');
    if (searchEl) searchEl.value = '';
    var backdrop = qs('contact-picker-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeContactPickerModal() {
    var backdrop = qs('contact-picker-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function renderContactPickerList(filterText) {
    var listEl = qs('contact-picker-list');
    if (!listEl) return;
    var filt = (filterText || '').toLowerCase();
    var rows = _pickedContacts.filter(function (c) {
      return !filt || (c.name.display || '').toLowerCase().indexOf(filt) >= 0;
    });
    if (!rows.length) {
      listEl.innerHTML = '<div class="home-empty">No contacts found.</div>';
      return;
    }
    listEl.innerHTML = rows.map(function (c) {
      var phone = (c.phones && c.phones[0] && c.phones[0].number) || '';
      var checked = _contactSelection[c.contactId] ? ' checked' : '';
      return '<label class="contact-pick-row">' +
        '<input type="checkbox" class="contact-pick-check" data-id="' + esc(c.contactId) + '"' + checked + ' />' +
        '<span class="contact-pick-name">' + esc(c.name.display || '') + '</span>' +
        '<span class="contact-pick-phone">' + esc(phone) + '</span>' +
      '</label>';
    }).join('');
  }

  function confirmContactImport() {
    var contacts = [];
    _pickedContacts.forEach(function (c) {
      if (!_contactSelection[c.contactId]) return;
      var phone = (c.phones && c.phones[0] && c.phones[0].number) || '';
      contacts.push({ name: c.name.display || '', phone: phone });
    });
    if (!contacts.length) { alert('Select at least one contact.'); return; }
    fetch(API_BASE + '/api/agent/leads-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_import', contacts: contacts }),
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (data.error) { alert(data.error); return; }
      closeContactPickerModal();
      loadLeadsSnapshot();
    }).catch(function (err) { dbg('import contacts failed: ' + err); });
  }

  function loadHomeSnapshot() {
    fetch(API_BASE + '/api/agent/home-snapshot').then(function (res) { return res.json(); }).then(function (data) {
      var goalCard = document.getElementById('home-goal-card');
      if (goalCard) {
        if (data.goal) {
          var pct = data.goal.target_amount > 0 ? Math.min(100, Math.round(data.goal.actual_amount / data.goal.target_amount * 100)) : 0;
          goalCard.innerHTML =
            '<div class="home-goal">' +
              '<div class="home-goal-cap">Quota · ' + esc(data.goal.period) + '</div>' +
              '<div class="home-goal-figs"><div class="home-goal-actual">RM ' + fmt(data.goal.actual_amount) + '</div>' +
                '<div class="home-goal-of">of RM ' + fmt(data.goal.target_amount) + '</div></div>' +
              '<div class="home-goal-track"><div style="width:' + pct + '%"></div></div>' +
            '</div>';
        } else {
          goalCard.innerHTML =
            '<div class="home-stat-row">' +
              '<div class="home-stat-card"><div class="home-stat-num">' + (data.quotesThisWeek || 0) + '</div><div class="home-stat-cap">Quotes this week</div></div>' +
            '</div>';
        }
      }

      var listEl = document.getElementById('home-recent-quotes');
      if (listEl) {
        if (!data.recentQuotes || !data.recentQuotes.length) {
          listEl.innerHTML = '<div class="home-empty">No quotes generated yet — they&apos;ll show up here once you print or share one.</div>';
        } else {
          listEl.innerHTML = data.recentQuotes.map(function (q) {
            var when = new Date(q.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
            return '<div class="home-quote-row">' +
              '<div><div class="hqr-main">' + esc(q.product || q.site || 'Quotation') + '</div>' +
              '<div class="hqr-sub">' + esc(q.site || '') + (q.section ? ' · ' + esc(q.section) : '') + '</div></div>' +
              '<div class="hqr-total">' + when + '</div>' +
            '</div>';
          }).join('');
        }
      }
    }).catch(function (err) { dbg('home snapshot failed: ' + err); });
  }

  // Both banners and the zone layout/quote live in one continuous scroll now --
  // these no longer toggle between two separate views (names kept since
  // applyDrawerSelection() and other call sites still call them; they just
  // handle the Filter Products data-fetch side now).
  function openAvailDrawer() {
    renderDrawer();
    if (!drawerState._typesFetched) fetchDrawerTypes();
  }

  function closeAvailDrawer() {}

  // Opens the memo drawer directly to the requested tab -- Price List and
  // Promo Memo are now two separate menu entries instead of one combined
  // "Price List & Promo Memo" item that required a second tap to switch tabs.
  function openMemoDrawer(tabId) {
    var backdrop = document.getElementById('memo-backdrop');
    var drawer = document.getElementById('memo-drawer');
    if (backdrop) backdrop.classList.add('open');
    if (drawer) drawer.classList.add('open');
    document.querySelectorAll('.memo-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tabId); });
    document.querySelectorAll('.memo-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'memo-panel-' + tabId); });
  }

  // Browse tab's sticky total bar -- shows a running count + net total the
  // moment a niche is picked, so Print is reachable without scrolling down
  // to the full quote card. Uses calcMatrix generically across lotQuotes;
  // close enough for a running summary even on the bespoke render branches
  // (NLP/combo/instant-case) -- the full quote card below is the source of truth.
  function updateBrowseStickyBar() {
    var bar = document.getElementById('browse-stickybar');
    if (!bar) return;
    if (!lotQuotes.length) { bar.style.display = 'none'; return; }
    var total = 0;
    lotQuotes.forEach(function (q) {
      try { total += calcMatrix(q.levelData, dpPct).netTotalPrice; } catch (e) {}
    });
    var countEl = document.getElementById('browse-sticky-count');
    var totalEl = document.getElementById('browse-sticky-total');
    if (countEl) countEl.textContent = lotQuotes.length + (lotQuotes.length === 1 ? ' niche selected' : ' niches selected');
    if (totalEl) totalEl.textContent = 'RM ' + fmt(total);
    bar.style.display = 'flex';
  }

  function promoTypeBadge(name) {
    if (!name) return '';
    var colour = name === 'Customer Promo' ? '#AAE571' : name === 'New Launch Promo' ? '#FB923C' : name === 'DRPlus Promo' ? '#FFFF00' : null;
    var bg = colour ? 'background:' + colour + ';color:#1a1a1a;' : 'background:transparent;color:#64748b;border:1px solid #cbd5e1;';
    return '<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;' + bg + '">' + esc(name) + '</span>';
  }

  function promoHighlightBadge(promo) {
    if (!promo || !promo.promo_name) return '';
    var name = promo.promo_name;
    var colour = name === 'Customer Promo' ? '#AAE571' : name === 'New Launch Promo' ? '#FB923C' : name === 'DRPlus Promo' ? '#FFFF00' : null;
    var dpPart = '';
    if (promo.dp_min != null) {
      dpPart = promo.dp_min === promo.dp_max ? promo.dp_min + '%DP' : promo.dp_min + '%~' + promo.dp_max + '%DP';
    }
    var discPart = '';
    if (promo.disc_min != null) {
      discPart = promo.disc_min === promo.disc_max ? promo.disc_min + '%disc' : promo.disc_min + '%~' + promo.disc_max + '%disc';
    }
    var detail = [dpPart, discPart].filter(Boolean).join(' / ');
    var label = name + (detail ? ' ' + detail : '');
    var bg = colour ? 'background:' + colour + ';color:#1a1a1a;' : 'background:transparent;color:#64748b;border:1px solid #cbd5e1;';
    return '<div style="margin-top:4px;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;display:inline-block;' + bg + '">' + esc(label) + '</div>';
  }

  function renderDrawer() {
    var c = document.getElementById('avail-content');
    if (!c) return;
    var html = '';

    // Step 1: Product Type
    html += '<div class="ad-card" style="margin-top:0">';
    html += '<div class="ad-label"><div class="ad-dot">1</div><span class="ad-title">Product Type</span>';
    if (drawerState.type) html += '<span class="ad-sub">' + esc(drawerState.typeLabel || drawerState.type) + '</span>';
    html += '</div><div class="ad-body"><div class="ad-chips" id="ad-type-chips"><div class="ad-loading">Loading…</div></div></div></div>';

    // Step 2: Site
    if (drawerState.type) {
      html += '<div class="ad-card"><div class="ad-label"><div class="ad-dot">2</div><span class="ad-title">Site</span>';
      if (drawerState.site) html += '<span class="ad-sub">' + esc(drawerState.site) + '</span>';
      html += '</div><div class="ad-body"><div class="ad-sites" id="ad-site-cards"><div class="ad-loading">Loading…</div></div></div></div>';
    }

    // Step 3: Available Zones
    if (drawerState.site) {
      html += '<div class="ad-card" id="ad-step-zones"><div class="ad-label"><div class="ad-dot">3</div><span class="ad-title">Available Zones</span>';
      if (drawerState._zoneResults && drawerState._zoneResults.length) html += '<span class="ad-sub">' + drawerState._zoneResults.length + ' found</span>';
      html += '</div><div class="ad-body">';
      if (drawerState._zonesLoading) {
        html += '<div class="ad-loading">Loading…</div>';
      } else if (!drawerState._zoneResults || !drawerState._zoneResults.length) {
        html += '<div class="ad-empty">No available lots found.</div>';
      } else {
        if (drawerState._sitePromos && drawerState._sitePromos.length) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
          drawerState._sitePromos.forEach(function(name) {
            html += promoTypeBadge(name);
          });
          html += '</div>';
        }
        html += '<div class="ad-sort-bar">';
        ['available','price_asc','price_desc'].forEach(function(s, i) {
          var lbl = ['Most Available','Cheapest First','Most Expensive'][i];
          html += '<div class="ad-sort' + (drawerState.sort === s ? ' on' : '') + '" data-sort="' + s + '">' + lbl + '</div>';
        });
        html += '</div><div class="ad-results">';
        drawerState._zoneResults.forEach(function(r, i) {
          var isOn = drawerState.selectedZone && drawerState.selectedZone.zone === r.zone;
          html += '<div class="ad-result' + (isOn ? ' on' : '') + '" data-ridx="' + i + '">';
          html += '<div class="ad-result-left"><div class="ad-result-prod">' + esc(displayZone(drawerState.site, r.product_name)) + (r.religion === 'Christian' ? ' <span class="f-dd-badge">Christian</span>' : '') + '</div>';
          if (r.section) html += '<div class="ad-result-sec">Section ' + esc(r.section) + (r.block ? ' · Block ' + esc(r.block) : '') + '</div>';
          if (r.levels && r.levels.length) html += '<div class="ad-result-sec">Levels: ' + r.levels.join(', ') + '</div>';
          if (r.min_pre_need_price) {
            html += '<div class="ad-result-price">from RM ' + r.min_pre_need_price.toLocaleString('en-MY');
            if (r.max_pre_need_price && r.max_pre_need_price !== r.min_pre_need_price) html += ' – RM ' + r.max_pre_need_price.toLocaleString('en-MY');
            html += '</div>';
          }
          if (r.promo_types && r.promo_types.length) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">';
            r.promo_types.forEach(function(name) { html += promoTypeBadge(name); });
            html += '</div>';
          }
          html += '</div><div class="ad-result-right"><div class="ad-result-count">' + r.available + '</div><div style="font-size:10px;color:#94a3b8">avail</div></div>';
          html += '<span class="ad-result-arrow">›</span></div>';
        });
        html += '</div>';
      }
      html += '</div></div>';
    }

    // Step 4: Sections (niche) or Lot Type (burial/others)
    if (drawerState.selectedZone) {
      var isNicheType = drawerState.type === 'NICHE' || drawerState.type === 'PET NICHE';
      html += '<div class="ad-card" id="ad-step-lt"><div class="ad-label"><div class="ad-dot">4</div><span class="ad-title">' + (isNicheType ? 'Section' : 'Lot Type') + '</span><span class="ad-sub">' + esc(displayZone(drawerState.site, drawerState.selectedZone.zone)) + '</span></div><div class="ad-body">';
      if (drawerState._ltLoading) {
        html += '<div class="ad-loading">Loading…</div>';
      } else if (isNicheType) {
        if (!drawerState._sections || !drawerState._sections.length) {
          html += '<div class="ad-empty">No section data available.</div>';
        } else {
          // Level multi-select pills — derived from all level_counts across sections
          var allLevelSet = {};
          drawerState._sections.forEach(function(s) {
            Object.keys(s.level_counts || {}).forEach(function(l) { allLevelSet[l] = true; });
          });
          var allLevels = sortLevels(Object.keys(allLevelSet));
          var selLevels = drawerState.levels;
          if (allLevels.length) {
            html += '<div style="padding:8px 12px 6px;">';
            html += '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Filter by Level</div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
            allLevels.forEach(function(l) {
              var on = selLevels.indexOf(l) >= 0;
              html += '<button class="sec-lvl-pill" data-lvl="' + esc(l) + '" style="padding:5px 13px;border-radius:20px;border:1.5px solid ' + (on ? '#1E40AF' : '#cbd5e1') + ';background:' + (on ? '#1E40AF' : '#fff') + ';color:' + (on ? '#fff' : '#334155') + ';font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation;">' + esc(l) + '</button>';
            });
            html += '</div></div>';
          }
          // Filter sections: show all if no levels selected, else only sections with at least one selected level
          var visibleSections = selLevels.length
            ? drawerState._sections.filter(function(s) {
                return selLevels.some(function(l) { return (s.level_counts || {})[l] > 0; });
              })
            : drawerState._sections;
          html += '<div class="ad-lt-grid">';
          visibleSections.forEach(function(sec) {
            var isOn = drawerState.selectedSection === sec.section;
            var priceRange = '';
            if (sec.min_pre_need_price != null && sec.max_pre_need_price != null) {
              priceRange = '<div class="ad-lt-price">RM ' + sec.min_pre_need_price.toLocaleString('en-MY') + (sec.max_pre_need_price !== sec.min_pre_need_price ? ' – ' + sec.max_pre_need_price.toLocaleString('en-MY') : '') + '</div>';
            }
            var lc = sec.level_counts || {};
            var lcKeys = sortLevels(Object.keys(lc));
            // Filtered available count
            var filteredAvail = selLevels.length
              ? selLevels.reduce(function(sum, l) { return sum + (lc[l] || 0); }, 0)
              : sec.available;
            var availLabel = selLevels.length
              ? filteredAvail + ' avail (Lvl ' + selLevels.join('+') + ')'
              : sec.available + ' available';
            // Per-level breakdown chips
            var lvlBreakdown = lcKeys.length
              ? '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">'
                + lcKeys.map(function(l) {
                    var cnt = lc[l];
                    var isSelLvl = selLevels.length === 0 || selLevels.indexOf(l) >= 0;
                    return '<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:' + (isSelLvl ? '#eff6ff' : '#f1f5f9') + ';color:' + (isSelLvl ? '#1E40AF' : '#94a3b8') + ';font-weight:700;">Lv' + esc(l) + ':' + cnt + '</span>';
                  }).join('')
                + '</div>'
              : '';
            html += '<div class="ad-lt' + (isOn ? ' on' : '') + '" style="' + (isOn ? 'border-color:#1E40AF;background:#eff6ff' : '') + '" data-section="' + esc(sec.section) + '"><div class="ad-lt-prefix">' + esc(sec.section) + '</div>' + priceRange + '<div class="ad-lt-avail">' + availLabel + '</div>' + lvlBreakdown + promoHighlightBadge(sec.promo) + '<div class="ad-lt-arrow">›</div></div>';
          });
          html += '</div>';
          html += '<button class="ad-show-all" id="ad-show-all">Show All Sections</button>';
        }
      } else {
        if (!drawerState._lotTypes || !drawerState._lotTypes.length) {
          html += '<div class="ad-empty">No lot type data available.</div>';
        } else {
          html += '<div class="ad-lt-grid">';
          drawerState._lotTypes.forEach(function(lt) {
            var isOn = drawerState.selectedPrefix === lt.prefix;
            var priceRange = '';
            if (lt.min_pre_need_price != null && lt.max_pre_need_price != null) {
              priceRange = '<div class="ad-lt-price">RM ' + lt.min_pre_need_price.toLocaleString('en-MY') + (lt.max_pre_need_price !== lt.min_pre_need_price ? ' – ' + lt.max_pre_need_price.toLocaleString('en-MY') : '') + '</div>';
            }
            var showLabel = drawerState.type !== 'EBL' && lt.label !== lt.prefix;
            var comboBadge = (window.AgentCombo && window.AgentCombo.isComboSection(lt.prefix))
              ? '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;background:#F59E0B;color:#fff;font-size:9px;font-weight:700;vertical-align:middle">Combo</span>'
              : '';
            html += '<div class="ad-lt' + (isOn ? ' on' : '') + '" style="' + (isOn ? 'border-color:#1E40AF;background:#eff6ff' : '') + '" data-prefix="' + esc(lt.prefix) + '"><div class="ad-lt-prefix">' + esc(lt.prefix) + comboBadge + '</div>' + (showLabel ? '<div class="ad-lt-label">' + esc(lt.label) + '</div>' : '') + priceRange + '<div class="ad-lt-avail">' + lt.available + ' available</div>' + promoHighlightBadge(lt.promo) + '<div class="ad-lt-arrow">›</div></div>';
          });
          html += '</div>';
          html += '<button class="ad-show-all" id="ad-show-all">Show All Lot Types</button>';
        }
      }
      html += '</div></div>';
    }

    // Step 6: Level (non-niche only — niche level is chosen in step 4)
    var isNicheStep6 = drawerState.type === 'NICHE' || drawerState.type === 'PET NICHE';
    if (!isNicheStep6 && drawerState.selectedPrefix !== null && drawerState._levelOpts && drawerState._levelOpts.length) {
      var lvls = drawerState.levels;
      var lvlSub = lvls.length === 0 ? 'All levels' : lvls.map(function(l) { return 'L' + l; }).join(', ');
      html += '<div class="ad-card" id="ad-step-lvl"><div class="ad-label"><div class="ad-dot">5</div><span class="ad-title">Level</span><span class="ad-sub">' + lvlSub + '</span></div><div class="ad-body">';
      html += '<div class="ad-lvl-chips">';
      html += '<div class="ad-lvl-chip' + (lvls.length === 0 ? ' on' : '') + '" data-lvl="">All</div>';
      drawerState._levelOpts.forEach(function(l) {
        html += '<div class="ad-lvl-chip' + (lvls.indexOf(l) >= 0 ? ' on' : '') + '" data-lvl="' + esc(l) + '">Level ' + esc(l) + '</div>';
      });
      html += '</div>';
      html += '<button class="ad-show-all" id="ad-apply-btn" style="margin-top:12px;background:#1E40AF;color:#fff;border-color:#1E40AF">View Layout →</button>';
      html += '</div></div>';
    }

    c.innerHTML = html;
    bindDrawerEvents(c);
    if (drawerState._typesFetched) renderTypeChips();
    if (drawerState._sitesFetched) renderSiteCards();
    renderFilterStepperShell();
    updateFilterBannerSub();
  }

  // ── Filter Products stepper shell — full-screen, one step at a time.
  // Reuses renderDrawer()'s existing per-step ".ad-card" HTML unchanged;
  // only the LAST card (the deepest step reached) is shown at once via
  // CSS (#filter-stepper-body .ad-card:last-of-type), so no rewrite of
  // the card-building or fetch logic above was needed. ──
  function isNicheFilterType(t) { return t === 'NICHE' || t === 'PET NICHE'; }

  function filterStepInfo() {
    var titles = ['Product Type', 'Site', 'Available Zones'];
    if (drawerState.type) {
      var isNiche = isNicheFilterType(drawerState.type);
      if (drawerState.selectedZone) titles.push(isNiche ? 'Section' : 'Lot Type');
      if (!isNiche && drawerState.selectedPrefix !== null && drawerState._levelOpts && drawerState._levelOpts.length) titles.push('Level');
    }
    return titles;
  }

  function renderFilterStepperShell() {
    var back  = qs('filter-stepper-back');
    var title = qs('filter-stepper-title');
    var count = qs('filter-stepper-step-count');
    var dots  = qs('filter-stepper-dots');
    if (!back && !title && !count && !dots) return;
    var titles = filterStepInfo();
    var step = titles.length;
    var total = drawerState.type ? (isNicheFilterType(drawerState.type) ? 4 : 5) : 3;
    if (title) title.textContent = titles[step - 1] || '';
    if (count) count.textContent = 'Step ' + step + ' of ' + total;
    if (back) back.style.visibility = step <= 1 ? 'hidden' : 'visible';
    if (dots) {
      var html = '';
      for (var i = 1; i <= total; i++) {
        html += '<div class="qs-dot' + (i < step ? ' done' : i === step ? ' now' : '') + '"></div>';
      }
      dots.innerHTML = html;
    }
  }

  function updateFilterBannerSub() {
    var sub = qs('filter-banner-sub');
    if (!sub) return;
    if (!drawerState.type) { sub.textContent = 'Narrow down by type, site & features'; return; }
    var parts = [drawerState.typeLabel || drawerState.type];
    if (drawerState.site) parts.push(drawerState.site);
    if (drawerState.selectedZone) parts.push(displayZone(drawerState.site, drawerState.selectedZone.zone));
    sub.textContent = parts.join(' · ');
  }

  function openFilterStepper() {
    var el = qs('filter-stepper');
    if (!el) return;
    el.classList.add('open');
    if (!drawerState._typesFetched) fetchDrawerTypes(); else renderDrawer();
  }

  function closeFilterStepper() {
    var el = qs('filter-stepper');
    if (el) el.classList.remove('open');
  }

  function filterStepBack() {
    if (drawerState.type && !drawerState.site) {
      drawerState.type = ''; drawerState.typeLabel = ''; drawerState.site = ''; drawerState.levels = [];
      drawerState.selectedZone = null; drawerState.selectedPrefix = null; drawerState.selectedSection = null;
      renderDrawer();
      return;
    }
    if (drawerState.site && !drawerState.selectedZone) {
      drawerState.site = ''; drawerState.levels = []; drawerState.selectedZone = null;
      drawerState.selectedPrefix = null; drawerState.selectedSection = null;
      renderDrawer();
      return;
    }
    var isNiche = isNicheFilterType(drawerState.type);
    if (drawerState.selectedZone && !isNiche && drawerState.selectedPrefix !== null && drawerState._levelOpts && drawerState._levelOpts.length) {
      drawerState.selectedPrefix = null; drawerState.levels = []; drawerState._levelOpts = [];
      renderDrawer();
      return;
    }
    if (drawerState.selectedZone) {
      drawerState.selectedZone = null; drawerState.selectedPrefix = null; drawerState.selectedSection = null;
      drawerState.levels = []; drawerState._lotTypes = []; drawerState._sections = []; drawerState._levelOpts = [];
      renderDrawer();
      return;
    }
    closeFilterStepper();
  }

  function bindDrawerEvents(c) {
    // Sort chips
    c.querySelectorAll('[data-sort]').forEach(function(el) {
      el.addEventListener('click', function() {
        drawerState.sort = el.dataset.sort;
        fetchDrawerZones();
      });
    });
    // Zone results
    c.querySelectorAll('.ad-result[data-ridx]').forEach(function(el) {
      el.addEventListener('click', function() {
        var r = drawerState._zoneResults[parseInt(el.dataset.ridx)];
        if (!r) return;
        drawerState.selectedZone = r;
        drawerState.selectedPrefix = null;
        drawerState.selectedSection = null;
        drawerState.levels = [];
        drawerState._lotTypes = [];
        drawerState._sections = [];
        drawerState._ltLoading = true;
        drawerState._levelOpts = [];
        renderDrawer();
        var isNiche = drawerState.type === 'NICHE' || drawerState.type === 'PET NICHE';
        var zone = r.zone;
        if (isNiche) {
          Promise.all([
            fetch(API_BASE + '/api/agent/availability-filter?step=sections&type=' + encodeURIComponent(drawerState.type) + '&site=' + encodeURIComponent(drawerState.site) + '&zone=' + encodeURIComponent(zone)).then(function(r) { return r.json(); }),
            fetch(API_BASE + '/api/agent/availability-filter?step=levels&type=' + encodeURIComponent(drawerState.type) + '&site=' + encodeURIComponent(drawerState.site) + '&zone=' + encodeURIComponent(zone)).then(function(r) { return r.json(); }),
          ]).then(function(results) {
            drawerState._sections = results[0].sections || [];
            drawerState._levelOpts = results[1].levels || [];
            drawerState._ltLoading = false;
            renderDrawer();
            setTimeout(function() { var s = document.getElementById('ad-step-lt'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
          }).catch(function() { drawerState._ltLoading = false; renderDrawer(); });
        } else {
          fetch(API_BASE + '/api/agent/availability-filter?step=lot_types&type=' + encodeURIComponent(drawerState.type) + '&site=' + encodeURIComponent(drawerState.site) + '&zone=' + encodeURIComponent(zone))
            .then(function(res) { return res.json(); })
            .then(function(j) {
              drawerState._lotTypes = j.lot_types || [];
              drawerState._ltLoading = false;
              renderDrawer();
              setTimeout(function() { var s = document.getElementById('ad-step-lt'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
              if (window.AgentCombo) window.AgentCombo.loadRanges(drawerState.site, zone);
            }).catch(function() { drawerState._ltLoading = false; renderDrawer(); });
        }
      });
    });
    // Level filter pills (niche step 4) handled by the [data-lvl] listener below
    // Section cards (niche) — levels already selected above, apply immediately
    c.querySelectorAll('.ad-lt[data-section]').forEach(function(el) {
      el.addEventListener('click', function() {
        var section = el.dataset.section;
        drawerState.selectedSection = section;
        drawerState.selectedPrefix = section;
        applyDrawerSelection();
      });
    });
    // Lot type cards — selecting a lot type fetches levels then shows step 5
    c.querySelectorAll('.ad-lt[data-prefix]').forEach(function(el) {
      el.addEventListener('click', function() {
        var prefix = el.dataset.prefix;
        drawerState.selectedPrefix = prefix;
        drawerState.levels = [];
        var url = API_BASE + '/api/agent/availability-filter?step=levels&type=' + encodeURIComponent(drawerState.type) + '&site=' + encodeURIComponent(drawerState.site) + '&zone=' + encodeURIComponent(drawerState.selectedZone.zone) + (prefix ? '&prefix=' + encodeURIComponent(prefix) : '');
        fetch(url).then(function(r) { return r.json(); }).then(function(j) {
          drawerState._levelOpts = j.levels || [];
          renderDrawer();
          if (!drawerState._levelOpts.length) { applyDrawerSelection(); return; }
          setTimeout(function() { var s = document.getElementById('ad-step-lvl'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        }).catch(function() { applyDrawerSelection(); });
      });
    });
    // Show all lot types — go straight to level step with no prefix
    var showAll = document.getElementById('ad-show-all');
    if (showAll) showAll.addEventListener('click', function() {
      drawerState.selectedPrefix = '';
      drawerState.levels = [];
      fetch(API_BASE + '/api/agent/availability-filter?step=levels&type=' + encodeURIComponent(drawerState.type) + '&site=' + encodeURIComponent(drawerState.site) + '&zone=' + encodeURIComponent(drawerState.selectedZone.zone))
        .then(function(r) { return r.json(); })
        .then(function(j) {
          drawerState._levelOpts = j.levels || [];
          renderDrawer();
          if (!drawerState._levelOpts.length) { applyDrawerSelection(); return; }
          setTimeout(function() { var s = document.getElementById('ad-step-lvl'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        }).catch(function() { applyDrawerSelection(); });
    });
    // Level chips — multi-select
    c.querySelectorAll('[data-lvl]').forEach(function(el) {
      el.addEventListener('click', function() {
        var lvl = el.dataset.lvl;
        if (!lvl) { drawerState.levels = []; }
        else {
          var idx = drawerState.levels.indexOf(lvl);
          if (idx >= 0) drawerState.levels.splice(idx, 1); else drawerState.levels.push(lvl);
        }
        renderDrawer();
        setTimeout(function() { var s = document.getElementById('ad-step-lvl'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
      });
    });
    // Apply / View Layout button
    var applyBtn = document.getElementById('ad-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', applyDrawerSelection);
  }

  function applyDrawerSelection() {
    if (!drawerState.selectedZone) return;
    closeFilterStepper();
    closeAvailDrawer();
    // Set filters FIRST so colorCells picks them up when layout renders
    window._drawerSectionFilter = drawerState.selectedPrefix || '';
    window._drawerLevelFilter   = drawerState.levels.join(',');
    window._drawerPromoFilter   = drawerState.selectedPromo || '';
    var newSite    = drawerState.site;
    var newProduct = drawerState.selectedZone.zone;
    site = newSite; product = newProduct;
    selectedLots = []; lotQuotes = [];
    var _isRmDp = newSite === 'Semenyih-NMG' && newProduct === 'OV6-1F-AT';
    dpPct = 20; _dpFixedRm = _isRmDp ? 4000 : null; _tombType = null; asNeedMode = false; dpAutoSet = false; _virtualBlk = null; _virtualSec = null;
    _pwpBundleActive = false; _pwpLevel2Data = null; _pwpHasOption = false; _pwpFetching = false;
    var key = newSite + '|' + newProduct;
    delete zoneLayoutCache[key]; delete lotMetaCache[key]; quotationCache = {};
    saveSession(); updateUI(); loadLayout(newSite, newProduct);
  }

  function fetchDrawerTypes() {
    fetch(API_BASE + '/api/agent/availability-filter?step=types')
      .then(function(r) { return r.json(); })
      .then(function(j) {
        drawerState._typesFetched = true;
        drawerState._types = j.types || [];
        renderTypeChips();
      }).catch(function() {});
  }

  function renderTypeChips() {
    var el = document.getElementById('ad-type-chips');
    if (!el) return;
    var html = '';
    (drawerState._types || []).forEach(function(t) {
      html += '<div class="ad-chip' + (drawerState.type === t.key ? ' on' : '') + '" data-tkey="' + esc(t.key) + '" data-tlabel="' + esc(t.label) + '">'
        + esc(t.label) + '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-tkey]').forEach(function(chip) {
      chip.addEventListener('click', function() {
        var k = chip.dataset.tkey;
        if (drawerState.type === k) return;
        drawerState.type = k;
        drawerState.typeLabel = chip.dataset.tlabel;
        drawerState.site = ''; drawerState.levels = []; drawerState.selectedZone = null; drawerState.selectedPrefix = null; drawerState.selectedPromo = null;
        drawerState._sitesFetched = false; drawerState._levelOpts = []; drawerState._zoneResults = []; drawerState._promoTypes = [];
        renderDrawer();
        fetchDrawerSites();
      });
    });
  }

  function fetchDrawerSites() {
    var t = drawerState.type;
    fetch(API_BASE + '/api/agent/availability-filter?step=sites&type=' + encodeURIComponent(t))
      .then(function(r) { return r.json(); })
      .then(function(j) {
        if (drawerState.type !== t) return;
        drawerState._sitesFetched = true;
        drawerState._sites = j.sites || [];
        renderSiteCards();
      }).catch(function() {});
  }

  function renderSiteCards() {
    var el = document.getElementById('ad-site-cards');
    if (!el) return;
    var html = '';
    (drawerState._sites || []).forEach(function(s) {
      var badges = (s.promo_types || []).map(promoTypeBadge).join('');
      html += '<div class="ad-site' + (drawerState.site === s.name ? ' on' : '') + '" data-sname="' + esc(s.name) + '">'
        + '<div class="ad-site-name">' + esc(s.name) + '</div>'
        + '<div class="ad-site-count">' + s.available + ' available</div>'
        + (badges ? '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">' + badges + '</div>' : '')
        + '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-sname]').forEach(function(card) {
      card.addEventListener('click', function() {
        var name = card.dataset.sname;
        if (drawerState.site === name) return;
        drawerState.site = name; drawerState.levels = []; drawerState.selectedZone = null; drawerState.selectedPrefix = null; drawerState.selectedPromo = null;
        drawerState._levelOpts = []; drawerState._zoneResults = []; drawerState._promoTypes = []; drawerState._zonesLoading = true;
        renderDrawer();
        fetchDrawerZones();
      });
    });
  }

  function fetchDrawerZones() {
    var t = drawerState.type, s = drawerState.site;
    drawerState._zonesLoading = true; drawerState.selectedZone = null; drawerState.selectedPrefix = null;
    renderDrawer();
    var url = API_BASE + '/api/agent/availability-filter?step=zones&type=' + encodeURIComponent(t) + '&site=' + encodeURIComponent(s) + '&sort=' + drawerState.sort;
    fetch(url).then(function(r) { return r.json(); }).then(function(j) {
      if (drawerState.type !== t || drawerState.site !== s) return;
      drawerState._zoneResults = j.results || [];
      drawerState._sitePromos  = j.site_promos || [];
      drawerState._zonesLoading = false;
      renderDrawer();
      setTimeout(function() { var s = document.getElementById('ad-step-zones'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    }).catch(function() { drawerState._zonesLoading = false; renderDrawer(); });
  }

  // ── Lot click ──────────────────────────────────────────────────
  function onLayoutClick(e) {
    var cell = e.target;
    while (cell && cell !== e.currentTarget && !cell.dataset.lot) cell = cell.parentElement;
    if (!cell || !cell.dataset.lot) return;
    var lot = cell.dataset.lot;
    var idx = selectedLots.indexOf(lot);
    var isSelected = idx >= 0;
    var isAvail = Object.keys(availMap).length > 0 ? (availMap[lot] === true) : cell.classList.contains('nz-avail');
    var isFiltered = cell.classList.contains('nz-filtered') || cell.classList.contains('nz-sold');

    if (!isSelected && (!isAvail || isFiltered)) return;
    if (isSelected) {
      selectedLots.splice(idx, 1);
      lotQuotes = lotQuotes.filter(function (q) { return q.lotCode !== lot; });
      delete hiddenCols[lot];
      // After removal: check if qty crossed a tier boundary and auto-update DP if so
      _applyQtyTierDp(selectedLots.length);
      saveSession(); colorCells(); renderSelectedBar(); renderQuoteSection(); return;
    }
    if (selectedLots.length >= MAX_LOTS) return;
    // Clear any promo-card overview columns (synthetic burial lots like "FA~FG-burial-0")
    // before adding a real lot — promo overview must not mix with a real lot selection.
    if (lotQuotes.some(function(q) { return q.lotCode.indexOf('-burial-') >= 0; })) {
      selectedLots = selectedLots.filter(function(l) { return l.indexOf('-burial-') < 0; });
      lotQuotes    = lotQuotes.filter(function(q)    { return q.lotCode.indexOf('-burial-') < 0; });
      _virtualBlk = null; _virtualSec = null;
    }
    selectedLots.push(lot);
    saveSession(); colorCells(); renderSelectedBar();

    var meta    = lotMeta[lot] || {};
    var block   = meta.block || product;
    // For niches without a price-matched section_group, the niche_section is encoded as
    // the first dash-segment of the lot code (e.g. "S3A" from "S3A-06-01").
    // extractBurialSection strips digits so gives "S" — wrong. Use lot.split('-')[0] instead.
    var section = meta.section_group
      || (lot.split('-').length >= 3 ? lot.split('-')[0] : null)
      || extractBurialSection(lot, site);
    // Only extract level from lot code for proper niches (section_group set or is_niche).
    // EBL lot codes like "A-06-18" have hyphens that are NOT levels — extracting "6"
    // breaks the quotation because the view groups EBL as price_level "1", not "6".
    // Semenyih-NMP pedestal: lot part 2 is position (L/R), not level — extract level
    // from first digit of part 3 (unit number, e.g. LF-L-107 → level '1').
    var level;
    if (meta.is_niche) {
      if (lot.split('-').length === 4) {
        // 4-part niche (SECTION-TYPE-LEVEL-UNIT, e.g. HC): level is part 3
        var _raw4 = lot.split('-')[2] || '';
        level = _raw4 ? (_raw4.replace(/^0+/, '') || _raw4) : '';
      } else {
        var _raw1 = lot.split('-')[1] || '';
        level = _raw1 ? (_raw1.replace(/^0+/, '') || _raw1) : '';
      }
    } else if (site === 'Klang' && lot.split('-').length === 3) {
      // Sub-zone lots (e.g. D6-06-08 in BK-A-LG1-HB-S3A-D6, D7, D8, D9, D10) have no layout
      // meta because the layout API finds no rows for the comma-containing zone name.
      // Level is still segment 2 of the lot code.
      var _raw2 = lot.split('-')[1] || '';
      level = _raw2 ? (_raw2.replace(/^0+/, '') || _raw2) : '';
    } else if (site === 'Nckl' && !meta.is_niche && lot.split('-').length === 2) {
      // NCKL pedestal (e.g. SSD-A lot "01-08"): part 0 is the level, part 1 is the position.
      var _raw3 = lot.split('-')[0] || '';
      level = _raw3 ? (_raw3.replace(/^0+/, '') || _raw3) : '';
    } else if (site === 'Klang' && !meta.is_niche && !meta.is_burial && lot.split('-').length === 2) {
      // Klang pedestal (e.g. BK-A-MH-AT-A lot "01-08"): same 2-part format, part 0 is the level.
      var _rawKP = lot.split('-')[0] || '';
      level = _rawKP ? (_rawKP.replace(/^0+/, '') || _rawKP) : '';
    } else if (site === 'Semenyih-NMP' && !meta.is_niche && !meta.is_burial && lot.split('-').length === 2) {
      // Pet Niche (e.g. PET-J lot "01-18"): 2-part code, part 0 is the floor/level.
      var _rawPetN = lot.split('-')[0] || '';
      level = _rawPetN ? (_rawPetN.replace(/^0+/, '') || _rawPetN) : '';
    } else {
      level = '';
    }
    if (!block) return;

    // Include dpPct in cache key only for N3 (DP-tier promo sensitive)
    var isN3Site = window.AgentN3 && window.AgentN3.hasN3(site);
    // For burial lots, extract the numeric part of the lot code (e.g. "FA18" → 18)
    // so the server can match the correct lot-range restricted promo for this specific lot.
    var burialLotNum = meta.is_burial ? parseInt(lot.replace(/^[A-Za-z~]+/, ''), 10) : NaN;
    // Pedestal lot codes (NCKL SSD, Klang BK-A-MH-AT) are "{level}-{position}" (e.g. "15-08").
    // The layout API sets is_burial=true for these because they have niche_section=null,
    // but the first number is a floor level, not a burial lot number. Clear burialLotNum
    // so the level-based DP re-fetch path fires instead of the burial lot path.
    if (!meta.is_niche && lot.split('-').length === 2 &&
        (site === 'Nckl' || site === 'Klang' || site === 'Semenyih-NMP')) {
      burialLotNum = NaN;
    }
    // Burial lots are DP-tier sensitive (restricted promos have per-DP discounts), so always
    // send dpPct for them and include it in the cache key so DP changes trigger a re-fetch.
    var isBurialLot = !isNaN(burialLotNum);
    var _promoFilter = window._drawerPromoFilter || '';
    var _qty = selectedLots.length; // qty = total niches being quoted (including this one)
    // For niche lots, extract the niche_section from the lot code (first dash-segment, e.g. 'DG' from 'DG-06-01')
    // so the API can use the correct section for promo matching within a mixed section group.
    var nicheSection = (meta.is_niche && lot.indexOf('-') >= 0) ? lot.split('-')[0] : '';
    var cacheKey = site + '|' + product + '|' + block + '|' + section + '|' + level + '|dp' + dpPct + '|qty' + _qty + (isBurialLot ? '|n' + burialLotNum : '') + (_promoFilter ? '|p' + _promoFilter : '') + (nicheSection ? '|ns' + nicheSection : '');
    var url = API_BASE + '/api/agent/quotation'
      + '?site='    + encodeURIComponent(site)
      + '&product=' + encodeURIComponent(product)
      + '&block='   + encodeURIComponent(block)
      + '&section=' + encodeURIComponent(section)
      + (level ? '&levels=' + encodeURIComponent(level) : '')
      + '&dp=' + dpPct
      + '&qty=' + _qty
      + (isBurialLot ? '&lot=' + burialLotNum : '')
      + (_promoFilter ? '&promo=' + encodeURIComponent(_promoFilter) : '')
      + (nicheSection ? '&niche_section=' + encodeURIComponent(nicheSection) : '');

    function applyQuotation(json) {
      // Discard stale fetch results if lot was deselected before response arrived
      if (selectedLots.indexOf(lot) < 0) return;
      if (!json.error && json.levels && json.levels.length) {
        // Server returns exactly one level for burial lots (lot-by-lot mode) and one per
        // niche level for niches. Pick by level for niches; fall back to first for burial.
        var lvData = json.levels.find(function (l) { return l.level === level; }) || json.levels[0];

        lotQuotes.push({ lotCode: lot, levelData: lvData, section: json.section, siteInfo: json,
          _burialLotNum: isBurialLot ? burialLotNum : null, _block: block, _section: section,
          _nicheSection: nicheSection || null });
        worshipPlans = json.worship_plans || [];
        nlpPromos    = json.nlp_promos    || [];
        if (json.has_pwp_option && !_pwpHasOption) { _pwpHasOption = true; colorCells(); }

        // Store qty_tiers for this product so _applyQtyTierDp can use them on future adds/removes
        if (json.qty_tiers && json.qty_tiers.length) {
          _qtyTiersMap[site + '|' + product] = { tiers: json.qty_tiers, baseDp: json.qty_tiers_base_dp || 20 };
        }

        // If qty just crossed a tier boundary, re-apply tier DP.
        // _applyQtyTierDp re-fetches all quotes and returns true — don't double-render.
        if (!_applyQtyTierDp(selectedLots.length)) {
          saveSession(); renderQuoteSection();
        }
      }
    }

    if (quotationCache[cacheKey]) {
      applyQuotation(quotationCache[cacheKey]);
    } else {
      fetch(url).then(function (r) { return r.json(); }).then(function (json) {
        quotationCache[cacheKey] = json;
        applyQuotation(json);
      }).catch(function () {});
    }
  }

  // ── NLP plan selector ──────────────────────────────────────────
  function triggerNLPQuotation(planName, panelEl) {
    // Toggle: if already selected, deselect and re-render
    var idx = selectedLots.indexOf(planName);
    if (idx >= 0) {
      selectedLots.splice(idx, 1);
      lotQuotes = lotQuotes.filter(function (q) { return q.lotCode !== planName; });
      if (panelEl) {
        panelEl.querySelectorAll('.nlp-card').forEach(function (c) {
          if (c.dataset.plan === planName) {
            c.style.background = c.dataset.color || '#fff';
            c.style.color = '';
          }
        });
      }
      saveSession(); renderQuoteSection();
      return;
    }
    // Add this plan
    selectedLots.push(planName);
    saveSession(); renderSelectedBar();
    var url = API_BASE + '/api/agent/quotation'
      + '?site='    + encodeURIComponent(site)
      + '&product=NLP'
      + '&block=NLP'
      + '&section=' + encodeURIComponent(planName);
    fetch(url).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.error && json.levels && json.levels.length) {
        var lvData = json.levels[0];
        lotQuotes.push({ lotCode: planName, levelData: lvData, section: planName, siteInfo: json,
          nlpColor:    NLP_COLOR[planName]    || '#c5d8f0',
          nlpZhName:   NLP_ZH_NAME[planName]  || '',
          nlpReligion: NLP_RELIGION[planName] || '',
        });
        worshipPlans = json.worship_plans || [];
        nlpPromos    = json.nlp_promos    || [];
        saveSession(); renderQuoteSection();
      }
    }).catch(function () {});
  }

  var NLP_ZH_NAME = {
    'NV Honour (A)':  '富贵如意',
    'NV Elegant Plus':'富贵安详（升级版）',
    'NV Elegant (A)': '富贵安详',
    'NV KT':          '',
    'NV Emerald':     '富贵永乐',
    'NV Essential':   '富贵永安',
    'NV Memory':      '美丽人生',
    'NV Gracious':    '富贵圣恩',
    'NV Blessing':    '富贵祝福',
  };

  // Card background colours matching the official NLP colour groups
  var NLP_COLOR = {
    'NV Honour (A)':  '#f0e8d0',
    'NV Elegant Plus':'#b8c8e8',
    'NV Elegant (A)': '#c8d4f0',
    'NV KT':          '#dde8f8',
    'NV Emerald':     '#b8dcc0',
    'NV Essential':   '#c8e4cc',
    'NV Memory':      '#f5e060',
    'NV Gracious':    '#d8c8e8',
    'NV Blessing':    '#e8e8e8',
  };

  var NLP_TIER = {
    'NV Honour (A)':  'Premium',
    'NV Elegant Plus':'Standard Plus',
    'NV Elegant (A)': 'Standard',
    'NV Emerald':     'Basic',
    'NV Essential':   'Basic (Instant)',
    'NV KT':          'Standard (Kuantan)',
    'NV Memory':      'Standard',
    'NV Gracious':    'Standard',
    'NV Blessing':    'Basic',
  };

  var NLP_RELIGION = {
    'NV Honour (A)':  'Buddhist & Taoist',
    'NV Elegant Plus':'Buddhist & Taoist',
    'NV Elegant (A)': 'Buddhist & Taoist',
    'NV Emerald':     'Buddhist & Taoist',
    'NV Essential':   'Buddhist & Taoist',
    'NV KT':          'Buddhist & Taoist',
    'NV Memory':      'Free Thinker',
    'NV Gracious':    'Christian',
    'NV Blessing':    'Christian',
  };

  function renderNLPPanel(el) {
    el.innerHTML = '<div class="layout-placeholder"><span class="lp-icon">⏳</span><span class="lp-title">Loading plans…</span></div>';
    fetch(API_BASE + '/api/agent/nlp-plans?site=' + encodeURIComponent(site))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var plans = d.plans || [];
        if (!plans.length) {
          el.innerHTML = '<div class="layout-placeholder"><span class="lp-icon">📭</span><span class="lp-title">No NLP plans found</span></div>';
          return;
        }
        var h = '<div class="nlp-panel">';
        h += '<div class="nlp-panel-title">Nirvana Life Plan — Select a Package</div>';
        h += '<div class="nlp-grid">';
        plans.forEach(function (p) {
          var active = selectedLots.indexOf(p.section_group) >= 0 ? ' style="background:#e0eaff;"' : '';
          var religion = NLP_RELIGION[p.section_group] || '';
          var tier     = NLP_TIER[p.section_group] || '';
          var zhName   = NLP_ZH_NAME[p.section_group] || '';
          var cardColor = NLP_COLOR[p.section_group] || '#fff';
          var isSelected = selectedLots.indexOf(p.section_group) >= 0;
          var bgStyle = 'background:' + (isSelected ? '#1a3a6b' : cardColor) + ';'
            + (isSelected ? 'color:#fff;' : '');
          h += '<div class="nlp-card" data-plan="' + esc(p.section_group) + '" data-color="' + esc(cardColor) + '" style="' + bgStyle + '">'
            + '<div class="nlp-card-name">' + esc(p.section_group) + '</div>'
            + (zhName ? '<div class="nlp-card-zh">' + esc(zhName) + '</div>' : '')
            + (tier ? '<div class="nlp-card-tier">' + esc(tier) + '</div>' : '')
            + (religion ? '<div class="nlp-card-religion">' + esc(religion) + '</div>' : '')
            + '<div class="nlp-card-preneed">RM ' + fmt(p.pre_need_price) + '</div>'
            + '<div class="nlp-card-asneed">As Need: RM ' + fmt(p.as_need_price) + '</div>'
            + '</div>';
        });
        h += '</div></div>';
        el.innerHTML = h;
        el.querySelectorAll('.nlp-card').forEach(function (card) {
          card.addEventListener('click', function () {
            triggerNLPQuotation(card.dataset.plan, el);
            // Sync highlight — check AFTER toggle has run
            var nowSelected = selectedLots.indexOf(card.dataset.plan) >= 0;
            card.style.background = nowSelected ? '#1a3a6b' : (card.dataset.color || '#fff');
            card.style.color = nowSelected ? '#fff' : '';
          });
        });
      })
      .catch(function () {
        el.innerHTML = '<div class="layout-placeholder"><span class="lp-icon">⚠️</span><span class="lp-title">Failed to load plans</span></div>';
      });
  }

  // ── Render layout area ─────────────────────────────────────────
  // Expose renderDrawer once here — before any early returns in renderLayoutArea
  window._agentRenderDrawer = renderDrawer;

  function renderLayoutArea() {
    var el = qs('layout-area');
    if (!el) return;

    // Preserve horizontal scroll positions so a background re-fetch doesn't jump
    var savedScrolls = [];
    el.querySelectorAll('.portal-scroll').forEach(function (ps) { savedScrolls.push(ps.scrollLeft); });

    if (!site || !product) {
      el.innerHTML = '<div class="layout-placeholder"><span class="lp-icon">🗺️</span><span class="lp-title">Zone layout will appear here</span><span class="lp-sub">Select a site and zone above</span></div>';
      return;
    }
    if (product === 'NLP') { renderNLPPanel(el); return; }
    if (layoutLoading) {
      el.innerHTML = '<div class="layout-placeholder"><span class="lp-icon">⏳</span><span class="lp-title">Loading layout…</span></div>';
      return;
    }
    if (!zoneLayouts.length) {
      el.innerHTML = '<div class="layout-placeholder"><span class="lp-icon">📭</span><span class="lp-title">No layout saved yet</span><span class="lp-sub">Run a Product Sync for ' + esc(product) + ' to generate the layout</span></div>';
      return;
    }

    var html = '';

    html += '<div class="legend no-print">'
      + '<div class="leg-item"><div class="leg-dot" style="background:#22c55e;border:1px solid #16a34a"></div>Available</div>'
      + '<div class="leg-item"><div class="leg-dot" style="background:#f1f5f9;border:1px solid #e2e8f0"></div>Unavailable</div>'
      + '<div class="leg-item"><div class="leg-dot" style="background:#1a3a6b"></div>Selected (<span id="sel-count">' + selectedLots.length + '</span>/' + MAX_LOTS + ')</div>'
      + '</div>'
      + '<div id="sel-bar" class="selected-bar no-print"></div>'
      + '<div id="filter-nav" class="filter-nav no-print" style="display:none">'
      + '<button id="fn-prev" class="fn-btn">‹</button>'
      + '<span id="fn-count"></span>'
      + '<button id="fn-next" class="fn-btn">›</button>'
      + '<button id="fn-clear" class="fn-clear">✕ Clear filter</button>'
      + '</div>'
      + '<div id="layout-card">';

    zoneLayouts.forEach(function (zl) {
      if (zoneLayouts.length > 1) html += '<div class="zone-label">' + esc(zl.zone) + '</div>';
      html += '<div class="portal-scroll"><div class="nirvana-zone-layout">' + (zl.html || '') + '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    // Fix unmerged ghost cells: Excel merged cells sometimes export as one lot cell
    // followed by empty sibling cells. Absorb those empties into the lot cell's colspan.
    el.querySelectorAll('tr').forEach(function (tr) {
      if (tr.classList.contains('nz-wall-header') || tr.classList.contains('nz-wall-gap')) return;
      tr.querySelectorAll('[data-lot]').forEach(function (lotTd) {
        var next = lotTd.nextElementSibling;
        while (next && !next.dataset.lot && !next.classList.contains('nz-empty')) {
          var ghostCols = parseInt(next.getAttribute('colspan') || '1', 10);
          lotTd.colSpan = (lotTd.colSpan || 1) + ghostCols;
          var toRemove = next;
          next = next.nextElementSibling;
          toRemove.parentNode.removeChild(toRemove);
        }
      });
    });

    // Restore scroll positions immediately after innerHTML is written
    var scrollEls = el.querySelectorAll('.portal-scroll');
    scrollEls.forEach(function (ps, i) {
      var target = savedScrolls[i] || layoutScrollLeft;
      if (target) ps.scrollLeft = target;
    });

    // Track scroll so we can persist it through page reloads
    scrollEls.forEach(function (ps) {
      var scrollTimer;
      ps.addEventListener('scroll', function () {
        layoutScrollLeft = ps.scrollLeft;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(saveSession, 300);
      }, { passive: true });
    });

    renderSelectedBar();
    colorCells();
    window._agentColorCells = colorCells;
    window._agentRenderQuoteSection = renderQuoteSection;

    window._agentTriggerComboQuotation = function (lotCode, displayRange) {
      var meta    = lotMeta[lotCode] || {};
      var block   = meta.block || product;
      var section = meta.section_group || (lotCode.replace(/[0-9].*$/, ''));
      var level;
      if (meta.is_niche && !meta.section_group) {
        level = '';
      } else if (site === 'Semenyih-NMP') {
        var _nmpPart3c = lotCode.split('-')[2] || '';
        level = _nmpPart3c ? _nmpPart3c.charAt(0) : '';
      } else {
        level = lotCode.split('-')[1] ? parseInt(lotCode.split('-')[1], 10).toString() : '';
      }
      if (!block || !section) return;

      var cacheKey = site + '|' + product + '|' + block + '|' + section + '|' + level;
      var url = API_BASE + '/api/agent/quotation'
        + '?site='    + encodeURIComponent(site)
        + '&product=' + encodeURIComponent(product)
        + '&block='   + encodeURIComponent(block)
        + '&section=' + encodeURIComponent(section)
        + (level ? '&levels=' + encodeURIComponent(level) : '');

      function applyQuotation(json) {
        if (!json.error && json.levels && json.levels.length) {
          var lvData = json.levels.find(function (l) { return l.level === level; }) || json.levels[0];
          selectedLots = [lotCode];
          dpAutoSet = false;
          lotQuotes = [{ lotCode: lotCode, levelData: lvData, section: json.section, siteInfo: json, displayRange: displayRange || null }];
          worshipPlans = json.worship_plans || [];
          renderQuoteSection();
        }
      }

      if (quotationCache[cacheKey]) {
        applyQuotation(quotationCache[cacheKey]);
      } else {
        fetch(url).then(function (r) { return r.json(); }).then(function (json) {
          quotationCache[cacheKey] = json;
          applyQuotation(json);
        }).catch(function () {});
      }
    };

    var card = qs('layout-card');
    if (card) card.addEventListener('click', onLayoutClick);

    // Filter navigator buttons
    var fnPrev = document.getElementById('fn-prev');
    var fnNext = document.getElementById('fn-next');
    var fnClear = document.getElementById('fn-clear');
    if (fnPrev) fnPrev.addEventListener('click', function() { scrollToNavCell(_navIdx - 1); });
    if (fnNext) fnNext.addEventListener('click', function() { scrollToNavCell(_navIdx + 1); });
    if (fnClear) fnClear.addEventListener('click', function() {
      window._drawerSectionFilter = '';
      window._drawerLevelFilter = '';
      colorCells();
    });

  }

  // ── Promo view ─────────────────────────────────────────────────
  function findCachedSection(blk, sec) {
    var prefix = site + '|' + product + '|' + blk + '|' + sec + '|';
    var allKeys = Object.keys(quotationCache);
    for (var i = 0; i < allKeys.length; i++) {
      if (allKeys[i].startsWith(prefix)) return quotationCache[allKeys[i]];
    }
    return null;
  }

  function renderPromoView() {
    // Collect unique block+section combos from available lots
    var groups = {};
    Object.keys(availMap).forEach(function (lot) {
      if (!availMap[lot]) return;
      var m = lotMeta[lot] || {};
      var block   = m.block || product;
      var section = m.section_group;
      var isBurial = !!m.is_burial;
      if (!section) {
        var _isNicheLot = lot.split('-').length >= 3;
        if (_isNicheLot) return; // niche lot with no section_group — skip, not a burial section
        section = lot.replace(/^([A-Za-z]+).*/, '$1').toUpperCase();
        if (!m.is_niche) isBurial = true;
      }
      if (!block || !section) return;
      // Skip burial sections whose name contains digits or parentheses — those are price
      // bracket identifiers (e.g. "FA(08~198)") that should not create separate promo cards.
      // Real burial section codes are letters only (e.g. "FA", "FA~FG", "DAB").
      if (isBurial && /[0-9()]/.test(section)) { console.log('[promo-filter] skipped burial section:', section); return; }
      var gk = block + '|' + section;
      if (!groups[gk]) { console.log('[promo-groups] new group:', gk, 'burial='+isBurial); groups[gk] = { block: block, section: section, count: 0, json: null, is_burial: isBurial, lotNums: [] }; }
      groups[gk].count++;
      if (isBurial) {
        var nm = lot.match(/(\d+)/);
        if (nm) groups[gk].lotNums.push(parseInt(nm[1], 10));
      }
    });

    var keys = Object.keys(groups);
    if (!keys.length) {
      var pv = document.getElementById('promo-view');
      if (pv) pv.innerHTML = '<div class="promo-loading">No available lots found.</div>';
      return;
    }

    // Paint immediately with whatever is cached, then fill in the rest
    keys.forEach(function (gk) {
      var g = groups[gk];
      var cached = findCachedSection(g.block, g.section);
      if (cached) g.json = cached;
    });
    paintPromoView(groups); // instant render with cached data

    // Batch-fetch missing sections. Always send the request even when all sections
    // are already cached from preloadQuotations — the batch API also returns virtual
    // sections (lot-range-restricted promo cards) that preloadQuotations never creates.
    var missing = keys.filter(function (gk) { return !groups[gk].json; });
    var pairsArr = missing.length ? missing : keys; // when all cached, use all pairs to trigger virtuals
    if (!pairsArr.length) return;

    var pairs = pairsArr.map(function (gk) {
      var g = groups[gk];
      return encodeURIComponent(g.block) + '%7C' + encodeURIComponent(g.section);
    }).join(',');

    fetch(API_BASE + '/api/agent/quotation/batch?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(product) + '&pairs=' + pairs)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        console.log('[batch] results count=' + (data.results || []).length, (data.results || []).map(function(r){ return r.section + (r.virtual?'(V)':'') + ' levels=' + (r.levels||[]).length; }));
        (data.results || []).forEach(function (json) {
          var gk = json.block + '|' + json.section;
          if (groups[gk]) {
            (json.levels || []).forEach(function (lv) {
              var ck = site + '|' + product + '|' + json.block + '|' + json.section + '|' + lv.level;
              if (!quotationCache[ck]) quotationCache[ck] = json;
            });
            groups[gk].json = json;
          } else if (json.virtual) {
            // Virtual section for a lot-range-restricted promo — create a new group on the fly
            var totalAvail = (json.levels || []).reduce(function (sum, lv) { return sum + (lv.available_count || 0); }, 0);
            groups[gk] = { block: json.block, section: json.section, count: totalAvail, json: json, is_burial: true, lotNums: [], virtual: true };
            // Cache it so onPromoCardTap can find it without a secondary API call
            (json.levels || []).forEach(function (lv, i) {
              var ck = site + '|' + product + '|' + json.block + '|' + json.section + '|v' + i;
              if (!quotationCache[ck]) quotationCache[ck] = json;
            });
          }
        });
        if (layoutMode === 'promos') paintPromoView(groups);
      }).catch(function () {});
  }

  function paintPromoView(groups) {
    var pv = document.getElementById('promo-view');
    if (!pv) return;

    // Separate into promo and standard
    var promoGroups = [], stdGroups = [];
    Object.values(groups).forEach(function (g) {
      if (!g.json) return;
      var hasPromo = (g.json.levels || []).some(function (lv) { return lv.promo; });
      if (hasPromo) promoGroups.push(g); else stdGroups.push(g);
    });
    promoGroups.sort(function (a, b) { return a.section.localeCompare(b.section); });
    stdGroups.sort(function (a, b)   { return a.section.localeCompare(b.section); });

    var allGroups = Object.values(groups);
    var loadedCount  = allGroups.filter(function (g) { return !!g.json; }).length;
    var pendingCount = allGroups.filter(function (g) { return !g.json; }).length;

    if (!promoGroups.length && !stdGroups.length) {
      if (pendingCount > 0) {
        var dots = ['⏳', '⌛'][Math.floor(Date.now() / 600) % 2];
        pv.innerHTML = '<div class="promo-loading promo-loading-progress">'
          + '<div class="promo-fetch-icon">' + dots + '</div>'
          + '<div class="promo-fetch-label">Fetching promo data, please wait…</div>'
          + '<div class="promo-fetch-bar-wrap"><div class="promo-fetch-bar" style="width:' + Math.round(loadedCount / allGroups.length * 100) + '%"></div></div>'
          + '<div class="promo-fetch-count">' + loadedCount + ' of ' + allGroups.length + ' sections loaded</div>'
          + '</div>';
      } else {
        pv.innerHTML = '<div class="promo-loading">No promo data found for this zone.</div>';
      }
      return;
    }

    // ── Merge sections that share the same lot_type + promo + price range ──
    function cardMergeKey(g) {
      var levels    = (g.json && g.json.levels) || [];
      var promos    = levels.map(function(l) { return l.promo; }).filter(Boolean);
      // Use highest-discount promo for the merge key so sections with identical DP-tier
      // options (but different prices) merge into one card.
      var promo     = promos.length ? promos[promos.length - 1] : null;
      var prices    = levels.map(function(l) { return l.pre_need_price || l.as_need_price || 0; }).filter(Boolean);
      var minP      = prices.length ? Math.min.apply(null, prices) : 0;
      var maxP      = prices.length ? Math.max.apply(null, prices) : 0;
      var lotType   = (g.json && g.json.lot_type) || '';
      var promoName = promo ? (promo.promo_name || '') : '__none__';
      var discKey   = promo
        ? (String(promo.discount_pct != null ? promo.discount_pct : '') + '|' + String(promo.discount_rm != null ? promo.discount_rm : ''))
        : '';
      // Virtual sections (lot-range-restricted) always get their own card.
      // Burial non-virtual: merge across price brackets — price omitted from key.
      var virtualKey = g.virtual ? ('__v__' + g.section) : '';
      var priceKey   = (g.is_burial && !g.virtual) ? '' : (minP + '||' + maxP);
      return g.block + '||' + String(!!g.is_burial) + '||' + lotType + '||' + promoName + '||' + discKey + '||' + priceKey + '||' + virtualKey;
    }

    function buildMergedList(list) {
      var mergedMap = {}, order = [];
      list.forEach(function(g) {
        var k = cardMergeKey(g);
        if (!mergedMap[k]) {
          mergedMap[k] = {
            sections:         [],
            block:            g.block,
            representativeGk: g.block + '|' + g.section,
            count:            0,
            lotNums:          [],
            is_burial:        g.is_burial,
            virtual:          g.virtual,
            json:             g.json,
          };
          order.push(k);
        }
        mergedMap[k].sections.push(g.section);
        mergedMap[k].count += g.count;
        (g.lotNums || []).forEach(function(n) { mergedMap[k].lotNums.push(n); });
      });
      return order.map(function(k) { return mergedMap[k]; });
    }

    console.log('[paint] promoGroups=' + promoGroups.length + ' sections:', promoGroups.map(function(g){ var p=(g.json&&g.json.levels||[]).map(function(l){return l.promo&&l.promo.discount_pct;}).filter(Boolean); return g.section+'['+p+']'; }));
    var mergedPromo = buildMergedList(promoGroups);
    console.log('[paint] mergedPromo=' + mergedPromo.length, mergedPromo.map(function(m){ return m.sections.join('+'); }));
    var mergedStd   = buildMergedList(stdGroups);

    function buildCard(mg) {
      var json    = mg.json;
      var levels  = json.levels || [];
      var promos  = levels.map(function (l) { return l.promo; }).filter(Boolean);
      var promo   = promos.length ? promos[promos.length - 1] : null; // highest for name/badge
      var prices  = levels.map(function (l) { return l.pre_need_price || l.as_need_price || 0; }).filter(Boolean);
      var minP    = prices.length ? Math.min.apply(null, prices) : 0;
      var maxP    = prices.length ? Math.max.apply(null, prices) : 0;
      var lvlNums = levels.map(function (l) { return l.level; }).filter(Boolean).join(', ');
      var isPromo = !!promo;
      var isGroup = mg.sections.length > 1;

      var c = '<div class="promo-card' + (isPromo ? ' has-promo' : '') + '" data-gk="' + esc(mg.representativeGk) + '">';
      c += '<div class="promo-card-top">';
      c += '<div class="promo-card-info">';

      if (isGroup) {
        var prefix = mg.is_burial ? 'Plot' : 'Wall';
        c += '<div class="promo-card-section">' + esc(prefix) + '</div>';
        c += '<div class="promo-section-list">' + mg.sections.map(esc).join(' · ') + '</div>';
      } else {
        var sectionLabel = mg.is_burial
          ? ('Plot ' + esc(mg.sections[0]))
          : ('Wall ' + esc(json.section || mg.sections[0]));
        c += '<div class="promo-card-section">' + sectionLabel + '</div>';
      }

      if (json.lot_type) c += '<div class="promo-card-levels">' + esc(json.lot_type) + '</div>';

      if (mg.is_burial && mg.lotNums && mg.lotNums.length) {
        var minLot  = Math.min.apply(null, mg.lotNums);
        var maxLot  = Math.max.apply(null, mg.lotNums);
        var lotRange = minLot === maxLot ? 'Lot ' + minLot : 'Lots ' + minLot + '–' + maxLot;
        c += '<div class="promo-card-levels">' + esc(lotRange) + '</div>';
      } else if (lvlNums) {
        c += '<div class="promo-card-levels">Levels: ' + esc(lvlNums) + '</div>';
      }

      if (minP) {
        c += '<div class="promo-card-price">from RM ' + minP.toLocaleString('en-MY');
        if (maxP && maxP !== minP) c += ' – RM ' + maxP.toLocaleString('en-MY');
        c += '</div>';
      }
      c += '</div>';
      c += '<div class="promo-card-right"><div class="promo-card-count">' + mg.count + '</div><div class="promo-card-avail">avail</div></div>';
      c += '</div>';
      if (isPromo) {
        var allDiscs = promos.map(function(p) { return p.discount_pct || 0; }).filter(Boolean);
        var minDisc  = allDiscs.length ? Math.min.apply(null, allDiscs) : 0;
        var maxDisc  = allDiscs.length ? Math.max.apply(null, allDiscs) : 0;
        var disc = promo.dp_tiers && promo.dp_tiers.length
          ? 'Up to ' + Math.max.apply(null, promo.dp_tiers) + '% off'
          : (maxDisc ? (minDisc && minDisc !== maxDisc ? minDisc + '–' + maxDisc + '% Special Rebate' : maxDisc + '% Special Rebate') : '');
        c += '<div class="promo-badge-bar"><span class="promo-badge-name">' + esc(promo.promo_name || 'Promotion') + '</span>';
        if (disc) c += '<span class="promo-badge-disc">' + esc(disc) + '</span>';
        c += '</div>';
      }
      c += '</div>';
      return c;
    }

    var html = '';
    if (mergedPromo.length) {
      html += '<div class="promo-group-label">🏷 Active Promotions</div>';
      mergedPromo.forEach(function (mg) { html += buildCard(mg); });
    }
    if (mergedStd.length) {
      html += '<div class="promo-group-label" style="margin-top:' + (mergedPromo.length ? '12px' : '0') + '">Standard Pricing</div>';
      mergedStd.forEach(function (mg) { html += buildCard(mg); });
    }
    pv.innerHTML = html;
    if (window.AgentCombo) window.AgentCombo.appendPromoSection(pv);

    // Bind tap — uses representative section (first in the group)
    pv.querySelectorAll('.promo-card[data-gk]').forEach(function (card) {
      card.addEventListener('click', function () {
        var parts = card.dataset.gk.split('|');
        var blk   = parts[0], sec = parts[1];
        onPromoCardTap(blk, sec);
      });
    });
  }

  function onPromoCardTap(blk, sec) {
    var cacheKey = site + '|' + product + '|' + blk + '|' + sec + '|';
    var json = null;
    var allKeys = Object.keys(quotationCache);
    for (var i = 0; i < allKeys.length; i++) {
      if (allKeys[i].startsWith(cacheKey)) { json = quotationCache[allKeys[i]]; break; }
    }
    function applyPromoJson(j) {
      if (!j || j.error || !j.levels || !j.levels.length) return;
      // Clear previous and load all levels for this section as synthetic lots
      selectedLots = []; lotQuotes = [];
      dpAutoSet = false;

      // For virtual (lot-range-restricted) sections, filter to the DP tier that best matches
      // the current dpPct — one level per price bracket, avoiding mixed 25%/35% columns.
      var levelsToLoad = j.levels;
      if (j.virtual) {
        _virtualBlk = blk; _virtualSec = sec;
        var byLotNo = {};
        j.levels.forEach(function(lv) {
          var key = lv.lot_no || 'std';
          if (!byLotNo[key]) byLotNo[key] = [];
          byLotNo[key].push(lv);
        });
        levelsToLoad = Object.keys(byLotNo).map(function(key) {
          var group = byLotNo[key];
          var eligible = group.filter(function(lv) {
            return (lv.promo && lv.promo.min_down_payment_pct != null ? lv.promo.min_down_payment_pct : 0) <= dpPct;
          });
          var pool = eligible.length ? eligible : group;
          return pool.reduce(function(best, lv) {
            var bDp = best.promo && best.promo.min_down_payment_pct != null ? best.promo.min_down_payment_pct : 0;
            var lDp = lv.promo && lv.promo.min_down_payment_pct != null ? lv.promo.min_down_payment_pct : 0;
            return eligible.length ? (lDp > bDp ? lv : best) : (lDp < bDp ? lv : best);
          });
        });
      } else {
        _virtualBlk = null; _virtualSec = null;
      }

      levelsToLoad.forEach(function (lvData, i) {
        var isBurial = lvData.lot_no != null && lvData.level == null;
        var syntheticLot = isBurial ? sec + '-burial-' + i : sec + '-' + lvData.level + '-0';
        selectedLots.push(syntheticLot);
        lotQuotes.push({ lotCode: syntheticLot, levelData: lvData, section: j.section, siteInfo: j, isBurial: isBurial, _blk: blk, _sec: sec, displayRange: true });
      });
      colorCells(); renderSelectedBar(); renderQuoteSection();
      setTimeout(function () {
        var el = qs('quote-section');
        var sb = qs('scroll-body');
        if (el && sb) sb.scrollTop = el.offsetTop - 8;
      }, 50);
    }
    if (json) {
      applyPromoJson(json);
    } else {
      var _pf = window._drawerPromoFilter || '';
      fetch(API_BASE + '/api/agent/quotation?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(product) + '&block=' + encodeURIComponent(blk) + '&section=' + encodeURIComponent(sec) + '&dp=' + dpPct + (_pf ? '&promo=' + encodeURIComponent(_pf) : ''))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          (j.levels || []).forEach(function (lv) {
            var ck = site + '|' + product + '|' + blk + '|' + sec + '|' + lv.level + (_pf ? '|p' + _pf : '');
            if (!quotationCache[ck]) quotationCache[ck] = j;
          });
          applyPromoJson(j);
        }).catch(function () {});
    }
  }

  function renderSelectedBar() {
    var bar = qs('sel-bar');
    if (!bar) return;
    var counter = document.getElementById('sel-count');
    if (counter) counter.textContent = selectedLots.length;
    var html = selectedLots.map(function (lot) {
      return '<div class="sel-chip" data-lot="' + esc(lot) + '">' + esc(lot) + ' <span class="sel-chip-x">×</span></div>';
    }).join('');
    bar.innerHTML = html;
    bar.querySelectorAll('.sel-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var lot = chip.dataset.lot;
        selectedLots = selectedLots.filter(function (l) { return l !== lot; });
        lotQuotes = lotQuotes.filter(function (q) { return q.lotCode !== lot; });
        delete hiddenCols[lot];
        saveSession(); colorCells(); renderSelectedBar(); renderQuoteSection();
      });
    });
  }

  // ── Product Assets Panel ───────────────────────────────────────
  function _ytId(url) {
    if (!url) return null;
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function _wireAssetsPanel(ap, photos, videos) {
    var header = ap.querySelector('#ap-header');
    var body   = ap.querySelector('#ap-body');
    var toggle = ap.querySelector('#ap-toggle');
    if (header) {
      header.addEventListener('click', function () {
        _assetsOpen = !_assetsOpen;
        if (body)   body.style.display = _assetsOpen ? 'block' : 'none';
        if (toggle) toggle.textContent  = _assetsOpen ? '▾' : '▸';
      });
    }
    ap.querySelectorAll('.ap-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.stopPropagation();
        _assetsTab = tab.dataset.tab;
        ap.querySelectorAll('.ap-tab').forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        ap.querySelectorAll('.ap-pane').forEach(function (p) { p.style.display = 'none'; });
        var pane = ap.querySelector('#ap-pane-' + _assetsTab);
        if (pane) pane.style.display = 'block';
      });
    });
    var lbIdx = 0;
    function openLb(idx) {
      lbIdx = idx;
      var lb  = document.getElementById('ap-lightbox');
      var img = document.getElementById('ap-lb-img');
      if (!lb || !img || !photos[idx]) return;
      img.src = photos[idx].url;
      lb.style.display = 'flex';
    }
    function closeLb() {
      var lb = document.getElementById('ap-lightbox');
      if (lb) lb.style.display = 'none';
    }
    ap.querySelectorAll('.ap-photo').forEach(function (img) {
      img.addEventListener('click', function () { openLb(parseInt(img.dataset.idx, 10)); });
    });
    var lbClose = document.getElementById('ap-lb-close');
    var lbBack  = document.getElementById('ap-lb-backdrop');
    var lbPrev  = document.getElementById('ap-lb-prev');
    var lbNext  = document.getElementById('ap-lb-next');
    if (lbClose) lbClose.onclick = closeLb;
    if (lbBack)  lbBack.onclick  = closeLb;
    if (lbPrev)  lbPrev.onclick  = function (e) {
      e.stopPropagation();
      lbIdx = (lbIdx - 1 + photos.length) % photos.length;
      var img = document.getElementById('ap-lb-img');
      if (img) img.src = photos[lbIdx].url;
    };
    if (lbNext)  lbNext.onclick  = function (e) {
      e.stopPropagation();
      lbIdx = (lbIdx + 1) % photos.length;
      var img = document.getElementById('ap-lb-img');
      if (img) img.src = photos[lbIdx].url;
    };
    // Folder toggle
    ap.querySelectorAll('.ap-folder-header').forEach(function (fh) {
      fh.addEventListener('click', function (e) {
        e.stopPropagation();
        var folderId = fh.dataset.folder;
        var fbody  = ap.querySelector('#ap-folder-body-' + folderId);
        var arrow  = fh.querySelector('.ap-folder-arrow');
        var isOpen = fbody && fbody.style.display !== 'none';
        if (fbody) fbody.style.display = isOpen ? 'none' : 'block';
        if (arrow) arrow.textContent   = isOpen ? '▸' : '▾';
      });
    });
    ap.querySelectorAll('.ap-vid-card').forEach(function (card) {
      card.addEventListener('click', function () {
        window.open('https://www.youtube.com/watch?v=' + card.dataset.vid, '_blank');
      });
    });
  }

  function _buildAssetsPanelHtml(ap, assets) {
    if (!assets || !assets.length) { ap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#94a3b8">No product materials</div>'; return; }
    var photos = assets.filter(function (a) { return a.asset_type === 'photo'; });
    var videos = assets.filter(function (a) { return a.asset_type === 'video'; });
    var docs   = assets.filter(function (a) { return a.asset_type === 'doc';   });

    // Normalise active tab to one that actually has content
    if (_assetsTab === 'photos' && !photos.length) _assetsTab = videos.length ? 'videos' : 'docs';
    if (_assetsTab === 'videos' && !videos.length) _assetsTab = photos.length ? 'photos' : 'docs';
    if (_assetsTab === 'docs'   && !docs.length)   _assetsTab = photos.length ? 'photos' : 'videos';

    // Mini thumbnail strip shown in the header even when collapsed
    var miniStrip = '';
    photos.slice(0, 4).forEach(function (p) {
      miniStrip += '<img class="ap-mini" src="' + p.url + '" alt="" loading="lazy">';
    });
    if (photos.length > 4) {
      miniStrip += '<div class="ap-mini ap-mini-more">+' + (photos.length - 4) + '</div>';
    }

    var tabsHtml = '';
    if (photos.length) tabsHtml += '<div class="ap-tab' + (_assetsTab === 'photos' ? ' on' : '') + '" data-tab="photos">Photos (' + photos.length + ')</div>';
    if (videos.length) tabsHtml += '<div class="ap-tab' + (_assetsTab === 'videos' ? ' on' : '') + '" data-tab="videos">Videos (' + videos.length + ')</div>';
    if (docs.length)   tabsHtml += '<div class="ap-tab' + (_assetsTab === 'docs'   ? ' on' : '') + '" data-tab="docs">Docs ('   + docs.length   + ')</div>';

    var pubBase = 'https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/';

    // Split photos into EDM group and regular photos
    var _monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var _now = new Date();
    var _edmFolderLabel = 'EDM (' + _monthNames[_now.getMonth()] + ')';
    var edmPhotos     = photos.filter(function (p) { return (p.caption || '').toUpperCase().indexOf('EDM') >= 0; });
    var regularPhotos = photos.filter(function (p) { return (p.caption || '').toUpperCase().indexOf('EDM') < 0; });

    function _photoItemHtml(p, idx) {
      var publicUrl = p.storage_path ? pubBase + p.storage_path.split('/').map(encodeURIComponent).join('/') : p.url;
      var fileName  = p.storage_path ? p.storage_path.split('/').pop() : (p.caption || 'photo.jpg');
      return '<div class="ap-photo-item">'
        + '<img class="ap-photo" src="' + publicUrl + '" alt="' + (p.caption || '') + '" data-idx="' + idx + '" loading="lazy">'
        + '<a class="ap-dl-btn" href="' + publicUrl + '" download="' + fileName + '" target="_blank" rel="noopener">⬇ Save to Phone</a>'
        + '</div>';
    }

    var photosHtml = '';
    // Regular photos — flat strip
    regularPhotos.forEach(function (p, i) { photosHtml += _photoItemHtml(p, i); });
    // EDM folder — collapsible
    if (edmPhotos.length) {
      var edmInner = '';
      edmPhotos.forEach(function (p, i) { edmInner += _photoItemHtml(p, regularPhotos.length + i); });
      photosHtml += '<div class="ap-folder" id="ap-folder-edm">'
        + '<div class="ap-folder-header" data-folder="edm">'
        +   '<span class="ap-folder-icon">📁</span>'
        +   '<span class="ap-folder-name">' + _edmFolderLabel + '</span>'
        +   '<span class="ap-folder-count">(' + edmPhotos.length + ' photos)</span>'
        +   '<span class="ap-folder-arrow">▸</span>'
        + '</div>'
        + '<div class="ap-folder-body" id="ap-folder-body-edm" style="display:none">'
        +   '<div class="ap-photo-strip">' + edmInner + '</div>'
        + '</div>'
        + '</div>';
    }

    var videosHtml = '';
    videos.forEach(function (v) {
      var vid = _ytId(v.url);
      if (!vid) return;
      videosHtml += '<div class="ap-vid-card" data-vid="' + vid + '">'
        + '<img class="ap-vid-thumb" src="https://img.youtube.com/vi/' + vid + '/mqdefault.jpg" alt="' + (v.caption || '') + '" loading="lazy">'
        + '<div class="ap-vid-play">▶</div>'
        + (v.caption ? '<div class="ap-vid-cap">' + v.caption + '</div>' : '')
        + '</div>';
    });

    var docsHtml = '';
    docs.forEach(function (d) {
      var kb = d.file_size_kb ? Math.round(d.file_size_kb) + ' KB' : '';
      docsHtml += '<a class="ap-doc" href="' + d.url + '" target="_blank" rel="noopener">'
        + '<span class="ap-doc-icon">📄</span>'
        + '<div class="ap-doc-info"><div class="ap-doc-name">' + (d.caption || 'Document') + '</div>'
        + (kb ? '<div class="ap-doc-size">' + kb + '</div>' : '') + '</div>'
        + '<span class="ap-doc-dl">↓</span></a>';
    });

    var html = '<div class="ap-wrap">'
      + '<div class="ap-header" id="ap-header">'
      +   '<div class="ap-header-left">'
      +     '<div class="ap-toggle" id="ap-toggle">' + (_assetsOpen ? '▾' : '▸') + '</div>'
      +     '<span class="ap-title">Product Assets</span>'
      +   '</div>'
      +   '<div class="ap-mini-strip">' + miniStrip + '</div>'
      + '</div>'
      + '<div class="ap-body" id="ap-body" style="display:' + (_assetsOpen ? 'block' : 'none') + '">'
      +   '<div class="ap-tabs" id="ap-tabs">' + tabsHtml + '</div>'
      +   '<div class="ap-pane" id="ap-pane-photos" style="display:' + (_assetsTab === 'photos' ? 'block' : 'none') + '">'
      +     '<div class="ap-photo-strip">' + photosHtml + '</div>'
      +   '</div>'
      +   '<div class="ap-pane" id="ap-pane-videos" style="display:' + (_assetsTab === 'videos' ? 'block' : 'none') + '">'
      +     '<div class="ap-vid-grid">' + videosHtml + '</div>'
      +   '</div>'
      +   '<div class="ap-pane" id="ap-pane-docs" style="display:' + (_assetsTab === 'docs' ? 'block' : 'none') + '">'
      +     '<div class="ap-doc-list">' + docsHtml + '</div>'
      +   '</div>'
      + '</div>'
      + '</div>'
      // Lightbox overlay — appended outside .ap-wrap so it can fill the viewport
      + '<div id="ap-lightbox" style="display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;">'
      +   '<div id="ap-lb-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,.85);"></div>'
      +   '<button id="ap-lb-close" style="position:absolute;top:16px;right:16px;z-index:1;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:24px;width:40px;height:40px;border-radius:50%;cursor:pointer;">×</button>'
      +   '<button id="ap-lb-prev" style="position:absolute;top:50%;left:16px;transform:translateY(-50%);z-index:1;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:28px;width:44px;height:44px;border-radius:50%;cursor:pointer;">‹</button>'
      +   '<img id="ap-lb-img" src="" alt="" style="position:relative;max-width:92vw;max-height:85vh;border-radius:6px;object-fit:contain;">'
      +   '<button id="ap-lb-next" style="position:absolute;top:50%;right:16px;transform:translateY(-50%);z-index:1;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:28px;width:44px;height:44px;border-radius:50%;cursor:pointer;">›</button>'
      + '</div>';

    ap.innerHTML = html;
    _wireAssetsPanel(ap, photos, videos);
  }

  var _edmCache = {};

  // ── Announcement read state ───────────────────────────────────
  var ANNOUNCEMENT_KEY = 'announcement_read_aug2026b'; // change key each month to reset

  function _applyAnnouncementReadState() {
    var isRead = false;
    try { isRead = !!localStorage.getItem(ANNOUNCEMENT_KEY); } catch(e) {}
    // Red dot on hamburger
    var dot = document.querySelector('#btn-menu > span:last-child');
    if (dot) dot.style.display = isRead ? 'none' : 'block';
    // NEW badge in side menu
    var badge = document.querySelector('.menu-badge');
    if (badge) badge.style.display = isRead ? 'none' : '';
    // What's New box and Mark as Read button
    var box = document.getElementById('whats-new-box');
    var btn = document.getElementById('btn-mark-read');
    var body = document.getElementById('whats-new-body');
    var arrow = document.getElementById('whats-new-arrow');
    if (isRead && body) {
      body.style.display = 'none';
      if (arrow) arrow.textContent = '▸';
    }
  }

  function _loadAnnouncementEdm() {
    // Reset dropdown and clear list when drawer opens
    var sel = document.getElementById('edm-site-sel');
    var el = document.getElementById('announcement-edm-list');
    if (sel) sel.value = '';
    if (el) el.innerHTML = '';
  }

  function _loadEdmForSite(s) {
    var el = document.getElementById('announcement-edm-list');
    if (!el || !s) return;
    if (_edmCache[s]) { _renderEdmPosters(el, _edmCache[s]); return; }
    el.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px 0">Loading…</div>';
    fetch(API_BASE + '/api/agent/assets?site=' + encodeURIComponent(s) + '&product=' + encodeURIComponent(s))
      .then(function(r) { return r.json(); })
      .then(function(j) {
        var a = (j.assets || []).filter(function(x) { return x.asset_type === 'photo'; });
        _edmCache[s] = a;
        _renderEdmPosters(el, a);
      })
      .catch(function() { el.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px 0">No EDM posters available</div>'; });
  }

  function _renderEdmPosters(el, assets) {
    if (!assets || !assets.length) {
      el.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px 0">No EDM posters available for this site</div>';
      return;
    }
    var pubBase = 'https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/';
    var html = '';
    assets.forEach(function(a) {
      if (!a.url) return;
      var publicUrl = a.storage_path ? pubBase + a.storage_path.split('/').map(encodeURIComponent).join('/') : a.url;
      var waUrl = 'https://wa.me/?text=' + encodeURIComponent(publicUrl);
      html += '<div class="edm-poster-wrap">'
        + '<img class="edm-poster-img" src="' + publicUrl + '" alt="' + (a.caption || 'EDM Poster') + '" data-poster="' + publicUrl + '" />'
        + '<a class="edm-wa-btn" href="' + waUrl + '" target="_blank" rel="noopener noreferrer">'
        + '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
        + 'Share via WhatsApp</a>'
        + '</div>';
    });
    el.innerHTML = html;
  }

  function renderAssetsPanel() {
    var ap = document.getElementById('assets-panel');
    if (!ap) return;
    if (!site || !product) { ap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#94a3b8">No product materials</div>'; return; }
    var cacheKey = site + '|' + product;
    if (_assetsCache[cacheKey] !== undefined) {
      _buildAssetsPanelHtml(ap, _assetsCache[cacheKey]);
      return;
    }
    ap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#94a3b8">Loading materials…</div>';
    fetch(API_BASE + '/api/agent/assets?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(product))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var assets = j.assets || [];
        _assetsCache[cacheKey] = assets;
        _buildAssetsPanelHtml(ap, assets);
      })
      .catch(function () { ap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#94a3b8">No product materials</div>'; });
  }

  // ── Quotation section ──────────────────────────────────────────
  function renderQuoteSection() {
    // OV6-1F-AT uses a fixed RM down payment — enforce it on every render so no code path can leave it as a %.
    if (site === 'Semenyih-NMG' && product === 'OV6-1F-AT' && dpPct !== 100) _dpFixedRm = 4000;
    var el = qs('quote-body');
    if (!el) return;
    // Print and Share are two separate, independent steps -- Print saves
    // the PDF to the phone (no way to know when the agent's actually done
    // with the system print dialog), Share (separate, later) captures who
    // it's for and opens WhatsApp so the agent can attach whatever PDF
    // they already saved. Order is up to the agent.
    var pdfBtn = qs('btn-pdf');
    if (pdfBtn) pdfBtn.style.display = lotQuotes.length ? '' : 'none';
    var shareBtn = qs('btn-share-pdf');
    if (shareBtn) shareBtn.style.display = lotQuotes.length ? '' : 'none';
    updateBrowseStickyBar();
    // Preserve horizontal scroll so new columns appear in place without jumping left
    var qtScrollEl = el.querySelector('.qt-scroll');
    var savedQtScroll = qtScrollEl ? qtScrollEl.scrollLeft : 0;

    if (!lotQuotes.length) {
      el.innerHTML = '<div class="quote-empty"><span class="qe-icon">📋</span><span class="qe-msg">'
        + (!product ? 'Select a site and zone to get started' : 'Tap available niches above to compare prices (up to 9)')
        + '</span></div>';
      return;
    }

    // Detect instant-case-only products (Package Plot / Semenyih-NMG NV-R)
    var firstLd = lotQuotes[0] && lotQuotes[0].levelData;
    var isInstantCase = (firstLd && firstLd.product_category === 'Package Plot')
      || (site === 'Semenyih-NMG' && product.toUpperCase() === 'NV-P')
      || (site === 'Shah Alam' && product.toUpperCase().startsWith('HC') && firstLd && !firstLd.pre_need_price);

    // Auto-set mode on first lot selection for this product
    if (!dpAutoSet) {
      if (isInstantCase) {
        asNeedMode = true;
      } else {
        var autoPromo = firstLd && firstLd.promo;
        if (autoPromo && autoPromo.min_down_payment_pct) {
          dpPct = autoPromo.min_down_payment_pct;
        } else {
          // Promo is always returned by the API regardless of dp (min_promo_dp enforced by
          // the warning overlay in the frontend). Auto-set: if promo carries a min DP, jump
          // straight to it so the agent sees the correct instalment breakdown immediately.
          var _autoMinDp = lotQuotes[0] && lotQuotes[0].siteInfo && lotQuotes[0].siteInfo.min_promo_dp;
          if (_autoMinDp && dpPct < _autoMinDp) dpPct = _autoMinDp;
        }
      }
      dpAutoSet = true;
    }

    // Build promo info note
    var promoNoteHtml = '';
    if (isInstantCase) {
      promoNoteHtml = '<div class="promo-note promo-note-instant no-print">⚡ For Instant Case Use Only</div>';
    } else if (window.AgentCombo && window.AgentCombo.hasComboLot(lotQuotes)) {
      var comboRow = window.AgentCombo.getFirstComboRow && window.AgentCombo.getFirstComboRow(lotQuotes);
      var comboParts = [comboRow && comboRow.promo_name ? comboRow.promo_name : 'Combo Lot Promo'];
      if (comboRow && comboRow.min_down_payment_pct) comboParts.push(comboRow.min_down_payment_pct + '% DP');
      if (comboRow && comboRow.max_instalment_months) comboParts.push(comboRow.max_instalment_months + ' mths Inst');
      if (comboRow && comboRow.promo_end_date) comboParts.push('Valid until ' + comboRow.promo_end_date);
      promoNoteHtml = '<div class="promo-note no-print">🎁 ' + comboParts.join(' • ') + '</div>';
    } else {
      // For Pedestal: show all available promo types (instalment + full payment) as separate rows.
      var _promoSummary = lotQuotes[0] && lotQuotes[0].siteInfo && lotQuotes[0].siteInfo.promo_summary;
      if (_promoSummary && _promoSummary.length) {
        var _promoRows = _promoSummary.map(function (p) {
          var parts = [p.promo_name || 'Promo'];
          if (p.lot_type) parts.push(p.lot_type);
          if (p.level_restriction) parts.push('Lvl ' + p.level_restriction);
          if (p.lot_range) parts.push(p.lot_range);
          if (p.purchase_condition === 'cash_purchase') {
            parts.push('Full Payment');
          } else if (p.min_down_payment_pct) {
            parts.push(p.min_down_payment_pct + '% DP');
          }
          if (p.max_instalment_months) parts.push(p.max_instalment_months + ' mths Inst');
          if (p.discount_rm) parts.push('RM' + Number(p.discount_rm).toLocaleString('en-MY') + ' Disc');
          else if (p.discount_pct) parts.push(p.discount_pct + '% Disc');
          return '<div class="promo-note">🎁 ' + parts.join(' • ') + '</div>';
        }).join('');
        var _promoCount = _promoSummary.length;
        promoNoteHtml = '<div class="promo-collapse no-print">'
          + '<div class="promo-collapse-header">🎁 ' + _promoCount + ' Promo' + (_promoCount > 1 ? 's' : '') + ' Available <span class="promo-collapse-arrow">▼</span></div>'
          + '<div class="promo-collapse-body" hidden>' + _promoRows + '</div>'
          + '</div>';
      }
      var notePromo = firstLd && firstLd.promo;
      if (!promoNoteHtml && notePromo && notePromo.promo_name) {
        var noteParts = [notePromo.promo_name];
        if (notePromo.min_down_payment_pct === 100) {
          noteParts.push('Full Payment');
        } else if (notePromo.dp_tiers && notePromo.dp_tiers.length) {
          noteParts.push('DP tiers: ' + notePromo.dp_tiers.join('%, ') + '%');
        } else if (notePromo.min_down_payment_pct) {
          noteParts.push('Min. ' + notePromo.min_down_payment_pct + '% DP');
        }
        if (notePromo.max_instalment_months) noteParts.push(notePromo.max_instalment_months + ' mths Inst');
        if (notePromo.discount_rm) {
          noteParts.push('RM' + Number(notePromo.discount_rm).toLocaleString('en-MY') + ' Disc');
        } else if (notePromo.discount_pct) {
          noteParts.push(notePromo.discount_pct + '% Disc');
        }
        promoNoteHtml = '<div class="promo-collapse no-print">'
          + '<div class="promo-collapse-header">🎁 1 Promo Available <span class="promo-collapse-arrow">▼</span></div>'
          + '<div class="promo-collapse-body" hidden><div class="promo-note">🎁 ' + noteParts.join(' • ') + '</div></div>'
          + '</div>';
      }
    }

    var firstCat = (firstLd && firstLd.product_category) || '';
    // EBL has no DP concept at all — hide the entire DP strip.
    // Pedestal still needs DP pills and Full Payment; only hide the As-Need pill.
    var isOneTimePayment = product.toUpperCase().startsWith('EBL') || firstCat === 'EBL';
    var hideAsNeed = isOneTimePayment || firstCat === 'Pedestal';
    // Compute min promo DP before rendering pills so we can hide invalid options.
    var _minPromoDp = lotQuotes.length > 0 && lotQuotes[0].siteInfo
      ? (lotQuotes[0].siteInfo.min_promo_dp || null) : null;
    // Collect unique RM-based DP values from selected lots' promos.
    var _rmDpValues = [];
    lotQuotes.forEach(function (q) {
      var p = q.levelData && q.levelData.promo;
      if (p && p.min_dp_rm != null) {
        var v = Number(p.min_dp_rm);
        if (_rmDpValues.indexOf(v) < 0) _rmDpValues.push(v);
      }
    });
    // Legacy OV6-1F-AT fallback — treat as RM 4,000 pill
    if (_rmDpValues.length === 0 && site === 'Semenyih-NMG' && product === 'OV6-1F-AT') {
      _rmDpValues = [4000];
    }
    // If switching away from an RM-based lot, clear any leftover fixed RM.
    if (_rmDpValues.length === 0 && _dpFixedRm != null) _dpFixedRm = null;
    var dpHtml = '';
    if (!isOneTimePayment) {
      dpHtml = '<div id="dp-strip" class="no-print"><span class="lbl">Down Payment:</span>';
      if (!isInstantCase) {
        dpHtml += '<select class="dp-select" id="dp-select">';
        if (_rmDpValues.length > 0) {
          _rmDpValues.slice().sort(function (a, b) { return a - b; }).forEach(function (v) {
            // Default-selected to smallest RM value when nothing has been explicitly picked yet.
            var isSel = !asNeedMode && (_dpFixedRm === v || (_dpFixedRm == null && v === Math.min.apply(null, _rmDpValues)));
            dpHtml += '<option value="rm' + v + '"' + (isSel ? ' selected' : '') + '>RM' + fmt(v) + '</option>';
          });
          dpHtml += '<option value="100"' + (!asNeedMode && dpPct === 100 ? ' selected' : '') + '>Full Payment</option>';
        } else {
          [10, 20, 30, 50, 100].filter(function (p) {
            return p === 100 || !_minPromoDp || p >= _minPromoDp;
          }).forEach(function (p) {
            var label = p === 100 ? 'Full Payment' : p + '%';
            dpHtml += '<option value="' + p + '"' + (!asNeedMode && dpPct === p ? ' selected' : '') + '>' + label + '</option>';
          });
        }
        dpHtml += '</select>';
      }
      if (!hideAsNeed) dpHtml += '<div class="dp-pill dp-asneed' + (asNeedMode ? ' on' : '') + '" data-pct="as-need">As-Need</div>';
      dpHtml += '</div>';
    }

    // If the current DP is below the minimum promo DP, auto-bump to the minimum and re-render.
    if (_minPromoDp && !asNeedMode && dpPct < _minPromoDp) {
      dpPct = _minPromoDp;
      saveSession();
      renderQuoteSection();
      return;
    }

    el.innerHTML = dpHtml + promoNoteHtml + '<div id="bundle-slot"></div>' + buildMatrixHtml();

    var _collapseHeader = el.querySelector('.promo-collapse-header');
    if (_collapseHeader) {
      _collapseHeader.addEventListener('click', function () {
        var _body = _collapseHeader.parentNode.querySelector('.promo-collapse-body');
        var _arrow = _collapseHeader.querySelector('.promo-collapse-arrow');
        var _open = !_body.hidden;
        _body.hidden = _open;
        if (_arrow) _arrow.textContent = _open ? '▼' : '▲';
      });
    }

    if (window.AgentBundle && !SOUTHERN_SITES[(site || '').toLowerCase()]) window.AgentBundle.afterRender(el, lotQuotes, function () { renderQuoteSection(); });

    // PWP (Purchase with Purchase) bundle — agent selects BOTH Level 1 and Level 2 from the layout.
    // When only one level is selected, show a message guiding the agent to pick the other.
    // When both are in lotQuotes, auto-fetch Level 2 with purchase_with_purchase promo (RM 8,000)
    // and render the 3-column PWP matrix.
    if (_pwpHasOption && lotQuotes.length > 0) {
      function _getLotLevel(lotCode) {
        var _p = lotCode.split('-');
        return _p.length >= 2 ? (_p[1].replace(/^0+/, '') || _p[1]) : '';
      }
      var _pwpHasL1 = lotQuotes.some(function (q) { return _getLotLevel(q.lotCode) === '1'; });
      var _pwpHasL2 = lotQuotes.some(function (q) { return _getLotLevel(q.lotCode) === '2'; });

      var _pwpSlot = document.getElementById('bundle-slot');
      var _pwpTarget = _pwpSlot || el;

      if (_pwpHasL1 && _pwpHasL2) {
        // Both lots selected — auto-fetch with PWP promo if not yet done
        if (!_pwpBundleActive && !_pwpFetching) {
          _pwpFetching = true;
          var _l2q = lotQuotes.find(function (q) { return _getLotLevel(q.lotCode) === '2'; });
          if (_l2q) {
            var _m2   = lotMeta[_l2q.lotCode] || {};
            var _blk2 = _m2.block || (_l2q.siteInfo && _l2q.siteInfo.block) || product;
            var _sec2 = _m2.section_group || (_l2q.siteInfo && _l2q.siteInfo.section) || 'DEFAULT';
            fetch(API_BASE + '/api/agent/quotation'
              + '?site='    + encodeURIComponent(site)
              + '&product=' + encodeURIComponent(product)
              + '&block='   + encodeURIComponent(_blk2)
              + '&section=' + encodeURIComponent(_sec2)
              + '&levels=2'
              + '&dp=' + dpPct
              + '&promo=purchase_with_purchase')
            .then(function (r) { return r.json(); })
            .then(function (json) {
              _pwpFetching = false;
              if (!json.error && json.levels && json.levels.length) {
                _pwpBundleActive = true;
                _pwpLevel2Data   = { levelData: json.levels[0], siteInfo: json };
                renderQuoteSection();
              }
            }).catch(function () { _pwpFetching = false; });
          }
        }
        if (_pwpBundleActive) {
          var _pwpActiveDiv = document.createElement('div');
          _pwpActiveDiv.className = 'bundle-section no-print';
          _pwpActiveDiv.innerHTML = '<div class="bundle-section-header">'
            + '<span class="bundle-section-title">Purchase with Purchase (PWP) 同步购买</span>'
            + '</div>';
          _pwpTarget.appendChild(_pwpActiveDiv);
        }
      } else {
        // Only one level selected — show guidance message
        _pwpBundleActive = false; _pwpLevel2Data = null; _pwpFetching = false;
        var _pwpMsg = _pwpHasL1
          ? 'Select a <strong>2nd unit</strong> from the layout to activate PWP bundle promo (Additional Discount RM 6,000).'
          : 'Select a unit from the layout to activate PWP bundle promo.';
        var _pwpMsgDiv = document.createElement('div');
        _pwpMsgDiv.className = 'bundle-trigger no-print';
        _pwpMsgDiv.innerHTML = '<p style="margin:0;padding:8px 12px;font-size:12px;color:#0369a1">'
          + '⬆ PWP Bundle 同步购买: ' + _pwpMsg + '</p>';
        _pwpTarget.appendChild(_pwpMsgDiv);
      }
    }

    // Restore scroll position after browser finishes layout (defer one frame)
    if (savedQtScroll > 0) {
      var elRef = el;
      var scrollTarget = savedQtScroll;
      requestAnimationFrame(function () {
        var s = elRef.querySelector('.qt-scroll');
        if (s) s.scrollLeft = scrollTarget;
      });
    }

    function applyDpPct(pctStr) {
        asNeedMode = false;
        var prevDp = dpPct;
        if (pctStr.startsWith('rm')) {
          _dpFixedRm = parseInt(pctStr.replace('rm', ''), 10);
          dpPct = 10; // instalment sentinel — ensures API excludes cash_purchase promo
        } else {
          _dpFixedRm = null;
          dpPct = parseInt(pctStr);
        }
        // Virtual sections (lot-range-restricted) must re-filter levels for the new DP tier
        if (prevDp !== dpPct && _virtualBlk && _virtualSec) {
          onPromoCardTap(_virtualBlk, _virtualSec);
          saveSession();
          return;
        }
        // Burial lots with restricted promos are DP-tier sensitive — re-fetch per lot with new DP
        var burialLotQuotes = lotQuotes.filter(function (q) { return q._burialLotNum != null; });
        if (prevDp !== dpPct && burialLotQuotes.length) {
          var bFetches = burialLotQuotes.map(function (q) {
            var bUrl = '/api/agent/quotation?site=' + encodeURIComponent(site)
              + '&product=' + encodeURIComponent(product)
              + '&block='   + encodeURIComponent(q._block)
              + '&section=' + encodeURIComponent(q._section)
              + '&lot='     + q._burialLotNum
              + '&dp='      + dpPct;
            return fetch(bUrl).then(function (r) { return r.json(); }).then(function (j) {
              if (!j || j.error || !j.levels) return;
              q.levelData = j.levels[0];
            });
          });
          Promise.all(bFetches).then(function () { renderQuoteSection(); });
          saveSession();
          return;
        }
        // Re-fetch promo for regular lots when DP changes (instalment vs cash promo selection)
        if (prevDp !== dpPct && lotQuotes.length && !window.AgentN3?.hasN3(site)) {
          var regularQuotes = lotQuotes.filter(function (q) { return q._burialLotNum == null && !_virtualBlk; });
          if (regularQuotes.length) {
            // Group by (block + section + nicheSection) so each group gets its own fetch with correct niche_section
            var fetchGroups = {};
            regularQuotes.forEach(function (q) {
              var blk = q._blk || (q.siteInfo && q.siteInfo.block);
              var sec = q._sec || (q.siteInfo && q.siteInfo.section);
              var ns = q._nicheSection || '';
              var gk = (blk || '') + '|' + (sec || '') + '|' + ns;
              if (!fetchGroups[gk]) fetchGroups[gk] = { blk: blk, sec: sec, ns: ns, quotes: [] };
              fetchGroups[gk].quotes.push(q);
            });
            var groupKeys = Object.keys(fetchGroups).filter(function (gk) {
              return fetchGroups[gk].blk && fetchGroups[gk].sec;
            });
            if (groupKeys.length) {
              var pending = groupKeys.length;
              function onGroupDone() { pending--; if (!pending) renderQuoteSection(); }
              groupKeys.forEach(function (gk) {
                var g = fetchGroups[gk];
                var url = API_BASE + '/api/agent/quotation?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(product) + '&block=' + encodeURIComponent(g.blk) + '&section=' + encodeURIComponent(g.sec) + '&dp=' + dpPct + (g.ns ? '&niche_section=' + encodeURIComponent(g.ns) : '');
                fetch(url)
                  .then(function (r) { return r.json(); })
                  .then(function (j) {
                    if (!j || j.error || !j.levels) { onGroupDone(); return; }
                    var promoByLevel = {};
                    j.levels.forEach(function (lv) {
                      var key = lv.level != null ? String(lv.level) : 'std';
                      promoByLevel[key] = lv.promo;
                    });
                    g.quotes.forEach(function (q) {
                      var ld = q.levelData;
                      if (!ld) return;
                      var key = ld.level != null ? String(ld.level) : 'std';
                      if (promoByLevel[key] !== undefined) ld.promo = promoByLevel[key];
                    });
                    onGroupDone();
                  }).catch(function () { onGroupDone(); });
              });
              saveSession();
              return;
            }
          }
        }
        // N3 promos are DP-tier sensitive — re-fetch promo only, update in place (don't replace lots)
        if (prevDp !== dpPct && window.AgentN3 && window.AgentN3.hasN3(site)) {
          var q0 = lotQuotes[0];
          var refBlk = q0 && (q0._blk || (q0.siteInfo && q0.siteInfo.block));
          var refSec = q0 && (q0._sec || (q0.siteInfo && q0.siteInfo.section));
          if (refBlk && refSec) {
            fetch(API_BASE + '/api/agent/quotation?site=' + encodeURIComponent(site) + '&product=' + encodeURIComponent(product) + '&block=' + encodeURIComponent(refBlk) + '&section=' + encodeURIComponent(refSec) + '&dp=' + dpPct)
              .then(function (r) { return r.json(); })
              .then(function (j) {
                if (!j || j.error || !j.levels) return;
                var promoByLevel = {};
                j.levels.forEach(function (lv) {
                  var key = lv.level != null ? String(lv.level) : (lv.lot_no != null ? String(lv.lot_no) : 'std');
                  promoByLevel[key] = lv.promo;
                });
                lotQuotes.forEach(function (q) {
                  var ld = q.levelData;
                  var key = ld.level != null ? String(ld.level) : (ld.lot_no != null ? String(ld.lot_no) : 'std');
                  if (key in promoByLevel) ld.promo = promoByLevel[key];
                });
                renderQuoteSection();
              });
            saveSession();
            return;
          }
        }
        saveSession(); renderQuoteSection();
    }

    // As-Need is still a standalone toggle pill (not part of the DP dropdown —
    // it's a different kind of choice, not a percentage value).
    el.querySelectorAll('.dp-pill[data-pct="as-need"]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        asNeedMode = !asNeedMode;
        saveSession(); renderQuoteSection();
      });
    });

    var dpSelectEl = el.querySelector('#dp-select');
    if (dpSelectEl) {
      dpSelectEl.addEventListener('change', function () {
        applyDpPct(dpSelectEl.value);
      });
    }

    // Tomb type buttons (Southern Region combo lot zones)
    el.querySelectorAll('[data-tomb-code]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _tombType = btn.getAttribute('data-tomb-code');
        renderQuoteSection();
      });
    });
  }

  function buildWorshipPlanHtml(calcs, plans) {
    var info = lotQuotes[0].siteInfo;
    var firstCalc = calcs[0];

    // 1-year data from the standard level row
    var yr1AsNeed  = firstCalc.q.levelData.as_need_price || firstCalc.q.levelData.pre_need_price || 0;
    var yr1Trust   = firstCalc.q.levelData.trust_account_facility || 0;
    var yr1Total   = yr1AsNeed + yr1Trust;
    var yr1Dp      = Math.round(yr1Total * dpPct / 100);
    var yr1Balance = yr1Total - yr1Dp;

    // 3-year data from the worship plan row
    var plan3 = null;
    for (var i = 0; i < plans.length; i++) {
      if ((plans[i].size_description || '').toLowerCase().indexOf('3') >= 0) { plan3 = plans[i]; break; }
    }
    var yr3PreNeed = plan3 ? (plan3.pre_need_price || 0) : 0;
    var yr3Trust   = plan3 ? (plan3.trust_account_facility || yr1Trust) : yr1Trust;
    var yr3Total   = yr3PreNeed + yr3Trust;
    var yr3Dp      = Math.round(yr3Total * dpPct / 100);
    var yr3Balance = yr3Total - yr3Dp;

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += renderZoneSection(info);
    if (lotQuotes[0] && lotQuotes[0].lotCode) h += '<div class="h-lot">Lot: ' + esc(lotQuotes[0].lotCode) + '</div>';
    h += '<div class="h-category"><span style="font-weight:400;opacity:0.65">Product:</span> ' + esc((info.lot_type ? info.lot_type + ' ' : '') + ((info.product_category || '').toLowerCase().indexOf('burial') >= 0 ? 'Plot' : (info.product_category || ''))) + '</div>';
    h += '</div>';

    h += '<div class="qt-scroll"><table class="qt"><thead></thead><tbody>';

    function wpRow(cls, label, zh, v1, v2) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
        + '<td>' + label + '</td><td>' + zh + '</td>'
        + '<td class="tv">' + v1 + '</td>'
        + '<td class="tv">' + v2 + '</td>'
        + '</tr>';
    }
    function wpSep() { return '<tr class="tsep"><td colspan="4"></td></tr>'; }
    function wpRule() { return '<tr class="tnet-rule"><td colspan="4"></td></tr>'; }

    h += wpRow('', 'Selling Price', '售价', fmt(yr1AsNeed), fmt(yr3PreNeed));
    h += wpRow('', 'Trust Account 3 &amp; Facility Cost', '储托账户3及设施款项', fmt(yr1Trust), fmt(yr3Trust));
    h += wpRow('tbold', 'Total Price', '总价', fmt(yr1Total), fmt(yr3Total));
    h += wpRule();
    h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
      + '<td class="tv">' + fmt(yr1Total) + '</td>'
      + '<td class="tv">' + fmt(yr3Total) + '</td>'
      + '</tr>' + wpRule();
    h += '</tbody></table></div>';
    h += '<div class="qt-footer">';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  function buildNoPromoHtml(calcs) {
    var _isEbl = calcs.some(function (x) { return (x.q.levelData.product_category || '').toLowerCase() === 'ebl'; });
    if (_isEbl && worshipPlans.length) return buildWorshipPlanHtml(calcs, worshipPlans);
    var hasBackwall = calcs.some(function (x) { return (x.q.levelData.backwall_cost || 0) > 0; });
    var info = lotQuotes[0].siteInfo;
    var n = calcs.length + 2;
    var lotCodes = calcs.map(function (x) { return x.q.lotCode; });

    function row(cls, label, zh, vals) {
      var r = '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td>' + zh + '</td>';
      vals.forEach(function (v, ci) {
        var lc = lotCodes[ci];
        var hid = hiddenCols[lc] ? ' col-hidden' : '';
        r += '<td class="tv' + hid + '" data-col="' + lc + '">' + v + '</td>';
      });
      return r + '</tr>';
    }
    function sep() { return '<tr class="tsep"><td colspan="' + n + '"></td></tr>'; }
    function rule() { return '<tr class="tnet-rule"><td colspan="' + n + '"></td></tr>'; }

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += renderZoneSection(info);
    var _nlpReligion = (info.product_category === 'NLP' && lotQuotes[0] && lotQuotes[0].nlpReligion) ? lotQuotes[0].nlpReligion : '';
    h += '<div class="h-category"><span style="font-weight:400;opacity:0.65">Product:</span> ' + esc((info.lot_type ? info.lot_type + ' ' : '') + ((info.product_category || '').toLowerCase().indexOf('burial') >= 0 ? 'Plot' : (info.product_category || ''))) + (_nlpReligion ? ' — ' + _nlpReligion : '') + '</div>';
    h += '</div>';

    h += '<div class="qt-scroll"><table class="qt"><thead>';
    h += '<tr class="no-print col-toggle-row"><th colspan="2" style="font-size:10px;color:#94a3b8;padding:4px 8px">Print columns:</th>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      h += '<th class="tc-val" style="text-align:center;padding:4px">'
        + '<input type="checkbox" class="col-toggle" data-col="' + lc + '"' + (hiddenCols[lc] ? '' : ' checked') + ' style="width:16px;height:16px;cursor:pointer">'
        + '</th>';
    });
    h += '</tr>';
    h += '</thead><tbody>';

    var _pdTnr = info.tenure || null; var _pdDir = info.direction || null; var _bcmRaw = info.bury_capacity_map || {}; var _pdBcM = {}; Object.keys(_bcmRaw).forEach(function(k){ _pdBcM[k.toLowerCase()] = _bcmRaw[k]; }); var _pdCatL = (info.product_category || '').toLowerCase(); var _pdIsLand = _pdCatL.indexOf('burial') >= 0 || _pdCatL === 'urn burial' || _pdCatL === 'land'; var _pdHasSize = calcs.some(function (x) { return !!(x.q.levelData && x.q.levelData.size_description); }); var _bcKeys = Object.keys(_pdBcM); var _bcFallback = _bcKeys.length === 1 ? _bcKeys[0] : ''; var _pdHasCap = calcs.some(function (x) { var lt = ((x.q.levelData && x.q.levelData.lot_type) || info.lot_type || _bcFallback).toLowerCase(); return !!_pdBcM[lt]; }); var _pdHasDir = _pdIsLand && _pdDir && _pdDir !== 'N/A' && _pdDir !== 'sold out';
    var _dirZh = { 'North': '北', 'South': '南', 'East': '东', 'West': '西', 'North East': '东北', 'Northeast': '东北', 'North West': '西北', 'Northwest': '西北', 'South East': '东南', 'Southeast': '东南', 'South West': '西南', 'Southwest': '西南' };
    var _tnrZh = { 'Freehold': '永久地契', 'Leasehold': '有期地契' };
    h += '<tr class="tsection-hdr"><td colspan="' + n + '">Product Details 产品资料</td></tr>';
    if (_pdTnr) h += row('tinfo no-print', 'Tenure', '地契性质', calcs.map(function () { var zh = _tnrZh[_pdTnr] || ''; return esc(_pdTnr + (zh ? ' ' + zh : '')); }));
    if (_pdHasDir) h += row('tinfo', 'Direction', '朝向', calcs.map(function () { var zh = _dirZh[_pdDir] || ''; return esc(_pdDir + (zh ? ' ' + zh : '')); }));
    if (_pdHasSize) h += row('tinfo', 'Size', '面积', calcs.map(function (x) { return esc((x.q.levelData && x.q.levelData.size_description) || '—'); }));
    var _bcKeys = Object.keys(_pdBcM); var _bcFallback = _bcKeys.length === 1 ? _bcKeys[0] : '';
    if (_pdHasCap) h += row('tinfo', 'Capacity', '可安葬人数', calcs.map(function (x) { var lt = ((x.q.levelData && x.q.levelData.lot_type) || info.lot_type || _bcFallback).toLowerCase(); var cap = _pdBcM[lt]; return cap ? cap + ' 位' + (lt === 'super double' ? ' (2 land + 2 niche)' : '') : '—'; }));
    h += '<tr class="tsection-hdr"><td colspan="2">Description 描述</td><td style="text-align:center"><div style="font-size:10px;font-weight:700">1 Year</div><div style="font-size:9px;font-weight:400;opacity:0.8">As Need / 常规</div></td><td style="text-align:center"><div style="font-size:10px;font-weight:700">3 Years</div><div style="font-size:9px;font-weight:400;opacity:0.8">Pre Need / 事前</div></td></tr>';

    var anDiscPct = asNeedMode ? ((lotQuotes[0] && lotQuotes[0].siteInfo && lotQuotes[0].siteInfo.as_need_discount_pct) || 0) : 0;
    var hasPedestalSpecialPromo = calcs.some(function (x) {
      return x.q.levelData.total_pre_need_price != null && (x.q.levelData.product_category || '') === 'Pedestal';
    });
    h += row('', 'Original Price', '原价', calcs.map(function (x) { return fmt(x.c.originalPrice); }));
    if (asNeedMode && anDiscPct) {
      h += row('tred', 'As-Need Discount ' + anDiscPct + '% 即时折扣', '', calcs.map(function (x) {
        return '- ' + fmt(Math.round(x.c.originalPrice * anDiscPct / 100));
      }));
    }
    if (!asNeedMode && hasPedestalSpecialPromo) {
      h += row('', 'Pre-Launch Price', '推介价', calcs.map(function (x) { return fmt(x.q.levelData.pre_need_price || 0); }));
      h += row('tbold tpnp', 'Special Promotion Price', '特惠价', calcs.map(function (x) { return fmt(x.q.levelData.total_pre_need_price || 0); }));
    } else if (!asNeedMode) {
      h += row('tbold tpnp', 'Pre Need Price', '价格', calcs.map(function (x) { return fmt(x.c.preNeedPrice); }));
    }
    if (calcs.some(function (x) { return x.c.trust > 0; })) h += row('', 'Trust Account 3 &amp; Facility Cost', '储托账户3及设施款项', calcs.map(function (x) { return fmt(x.c.trust); }));
    if (hasBackwall) h += row('', 'Backwall Cost', '后壁费用', calcs.map(function (x) { return (x.q.levelData.backwall_cost || 0) > 0 ? fmt(x.c.backwall) : '—'; }));
    h += row('tbold', 'Total Price', '总价', calcs.map(function (x) {
      if (asNeedMode) {
        var disc = anDiscPct ? Math.round(x.c.originalPrice * anDiscPct / 100) : 0;
        return fmt(x.c.originalPrice - disc + (x.c.trust || 0) + (x.c.backwall || 0));
      }
      return fmt(x.c.totalPrice);
    }));
    if (!asNeedMode) {
      var fullPmt = dpPct === 100;
      if (!fullPmt) {
        h += sep();
        var _dpLabel = _dpFixedRm != null ? '<strong>RM' + fmt(_dpFixedRm) + '</strong>' : '<strong>' + dpPct + '%</strong>';
        h += row('', _dpLabel + ' Down Payment', '头期', calcs.map(function (x) { return fmt(x.c.downPayment); }));
        h += row('', 'Balance', '余额', calcs.map(function (x) { return fmt(x.c.balance); }));
      }
    }
    h += rule();
    h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      var hid = hiddenCols[lc] ? ' col-hidden' : '';
      var netVal;
      if (asNeedMode) {
        var disc = anDiscPct ? Math.round(x.c.originalPrice * anDiscPct / 100) : 0;
        netVal = x.c.originalPrice - disc + (x.c.trust || 0) + (x.c.backwall || 0);
      } else {
        netVal = x.c.netTotalPrice;
      }
      h += '<td class="tv' + hid + '" data-col="' + lc + '">' + fmt(netVal) + '</td>';
    });
    h += '</tr>' + rule();
    h += '</tbody></table></div>';
    h += '<div class="qt-footer">';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  function buildPackagePlotHtml(calcs) {
    var info = lotQuotes[0].siteInfo;
    var n = calcs.length + 2;
    var lotCodes = calcs.map(function (x) { return x.q.lotCode; });

    function row(cls, label, zh, vals) {
      var r = '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td>' + zh + '</td>';
      vals.forEach(function (v, ci) {
        var lc = lotCodes[ci];
        var hid = hiddenCols[lc] ? ' col-hidden' : '';
        r += '<td class="tv' + hid + '" data-col="' + lc + '">' + v + '</td>';
      });
      return r + '</tr>';
    }
    function sep() { return '<tr class="tsep"><td colspan="' + n + '"></td></tr>'; }
    function rule() { return '<tr class="tnet-rule"><td colspan="' + n + '"></td></tr>'; }

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += renderZoneSection(info);
    h += '<div class="h-category">Package Plot</div>';
    h += '</div>';

    h += '<div class="qt-scroll"><table class="qt"><thead>';
    h += '<tr class="no-print col-toggle-row"><th colspan="2" style="font-size:10px;color:#94a3b8;padding:4px 8px">Print columns:</th>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      h += '<th class="tc-val" style="text-align:center;padding:4px">'
        + '<input type="checkbox" class="col-toggle" data-col="' + lc + '"' + (hiddenCols[lc] ? '' : ' checked') + ' style="width:16px;height:16px;cursor:pointer">'
        + '</th>';
    });
    h += '</tr>';
    h += '<tr><th class="tc-lbl" colspan="2">Description 描述</th>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      var hid = hiddenCols[lc] ? ' col-hidden' : '';
      var ln = x.q.levelData.lot_no || '';
      var sectionPart = ln.split('(')[0].trim() || x.q.section;
      var lotRange = '';
      var rm = ln.match(/\(([^)]+)\)/);
      if (rm) {
        var inner = rm[1];
        if (inner.indexOf('~') >= 0) {
          var rp = inner.split('~');
          lotRange = 'Lots ' + rp[0].trim() + '–' + rp[1].trim();
        } else {
          lotRange = 'Lot ' + inner.trim();
        }
      }
      h += '<th class="tc-val' + hid + '" data-col="' + lc + '" style="min-width:90px">'
        + '<div style="font-size:10px;font-weight:700">' + esc(lotRange || ln || lc) + '</div>'
        + (x.q.levelData.size_description ? '<div style="font-size:8px;font-weight:400;opacity:0.65;letter-spacing:-0.2px">' + esc(x.q.levelData.size_description) + '</div>' : '')
        + '</th>';
    });
    h += '</tr></thead><tbody>';

    var hasTomb    = calcs.some(function (x) { return (x.q.levelData.tomb_price || 0) > 0; });
    var hasHole    = calcs.some(function (x) { return (x.q.levelData.hole_excavation_fees || 0) > 0; });
    var hasBack    = calcs.some(function (x) { return (x.q.levelData.backwall_cost || 0) > 0; });

    var hasAsNeedDiscount = calcs.some(function (x) {
      var promo = x.q.levelData.promo;
      return promo && promo.purchase_condition === 'as_need' && promo.discount_pct;
    });

    h += row('tbold tpnp', 'Plot Price', '骨灰地价格', calcs.map(function (x) { return fmt(x.q.levelData.as_need_price || 0); }));

    if (hasAsNeedDiscount) {
      h += row('tred', 'As-Need Discount 即时折扣', '', calcs.map(function (x) {
        var promo = x.q.levelData.promo;
        var discPct = promo && promo.purchase_condition === 'as_need' ? (promo.discount_pct || 0) : 0;
        if (!discPct) return '—';
        return '- ' + fmt(Math.round((x.q.levelData.as_need_price || 0) * discPct / 100));
      }));
    }

    h += row('', 'Trust Account 3 &amp; Facility Cost', '储托账户3及设施款项', calcs.map(function (x) { return fmt(x.q.levelData.trust_account_facility || 0); }));
    if (hasBack) h += row('', 'Backwall Cost', '后壁费用', calcs.map(function (x) { return (x.q.levelData.backwall_cost || 0) > 0 ? fmt(x.q.levelData.backwall_cost) : '—'; }));
    if (hasHole) h += row('', 'Hole Excavation Fees', '挖掘费', calcs.map(function (x) { return (x.q.levelData.hole_excavation_fees || 0) > 0 ? fmt(x.q.levelData.hole_excavation_fees) : '—'; }));
    if (hasTomb) h += row('', 'Tomb', '墓碑', calcs.map(function (x) { return (x.q.levelData.tomb_price || 0) > 0 ? fmt(x.q.levelData.tomb_price) : '—'; }));
    h += sep();
    h += rule();
    h += '<tr class="tnet"><td colspan="2">TOTAL PACKAGE PRICE 配套总价</td>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      var hid = hiddenCols[lc] ? ' col-hidden' : '';
      var promo = x.q.levelData.promo;
      var discPct = (hasAsNeedDiscount && promo && promo.purchase_condition === 'as_need') ? (promo.discount_pct || 0) : 0;
      var plotPrice = x.q.levelData.as_need_price || 0;
      var discountedPlot = discPct ? Math.round(plotPrice * (1 - discPct / 100)) : plotPrice;
      var total = discountedPlot
                + (x.q.levelData.trust_account_facility || 0)
                + (x.q.levelData.backwall_cost || 0)
                + (x.q.levelData.hole_excavation_fees || 0)
                + (x.q.levelData.tomb_price || 0);
      h += '<td class="tv' + hid + '" data-col="' + lc + '">' + fmt(total) + '</td>';
    });
    h += '</tr>' + rule();
    h += '</tbody></table></div>';
    h += '<div class="qt-footer">';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  // ── PWP 3-column matrix: Level 1 | Level 2 | Total ────────────
  // Level 1: Special Discount = c1.specialRebate (RM 2,000 from standard Customer Promo row)
  // Level 2: Additional Discount = c2.specialRebate (RM 6,000 from purchase_with_purchase row)
  // Each column stands alone; Total column sums every row across both levels.
  function _buildPwpMatrixHtml(calc1, lvl2, dpPct, lot2Code) {
    var q1   = calc1.q;
    var c1   = calc1.c;
    var ld2  = lvl2.levelData;
    var c2   = calcMatrix(ld2, dpPct);
    var info = q1.siteInfo;
    var fmt  = function (n) { if (n == null || isNaN(n)) return '—'; return 'RM ' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
    var fmtNeg = function (n) { if (!n || n <= 0) return '—'; return '<span style="color:#dc2626">(' + fmt(n) + ')</span>'; };

    var tenure1 = c1.tenure || 0;
    var tenure2 = c2.tenure || 0;
    var maxTen  = Math.max(tenure1, tenure2);
    var dpFull  = dpPct === 100;

    // Total column values
    var totalNet  = c1.netTotalPrice + c2.netTotalPrice;
    var totalDp   = c1.downPayment   + c2.downPayment;
    var totalBal  = c1.balance       + c2.balance;

    function row3(cls, en, zh, v1, v2, vt) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
        + '<td>' + en + '</td><td>' + zh + '</td>'
        + '<td class="tv">' + v1 + '</td>'
        + '<td class="tv">' + v2 + '</td>'
        + '<td class="tv">' + vt + '</td>'
        + '</tr>';
    }
    function sep3()  { return '<tr class="tsep"><td colspan="5"></td></tr>'; }
    function rule3() { return '<tr class="tnet-rule"><td colspan="5"></td></tr>'; }

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += renderZoneSection(info);
    h += '<div class="h-promo-badge" style="background:#0284c7">Purchase with Purchase (PWP) 同步购买</div>';
    h += '</div>';

    h += '<div class="qt-scroll"><table class="qt"><thead>';
    h += '<tr><th class="tc-lbl" colspan="2">Description 描述</th>'
      + '<th class="tc-val" style="min-width:90px">Level 1<br><div style="font-size:9px;font-weight:400;opacity:0.7">' + esc(q1.lotCode) + '</div></th>'
      + '<th class="tc-val" style="min-width:90px">Level 2 (PWP)<br><div style="font-size:9px;font-weight:400;opacity:0.7">' + esc(lot2Code || ld2.size_description || '') + '</div></th>'
      + '<th class="tc-val" style="min-width:90px">Total 总计</th>'
      + '</tr></thead><tbody>';

    var origTotal = (c1.originalPrice || c1.preNeedPrice) + (c2.originalPrice || c2.preNeedPrice);
    h += row3('', 'Original Price', '原价', fmt(c1.originalPrice || c1.preNeedPrice), fmt(c2.originalPrice || c2.preNeedPrice), fmt(origTotal));
    if (c1.preNeedRebate > 0 || c2.preNeedRebate > 0) {
      h += row3('tred', 'Pre Need Rebate', '事前规划回扣',
        c1.preNeedRebate > 0 ? fmtNeg(c1.preNeedRebate) : '—',
        c2.preNeedRebate > 0 ? fmtNeg(c2.preNeedRebate) : '—',
        fmtNeg(c1.preNeedRebate + c2.preNeedRebate));
      h += row3('tbold tpnp', 'Pre Need Price', '价格', fmt(c1.preNeedPrice), fmt(c2.preNeedPrice), fmt(c1.preNeedPrice + c2.preNeedPrice));
    }
    if (c1.trust + c2.trust > 0) h += row3('', 'Trust Account 3 &amp; Facility Cost', '储托账戸3及设施款项', fmt(c1.trust), fmt(c2.trust), fmt(c1.trust + c2.trust));
    h += row3('tbold', 'Total Price', '总价', fmt(c1.totalPrice), fmt(c2.totalPrice), fmt(c1.totalPrice + c2.totalPrice));

    if (!dpFull) {
      h += sep3();
      h += row3('', '<strong>' + dpPct + '%</strong> Down Payment', '头期', fmt(c1.downPayment), fmt(c2.downPayment), fmt(totalDp));
      h += row3('', 'Balance', '余额', fmt(c1.balance), fmt(c2.balance), fmt(totalBal));
      // Level 1: Special Discount (RM 2,000); Level 2: Additional Discount (RM 6,000)
      if (c1.specialRebate > 0) {
        h += row3('tred', 'Special Discount', '特别折扣', fmtNeg(c1.specialRebate), '—', fmtNeg(c1.specialRebate));
      }
      if (c2.specialRebate > 0) {
        h += row3('tred', 'Additional Discount', '额外折扣', '—', fmtNeg(c2.specialRebate), fmtNeg(c2.specialRebate));
      }
      // Instalment Amount (balance after discounts)
      var inst1 = tenure1 > 0 ? c1.instalmentAmount : 0;
      var inst2 = tenure2 > 0 ? c2.instalmentAmount : 0;
      h += row3('tbold tinst', 'Instalment Amount', '供期余额',
        tenure1 > 0 ? fmt(inst1) : '—',
        tenure2 > 0 ? fmt(inst2) : '—',
        fmt(inst1 + inst2));
      h += row3('ttenure', 'Instalment Tenure', '分期付款期限',
        tenure1 > 0 ? String(tenure1) : '—',
        tenure2 > 0 ? String(tenure2) : '—',
        String(maxTen));
      if (maxTen > 1) {
        h += row3('', '1st – ' + (maxTen - 1) + 'th Monthly', '',
          tenure1 > 0 ? fmt(c1.monthly) : '—',
          tenure2 > 0 ? fmt(c2.monthly) : '—',
          fmt((tenure1 > 0 ? c1.monthly : 0) + (tenure2 > 0 ? c2.monthly : 0)));
      }
      h += row3('', maxTen + 'th Monthly', '',
        tenure1 > 0 ? fmt(c1.lastInstalment) : '—',
        tenure2 > 0 ? fmt(c2.lastInstalment) : '—',
        fmt((tenure1 > 0 ? c1.lastInstalment : 0) + (tenure2 > 0 ? c2.lastInstalment : 0)));
    }

    h += rule3();
    h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
      + '<td class="tv">' + fmt(c1.netTotalPrice) + '</td>'
      + '<td class="tv">' + fmt(c2.netTotalPrice) + '</td>'
      + '<td class="tv">' + fmt(totalNet) + '</td>'
      + '</tr>' + rule3();

    h += '</tbody></table></div>';
    h += '<div class="qt-footer">';
    var endDate = ld2.promo && ld2.promo.promo_end_date ? ld2.promo.promo_end_date : '';
    if (endDate) h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(endDate) + '</p>';
    h += '<p>1. Only NEW Pre-Need sale confirmed during the promotion period is eligible to this promotion.</p>';
    h += '<p>2. Purchase with Purchase (PWP): customer must purchase both Level 1 and Level 2 together.</p>';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  function buildTombBundleHtml(calcs) {
    var info = lotQuotes[0].siteInfo;
    var tombOpts = info.tomb_options || [];
    if (!_tombType && tombOpts.length) _tombType = tombOpts[0].tomb_code;
    var activeTomb     = tombOpts.find(function (t) { return t.tomb_code === _tombType; }) || tombOpts[0];
    var tombOriginal   = activeTomb ? Number(activeTomb.price)    : 0;
    var tombDiscount   = activeTomb ? Number(activeTomb.discount || 0) : 0;
    var tombPrice      = tombOriginal - tombDiscount;  // net price after discount

    // In print, show the selected tomb name in the Tomb column header
    var tombPrintName = '<div class="print-only" style="font-size:9px;font-weight:400;opacity:0.8">' + esc(activeTomb ? activeTomb.tomb_name : '') + '</div>';

    function row3(cls, en, zh, landVal, tombVal, totalVal) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
        + '<td>' + en + '</td><td>' + zh + '</td>'
        + '<td class="tv">' + landVal + '</td>'
        + '<td class="tv">' + tombVal + '</td>'
        + '<td class="tv">' + totalVal + '</td>'
        + '</tr>';
    }
    function sep3()  { return '<tr class="tsep"><td colspan="5"></td></tr>'; }
    function rule3() { return '<tr class="tnet-rule"><td colspan="5"></td></tr>'; }

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    var _zoneComboLabel = '<div class="h-product"><span style="font-weight:400;opacity:0.65">Zone:</span> ' + esc(info.product) + ' <span style="font-size:11px;font-weight:600;color:#1a3a6b;opacity:0.75">(Combo Lot)</span></div>';
    h += renderZoneSection(info).replace(/^<div class="h-product">[\s\S]*?<\/div>/, _zoneComboLabel);
    h += '<div class="h-category"><span style="font-weight:400;opacity:0.65">Product:</span> '
      + esc((info.lot_type ? info.lot_type + ' ' : '') + 'Burial Plot') + '</div>';
    h += '</div>';

    calcs.forEach(function (x) {
      var lvl      = x.q.levelData;
      var trust    = Number(lvl.trust_account_facility) || 0;
      var backwall = Number(lvl.backwall_cost) || 0;
      var landAsNeed  = Number(lvl.as_need_price)  || 0;
      var landPreNeed = Number(lvl.pre_need_price)  || 0;

      var isBurial = lvl.lot_no != null && lvl.level == null;
      var lotSub = '<div style="font-size:9px;opacity:0.7">' + (isBurial ? 'Lot ' : '') + esc(x.q.lotCode) + '</div>';

      var _pdTnr = info.tenure || null;
      var _pdDir = info.direction || null;
      var _pdHasSize = !!(lvl && lvl.size_description);
      var _bcmRaw = info.bury_capacity_map || {};
      var _bcmKeys = Object.keys(_bcmRaw);
      var _pdCap = _bcmKeys.length ? (_bcmRaw[_bcmKeys[0]] || null) : null;
      var _tnrZh = { 'Freehold': '永久地契', 'Leasehold': '有期地契' };
      var _dirZh = { 'North': '北', 'South': '南', 'East': '东', 'West': '西', 'North East': '东北', 'Northeast': '东北', 'North West': '西北', 'Northwest': '西北', 'South East': '东南', 'Southeast': '东南', 'South West': '西南', 'Southwest': '西南' };
      function rowPd(en, zh, val) {
        return '<tr class="tinfo"><td>' + en + '</td><td>' + zh + '</td><td class="tv" colspan="3">' + val + '</td></tr>';
      }

      h += '<div class="qt-scroll"><table class="qt"><thead></thead><tbody>';
      if (_pdTnr || _pdHasSize || _pdDir || _pdCap) {
        h += '<tr class="tsection-hdr"><td colspan="5">Product Details 产品资料</td></tr>';
        if (_pdTnr) { var _zh = _tnrZh[_pdTnr] || ''; h += '<tr class="tinfo no-print"><td>Tenure</td><td>地契性质</td><td class="tv" colspan="3">' + esc(_pdTnr + (_zh ? ' ' + _zh : '')) + '</td></tr>'; }
        if (_pdDir && _pdDir !== 'N/A') { var _zh2 = _dirZh[_pdDir] || ''; h += rowPd('Direction', '朝向', esc(_pdDir + (_zh2 ? ' ' + _zh2 : ''))); }
        if (_pdCap) h += rowPd('Capacity', '容量', String(_pdCap));
        if (_pdHasSize) h += rowPd('Size', '面积', esc(lvl.size_description));
      }

      // Tomb type selector row (interactive, hidden on print)
      var _tombRowHtml = '<tr class="no-print" style="background:#eff6ff">'
        + '<td colspan="2" style="padding:6px 10px;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.05em;text-transform:uppercase">Tomb Type 墓碑类型</td>'
        + '<td colspan="3" style="padding:6px 10px;text-align:center">';
      tombOpts.forEach(function (t) {
        var isActive = t.tomb_code === (activeTomb ? activeTomb.tomb_code : '');
        _tombRowHtml += '<button data-tomb-code="' + esc(t.tomb_code) + '" style="margin:0 4px;padding:4px 14px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;border:2px solid '
          + (isActive ? '#1a3a6b;background:#1a3a6b;color:#fff' : '#94a3b8;background:#fff;color:#334155')
          + '">' + esc(t.tomb_name) + '</button>';
      });
      _tombRowHtml += '</td></tr>';
      h += _tombRowHtml;

      // Column header: Land | Tomb | Total
      var _colHdrCell = 'text-align:center;border-left:2px solid #fff;border-right:2px solid #fff';
      h += '<tr class="tsection-hdr">'
        + '<td colspan="2">Description 描述</td>'
        + '<td style="' + _colHdrCell + '">Land 土地<br>' + lotSub + '</td>'
        + '<td style="' + _colHdrCell + '">Tomb 墓碑<br>' + tombPrintName + '</td>'
        + '<td style="text-align:center">Total 总计</td>'
        + '</tr>';

      var promo   = x.q.levelData.promo || null;
      var discRm  = promo && promo.discount_rm ? Number(promo.discount_rm) : 0;

      var anm            = !!window._agentAsNeedMode;
      var asNeedTotal    = landAsNeed + tombOriginal;
      var totalPriceLand = (anm ? landAsNeed : landPreNeed) + trust + backwall;  // pre-need + trust + backwall
      var totalPriceTomb = tombOriginal;                                          // tomb unchanged
      var totalPrice     = totalPriceLand + totalPriceTomb;
      var netLand        = totalPriceLand - discRm;                               // after promo discount
      var netTotal       = netLand + (tombOriginal - tombDiscount);

      function fmtNeg(n) {
        if (!n || n <= 0) return '—';
        return '<span style="color:#dc2626">(' + fmt(n) + ')</span>';
      }

      var landPreNeedDisc = landAsNeed - landPreNeed;
      // 1. Original Price (As-Need)
      h += row3('', 'Original Price', '原价', fmt(landAsNeed), fmt(tombOriginal), fmt(asNeedTotal));
      // 2. Pre-Need Discount (land only — tomb has no pre-need price difference)
      if (!anm && landPreNeedDisc > 0) h += row3('tred', 'Pre-Need Discount', '预售折扣', fmtNeg(landPreNeedDisc), '—', fmtNeg(landPreNeedDisc));
      // 3. Pre Need Price (tomb stays at original price — no pre-need vs as-need distinction)
      if (!anm) h += row3('tbold tpnp', 'Pre Need Price', '价格', fmt(landPreNeed), fmt(tombOriginal), fmt(landPreNeed + tombOriginal));
      // 4. Trust, Backwall
      h += row3('', 'Trust Account 3 &amp; Facility Cost', '储托账戸3及设施款项', fmt(trust), '—', fmt(trust));
      if (backwall > 0) h += row3('', 'Backwall Cost', '后壁费用', fmt(backwall), '—', fmt(backwall));
      // 5. Total Price (pre-need + trust + backwall, before promo discount)
      h += row3('tbold', 'Total Price', '总价', fmt(totalPriceLand), fmt(totalPriceTomb), fmt(totalPrice));

      // ── DP / Instalment section ───────────────────────────────────
      if (!anm) {
        var months   = promo && promo.max_instalment_months ? Number(promo.max_instalment_months) : 0;
        var fullPmt  = dpPct === 100;
        var _effDpRm = (promo && promo.min_dp_rm != null) ? promo.min_dp_rm : _dpFixedRm;
        var dpAmt    = _effDpRm != null ? _effDpRm : Math.round(totalPrice * dpPct / 100);
        var landDpAmt= Math.round(totalPriceLand * dpPct / 100);
        var tombDpAmt= Math.round(totalPriceTomb * dpPct / 100);
        // pre-discount balance (shown in Balance row)
        var balPreDisc     = totalPrice     - dpAmt;
        var landBalPreDisc = totalPriceLand - landDpAmt;
        var tombBalPreDisc = tombOriginal   - tombDpAmt;
        // post-discount instalment amounts
        var instAmt     = balPreDisc     - (discRm + tombDiscount);
        var landInstAmt = landBalPreDisc - discRm;
        var tombInstAmt = tombBalPreDisc - tombDiscount;
        var monthly      = months > 0 ? Math.ceil(instAmt / months) : 0;
        var lastInst     = months > 0 ? instAmt - monthly * (months - 1) : 0;
        var landMonthly  = months > 0 ? Math.ceil(landInstAmt / months) : 0;
        var tombMonthly  = months > 0 ? Math.ceil(tombInstAmt / months) : 0;
        var landLastInst = months > 0 ? landInstAmt - landMonthly * (months - 1) : 0;
        var tombLastInst = months > 0 ? tombInstAmt - tombMonthly * (months - 1) : 0;

        if (!fullPmt) {
          h += sep3();
          h += row3('', '<strong>' + dpPct + '%</strong> Down Payment', '头期',
            fmt(landDpAmt), fmt(tombDpAmt), fmt(dpAmt));
          h += row3('', 'Balance', '余额', fmt(landBalPreDisc), fmt(tombBalPreDisc), fmt(balPreDisc));
          if (discRm > 0 || tombDiscount > 0) {
            h += row3('tred', 'Promotion Discount', '促销折扣',
              fmtNeg(discRm), fmtNeg(tombDiscount), fmtNeg(discRm + tombDiscount));
          }
          if (months > 0) {
            h += row3('tbold tinst', 'Instalment Amount', '供期余额', fmt(landInstAmt), fmt(tombInstAmt), fmt(instAmt));
            h += row3('ttenure', 'Instalment Tenure', '分期付款期限', String(months) + ' mths', String(months) + ' mths', String(months) + ' mths');
            h += row3('', '1st – ' + (months - 1) + 'th', '', fmt(landMonthly), fmt(tombMonthly), fmt(monthly));
            h += row3('', months + 'th', '', fmt(landLastInst), fmt(tombLastInst), fmt(lastInst));
          }
        }
      }

      h += rule3();
      h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
        + '<td class="tv">' + fmt(netLand) + '</td>'
        + '<td class="tv">' + fmt(tombPrice) + '</td>'
        + '<td class="tv">' + fmt(netTotal) + '</td>'
        + '</tr>' + rule3();
      h += '</tbody></table></div>';
    });

    var _srFirstPromo = lotQuotes[0] && lotQuotes[0].q && lotQuotes[0].q.levelData && lotQuotes[0].q.levelData.promo ? lotQuotes[0].q.levelData.promo : null;
    h += '<div class="qt-footer">';
    if (_srFirstPromo && _srFirstPromo.promo_end_date) h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(_srFirstPromo.promo_end_date) + '</p>';
    h += '<p>1. Only NEW Pre-Need sale confirmed during the promotion period is eligible to this promotion.</p>';
    h += '<p>2. Purchasers are required to submit the balance payment documents support upon sales confirmation.</p>';
    h += '<p>3. No Booking and Reservation allowed for products with 35% discount and above.</p>';
    if (_srFirstPromo && _srFirstPromo.remarks) h += '<p>4. ' + esc(_srFirstPromo.remarks) + '</p>';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  function buildMatrixHtml() {
    if (!lotQuotes.length) return '';
    var calcs = lotQuotes.map(function (q) { return { q: q, c: calcMatrix(q.levelData, dpPct) }; });
    window._agentAsNeedMode = asNeedMode;
    if (_pwpBundleActive && _pwpLevel2Data && calcs.length) {
      var _pwpCalc1 = calcs.find(function (x) {
        var _p = x.q.lotCode.split('-');
        return (_p.length >= 2 ? (_p[1].replace(/^0+/, '') || _p[1]) : '') === '1';
      }) || calcs[0];
      var _pwpCalc2 = calcs.find(function (x) { return x !== _pwpCalc1; });
      var _lot2Code = _pwpCalc2 ? _pwpCalc2.q.lotCode : null;
      return _buildPwpMatrixHtml(_pwpCalc1, _pwpLevel2Data, dpPct, _lot2Code);
    }
    var _isSouthern = SOUTHERN_SITES[(site || '').toLowerCase()];
    if (!_isSouthern && window.AgentBundle && window.AgentBundle.isBundleActive() && window.AgentBundle.hasBundleLot(lotQuotes)) return window.AgentBundle.buildMatrixHtml(calcs, dpPct);
    if (window.AgentNLP   && window.AgentNLP.hasNLP(lotQuotes))        return window.AgentNLP.buildMatrixHtml(calcs, dpPct, nlpPromos);
    if (!_isSouthern && window.AgentCombo && window.AgentCombo.hasComboLot(lotQuotes)) return window.AgentCombo.buildMatrixHtml(calcs, dpPct);
    if (window.AgentN3    && window.AgentN3.hasN3(site))               return window.AgentN3.buildMatrixHtml(calcs, dpPct, lotQuotes[0] && lotQuotes[0].siteInfo, hiddenCols);
    if (lotQuotes[0] && lotQuotes[0].levelData && lotQuotes[0].levelData.product_category === 'Package Plot') return buildPackagePlotHtml(calcs);
    if (lotQuotes[0] && lotQuotes[0].siteInfo && lotQuotes[0].siteInfo.tomb_options && lotQuotes[0].siteInfo.tomb_options.length) return buildTombBundleHtml(calcs);
    var hasPromo = calcs.some(function (x) { return !!x.q.levelData.promo; });
    var _calcsIsNiche = calcs.some(function (x) { return (x.q.levelData.product_category || '').toLowerCase() === 'niche'; });
    if (!hasPromo && !_calcsIsNiche) return buildNoPromoHtml(calcs);
    var hasRebate     = calcs.some(function (x) { return x.c.preNeedRebate > 0; });
    var hasBackwall   = calcs.some(function (x) { return (x.q.levelData.backwall_cost || 0) > 0; });
    var hasInstalment = calcs.some(function (x) { return x.c.tenure > 0; });
    var hasDrPlus     = calcs.some(function (x) { return x.c.drPlusUnits > 0; });
    var isAsNeedPromo = calcs.every(function (x) { return !!x.c.isAsNeed; });
    var maxTenure     = Math.max.apply(null, calcs.map(function (x) { return x.c.tenure; }).concat([0]));
    var firstPromo    = null;
    for (var i = 0; i < calcs.length; i++) { if (calcs[i].q.levelData.promo) { firstPromo = calcs[i].q.levelData.promo; break; } }
    var activeDpTier  = null;
    if (firstPromo && firstPromo.dp_tiers && firstPromo.dp_tiers.length) {
      var tiers2 = firstPromo.dp_tiers.filter(function (t) { return t <= dpPct; });
      if (tiers2.length) activeDpTier = Math.max.apply(null, tiers2);
    }
    var rebateLabel = activeDpTier != null
      ? activeDpTier + '% Special Rebate'
      : (firstPromo && firstPromo.discount_pct != null ? firstPromo.discount_pct + '% Special Rebate' : 'Special Rebate');
    var info = lotQuotes[0].siteInfo;
    var n = calcs.length + 2;
    var lotCodes = calcs.map(function (x) { return x.q.lotCode; });

    function row(cls, label, zh, vals) {
      var r = '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td>' + zh + '</td>';
      vals.forEach(function (v, ci) {
        var lc = lotCodes[ci];
        var hid = hiddenCols[lc] ? ' col-hidden' : '';
        r += '<td class="tv' + hid + '" data-col="' + lc + '">' + v + '</td>';
      });
      return r + '</tr>';
    }
    function sep() { return '<tr class="tsep"><td colspan="' + n + '"></td></tr>'; }
    function rule() { return '<tr class="tnet-rule"><td colspan="' + n + '"></td></tr>'; }

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site_name_en || info.site) + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += renderZoneSection(info);
    h += '<div class="h-category"><span style="font-weight:400;opacity:0.65">Product:</span> ' + esc((info.lot_type ? info.lot_type + ' ' : '') + ((info.product_category || '').toLowerCase().indexOf('burial') >= 0 ? 'Plot' : (info.product_category || ''))) + '</div>';
    if (firstPromo && firstPromo.promo_name) { var _pnBg = (firstPromo.promo_name === 'New Launch Promo') ? 'background:#ea580c' : ''; h += '<div class="h-promo-badge"' + (_pnBg ? ' style="' + _pnBg + '"' : '') + '>' + esc(firstPromo.promo_name) + '</div>'; }
    h += '</div>';

    h += '<div class="qt-scroll"><table class="qt"><thead>';
    // Checkbox row — hidden in print, lets user untick columns before saving PDF
    h += '<tr class="no-print col-toggle-row"><th colspan="2" style="font-size:10px;color:#94a3b8;padding:4px 8px">Print columns:</th>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      h += '<th class="tc-val" style="text-align:center;padding:4px">'
        + '<input type="checkbox" class="col-toggle" data-col="' + lc + '"' + (hiddenCols[lc] ? '' : ' checked') + ' style="width:16px;height:16px;cursor:pointer">'
        + '</th>';
    });
    h += '</tr>';
    h += '</thead><tbody>';

    var _pdTnr2 = info.tenure || null; var _pdDir2 = info.direction || null; var _bcmRaw2 = info.bury_capacity_map || {}; var _pdBcM2 = {}; Object.keys(_bcmRaw2).forEach(function(k){ _pdBcM2[k.toLowerCase()] = _bcmRaw2[k]; }); var _pdCatL2 = (info.product_category || '').toLowerCase(); var _pdIsLand2 = _pdCatL2.indexOf('burial') >= 0 || _pdCatL2 === 'urn burial' || _pdCatL2 === 'land'; var _pdHasSize2 = calcs.some(function (x) { return !!(x.q.levelData && x.q.levelData.size_description); }); var _bcKeys2 = Object.keys(_pdBcM2); var _bcFallback2 = _bcKeys2.length === 1 ? _bcKeys2[0] : ''; var _pdHasCap2 = calcs.some(function (x) { var lt = ((x.q.levelData && x.q.levelData.lot_type) || info.lot_type || _bcFallback2).toLowerCase(); return !!_pdBcM2[lt]; }); var _pdHasDir2 = _pdIsLand2 && _pdDir2 && _pdDir2 !== 'N/A' && _pdDir2 !== 'sold out';
    var _dirZh2 = { 'North': '北', 'South': '南', 'East': '东', 'West': '西', 'North East': '东北', 'Northeast': '东北', 'North West': '西北', 'Northwest': '西北', 'South East': '东南', 'Southeast': '东南', 'South West': '西南', 'Southwest': '西南' };
    var _tnrZh2 = { 'Freehold': '永久地契', 'Leasehold': '有期地契' };
    h += '<tr class="tsection-hdr"><td colspan="' + n + '">Product Details 产品资料</td></tr>';
    if (_pdTnr2) h += row('tinfo no-print', 'Tenure', '地契性质', calcs.map(function () { var zh = _tnrZh2[_pdTnr2] || ''; return esc(_pdTnr2 + (zh ? ' ' + zh : '')); }));
    if (_pdHasDir2) h += row('tinfo', 'Direction', '朝向', calcs.map(function () { var zh = _dirZh2[_pdDir2] || ''; return esc(_pdDir2 + (zh ? ' ' + zh : '')); }));
    if (_pdHasSize2) h += row('tinfo', 'Size', '面积', calcs.map(function (x) { return esc((x.q.levelData && x.q.levelData.size_description) || '—'); }));
    var _bcKeys2 = Object.keys(_pdBcM2); var _bcFallback2 = _bcKeys2.length === 1 ? _bcKeys2[0] : '';
    if (_pdHasCap2) h += row('tinfo', 'Capacity', '可安葬人数', calcs.map(function (x) { var lt = ((x.q.levelData && x.q.levelData.lot_type) || info.lot_type || _bcFallback2).toLowerCase(); var cap = _pdBcM2[lt]; return cap ? cap + ' 位' + (lt === 'super double' ? ' (2 land + 2 niche)' : '') : '—'; }));
    h += '<tr class="tsection-hdr"><td colspan="2">Description 描述</td>' + calcs.map(function (x) {
      var isBurial2 = !!x.q.isBurial || (x.q.levelData.lot_no != null && x.q.levelData.level == null);
      var lbl2;
      if (isBurial2) { lbl2 = esc(x.q.lotCode.indexOf('-burial-') < 0 ? x.q.lotCode : (x.q.levelData.lot_no || x.q.lotCode)); }
      else { var _lp2 = x.q.lotCode.split('-'); var _lr2 = site === 'Nckl' && _lp2.length === 2 ? (_lp2[0] || '0') : ((_lp2.length === 4 ? _lp2[2] : _lp2[1]) || '0'); var lv2 = _lr2.replace(/^0+/, '') || _lr2; lbl2 = 'Lvl ' + lv2 + (x.q.displayRange ? '' : ' · ' + esc(x.q.lotCode)); }
      var hid2 = (hiddenCols || {})[x.q.lotCode] ? ' col-hidden' : '';
      return '<td class="tc-val' + hid2 + '" data-col="' + x.q.lotCode + '" style="text-align:center">' + lbl2 + '</td>';
    }).join('') + '</tr>';

    var anDiscPct2 = (asNeedMode && !isAsNeedPromo) ? ((lotQuotes[0] && lotQuotes[0].siteInfo && lotQuotes[0].siteInfo.as_need_discount_pct) || 0) : 0;
    h += row('', isAsNeedPromo ? 'As Need Price' : 'Original Price', '原价', calcs.map(function (x) { return fmt(x.c.originalPrice); }));
    if (asNeedMode && !isAsNeedPromo && anDiscPct2) {
      h += row('tred', 'As-Need Discount ' + anDiscPct2 + '% 即时折扣', '', calcs.map(function (x) {
        return '- ' + fmt(Math.round(x.c.originalPrice * anDiscPct2 / 100));
      }));
    }
    if (!asNeedMode && !isAsNeedPromo && hasRebate) h += row('tred', 'Pre Need Rebate', '事前规划回扣', calcs.map(function (x) { return x.c.preNeedRebate > 0 ? '(' + fmt(x.c.preNeedRebate) + ')' : '—'; }));
    if (!asNeedMode && !isAsNeedPromo) h += row('tbold tpnp', 'Pre Need Price', '价格', calcs.map(function (x) { return fmt(x.c.preNeedPrice); }));
    if (calcs.some(function (x) { return x.c.trust > 0; })) h += row('', 'Trust Account 3 &amp; Facility Cost', '储托账戸3及设施款项', calcs.map(function (x) { return fmt(x.c.trust); }));
    if (hasBackwall) h += row('', 'Backwall Cost', '后壁费用', calcs.map(function (x) { return (x.q.levelData.backwall_cost || 0) > 0 ? fmt(x.c.backwall) : '—'; }));
    h += row('tbold', 'Total Price', '总价', calcs.map(function (x) {
      if (asNeedMode && !isAsNeedPromo) {
        var disc = anDiscPct2 ? Math.round(x.c.originalPrice * anDiscPct2 / 100) : 0;
        return fmt(x.c.originalPrice - disc + (x.c.trust || 0) + (x.c.backwall || 0));
      }
      return fmt(x.c.totalPrice);
    }));
    if (!asNeedMode && !isAsNeedPromo) {
      var fullPmt = dpPct === 100;
      if (!fullPmt) {
        h += sep();
        var _hasPromoRmDp = calcs.some(function(x) { return x.q.levelData.promo && x.q.levelData.promo.min_dp_rm != null; });
        var _dpLabelPed = _hasPromoRmDp ? '<strong>Min. DP</strong>'
          : (_dpFixedRm != null ? '<strong>RM' + fmt(_dpFixedRm) + '</strong>' : '<strong>' + dpPct + '%</strong>');
        h += row('', _dpLabelPed + ' Down Payment', '头期', calcs.map(function (x) { return fmt(x.c.downPayment); }));
        h += row('', 'Balance', '余额', calcs.map(function (x) { return fmt(x.c.balance); }));
      }
      if (hasPromo) h += row('tred', rebateLabel, '特别回扣', calcs.map(function (x) { return x.q.levelData.promo ? fmt(x.c.specialRebate) : '—'; }));
      if (!fullPmt && hasPromo) h += row('tbold tinst', 'Instalment Amount', '供期余额', calcs.map(function (x) { return x.c.tenure > 0 ? fmt(x.c.instalmentAmount) : '—'; }));
      if (!fullPmt && hasPromo) h += row('ttenure', 'Instalment Tenure', '分期付款期限', calcs.map(function (x) { return x.c.tenure > 0 ? String(x.c.tenure) : '—'; }));
      if (!fullPmt && hasPromo) h += row('', '1st – ' + (maxTenure > 1 ? maxTenure - 1 : '?') + 'th', '', calcs.map(function (x) { return x.c.tenure > 0 ? fmt(x.c.monthly) : '—'; }));
      if (!fullPmt && hasPromo) h += row('', (maxTenure || '?') + 'th', '', calcs.map(function (x) { return x.c.tenure > 0 ? fmt(x.c.lastInstalment) : '—'; }));
    } else if (isAsNeedPromo && hasPromo) {
      // Full payment only — show discount row but no DP/instalment
      h += row('tred', rebateLabel, '特别回扣', calcs.map(function (x) { return x.q.levelData.promo ? fmt(x.c.specialRebate) : '—'; }));
    }
    h += rule();
    h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>';
    calcs.forEach(function (x) {
      var lc = x.q.lotCode;
      var hid = hiddenCols[lc] ? ' col-hidden' : '';
      var netVal;
      if (asNeedMode && !isAsNeedPromo) {
        var disc = anDiscPct2 ? Math.round(x.c.originalPrice * anDiscPct2 / 100) : 0;
        netVal = x.c.originalPrice - disc + (x.c.trust || 0) + (x.c.backwall || 0);
      } else {
        netVal = x.c.netTotalPrice;
      }
      h += '<td class="tv' + hid + '" data-col="' + lc + '">' + fmt(netVal) + '</td>';
    });
    h += '</tr>' + rule();
    if (hasDrPlus) {
      h += sep() + row('tdr', 'Entitled Unit DRPlus', 'DRPlus 有权单位', calcs.map(function (x) { return x.c.drPlusUnits > 0 ? String(x.c.drPlusUnits) : '—'; }));
    }
    h += '</tbody></table></div>';
    h += '<div class="qt-footer">';
    if (firstPromo) h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(firstPromo.promo_end_date) + '</p>';
    h += '<p>1. Only NEW Pre-Need sale confirmed during the promotion period is eligible to this promotion.</p>';
    h += '<p>2. Purchasers are required to submit the balance payment documents support upon sales confirmation.</p>';
    h += '<p>3. No Booking and Reservation allowed for products with 35% discount and above.</p>';
    if (firstPromo && firstPromo.remarks) h += '<p>4. ' + esc(firstPromo.remarks) + '</p>';
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  // ── Toast notification ─────────────────────────────────────────
  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'agent-toast' + (type === 'err' ? ' toast-err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    // fade in
    requestAnimationFrame(function () { t.classList.add('toast-in'); });
    setTimeout(function () {
      t.classList.remove('toast-in');
      setTimeout(function () { t.remove(); }, 400);
    }, 3500);
  }

  // ── Synced-at label ────────────────────────────────────────────
  function updateSyncedAt(layouts) {
    var el = qs('layout-synced-at');
    if (!el) return;
    var ts = layouts && layouts[0] && layouts[0].synced_at;
    if (!ts) { el.textContent = ''; return; }
    var d = new Date(ts);
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    var age = days === 0 ? 'today' : days === 1 ? '1 day ago' : days + ' days ago';
    el.textContent = 'Last update: ' + d.toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (' + age + ')';
  }

  // ── Session persistence ────────────────────────────────────────
  function saveSession() {
    try {
      var snapshot = {
        site: site,
        product: product,
        dpPct: dpPct,
        dpFixedRm: _dpFixedRm,
        selectedLots: selectedLots,
        layoutScrollLeft: layoutScrollLeft,
        layoutMode: layoutMode,
        drawerSecFilter:   window._drawerSectionFilter || '',
        drawerLvlFilter:   window._drawerLevelFilter   || '',
      };
      localStorage.setItem('agent_session', JSON.stringify(snapshot));
    } catch(e) {}
  }

  function restoreSession() {
    try {
      var raw = localStorage.getItem('agent_session');
      if (!raw) return;
      var snap = JSON.parse(raw);
      if (!snap.site) return;

      site             = snap.site    || '';
      product          = snap.product || '';
      dpPct            = snap.dpPct   || 20;
      var _isRmDpRestore = (snap.site === 'Semenyih-NMG' && snap.product === 'OV6-1F-AT');
      _dpFixedRm       = snap.dpFixedRm !== undefined ? snap.dpFixedRm : (_isRmDpRestore ? 4000 : null);
      selectedLots     = snap.selectedLots || [];
      lotQuotes        = []; // never restore lotQuotes — large objects crash on restore
      layoutScrollLeft = snap.layoutScrollLeft || 0;
      layoutMode       = snap.layoutMode || 'grid';
      window._drawerSectionFilter = snap.drawerSecFilter  || '';
      window._drawerLevelFilter   = snap.drawerLvlFilter   || '';
      window._drawerPromoFilter   = snap.drawerPromoFilter || '';
      currentZoneGroupKey = product || '';
      _cachedCatGroups    = null;

      if (site) {
        var restoreZoneGroup = function () {
          // After zones load, find the group key that matches the restored product
          if (product && _cachedCatGroups) {
            var found = null;
            _cachedCatGroups.forEach(function (cat) {
              cat.groups.forEach(function (g) {
                if (g.key === product) { found = g.key; return; }
                if (g.type === 'group') {
                  g.members.forEach(function (m) { if (m.name === product) found = g.key; });
                }
              });
            });
            if (found) currentZoneGroupKey = found;
          }
          populateZoneDropdown();
          updateZoneSelect();
        };
        if (zonesCache[site]) {
          productOpts = zonesCache[site]; _cachedCatGroups = null; restoreZoneGroup();
        } else {
          fetch(API_BASE + '/api/agent/filters?step=products&site=' + encodeURIComponent(site))
            .then(function (r) { return r.json(); })
            .then(function (d) { zonesCache[site] = d.options || []; productOpts = zonesCache[site]; _cachedCatGroups = null; restoreZoneGroup(); })
            .catch(function () {});
        }
      }

      if (site && product) {
        loadLayout(site, product);
      }
      updateUI();
    } catch(e) {}
  }

  // ── UI helpers ─────────────────────────────────────────────────
  function updateSiteSelect() {
    updateSiteDropdownBtn();
  }

  function updateZoneDropdownBtn() {
    var btn = qs('zone-dd-btn');
    var val = qs('zone-dd-val');
    if (!btn || !val) return;
    btn.disabled = !site;
    if (!currentZoneGroupKey) {
      val.textContent = 'Select zone…';
      btn.classList.add('placeholder');
    } else {
      val.textContent = currentZoneGroupKey;
      btn.classList.remove('placeholder');
    }
  }

  function updateZoneSelect() {
    updateZoneDropdownBtn();
    updateSectionSelect();
  }

  function updateResetBtn() {
    var btn = qs('btn-reset');
    if (btn) btn.style.display = ''; // always visible — last-resort escape hatch
  }

  function updateQsBannerSub() {
    var sub = qs('qs-banner-sub');
    if (!sub) return;
    if (!site) { sub.textContent = 'Pick a site, zone & section fast'; return; }
    var parts = [site];
    if (currentZoneGroupKey) parts.push(currentZoneGroupKey);
    var secSel = qs('section-sel');
    if (secSel && secSel.value) parts.push(secSel.value);
    sub.textContent = parts.join(' · ');
  }

  function updateUI() {
    updateSiteSelect(); updateZoneSelect(); updateResetBtn(); updateQsBannerSub();
    renderLayoutArea(); renderQuoteSection();
  }

  // ── Print ──────────────────────────────────────────────────────
  // Capacitor's WebView has no window.print() dialog wired up. On native
  // platforms, the btn-pdf handler below calls the NativePrint Capacitor
  // plugin (android/.../NativePrintPlugin.java) instead, which hands the
  // live WebView to Android's own PrintManager — same @media print CSS,
  // same beforeprint/afterprint events below, just a different trigger.
  window.addEventListener('beforeprint', function () {
    var el = qs('quote-section');
    if (!el) return;
    var dynStyle = qs('dyn-page-style');
    if (!dynStyle) {
      dynStyle = document.createElement('style');
      dynStyle.id = 'dyn-page-style';
      document.head.appendChild(dynStyle);
    }

    // Remove overflow clipping on qt-scroll so the full table width is measurable and printable
    var qtScrollEl = el.querySelector('.qt-scroll');
    if (qtScrollEl) {
      qtScrollEl.dataset.printOverflow = qtScrollEl.style.overflow || '';
      qtScrollEl.style.overflow = 'visible';
    }

    el.style.zoom = '';

    // Measure true content dimensions with overflow visible
    var contentW = el.scrollWidth;
    var contentH = el.scrollHeight;

    // Scale to fit A4 landscape (1123×794px at 96dpi, zero margins) in one page.
    var scale = Math.min(1123 / contentW, 794 / contentH);
    if (scale > 1) scale = 1;

    dynStyle.textContent = '@media print { #quote-section { margin: 0 auto; display: block; } }';
    el.style.zoom = scale.toFixed(3);
  });
  window.addEventListener('afterprint', function () {
    var el = qs('quote-section');
    if (el) el.style.zoom = '';
    // Restore qt-scroll overflow
    var qtScrollEl = el ? el.querySelector('.qt-scroll') : null;
    if (qtScrollEl) {
      qtScrollEl.style.overflow = qtScrollEl.dataset.printOverflow || '';
      delete qtScrollEl.dataset.printOverflow;
    }
    var s = qs('dyn-page-style');
    if (s) s.textContent = '';
  });

  // ── Init ───────────────────────────────────────────────────────
  function init() {
    switchTab('home');

    // Column visibility toggle — checkbox per column in the quotation table
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.classList.contains('col-toggle')) return;
      var lc = t.dataset.col;
      if (!lc) return;
      if (t.checked) {
        delete hiddenCols[lc];
      } else {
        hiddenCols[lc] = true;
      }
      // col-hidden only takes effect during print (@media print) — no screen change needed
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'contact-picker-search') renderContactPickerList(e.target.value);
      if (e.target && e.target.id === 'customer-info-name') renderCustomerNameSuggestions(e.target.value);
      if (e.target && e.target.id === 'team-perf-search') renderTeamPerfTable();
      if (e.target && e.target.id === 'leads-search') renderLeadsList();
    });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.classList.contains('contact-pick-check')) { _contactSelection[t.dataset.id] = t.checked; return; }
      if (t && t.id === 'team-perf-tier-filter') renderTeamPerfTable();
      if (t && (t.id === 'leads-label-filter' || t.id === 'leads-sort')) renderLeadsList();
    });

    // Stamp col-hidden just before the browser renders the print preview,
    // and clean up immediately after — works correctly across all browsers.
    window.addEventListener('beforeprint', function () {
      Object.keys(hiddenCols).forEach(function (lc) {
        document.querySelectorAll('[data-col="' + lc + '"]').forEach(function (el) { el.classList.add('col-hidden'); });
      });
    });
    window.addEventListener('afterprint', function () {
      document.querySelectorAll('.col-hidden').forEach(function (el) { el.classList.remove('col-hidden'); });
    });

    // Populate site dropdown on load
    populateSiteSelect();

    // ── Quick Select / Filter Products banners — closest()-based so a tap
    // anywhere inside (including child spans that carry their own id, like
    // qs-banner-sub) still resolves to the banner button, not just the
    // literal element under the finger. Checked ahead of the generic
    // id-based switch-case below, which would otherwise stop at the first
    // id it finds walking up and miss these. ──
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest('#qs-banner-btn')) { openQsStepper(1); return; }
      if (e.target && e.target.closest('#filter-banner-btn')) { openFilterStepper(); return; }
    });

    // ── Site custom dropdown (all via delegation — survives Next.js hydration) ──
    document.addEventListener('click', function (e) {
      // Site dropdown: button toggle
      if (e.target && e.target.closest('#site-dd-btn')) {
        if (siteDropdownIsOpen) closeSiteDropdown(); else openSiteDropdown();
        return;
      }
      // Site dropdown: group header toggle
      var catEl = e.target && e.target.closest('[data-sitecat]');
      if (catEl) {
        var label = catEl.getAttribute('data-sitecat');
        openSiteGroup = (openSiteGroup === label) ? null : label;
        renderSiteDropdownPanel();
        return;
      }
      // Site dropdown: item click
      var itemEl = e.target && e.target.closest('[data-siteitem]');
      if (itemEl) {
        var val = itemEl.getAttribute('data-siteitem');
        var siteChanged = (val !== site);
        site = val;
        showQsStep(2);
        if (siteChanged) {
          product = ''; currentZoneGroupKey = ''; openCategory = null; _cachedCatGroups = null;
          window._drawerSectionFilter = ''; window._drawerLevelFilter = ''; window._drawerPromoFilter = ''; productOpts = []; resetLayout();
        }
        saveSession(); updateUI();
        if (!val) return;
        (function loadSiteAssets(s) {
          var ap = document.getElementById('assets-panel');
          if (!ap) return;
          var cacheKey = s + '|' + s;
          if (_assetsCache[cacheKey] !== undefined) { _buildAssetsPanelHtml(ap, _assetsCache[cacheKey]); return; }
          ap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#94a3b8">Loading materials…</div>';
          fetch(API_BASE + '/api/agent/assets?site=' + encodeURIComponent(s) + '&product=' + encodeURIComponent(s))
            .then(function(r) { return r.json(); })
            .then(function(j) { var a = j.assets || []; _assetsCache[cacheKey] = a; _buildAssetsPanelHtml(ap, a); })
            .catch(function() { ap.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:#94a3b8">No product materials</div>'; });
        }(val));
        if (zonesCache[val]) {
          productOpts = zonesCache[val]; _cachedCatGroups = null; populateZoneDropdown();
          if (val === 'Nirvana Life Planning') { var _nlpOpt = productOpts.find(function(p){ return p.category === 'NLP'; }); if (_nlpOpt) { onZoneSelected(_nlpOpt.name); switchTab('browse'); closeAvailDrawer(); } }
        } else {
          fetch(API_BASE + '/api/agent/filters?step=products&site=' + encodeURIComponent(val))
            .then(function (r) { return r.json(); })
            .then(function (d) {
              zonesCache[val] = d.options || []; productOpts = zonesCache[val]; _cachedCatGroups = null; populateZoneDropdown();
              if (val === 'Nirvana Life Planning') { var _nlpOpt = productOpts.find(function(p){ return p.category === 'NLP'; }); if (_nlpOpt) { onZoneSelected(_nlpOpt.name); switchTab('browse'); closeAvailDrawer(); } }
            })
            .catch(function () {});
        }
        return;
      }
      // Close site dropdown when clicking outside
      if (siteDropdownIsOpen) {
        var panel = document.getElementById('site-dd-panel');
        var btn   = document.getElementById('site-dd-btn');
        if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) closeSiteDropdown();
      }
    });

    // Site / Zone / Section select handlers
    document.addEventListener('change', function (e) {
      var id = e.target && e.target.id;

      if (id === 'edm-site-sel') {
        _loadEdmForSite(e.target.value);
        return;
      }

      if (e.target && e.target.classList && e.target.classList.contains('mqr-status-sel')) {
        applyQuoteStatus(e.target, e.target.dataset.ref, e.target.value);
        return;
      }

      if (id === 'section-sel') {
        var val = e.target.value;
        if (!_cachedCatGroups) _cachedCatGroups = buildCategoryGroups();
        var g = null;
        _cachedCatGroups.forEach(function (cat) {
          cat.groups.forEach(function (gr) { if (gr.key === currentZoneGroupKey) g = gr; });
        });
        if (!g) return;
        if (g.type === 'group') {
          // Sub-zone products (e.g. NV-S-DA) are genuinely different products — full reload needed.
          if (!val) return;
          product = val;
          window._drawerSectionFilter = '';
          window._drawerLevelFilter   = '';
          window._drawerPromoFilter   = '';
          resetLayout(); saveSession(); updateUI();
          loadLayout(site, product);
        } else {
          // Subsections within the same zone — layout already loaded, just filter rows in place.
          product = currentZoneGroupKey;
          window._drawerSectionFilter = val;
          window._drawerLevelFilter   = '';
          saveSession();
          applyLayoutSectionFilter();
          colorCells();
          updateQsBannerSub();
        }
        return;
      }
    });

    // Custom zone dropdown click delegation
    document.addEventListener('click', function (e) {
      var ddBtn   = qs('zone-dd-btn');
      var ddPanel = qs('zone-dd-panel');

      // Toggle dropdown on button click
      if (ddBtn && e.target === ddBtn) {
        if (zoneDropdownIsOpen) { closeZoneDropdown(); } else { openZoneDropdown(); }
        e.stopPropagation();
        return;
      }

      // Category header click — toggle open category
      var catEl = e.target && e.target.closest && e.target.closest('.f-dd-cat');
      if (catEl && ddPanel && ddPanel.contains(catEl)) {
        var cat = catEl.dataset.cat;
        openCategory = (openCategory === cat) ? null : cat;
        renderZoneDropdownPanel();
        e.stopPropagation();
        return;
      }

      // Zone item click
      var zoneEl = e.target && e.target.closest && e.target.closest('.f-dd-zone');
      if (zoneEl && ddPanel && ddPanel.contains(zoneEl)) {
        var zoneKey = zoneEl.dataset.zone;
        if (zoneKey) onZoneSelected(zoneKey);
        e.stopPropagation();
        return;
      }

      // Outside click — close dropdown
      if (zoneDropdownIsOpen) {
        if (ddPanel && !ddPanel.contains(e.target)) closeZoneDropdown();
      }
    });

    // Quick Select stepper — Section step (step 3) click delegation
    document.addEventListener('click', function (e) {
      var secPanel = qs('qs-section-panel');
      if (!secPanel || !secPanel.contains(e.target)) return;

      var secEl = e.target.closest && e.target.closest('[data-section]');
      if (secEl) {
        var secVal = secEl.getAttribute('data-section');
        var sel = qs('section-sel');
        if (sel) {
          sel.value = secVal;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        closeQsStepper();
        return;
      }

      var finishEl = e.target.closest && e.target.closest('[data-qsfinish]');
      if (finishEl) {
        closeQsStepper();
        return;
      }
    });

    // Use event delegation on document so listeners survive any React DOM re-renders
    document.addEventListener('click', function (e) {
      var id = e.target && e.target.id;
      if (!id && e.target) id = e.target.closest && e.target.closest('[id]') && e.target.closest('[id]').id;
      // Poster modal — tap an image with data-poster attribute directly (challenge gallery)
      var directPoster = e.target && e.target.closest && e.target.closest('[data-poster]');
      if (directPoster && !directPoster.hasAttribute('data-events')) {
        var dp = directPoster.getAttribute('data-poster');
        if (dp) { openPosterModal({ poster: dp }); return; }
      }
      // Poster modal — tap a calendar day with data-events attribute
      var evtTarget = e.target && e.target.closest && e.target.closest('[data-events]');
      if (evtTarget) {
        var evtsRaw = evtTarget.getAttribute('data-events');
        if (evtsRaw) {
          var evts = JSON.parse(evtsRaw);
          if (evts.length === 1) {
            openPosterModal(evts[0]);
          } else {
            openEventPicker(evts);
          }
          return;
        }
      }
      // Event picker item tap
      var pickerItem = e.target && e.target.closest && e.target.closest('.evt-picker-item');
      if (pickerItem) {
        var itemEvt = JSON.parse(pickerItem.getAttribute('data-evt'));
        document.getElementById('evt-picker-backdrop').classList.remove('open');
        openPosterModal(itemEvt);
        return;
      }

      // Close side menu on outside click or when a menu item is clicked
      var sideMenu = document.getElementById('side-menu');
      if (sideMenu && sideMenu.classList.contains('open')) {
        var menuBtn = document.getElementById('btn-menu');
        var clickedLink = e.target && e.target.closest && e.target.closest('#side-menu a, #side-menu button.menu-item');
        if (clickedLink || (!sideMenu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target))) {
          sideMenu.classList.remove('open');
          var sideMenuBackdrop = document.getElementById('side-menu-backdrop');
          if (sideMenuBackdrop) sideMenuBackdrop.classList.remove('open');
        }
      }

      // Bottom tab bar switching
      var tabBtn = e.target && e.target.closest && e.target.closest('.tab-btn');
      if (tabBtn) {
        switchTab(tabBtn.dataset.tab);
        return;
      }

      // Memo drawer tab switching
      var memoTab = e.target && e.target.closest && e.target.closest('.memo-tab');
      if (memoTab) {
        var tabId = memoTab.dataset.tab;
        document.querySelectorAll('.memo-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.memo-panel').forEach(function(p) { p.classList.remove('active'); });
        memoTab.classList.add('active');
        var panel = document.getElementById('memo-panel-' + tabId);
        if (panel) panel.classList.add('active');
        return;
      }

      // "Edit" button on a recent-quote row (Me tab) — name/phone only
      var editBtn = e.target && e.target.closest && e.target.closest('.mqr-edit-btn');
      if (editBtn) {
        openEditCustomerModal(editBtn.dataset.ref, editBtn.dataset.name, editBtn.dataset.phone);
        return;
      }

      // "Delete" button on a recent-quote row (Me tab) — removes the quote
      // from the list; any past "Close" sales record is untouched.
      var deleteQuoteBtn = e.target && e.target.closest && e.target.closest('.mqr-delete-btn');
      if (deleteQuoteBtn) {
        if (confirm('Delete this quote? This cannot be undone.')) {
          fetch(API_BASE + '/api/agent/me-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_quote', quotationRef: deleteQuoteBtn.dataset.ref }),
          }).then(function (res) { return res.json(); }).then(function (data) {
            if (data.error) { alert(data.error); return; }
            _meLoaded = false;
            loadMeSnapshot();
            _leadsLoaded = false;
            loadLeadsSnapshot();
          }).catch(function (err) { dbg('delete quote failed: ' + err); });
        }
        return;
      }

      // Tapping outside the name-suggestion dropdown closes it without picking
      var cnsWrap = qs('customer-name-autocomplete-wrap');
      if (cnsWrap && !cnsWrap.contains(e.target)) hideCustomerNameSuggestions();

      // Picking a name-lookup suggestion (Share flow) — fills phone too
      var cnsItem = e.target && e.target.closest && e.target.closest('.cns-item');
      if (cnsItem) {
        var cnsNameEl = qs('customer-info-name');
        var cnsPhoneEl = qs('customer-info-phone');
        if (cnsNameEl) cnsNameEl.value = cnsItem.dataset.name || '';
        if (cnsPhoneEl) cnsPhoneEl.value = cnsItem.dataset.phone || '';
        hideCustomerNameSuggestions();
        return;
      }

      // Sortable column header (Team Performance table)
      var perfHeaderTh = e.target && e.target.closest && e.target.closest('#team-perf-table thead th[data-sort]');
      if (perfHeaderTh) {
        var sortCol = perfHeaderTh.dataset.sort;
        if (_teamPerfSortCol === sortCol) {
          _teamPerfSortDir = _teamPerfSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _teamPerfSortCol = sortCol;
          _teamPerfSortDir = 'asc';
        }
        renderTeamPerfTable();
        return;
      }

      // Expand/collapse a lead's quote history (Leads tab)
      var leadExpandBtn = e.target && e.target.closest && e.target.closest('.lead-expand-toggle');
      if (leadExpandBtn) {
        var leadRow = leadExpandBtn.closest('.lead-row');
        var leadQuotesEl = leadRow && leadRow.nextElementSibling;
        if (leadQuotesEl && leadQuotesEl.classList.contains('lead-quotes')) {
          var leadNowOpen = leadQuotesEl.classList.toggle('open');
          leadExpandBtn.classList.toggle('expanded', leadNowOpen);
        }
        return;
      }

      // Expand/collapse a team member's own downline (Team tab)
      var teamExpandBtn = e.target && e.target.closest && e.target.closest('.team-expand-toggle');
      if (teamExpandBtn) {
        var teamRow = teamExpandBtn.closest('.team-row');
        var childrenEl = teamRow && teamRow.nextElementSibling;
        if (childrenEl && childrenEl.classList.contains('team-children')) {
          var nowOpen = childrenEl.classList.toggle('open');
          teamExpandBtn.classList.toggle('expanded', nowOpen);
        }
        return;
      }

      // "View Quote" button on a quote row (Me tab and Leads tab)
      var viewQuoteBtn = e.target && e.target.closest && e.target.closest('.mqr-view-btn');
      if (viewQuoteBtn) { openQuoteSnapshotView(viewQuoteBtn.dataset.quoteId); return; }

      // "Delete" button on a lead row (Leads tab)
      var deleteLeadBtn = e.target && e.target.closest && e.target.closest('.lead-delete-btn');
      if (deleteLeadBtn) { deleteLead(deleteLeadBtn.dataset.id); return; }

      // "Edit" button on a lead row (Leads tab)
      var editLeadBtn = e.target && e.target.closest && e.target.closest('.lead-edit-btn');
      if (editLeadBtn) { openAddLeadModal(editLeadBtn.dataset.id); return; }

      // "Suggest Products" toggle on a lead row (Leads tab)
      var suggestLeadBtn = e.target && e.target.closest && e.target.closest('.lead-suggest-toggle');
      if (suggestLeadBtn) { toggleLeadSuggestions(suggestLeadBtn.dataset.id); return; }

      // Year-pair switch on the Quota trend chart (Me tab)
      var yearBtn = e.target && e.target.closest && e.target.closest('.qtrend-year-btn');
      if (yearBtn) {
        document.querySelectorAll('.qtrend-year-btn').forEach(function (b) { b.classList.remove('active'); });
        yearBtn.classList.add('active');
        loadQuotaHistory(parseInt(yearBtn.dataset.baseYear, 10));
        return;
      }

      // Tapping a month in the yearly-goal mini bar chart (Me tab)
      var monthBarCol = e.target && e.target.closest && e.target.closest('.mgc-bar-col');
      if (monthBarCol) {
        openMonthGoalModal(monthBarCol.dataset.period, parseFloat(monthBarCol.dataset.target) || 0, !!monthBarCol.dataset.locked);
        return;
      }

      // Mark Sold checklist item toggled — recompute the running total
      var soldCheck = e.target && e.target.closest && e.target.closest('.sold-item-check');
      if (soldCheck) {
        updateSoldModalTotal();
        return;
      }

      // "Set Goal" / "Edit Goal" button on a team-member row (Team tab)
      var goalBtn = e.target && e.target.closest && e.target.closest('.team-set-goal-btn');
      if (goalBtn) {
        openGoalModal(goalBtn.dataset.userId, goalBtn.dataset.label);
        return;
      }

      // "Remove goal" button on a team-member row (Team tab)
      var removeGoalBtn = e.target && e.target.closest && e.target.closest('.team-remove-goal-btn');
      if (removeGoalBtn) {
        if (confirm('Remove this goal? The member can still set their own anytime.')) {
          fetch(API_BASE + '/api/agent/team-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_goal', user_id: removeGoalBtn.dataset.userId })
          }).then(function (res) { return res.json(); }).then(function (data) {
            if (data.error) { alert(data.error); return; }
            _teamLoaded = false;
            loadTeamSnapshot();
          }).catch(function (err) { dbg('delete goal failed: ' + err); });
        }
        return;
      }

      switch (id) {
        case 'qs-banner-btn':     openQsStepper(1); break;
        case 'filter-banner-btn': openFilterStepper(); break;
        case 'filter-stepper-close': closeFilterStepper(); break;
        case 'filter-stepper-back':  filterStepBack(); break;
        case 'btn-reset':         resetAll(); break;
        case 'btn-reload':        window.location.reload(); break;
        case 'btn-menu': {
          var sm = document.getElementById('side-menu');
          var smBackdrop = document.getElementById('side-menu-backdrop');
          if (sm) sm.classList.toggle('open');
          if (smBackdrop) smBackdrop.classList.toggle('open');
          break;
        }
        case 'btn-menu-pricelist': openMemoDrawer('pricelist'); break;
        case 'btn-menu-promo':     openMemoDrawer('promo'); break;
        case 'memo-drawer-close':
        case 'memo-backdrop':
          document.getElementById('memo-backdrop').classList.remove('open');
          document.getElementById('memo-drawer').classList.remove('open');
          break;
        case 'qs-stepper-close':
          closeQsStepper();
          break;
        case 'qs-stepper-back':
          if (qsStep > 1) showQsStep(qsStep - 1); else closeQsStepper();
          break;
        case 'btn-menu-forms':
          document.getElementById('forms-backdrop').classList.add('open');
          document.getElementById('forms-drawer').classList.add('open');
          break;
        case 'forms-drawer-close':
        case 'forms-backdrop':
          document.getElementById('forms-backdrop').classList.remove('open');
          document.getElementById('forms-drawer').classList.remove('open');
          break;
        case 'btn-menu-sites':
          document.getElementById('sites-backdrop').classList.add('open');
          document.getElementById('sites-drawer').classList.add('open');
          break;
        case 'btn-menu-logout':
          fetch(API_BASE + '/api/auth/logout', { method: 'POST', credentials: 'include' })
            .catch(function (err) { dbg('logout failed: ' + err); })
            .then(function () {
              try { localStorage.removeItem('agent_session'); } catch (e) {}
              // Locally-bundled shell (Capacitor) needs the literal
              // login.html file path; the remotely-loaded main app's own
              // server resolves the clean "/login" path itself.
              var isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
              window.location.href = isNative ? '/login.html' : '/login';
            });
          break;
        case 'sites-drawer-close':
        case 'sites-backdrop':
          document.getElementById('sites-backdrop').classList.remove('open');
          document.getElementById('sites-drawer').classList.remove('open');
          break;
        case 'evt-picker-backdrop':
          if (e.target.id === 'evt-picker-backdrop') document.getElementById('evt-picker-backdrop').classList.remove('open');
          break;
        case 'poster-modal-close':
          document.getElementById('poster-modal-backdrop').classList.remove('open');
          document.getElementById('poster-modal-img').src = '';
          document.getElementById('poster-modal-register').style.display = 'none';
          document.getElementById('poster-modal-notice').style.display = 'none';
          break;
        case 'poster-modal-backdrop':
          if (e.target.id === 'poster-modal-backdrop') {
            document.getElementById('poster-modal-backdrop').classList.remove('open');
            document.getElementById('poster-modal-img').src = '';
            document.getElementById('poster-modal-register').style.display = 'none';
            document.getElementById('poster-modal-notice').style.display = 'none';
          }
          break;
        case 'sold-modal-cancel':
          closeSoldModal();
          break;
        case 'sold-modal-backdrop':
          if (e.target.id === 'sold-modal-backdrop') closeSoldModal();
          break;
        case 'sold-modal-confirm':
          confirmSold();
          break;
        case 'edit-customer-modal-cancel':
          closeEditCustomerModal();
          break;
        case 'edit-customer-modal-backdrop':
          if (e.target.id === 'edit-customer-modal-backdrop') closeEditCustomerModal();
          break;
        case 'edit-customer-modal-confirm':
          confirmEditCustomer();
          break;
        case 'btn-add-lead':
          openAddLeadModal();
          break;
        case 'btn-sync-contacts':
          syncPhoneContacts();
          break;
        case 'add-lead-modal-cancel':
          closeAddLeadModal();
          break;
        case 'add-lead-modal-backdrop':
          if (e.target.id === 'add-lead-modal-backdrop') closeAddLeadModal();
          break;
        case 'add-lead-modal-confirm':
          confirmAddLead();
          break;
        case 'contact-picker-modal-cancel':
          closeContactPickerModal();
          break;
        case 'contact-picker-modal-backdrop':
          if (e.target.id === 'contact-picker-modal-backdrop') closeContactPickerModal();
          break;
        case 'contact-picker-modal-confirm':
          confirmContactImport();
          break;
        case 'btn-team-performance':
          openTeamPerfView();
          break;
        case 'quote-snapshot-close':
          closeQuoteSnapshotView();
          break;
        case 'quote-snapshot-backdrop':
          if (e.target.id === 'quote-snapshot-backdrop') closeQuoteSnapshotView();
          break;
        case 'quote-snapshot-print':
          printQuoteSnapshot();
          break;
        case 'team-perf-close':
          closeTeamPerfView();
          break;
        case 'team-perf-print':
          printTeamPerf();
          break;
        case 'goal-modal-cancel':
          closeGoalModal();
          break;
        case 'goal-modal-backdrop':
          if (e.target.id === 'goal-modal-backdrop') closeGoalModal();
          break;
        case 'goal-modal-confirm':
          confirmGoal();
          break;
        case 'btn-set-yearly-goal':
          openYearlyGoalModal();
          break;
        case 'btn-remove-yearly-goal':
          if (confirm('Remove your yearly goal? This clears the target for all 12 months. You can set a new one anytime.')) {
            fetch(API_BASE + '/api/agent/me-snapshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete_yearly_goal' })
            }).then(function (res) { return res.json(); }).then(function (data) {
              if (data.error) { alert(data.error); return; }
              _meLoaded = false;
              loadMeSnapshot();
            }).catch(function (err) { dbg('delete yearly goal failed: ' + err); });
          }
          break;
        case 'yearly-goal-modal-cancel':
          closeYearlyGoalModal();
          break;
        case 'yearly-goal-modal-backdrop':
          if (e.target.id === 'yearly-goal-modal-backdrop') closeYearlyGoalModal();
          break;
        case 'yearly-goal-modal-confirm':
          confirmYearlyGoal();
          break;
        case 'month-goal-modal-cancel':
          closeMonthGoalModal();
          break;
        case 'month-goal-modal-backdrop':
          if (e.target.id === 'month-goal-modal-backdrop') closeMonthGoalModal();
          break;
        case 'month-goal-modal-confirm':
          confirmMonthGoal();
          break;
        case 'month-goal-modal-unpin':
          unpinMonthGoal();
          break;
        case 'carry-forward-modal-accept':
          respondCarryForward(true);
          break;
        case 'carry-forward-modal-deny':
          respondCarryForward(false);
          break;
        case 'btn-menu-announcement':
        case 'home-whats-new-teaser':
          document.getElementById('announcement-backdrop').classList.add('open');
          document.getElementById('announcement-drawer').classList.add('open');
          _loadAnnouncementEdm();
          _applyAnnouncementReadState();
          break;
        case 'btn-whats-new-toggle': {
          var _wnBody = document.getElementById('whats-new-body');
          var _wnArrow = document.getElementById('whats-new-arrow');
          if (_wnBody) {
            var _collapsed = _wnBody.style.display === 'none';
            _wnBody.style.display = _collapsed ? '' : 'none';
            if (_wnArrow) _wnArrow.textContent = _collapsed ? '▾' : '▸';
          }
          break;
        }
        case 'btn-mark-read':
          if (confirm('Confirm that you have read and understood all updates in What\'s New?')) {
            try { localStorage.setItem('announcement_read_aug2026', '1'); } catch(e) {}
            _applyAnnouncementReadState();
          }
          break;
        case 'announcement-drawer-close':
        case 'announcement-backdrop':
          document.getElementById('announcement-backdrop').classList.remove('open');
          document.getElementById('announcement-drawer').classList.remove('open');
          break;
        case 'btn-menu-training':
          document.getElementById('training-backdrop').classList.add('open');
          document.getElementById('training-drawer').classList.add('open');
          break;
        case 'training-drawer-close':
        case 'training-backdrop':
          document.getElementById('training-backdrop').classList.remove('open');
          document.getElementById('training-drawer').classList.remove('open');
          break;
        case 'btn-challenge':
          document.getElementById('challenge-backdrop').classList.add('open');
          document.getElementById('challenge-drawer').classList.add('open');
          break;
        case 'challenge-drawer-close':
        case 'challenge-backdrop':
          document.getElementById('challenge-backdrop').classList.remove('open');
          document.getElementById('challenge-drawer').classList.remove('open');
          break;
        case 'btn-pdf':
          doPrintFlow();
          break;
        case 'btn-share-pdf':
          openCustomerInfoModal();
          break;
        case 'btn-leads-export':
          exportLeadsCsv();
          break;
        case 'customer-info-modal-cancel':
        case 'customer-info-modal-backdrop':
          closeCustomerInfoModal();
          break;
        case 'customer-info-modal-confirm':
          confirmCustomerInfoAndShare();
          break;
      }
    });
  }

  // ── PWA install banner ────────────────────────────────────────
  var deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show a subtle install banner at the bottom
    var existing = document.getElementById('install-banner');
    if (existing) return;

    var banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.innerHTML =
      '<span style="flex:1;font-size:13px;font-weight:600;color:#fff">Add to Home Screen for the best experience</span>' +
      '<button id="btn-install" style="padding:7px 14px;background:#fff;color:#1E40AF;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Install</button>' +
      '<button id="btn-install-dismiss" style="padding:7px 10px;background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer">✕</button>';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1E40AF;display:flex;align-items:center;gap:10px;padding:12px 14px;z-index:9999;box-shadow:0 -2px 12px rgba(0,0,0,0.2);max-width:430px;margin:0 auto;';
    document.body.appendChild(banner);

    document.getElementById('btn-install').addEventListener('click', function () {
      banner.remove();
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function () { deferredInstallPrompt = null; });
    });
    document.getElementById('btn-install-dismiss').addEventListener('click', function () {
      banner.remove();
    });
  });

  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('install-banner');
    if (b) b.remove();
    deferredInstallPrompt = null;
  });

  // Wake up Vercel functions immediately on page load to avoid cold start lag
  function warmUpServer() {
    fetch(API_BASE + '/api/agent/filters?step=sites').catch(function () {});
  }

  // Prefetch zones for every site in parallel so site→zone selection is instant
  function prefetchAllZones() {
    SITES.forEach(function (s) {
      fetch(API_BASE + '/api/agent/filters?step=products&site=' + encodeURIComponent(s))
        .then(function (r) { return r.json(); })
        .then(function (d) { zonesCache[s] = d.options || []; })
        .catch(function () {});
    });
  }

  function start() {
    // Registered first, before anything else in start() that could throw --
    // if a later step (e.g. updateUI()) throws uncaught, the rest of this
    // function silently stops, which would otherwise prevent this from
    // ever running.
    try { initPullToRefresh(); } catch (e) { dbg('initPullToRefresh err: ' + e.message); }
    try { initTabSwipe(); } catch (e) { dbg('initTabSwipe err: ' + e.message); }
    try { refreshSitesFromApi(); } catch (e) { dbg('refreshSitesFromApi err: ' + e.message); }
    try { highlightTodayInCalendars(); } catch (e) { dbg('highlightTodayInCalendars err: ' + e.message); }

    var navType = 'unknown';
    try { navType = performance.getEntriesByType('navigation')[0].type; } catch(e) {}
    dbg('start() navType=' + navType);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/agent-sw.js').catch(function () {});
    }
    init();
    try {
      if (navType === 'reload') {
        localStorage.removeItem('agent_session');
        dbg('reload: cleared session');
      } else {
        if (localStorage.getItem('agent_was_reset')) {
          localStorage.removeItem('agent_was_reset');
          localStorage.removeItem('agent_session');
          dbg('was_reset flag: cleared session');
        } else {
          restoreSession();
          dbg('restoreSession called');
        }
      }
    } catch(e) { dbg('start catch: ' + e.message); restoreSession(); }
    try { updateUI(); } catch(e) { dbg('updateUI err: ' + e.message); lotQuotes = []; selectedLots = []; try { updateUI(); } catch(e2) { dbg('updateUI 2nd err: ' + e2.message); } }
    warmUpServer();
    prefetchAllZones();
    _applyAnnouncementReadState();
  }

  // ── Custom pull-to-refresh ────────────────────────────────────
  // Native overscroll/bounce-reload stays disabled (see overscroll-behavior in
  // page.tsx) -- a real page reload would re-init the Capacitor bridge and is
  // heavier than needed. This tracks the pull gesture in JS instead and does a
  // full in-app reset via resetAll() on release, matching what navType==='reload'
  // already does above (clear agent_session, don't restore it).
  // "Today" highlight on the Training & Event calendars is computed here
  // (client-only, real local date) instead of via new Date() in page.tsx's
  // server-rendered JSX -- that was causing a real/local timezone difference
  // between the server's render and the device's, a documented cause of
  // React hydration mismatches (error #418).
  function refreshSitesFromApi() {
    if (SITES.length) return; // already have a value (main app's server-rendered attribute)
    fetch(API_BASE + '/api/agent/session', { credentials: 'include' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.valid && data.sites && data.sites.length) {
          SITES = data.sites;
          if (typeof populateSiteSelect === 'function') populateSiteSelect();
        }
      })
      .catch(function (err) { dbg('refreshSitesFromApi failed: ' + err); });
  }

  function highlightTodayInCalendars() {
    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    document.querySelectorAll('[data-cal-date="' + todayStr + '"]').forEach(function (el) {
      el.classList.add('today');
    });
  }

  // Refreshes whatever tab the agent is currently on, without navigating them
  // back to Home -- pulling to refresh should re-fetch/reset in place, not
  // jump away from where they were.
  function refreshCurrentTab() {
    var activeBtn = document.querySelector('.tab-btn.active');
    var tab = activeBtn ? activeBtn.dataset.tab : 'home';
    switch (tab) {
      case 'browse':
        resetAll();
        resetDrawerState();
        openAvailDrawer();
        break;
      case 'team':
        _teamLoaded = false;
        loadTeamSnapshot();
        break;
      case 'me':
        _meLoaded = false;
        loadMeSnapshot();
        break;
      case 'leads':
        _leadsLoaded = false;
        loadLeadsSnapshot();
        break;
      case 'home':
      default:
        _homeSnapshotLoaded = false;
        loadHomeSnapshot();
        break;
    }
  }

  // Swipe left/right on the tab content to move between tabs, matching the
  // bottom tab bar order. Ignores gestures that start inside a horizontally
  // scrollable area already in the app (Product Type/Site carousels, the
  // quote comparison table) -- those need to keep their own horizontal
  // scroll, not trigger a tab change -- and inside the layout/quote areas
  // entirely, since agents select lots/rows there and an accidental
  // horizontal drag shouldn't ever bounce them to a different tab.
  function initTabSwipe() {
    var scrollBody = document.getElementById('scroll-body');
    if (!scrollBody) return;
    var startX = null, startY = null, swiping = false, blocked = false;

    scrollBody.addEventListener('touchstart', function (e) {
      var t = e.target;
      blocked = !!(t && t.closest && t.closest('.ad-chips, .ad-sites, .qt-scroll, #layout-area, #quote-section'));
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = false;
    }, { passive: true });

    scrollBody.addEventListener('touchmove', function (e) {
      if (blocked || startX == null) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (!swiping) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) swiping = true;
        else if (Math.abs(dy) > 12) blocked = true; // vertical scroll wins
      }
    }, { passive: true });

    scrollBody.addEventListener('touchend', function (e) {
      if (!blocked && swiping && startX != null) {
        var touch = e.changedTouches && e.changedTouches[0];
        var dx = (touch ? touch.clientX : startX) - startX;
        if (Math.abs(dx) > 60) {
          var activeBtn = document.querySelector('.tab-btn.active');
          var idx = TAB_IDS.indexOf(activeBtn ? activeBtn.dataset.tab : 'home');
          if (dx < 0 && idx < TAB_IDS.length - 1) switchTab(TAB_IDS[idx + 1]);
          else if (dx > 0 && idx > 0) switchTab(TAB_IDS[idx - 1]);
        }
      }
      startX = null; startY = null; swiping = false; blocked = false;
    }, { passive: true });
  }

  function initPullToRefresh() {
    var scrollBody = document.getElementById('scroll-body');
    var indicator  = document.getElementById('pull-refresh-indicator');
    var spinner    = document.getElementById('pull-refresh-spinner');
    var label      = document.getElementById('pull-refresh-label');
    if (!scrollBody || !indicator) return;

    var THRESHOLD = 64;
    var startY = null, pulling = false, triggered = false;

    scrollBody.addEventListener('touchstart', function (e) {
      // Full-screen overlays (quote viewer, Team Performance) have their own
      // independent scroll region -- #scroll-body's own scrollTop being 0
      // doesn't mean there's nothing to scroll up inside them, so pull-to-
      // refresh must not intercept drag-down gestures started in there.
      var t = e.target;
      if (t && t.closest && t.closest('#quote-snapshot-backdrop, #team-perf-view')) { startY = null; return; }
      if (scrollBody.scrollTop > 0) { startY = null; return; }
      startY = e.touches[0].clientY;
      pulling = false; triggered = false;
      indicator.classList.remove('pr-anim');
    }, { passive: true });

    scrollBody.addEventListener('touchmove', function (e) {
      if (startY == null) return;
      var dy = e.touches[0].clientY - startY;
      if (dy <= 0) { indicator.style.height = '0px'; return; }
      if (scrollBody.scrollTop > 0) return; // scrolled away mid-gesture
      // Not passive + preventDefault: some WebViews stop delivering touchmove
      // once they decide there's nothing to scroll (already at top, bounce
      // disabled) -- this forces the browser to keep handing us the gesture.
      e.preventDefault();
      pulling = true;
      var h = Math.min(dy * 0.5, THRESHOLD + 10);
      indicator.style.height = h + 'px';
      triggered = h >= THRESHOLD;
      label.textContent = triggered ? 'Release to refresh' : 'Pull down to refresh';
    }, { passive: false });

    scrollBody.addEventListener('touchend', function () {
      if (!pulling) { startY = null; return; }
      pulling = false;
      indicator.classList.add('pr-anim');
      if (triggered) {
        indicator.style.height = THRESHOLD + 'px';
        spinner.classList.add('spin');
        label.textContent = 'Refreshing…';
        setTimeout(function () {
          refreshCurrentTab();
          indicator.style.height = '0px';
          setTimeout(function () { spinner.classList.remove('spin'); }, 250);
        }, 450);
      } else {
        indicator.style.height = '0px';
      }
      startY = null; triggered = false;
    }, { passive: true });
  }

  // Retired: this used to force a reload on bfcache-restored pages (pageshow
  // persisted=true). On this Android/Capacitor WebView, persisted=true fires on
  // ordinary app resume too, and the reload's own pageshow event also reported
  // persisted=true -- reloading forever (React hydration error #418 on every
  // reload, blank Home tab, pull-to-refresh init never settling). The real
  // problem this was working around (stale JS after resume) is now handled
  // properly by WebSettings.LOAD_NO_CACHE in MainActivity.java instead.

  // Wait for window 'load', THEN requestIdleCallback, before mutating the DOM.
  // This script runs synchronously and was winning a race against React's
  // hydration, which is scheduled asynchronously via React's own scheduler
  // (confirmed via chrome://inspect: our restoreSession() log fires, then
  // React error #418 fires ~1s later) -- our early innerHTML writes made the
  // live DOM no longer match what the server sent, so hydration failed and
  // React discarded/regenerated the whole tree, wiping out everything this
  // script had just set up. window 'load' alone turned out to be an
  // unreliable heuristic (timing varies across launches/devices -- the race
  // came back on a later test). requestIdleCallback is a real signal, not a
  // guess: the browser only fires it once the main thread has no pending
  // scheduled work, and React's hydration IS scheduled work, so by
  // definition idle time shouldn't arrive until hydration has finished.
  function deferredStart() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(start, { timeout: 2000 });
    } else {
      setTimeout(start, 300);
    }
  }
  if (document.readyState === 'complete') {
    deferredStart();
  } else {
    window.addEventListener('load', deferredStart);
  }
})();

