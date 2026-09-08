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
 * ★ 2 の条件が肝。URLに識別子がある＝公式タグが処理する場面では
 *   このスクリプトは一切リンクに触らない。役割が重ならないので
 *   二重付与・パラメータ重複が起きない。
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

  // 公式タグ（pt.min.js）が動く場面＝URLに識別子がある場合は、こちらは何もしない。
  var urlHasClickId = KEYS.some(function (k) { return !!qs.get(k); });

  function apply() {
    if (urlHasClickId) return;   // 公式タグに任せる
    var links = d.querySelectorAll('a[data-offline-cv-link][href^="http"]');
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute("href");
      var next = decorate(href);
      if (next !== href) a.setAttribute("href", next);
    });
  }

  // 他スクリプトが href を書き換えたあとに実行されるよう、
  // 読み込み直後・DOMContentLoaded・クリック直前の3段で当てる。
  apply();
  d.addEventListener("DOMContentLoaded", apply);
  d.addEventListener("click", function (e) {
    if (urlHasClickId) return;   // 公式タグに任せる
    var a = e.target && e.target.closest ? e.target.closest('a[data-offline-cv-link][href^="http"]') : null;
    if (!a) return;
    var href = a.getAttribute("href");
    var next = decorate(href);
    if (next !== href) a.setAttribute("href", next);
  }, true);   // capture。他のクリックハンドラより先に走らせる
}(window, document));
