/* /hikaku/ のページ内の動き：yk-radar の描画（パーツ集の RADAR_JS そのまま）と yk-finder の判定 */

/* yk-radar：data-labels（カンマ区切り）と data-scores（同じ数）からレーダーチャートを描く。ページ末尾に1回だけ置く */
document.querySelectorAll('.yk-radar[data-labels]').forEach(function (el) {
  var L = el.dataset.labels.split(','), S = el.dataset.scores.split(',').map(Number), M = +(el.dataset.max || 5), n = L.length, cx = 160, cy = 150, R = 100;
  function p(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)]; }
  var s = '<svg viewBox="0 0 320 300" role="img" aria-label="' + (el.dataset.name || '') + 'の評価：' + L.map(function (l, i) { return l + ' ' + S[i]; }).join('、') + '">';
  for (var k = 1; k <= M; k++) s += '<polygon points="' + L.map(function (_, i) { return p(i, R * k / M).join(','); }).join(' ') + '" fill="none" stroke="#c9d3e3"/>';
  L.forEach(function (l, i) { var a = p(i, R), b = p(i, R + 24); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + a[0] + '" y2="' + a[1] + '" stroke="#c9d3e3"/><text x="' + b[0] + '" y="' + b[1] + '" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#444">' + l + '</text>'; });
  s += '<polygon points="' + S.map(function (v, i) { return p(i, R * v / M).join(','); }).join(' ') + '" fill="rgba(47,103,184,.18)" stroke="#2f67b8" stroke-width="2.5"/></svg>';
  el.innerHTML = s;
});

/* yk-finder（あなたに合う申請サポート診断）の判定。
   点数は各社公式サイトの記載（2026-10-19確認）で決められる条件だけ。入力内容は送信・保存しない。
   対象外の判定はしない（本人指示 2026-10-19：条件で落とさない）。 */
(function () {
  'use strict';
  var form = document.getElementById('finder');
  var out = document.getElementById('finder-result');
  if (!form || !out) return;
  var FELMAT = 'https://t.felmat.net/fmcl?ak=X12115Q.1.8167402B.D141513M&pb=';
  var SV = {
    yorimichi: { name: 'よりみち給付金サポート', base: 4.8, url: FELMAT, own: true },
    supporters: { name: '退職サポーターズ', base: 4.4, url: 'https://taishoku-supporters.com/' },
    relief: { name: '退職リリーフ', base: 4.0, url: 'https://taishoku-relief.com/' },
    concierge: { name: '退職コンシェルジュ', base: 3.6, url: 'https://www.taishoku-concierge.jp/' },
    advisor: { name: '退職前アドバイザー', base: 3.0, url: 'https://taisyoku-advisor.com/' },
    smile: { name: '退職スマイル', base: 2.8, url: 'https://taisyoku-smile.com/' }
  };
  // [条件, 会社, 点, 理由]
  var RULES = [
    ['status:thinking', 'yorimichi', 3, '退職予定日の1か月前の相談をすすめていて、在職中から相談できる'],
    ['status:thinking', 'relief', 1, '退職前の申請をすすめている'],
    ['status:thinking', 'supporters', 1, '退職前なら準備が間に合うと案内している'],
    ['status:thinking', 'smile', 1, '退職前・退職予定の方を対象にしている'],
    ['status:decided', 'yorimichi', 3, '1か月以内に退職する予定なら、すぐに相談するよう案内している'],
    ['status:decided', 'supporters', 1, '退職前なら準備が間に合うと案内している'],
    ['status:decided', 'relief', 1, '退職前の申請をすすめている'],
    ['status:paid', 'yorimichi', 2, '有休消化中でも、退職日までに準備できれば申請できると案内している'],
    ['status:paid', 'supporters', 2, '有休消化中でも、退職前なら準備は間に合うと案内している'],
    ['status:left', 'concierge', 2, '退職済みでも、条件を満たしていれば間に合うことが多いと記載している'],
    ['status:left', 'relief', 1, '退職直後の方も相談できると記載している'],
    ['line', 'yorimichi', 2, 'LINEで無料受給額診断ができる'],
    ['line', 'relief', 2, 'LINEで相談でき、診断は約1分'],
    ['line', 'supporters', 1, 'LINEで無料診断ができる'],
    ['line', 'smile', 1, 'LINEから無料診断ができる'],
    ['line', 'concierge', 1, '公式LINEで相談できる'],
    ['night', 'yorimichi', 2, 'LINEは24時間受付'],
    ['night', 'relief', 2, 'LINEは24時間受付'],
    ['sick', 'relief', 2, '傷病手当金にも対応している'],
    ['sick', 'concierge', 2, '傷病手当金にも対応している'],
    ['sick', 'advisor', 2, '傷病手当金にも対応している'],
    ['proxy', 'relief', 3, '退職代行にも対応している'],
    ['proxy', 'concierge', 1, '提携先の退職代行を紹介している'],
    ['job', 'supporters', 2, '転職サポートがある'],
    ['job', 'concierge', 2, '転職支援がある'],
    ['phone', 'supporters', 2, '電話で相談できる'],
    ['phone', 'advisor', 2, 'Zoomか電話で個別面談ができる']
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var keys = [];
    var st = form.elements.status.value; if (st) keys.push('status:' + st);
    Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox]:checked'), function (c) { keys.push(c.value); });
    var score = {}, why = {};
    Object.keys(SV).forEach(function (k) { score[k] = SV[k].base; why[k] = []; });
    RULES.forEach(function (r) {
      if (keys.indexOf(r[0]) === -1) return;
      score[r[1]] += r[2]; why[r[1]].push(r[3]);
    });
    var top = Object.keys(SV).sort(function (a, b) { return score[b] - score[a] || SV[b].base - SV[a].base; }).slice(0, 2);
    out.innerHTML = '<p class="yk-sec-ttl" style="font-size:18px">あなたに合いそうな<em>2社</em></p>' + top.map(function (k, i) {
      var s = SV[k], list = why[k].length ? why[k] : ['5項目の採点で総合評価 ' + s.base.toFixed(1)];
      var btn = s.own
        ? '<p class="yk-catch">在職中でも、自己都合でも相談OK</p><a class="yk-btn" href="' + s.url + '" rel="sponsored nofollow" data-cta data-cta-id="finder" data-offline-cv-link>無料診断を公式で見る</a>'
        : '<a class="yk-btn yk-btn--sub" href="' + s.url + '" target="_blank" rel="nofollow noopener" data-other-cta="finder">公式サイトを見る</a>';
      return '<div class="hk-result__item' + (i === 0 ? ' is-pick' : '') + '"><p class="hk-result__name">' + (i + 1) + '. ' + esc(s.name) + '</p><ul>' +
        list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + btn + '</div>';
    }).join('') + '<p class="yk-small">※各社公式サイトの記載（2026年10月19日確認）をもとに表示しています。入力した内容は送信・保存しません。</p>';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
