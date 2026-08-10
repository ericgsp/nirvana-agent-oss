/* public/agent-nlp.js — NLP (Nirvana Life Plan) standalone quotation module */
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

  // Pick best matching promo: highest min_down_payment_pct that is still <= dpPct
  function pickPromo(nlpPromos, planName, dpPct) {
    var candidates = (nlpPromos || []).filter(function (p) {
      return p.lot_range === planName
        && (p.min_down_payment_pct == null || p.min_down_payment_pct <= dpPct);
    });
    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      return (b.min_down_payment_pct || 0) - (a.min_down_payment_pct || 0);
    });
    return candidates[0];
  }

  function hasNLP(lotQuotes) {
    return lotQuotes.some(function (q) {
      return q.levelData && q.levelData.product_category === 'NLP';
    });
  }

  function buildMatrixHtml(calcs, dpPct, nlpPromos) {
    var calcFn = window._calcMatrix;
    if (!calcFn) return '<div style="padding:20px;color:red">Error: _calcMatrix not exposed</div>';

    // Build per-plan data for each selected NLP calc
    var plans = calcs.map(function (x) {
      var planName  = x.q.section;
      var levelData = x.q.levelData;
      var promo     = pickPromo(nlpPromos, planName, dpPct);
      var ld = {
        pre_need_price:         levelData.pre_need_price || 0,
        as_need_price:          levelData.as_need_price  || 0,
        trust_account_facility: levelData.trust_account_facility || 0,
        backwall_cost:          levelData.backwall_cost  || 0,
        promo:                  promo,
      };
      var c = calcFn(ld, dpPct);
      return { planName: planName, ld: ld, c: c, promo: promo,
        nlpColor:    x.q.nlpColor    || '#c5d8f0',
        nlpZhName:   x.q.nlpZhName   || '',
        nlpReligion: x.q.nlpReligion || '',
      };
    });

    var n = plans.length + 2; // label cols + plan cols
    var anyRebate    = plans.some(function (p) { return p.c.preNeedRebate > 0; });
    var anyTrust     = plans.some(function (p) { return (p.ld.trust_account_facility || 0) > 0; });
    var anyDiscount  = plans.some(function (p) { return p.promo && p.c.specialRebate > 0; });
    var anyInstalment = plans.some(function (p) { return p.c.tenure > 0; });
    var anyDrPlus    = plans.some(function (p) { return p.promo && p.promo.dr_plus_eligible && p.c.drPlusUnits > 0; });
    var anyPromo     = plans.some(function (p) { return !!p.promo; });

    var h = '<div style="position:relative;border:2px solid #1a3a6b;border-radius:6px;overflow:hidden">';
    h += '<div class="wm-wrap" aria-hidden="true"><div class="wm-text">BDD1228</div></div>';
    var _religions = plans.map(function (p) { return p.nlpReligion; }).filter(function (r, i, a) { return r && a.indexOf(r) === i; });
    h += '<div class="qt-header">';
    h += '<div class="h-brand">Nirvana Life Plan</div>';
    h += '<div class="h-site-zh">富贵生命圆满契约</div>';
    h += '<div class="h-product">Pre-Need NLP Package' + (_religions.length ? ' — ' + _religions.join(' / ') : '') + '</div>';
    if (anyPromo) h += '<div class="h-promo-badge">Customer Promo</div>';
    h += '</div>';

    h += '<div class="qt-scroll"><table class="qt"><thead>';
    h += '<tr><th class="tc-lbl" colspan="2">Description 描述</th>';
    plans.forEach(function (p) {
      h += '<th class="tc-val nlp-th" style="min-width:130px;background:' + esc(p.nlpColor) + ';padding:6px 4px;border-radius:4px">'
        + '<div style="font-size:10px;font-weight:700;color:#1a3a6b">' + esc(p.planName) + '</div>'
        + (p.nlpZhName ? '<div style="font-size:10px;font-weight:700;color:#1a3a6b;margin-top:2px">' + esc(p.nlpZhName) + '</div>' : '')
        + '</th>';
    });
    h += '</tr></thead><tbody>';

    function vals(fn) {
      return plans.map(function (p) { return '<td class="tv">' + fn(p) + '</td>'; }).join('');
    }
    function row(cls, label, zh, fn) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
        + '<td>' + label + '</td><td>' + zh + '</td>'
        + vals(fn) + '</tr>';
    }
    function sep() { return '<tr class="tsep"><td colspan="' + n + '"></td></tr>'; }
    function rule() { return '<tr class="tnet-rule"><td colspan="' + n + '"></td></tr>'; }

    var anm = !!window._agentAsNeedMode;
    h += row('', 'As Need Price', '常规价格', function (p) { return fmt(p.c.originalPrice); });
    if (!anm && anyRebate) h += row('tred', 'Pre-Need Saving', '事前规划优惠', function (p) {
      return p.c.preNeedRebate > 0 ? '(' + fmt(p.c.preNeedRebate) + ')' : '—';
    });
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
      if (anyDiscount) h += row('tred', 'Special Discount (Customer Promo)', '特别折扣', function (p) {
        return (p.promo && p.c.specialRebate > 0) ? '(' + fmt(p.c.specialRebate) + ')' : '—';
      });
      if (!fullPmt && anyInstalment) {
        var maxTenureNlp = Math.max.apply(null, plans.map(function (p) { return p.c.tenure || 0; }).concat([0]));
        h += row('tbold tinst', 'Instalment Amount', '供期余额', function (p) {
          return p.c.tenure > 0 ? fmt(p.c.instalmentAmount) : '—';
        });
        h += row('ttenure', 'Instalment Tenure', '分期付款期限', function (p) {
          return p.c.tenure > 0 ? String(p.c.tenure) + ' months' : '—';
        });
        h += row('', '1st – ' + (maxTenureNlp > 1 ? maxTenureNlp - 1 : '?') + 'th Monthly', '每月', function (p) {
          return p.c.tenure > 0 ? fmt(p.c.monthly) : '—';
        });
        h += row('', maxTenureNlp + 'th Monthly', '最后一期', function (p) {
          return p.c.tenure > 0 ? fmt(p.c.lastInstalment) : '—';
        });
      }
    }
    h += rule();
    h += '<tr class="tnet"><td colspan="2">NET TOTAL PRICE 净价</td>'
      + vals(function (p) { return anm ? fmt(p.c.originalPrice + (p.c.trust || 0)) : fmt(p.c.netTotalPrice); }) + '</tr>';
    h += rule();
    if (anyDrPlus) {
      h += sep();
      h += row('tdr', 'Entitled Unit DRPlus', 'DRPlus 有权单位', function (p) {
        return (p.promo && p.promo.dr_plus_eligible && p.c.drPlusUnits > 0)
          ? String(p.c.drPlusUnits) + ' units' : '—';
      });
    }
    h += '</tbody></table></div>';

    // Footer — use latest promo end date across all plans
    var latestEndDate = plans.reduce(function (acc, p) {
      if (p.promo && p.promo.promo_end_date && p.promo.promo_end_date > acc) return p.promo.promo_end_date;
      return acc;
    }, '');
    h += '<div class="qt-footer">';
    if (latestEndDate) {
      h += '<p class="f-valid">*** Valid until :&nbsp;&nbsp;' + esc(latestEndDate) + '</p>';
    }
    h += '<p>1. Only Pre-Need NLP sale duly submitted and confirmed during the promotion period is eligible.</p>';
    h += '<p>2. Customers are required to submit the balance payment documents support upon sales confirmation.</p>';
    if (anyDrPlus) {
      h += '<p>3. Purchaser is required to submit the DR Plus form within 90 days upon confirmation of sale.</p>';
    }
    h += '<p style="margin-top:5px">*公司保留权力，在必须时随时更改以上价格</p>';
    h += '<p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>';
    h += '</div></div>';
    return h;
  }

  window.AgentNLP = {
    hasNLP:          hasNLP,
    buildMatrixHtml: buildMatrixHtml,
  };
})();
