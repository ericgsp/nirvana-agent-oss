/* public/agent-n3.js — Nirvana 3 standalone quotation module */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) {
    return 'RM ' + Number(n || 0).toLocaleString('en-MY', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    });
  }

  // Convert Roman numeral (i)(ii)... to Arabic numbers and format as numbered list
  function formatRemarks(text) {
    if (!text) return '';
    var roman = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8 };
    // Escape HTML first, then transform markers inside the escaped string
    var escaped = esc(text)
      // Bold known section headings (T&amp;C: and Others:)
      .replace(/(T&amp;C|Others)\s*:/g, '<strong>$1:</strong>')
      // Replace (i) (ii) etc with line-break + number
      .replace(/\s*\((i{1,3}|iv|vi{0,3})\)\s*/gi, function (m, r) {
        var n = roman[r.toLowerCase()] || r;
        return '<br>' + n + '. ';
      });
    return '<div style="font-size:12px;line-height:1.8;margin-bottom:4px">' + escaped + '</div>';
  }

  function hasN3(site) {
    return site === 'Nirvana 3';
  }

  function buildMatrixHtml(calcs, dpPct, siteInfo, hiddenCols) {
    var calcFn = window._calcMatrix;
    if (!calcFn) return '<div style="padding:20px;color:red">Error: _calcMatrix not exposed</div>';

    var info = siteInfo || (calcs[0] && calcs[0].q.siteInfo) || {};
    var n    = calcs.length + 2;
    var lotCodes = calcs.map(function (x) { return x.q.lotCode; });

    // Promo is already matched by the quotation API and stored in levelData.promo.
    // Re-apply calcMatrix with that promo so discount + tenure are correct.
    var plans = calcs.map(function (x) {
      var levelData = x.q.levelData;
      var promo     = levelData.promo || null;
      var ld = {
        pre_need_price:         levelData.pre_need_price || 0,
        as_need_price:          levelData.as_need_price  || 0,
        trust_account_facility: levelData.trust_account_facility || 0,
        backwall_cost:          levelData.backwall_cost  || 0,
        promo:                  promo,
      };
      var c = calcFn(ld, dpPct);
      return { lotCode: x.q.lotCode, lotType: levelData.lot_type || null, ld: ld, c: c, promo: promo };
    });

    var anyPromo      = plans.some(function (p) { return !!p.promo; });
    var promoLabel    = (function () { for (var i = 0; i < plans.length; i++) { if (plans[i].promo && plans[i].promo.promo_name) return plans[i].promo.promo_name; } return 'Customer Promo'; }());
    var anyDiscount   = plans.some(function (p) { return p.promo && p.c.specialRebate > 0; });
    var anyTrust      = plans.some(function (p) { return (p.ld.trust_account_facility || 0) > 0; });
    var anyInstalment = plans.some(function (p) { return p.c.tenure > 0; });

    // Purchase condition from the matched promo (use first non-null)
    var purchaseCondition = '';
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].promo && plans[i].promo.purchase_condition) {
        purchaseCondition = plans[i].promo.purchase_condition;
        break;
      }
    }

    // Remarks / T&C from promo
    var remarks = '';
    for (var j = 0; j < plans.length; j++) {
      if (plans[j].promo && plans[j].promo.remarks) {
        remarks = plans[j].promo.remarks;
        break;
      }
    }

    // Promo end date
    var promoEndDate = '';
    for (var k = 0; k < plans.length; k++) {
      if (plans[k].promo && plans[k].promo.promo_end_date) {
        promoEndDate = plans[k].promo.promo_end_date;
        break;
      }
    }

    function vals(fn) {
      return plans.map(function (p, ci) {
        var lc  = lotCodes[ci];
        var hid = (hiddenCols && hiddenCols[lc]) ? ' col-hidden' : '';
        return '<td class="tv' + hid + '" data-col="' + lc + '">' + fn(p) + '</td>';
      }).join('');
    }
    function row(cls, label, zh, fn) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
        + '<td>' + label + '</td><td>' + zh + '</td>'
        + vals(fn) + '</tr>';
    }
    function sep()  { return '<tr class="tsep"><td colspan="' + n + '"></td></tr>'; }
    function rule() { return '<tr class="tnet-rule"><td colspan="' + n + '"></td></tr>'; }

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';

    // Header
    h += '<div class="qt-header">';
    h += '<div class="h-brand">' + esc(info.site || 'Nirvana 3') + '</div>';
    if (info.site_name_zh) h += '<div class="h-site-zh">' + esc(info.site_name_zh) + '</div>';
    h += '<div class="h-product">' + esc(info.product || '') + '</div>';
    h += '<div class="h-category">' + esc(info.product_category || '') + '</div>';
    if (anyPromo) h += '<div class="h-promo-badge">' + esc(promoLabel) + '</div>';
    h += '</div>';

    // Purchase condition bold notice
    if (purchaseCondition) {
      h += '<div class="n3-condition"><strong>' + esc(purchaseCondition) + '</strong></div>';
    }

    h += '<div class="qt-scroll"><table class="qt"><thead>';

    // Column toggle row (no-print)
    h += '<tr class="no-print col-toggle-row"><th colspan="2" style="font-size:10px;color:#94a3b8;padding:4px 8px">Print columns:</th>';
    plans.forEach(function (p) {
      var lc  = p.lotCode;
      var chk = (hiddenCols && hiddenCols[lc]) ? '' : ' checked';
      h += '<th class="tc-val" style="text-align:center;padding:4px">'
        + '<input type="checkbox" class="col-toggle" data-col="' + lc + '"' + chk + ' style="width:16px;height:16px;cursor:pointer">'
        + '</th>';
    });
    h += '</tr>';

    // Column headers
    h += '<tr><th class="tc-lbl" colspan="2">Description 描述</th>';
    plans.forEach(function (p) {
      var lc  = p.lotCode;
      var hid = (hiddenCols && hiddenCols[lc]) ? ' col-hidden' : '';
      h += '<th class="tc-val' + hid + '" data-col="' + lc + '" style="min-width:110px">'
        + '<div style="font-size:10px;font-weight:700">' + esc(lc) + '</div>'
        + (p.lotType ? '<div style="font-size:9px;font-weight:400;opacity:0.65">' + esc(p.lotType) + '</div>' : '')
        + '</th>';
    });
    h += '</tr></thead><tbody>';

    // Price rows
    var anm = !!window._agentAsNeedMode;
    h += row('', 'As Need Price', '常规价格', function (p) { return fmt(p.c.originalPrice); });
    if (!anm) h += row('tbold tpnp', 'Pre-Need Price', '事前价格', function (p) { return fmt(p.c.preNeedPrice); });
    if (anyTrust) h += row('', 'Trust Account 3 &amp; Facility Cost', '储托账户3及设施款项', function (p) {
      return (p.ld.trust_account_facility || 0) > 0 ? fmt(p.c.trust) : '—';
    });
    h += row('tbold', 'Total Price', '总价', function (p) {
      return anm ? fmt(p.c.originalPrice + (p.c.trust || 0)) : fmt(p.c.totalPrice);
    });
    if (!anm) {
      var fullPmt = dpPct === 100;
      if (!fullPmt) {
        h += sep();
        h += row('', '<strong>' + dpPct + '%</strong> Down Payment', '头期', function (p) { return fmt(p.c.downPayment); });
        h += row('', 'Balance', '余额', function (p) { return fmt(p.c.balance); });
      }
      if (anyDiscount) {
        h += row('tred', 'Special Discount (' + promoLabel + ')', '特别折扣', function (p) {
          return (p.promo && p.c.specialRebate > 0) ? '(' + fmt(p.c.specialRebate) + ')' : '—';
        });
      }
      if (!fullPmt && anyInstalment) {
        var maxTenureN3 = Math.max.apply(null, calcs.map(function (p) { return p.c.tenure || 0; }).concat([0]));
        h += row('tbold tinst', 'Instalment Amount', '供期余额', function (p) {
          return p.c.tenure > 0 ? fmt(p.c.instalmentAmount) : '—';
        });
        h += row('ttenure', 'Instalment Tenure', '分期付款期限', function (p) {
          return p.c.tenure > 0 ? String(p.c.tenure) + ' months' : '—';
        });
        h += row('', '1st – ' + (maxTenureN3 > 1 ? maxTenureN3 - 1 : '?') + 'th Monthly', '每月', function (p) {
          return p.c.tenure > 0 ? fmt(p.c.monthly) : '—';
        });
        h += row('', maxTenureN3 + 'th Monthly', '最后一期', function (p) {
          return p.c.tenure > 0 ? fmt(p.c.lastInstalment) : '—';
        });
      }
    }
    h += rule();
    h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
      + vals(function (p) { return anm ? fmt(p.c.originalPrice + (p.c.trust || 0)) : fmt(p.c.netTotalPrice); }) + '</tr>';
    h += rule();
    h += '</tbody></table></div>';

    // Footer
    h += '<div class="qt-footer">';
    if (promoEndDate) h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(promoEndDate) + '</p>';
    if (remarks) h += formatRemarks(remarks);
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  window.AgentN3 = {
    hasN3:          hasN3,
    buildMatrixHtml: buildMatrixHtml,
  };
})();
