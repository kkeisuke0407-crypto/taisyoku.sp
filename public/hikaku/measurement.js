/* /hikaku/ の計測。ソウガク比較LP（online-tutor.navolio.net/lp-measurement.js）と同じイベント体系。
 *
 * ★gtag の読み込みと config は各HTMLの <head> にある（GT-WB2N4H34 ＋ AW-18129603657）。
 *   ここは「何をいつ送るか」だけを持つ。G-DD332W5J8R を読み込みIDに使わないこと（404でGA4が止まる）。
 *
 * 送るもの（GA4だけ。send_to に GT-WB2N4H34 を指定。宛先は G-DD332W5J8R のみ）
 *   lp_section_view  data-section-id の要素が50%以上・1秒見えた（1回だけ）
 *   lp_cta_view      a[data-cta-id] が50%以上・1秒見えた（1回だけ）
 *   lp_scroll        25/50/75/90/100%
 *   lp_active_read   画面を開いて操作できる状態で30/60/120秒
 *   lp_faq_open      details[data-faq-id] を開いた
 *   lp_other_service_click  他社の公式リンク
 *   yorimichi_mcv    よりみち（felmat）へのクリック
 *
 * MCV（よりみちへのクリック）は、現行LP /taishoku-kyufukin/ と同じ名前のイベントも送る。
 *   taishoku_relief_line_click（send_to なし＝GA4と広告の両方）／taishoku_relief_cta_click（GA4だけ）
 *   Google広告側のCV設定とつながっているので、名前を変えないこと。
 * 成果（LINE友だち追加）は felmat が成果発生時にAPIで通知する（body末尾の fmptr.js がID受け渡し）。
 */
