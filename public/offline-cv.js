/*!
 * offline-cv.js — 公式タグの「取りこぼし」だけを補う
 * ---------------------------------------------------------------
 * 成果連携の本体は SLVRbullet 公式の「パラメータ引き継ぎタグ」:
 *     <script src="https://js.slvrbullet.com/pt.min.js"></script>
 * 公式タグは「記事URLに gclid/wbraid/gbraid が含まれている場合」に
 * SLVRbullet広告リンクへ引き継ぐ。広告からの直着地はこれで足りる。
 *
 * 足りないのは、着地後に回遊してURLからパラメータが消えた場合。
 * 例：広告→LP→/operator/→戻ってCTA。このときURLに識別子が無いので
 * 公式タグは何もできず、クリック識別子が失われる。
 *
 * そこでこのスクリプトは:
 *   1. 着地時に gclid/wbraid/gbraid を Cookie（90日）と localStorage に保存
 *   2. **URLに識別子が無いときだけ** 送客リンクへ保存済みの値を付け直す
 *   3. dataLayer に積む（GTM／デバッグ用）
 *
 * ★ 判定は「URLの状態」ではなく「リンクの実際の状態」で行う。
 *   公式タグが付けていれば何もせず、付いていなければ補う。
 *   公式タグが読み込まれなかった場合も識別子が失われない。
 *
 * 90日にしている理由：Google広告のオフラインCVインポートは、
 * クリックから最大90日以内の識別子のみ受け付けるため。
 *
 * 対象は data-offline-cv-link を付けたリンクのみ（出典等は汚さない）。
 */
(function (w, d) {
  "use strict";

  var KEYS = ["gclid", "gbraid", "wbraid"];
  var COOKIE_DAYS = 90;
  var PREFIX = "ocv_";

  function readCookie(name) {
    var m = d.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function writeCookie(name, value) {
    var exp = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
    // ドメイン跨ぎは不要（同一サブドメイン内で完結）。SameSite=Lax で
    // 広告からの遷移（トップレベルナビゲーション）では送出される。
    d.cookie = name + "=" + encodeURIComponent(value) +
      "; expires=" + exp + "; path=/; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
  }

  function ls(op, k, v) {
    try { return op === "get" ? w.localStorage.getItem(k) : w.localStorage.setItem(k, v); }
    catch (_) { return null; }   // プライベートモード等で例外になる
  }

  // ---- 1) 取得（URL優先 → 無ければ保存済みを引き継ぐ）----
  var qs = new URLSearchParams(location.search);
  var store = {};

  KEYS.forEach(function (k) {
    var fromUrl = (qs.get(k) || "").trim();
    var key = PREFIX + k;
    if (fromUrl) {
      writeCookie(key, fromUrl);
      ls("set", key, fromUrl);
      store[k] = fromUrl;
    } else {
      store[k] = readCookie(key) || ls("get", key) || "";
    }
  });

  // 初回着地時刻も持つ（インポート時の click_time 突き合わせに使える）
  var TS = PREFIX + "ts";
  if (KEYS.some(function (k) { return qs.get(k); })) {
    var now = new Date().toISOString();
    writeCookie(TS, now); ls("set", TS, now);
  }
  store.ts = readCookie(TS) || ls("get", TS) || "";

  // ---- 2) 公開 ----
  w.__OCV = store;

  // ---- 3) dataLayer へ（GTM・デバッグ用）----
  w.dataLayer = w.dataLayer || [];
  if (store.gclid || store.gbraid || store.wbraid) {
    w.dataLayer.push({
      event: "offline_cv_click_id",
      gclid: store.gclid || undefined,
      gbraid: store.gbraid || undefined,
      wbraid: store.wbraid || undefined,
      click_time: store.ts || undefined
    });
  }

  // ---- 4) 明示した送客リンクへ付け直す ----
  // 全外部リンクを対象にすると、出典・運営者情報など無関係の遷移先にも
  // クリック識別子を渡してしまう。送客先だけに data-offline-cv-link を付ける。
  function decorate(href) {
    if (!href || href.charAt(0) === "#" || /^(javascript|mailto|tel):/i.test(href)) return href;
    try {
      var u = new URL(href, location.href);
      if (u.origin === location.origin) return href;   // 内部リンクは触らない
      KEYS.forEach(function (k) {
        if (store[k] && !u.searchParams.has(k)) u.searchParams.set(k, store[k]);
      });
      return u.toString();
    } catch (_) { return href; }
  }
  w.__OCV.decorate = decorate;

  // ---- 4) 公式タグが取りこぼした場合だけ補う（フェイルセーフ）----
  //
  // 以前は「URLに識別子があれば公式タグに任せる」という条件で止めていたが、
  // 公式タグが読み込まれなかった場合（Astroによるモジュール化・CORS失敗・
  // 広告ブロッカー・ネットワークエラー）に識別子が丸ごと失われた。実際に
  // LP③でこれが起き、9/9〜Google側のオフラインCVが0になった。
  //
  // そこで判定を「URLの状態」から「リンクの実際の状態」に変えた:
  //   ・リンクに既に識別子が付いている → 公式タグが働いた。何もしない
  //   ・付いていない                   → 公式タグが動いていない。補う
  // decorate() は欠けているパラメータしか足さないので、二重付与にならない。
  //
  // 実行タイミングが重要。公式タグはページ読み込み時にリンクを書き換えるため、
  // こちらが先に足すと公式タグが後から重ねて二重になる。だから
  // 「load後に十分待ってから」と「クリック直前」の2点だけで走らせる。
  function fill() {
    var links = d.querySelectorAll('a[data-offline-cv-link][href^="http"]');
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute("href");
      var next = decorate(href);
      if (next !== href) a.setAttribute("href", next);
    });
  }

  w.addEventListener("load", function () { setTimeout(fill, 2000); });

  d.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-offline-cv-link][href^="http"]') : null;
    if (!a) return;
    var href = a.getAttribute("href");
    var next = decorate(href);
    if (next !== href) a.setAttribute("href", next);
  }, true);   // capture。遷移が始まる前に確実に当てる

}(window, document));