(function () {
  'use strict';
  if (window.__hkMeasurement) return;
  window.__hkMeasurement = true;

  var TAG = 'GT-WB2N4H34';
  var path = location.pathname;
  var page = (path.match(/\/hikaku\/([a-z0-9-]+)\.html$/) || [])[1];
  var LP = page ? 'HIKAKU_' + page.toUpperCase() : 'HIKAKU';
  var LANDING = page ? 'hikaku_' + page : 'hikaku';
  var debug = /(?:^|[?&])measurement_debug=1(?:&|$)/.test(location.search);

  window.dataLayer = window.dataLayer || [];
  var gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function send(name, params, toAll) {
    var p = Object.assign({ lp_id: LP, landing_intent: LANDING, debug_mode: debug || undefined }, params || {});
    if (!toAll) p.send_to = TAG;
    try { gtag('event', name, p); } catch (_) {}
  }

  /* ---------- よりみち（felmat）のリンク ---------- */
  var YORIMICHI_AK = 'X12115Q.1.8167402B.D141513M';
  function isYorimichi(a) {
    try {
      var u = new URL(a.href);
      return u.hostname === 't.felmat.net' && u.pathname === '/fmcl' && u.searchParams.get('ak') === YORIMICHI_AK;
    } catch (_) { return false; }
  }

  // 着地URLの広告分析用クエリ（utm_ など）を felmat リンクへ転送する。現行LPの fwd() と同じ。
  // gclid / gbraid / wbraid は felmat 公式タグ（fmptr.js）と /offline-cv.js が付けるので、ここでは触らない。
  var KEEP = /^(utm_|gad_|campaignid|keyword|matchtype|device|network|creative)/i;
  var qs = new URLSearchParams(location.search);
  Array.prototype.forEach.call(document.querySelectorAll('a[data-cta]'), function (a) {
    if (!isYorimichi(a)) return;
    try {
      var u = new URL(a.href);
      qs.forEach(function (v, k) { if (KEEP.test(k) && !u.searchParams.has(k)) u.searchParams.set(k, v); });
      a.setAttribute('href', u.toString());
    } catch (_) {}
  });

  var OTHER = ['taishoku-supporters.com', 'taishoku-relief.com', 'taishoku-concierge.jp', 'taisyoku-advisor.com', 'taisyoku-smile.com'];
  var recent = new WeakMap();
  function onClick(e) {
    if (e.type === 'auxclick' && e.button !== 1) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (isYorimichi(a)) {
      var now = Date.now();
      if (now - (recent.get(a) || 0) < 1200) return;   // 連打による二重MCVを防ぐ
      recent.set(a, now);
      var params = { affiliate_key: 'yorimichi', cta_id: a.dataset.ctaId || 'unclassified', cta_type: 'line', link_url: a.href, transport_type: 'beacon' };
      send('yorimichi_mcv', params);
      send('taishoku_relief_line_click', params, true);
      send('taishoku_relief_cta_click', params);
      return;
    }
    try {
      var host = new URL(a.href).hostname.replace(/^www\./, '');
      if (OTHER.indexOf(host) !== -1) send('lp_other_service_click', { destination: host, cta_id: a.dataset.otherCta || 'unclassified', transport_type: 'beacon' });
    } catch (_) {}
  }
  document.addEventListener('click', onClick);
  document.addEventListener('auxclick', onClick);

  /* ---------- 表示（区間・CTA） ---------- */
  function observe(selector, name, key, attr) {
    if (!('IntersectionObserver' in window)) return;
    var timers = new Map(), seen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var node = en.target;
        if (seen.has(node)) return;
        if (!en.isIntersecting || en.intersectionRatio < 0.5 || document.hidden) {
          clearTimeout(timers.get(node)); timers.delete(node); return;
        }
        if (timers.has(node)) return;
        timers.set(node, setTimeout(function () {
          timers.delete(node);
          if (document.hidden) return;
          var p = {}; p[key] = node.getAttribute(attr);
          seen.add(node); send(name, p); io.unobserve(node);
        }, 1000));
      });
    }, { threshold: [0, 0.5] });
    document.querySelectorAll(selector).forEach(function (n) { io.observe(n); });
    document.addEventListener('visibilitychange', function () {
      timers.forEach(clearTimeout); timers.clear();
      if (!document.hidden) document.querySelectorAll(selector).forEach(function (n) {
        if (!seen.has(n)) { io.unobserve(n); io.observe(n); }
      });
    });
  }
  observe('[data-section-id]', 'lp_section_view', 'section_id', 'data-section-id');
  observe('a[data-cta-id]', 'lp_cta_view', 'cta_id', 'data-cta-id');

  /* ---------- スクロール率 ---------- */
  var sent = new Set(), pending = false;
  function scrollCheck() {
    pending = false;
    if (document.hidden) return;
    var h = document.documentElement.scrollHeight;
    var pct = Math.min(100, Math.floor((window.scrollY + window.innerHeight) / h * 100));
    [25, 50, 75, 90, 100].forEach(function (t) {
      if (pct >= t && !sent.has(t)) { sent.add(t); send('lp_scroll', { scroll_percent: t }); }
    });
  }
  // rAF は描画が走らない状況で来ないことがある（現行LPの固定CTAで実際に起きた）。
  // 時刻で間引き、止まった位置も必ず拾えるよう最後に1回判定する（後追い）
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true; setTimeout(scrollCheck, 150);
  }, { passive: true });
  window.addEventListener('load', scrollCheck, { once: true });

  /* ---------- FAQ ---------- */
  document.querySelectorAll('details[data-faq-id]').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) send('lp_faq_open', { faq_id: d.getAttribute('data-faq-id') }); });
  });

  /* ---------- 閲覧時間 ---------- */
  var active = 0, tick = Date.now(), done = new Set();
  setInterval(function () {
    var now = Date.now();
    if (!document.hidden && document.hasFocus()) active += Math.min((now - tick) / 1000, 2);
    tick = now;
    [30, 60, 120].forEach(function (s) {
      if (active >= s && !done.has(s)) { done.add(s); send('lp_active_read', { read_seconds: s }); }
    });
  }, 1000);
  document.addEventListener('visibilitychange', function () { tick = Date.now(); });

  send('taishoku_relief_landing_intent', {});
  send(LANDING + '_open', {});
})();
