/**
 * phrase-wrap.mjs — ビルド後の /hikaku/ に「文節の切れ目」を書き込む
 * ---------------------------------------------------------------
 * Chrome は word-break:auto-phrase で文節ごとに改行するが、Safari は非対応で
 * 「コンシェ／ルジュ」「窓／口」のように語の途中で折り返していた。
 * Chrome の auto-phrase と同じ BudouX で文節を区切って <wbr> を入れ、
 * word-break:keep-all で <wbr> の位置（と句読点）でだけ改行させる。
 *
 * - 変換するのは dist/ の出力だけ。public/ の原稿はきれいなまま。
 * - 文節は、太字・マーカー等の装飾タグをまたいだ「ひと続きの文」で判定する。
 *   装飾の境目が文節の切れ目なら、閉じタグの外側に <wbr> を置く
 *   （.hk-nw などの nowrap の内側に置くと改行できないため）。
 * - <body> のテキストだけを対象にし、script/style/svg 等・属性・文字参照には触れない。
 * - CSS は変換したページの <head> にだけ足す（変換されていないページが keep-all で崩れないように）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { loadDefaultJapaneseParser } from "budoux";

const PAGES = ["hikaku/index.html", "hikaku/yorimichi.html", "hikaku/method.html"];
const STYLE = '<style id="phrase-wrap">.hk-wrap{word-break:keep-all;overflow-wrap:break-word}</style>';
const SKIP = new Set(["script", "style", "svg", "noscript", "textarea", "title", "template"]);
const INLINE = new Set(["a", "span", "b", "strong", "em", "i", "u", "s", "small", "mark", "sup", "sub", "wbr", "code"]);
const JA = /[぀-ヿ㐀-鿿]/;
const KEEP = ["よりみち", "給付金", "傷病手当金", "失業保険", "コンシェルジュ", "ハローワーク"];
const SPLIT = [["よりみち給付金サポート", [4, 7, 11]]];
const parser = loadDefaultJapaneseParser();

// 文節の切れ目（文字位置）。BudouX は「無料診断→専属コンシェルジュが」のように記号をまたいで
// 1文節にすることがあるので、→ ・ ／ の後ろと（ の前でも折り返せるようにする。
function breakPoints(text) {
  const pts = new Set();
  let pos = 0;
  for (const p of parser.parse(text)) {
    pos += p.length;
    pts.add(pos);
  }
  for (let i = 1; i < text.length; i++) {
    if ("→・／".includes(text[i - 1]) || "（(".includes(text[i])) pts.add(i);
  }
  // サービス名などは途中で切らない（BudouX は「より／みち」と切る）
  for (const w of KEEP) {
    for (let at = text.indexOf(w); at >= 0; at = text.indexOf(w, at + 1)) {
      for (let k = at + 1; k < at + w.length; k++) pts.delete(k);
    }
  }
  // 長いサービス名は名前の中の区切りでは折り返してよい（「…見たかぎり、」だけの短い行を防ぐ）
  for (const [w, cuts] of SPLIT) {
    for (let at = text.indexOf(w); at >= 0; at = text.indexOf(w, at + 1)) cuts.forEach((c) => pts.add(at + c));
  }
  pts.delete(0);
  pts.delete(text.length);
  return pts;
}

// 文字参照は1文字として数え、途中で切らない
const units = (s) => s.match(/&[#a-zA-Z0-9]+;|[\s\S]/g) ?? [];

function processRun(tokens, run, nwDepth) {
  // run: tokens の添字の並び（テキストと装飾タグ）。テキストを連結して文節を判定する
  const texts = run.filter((i) => !tokens[i].startsWith("<"));
  const joined = texts.map((i) => units(tokens[i]).map((u) => (u.length > 1 ? "＆" : u)).join("")).join("");
  if (!JA.test(joined)) return 0;
  const pts = breakPoints(joined);
  let count = 0;
  let offset = 0;
  let prevText = -1;
  for (const i of run) {
    const tok = tokens[i];
    if (tok.startsWith("<")) continue;
    const us = units(tok);
    // 前のテキストとの境目が切れ目：直前の閉じタグの外側（次の開きタグの手前）に置く
    if (prevText >= 0 && pts.has(offset) && /\S/.test(tokens[prevText].slice(-1))) {
      let at = prevText + 1;
      while (at < i && tokens[at].startsWith("</")) at++;
      if (!nwDepth[at - 1]) { tokens[at - 1] += "<wbr>"; count++; }
    }
    let out = "";
    us.forEach((u, k) => {
      if (k > 0 && pts.has(offset + k) && !nwDepth[i]) { out += "<wbr>"; count++; }
      out += u;
    });
    tokens[i] = out;
    offset += us.length;
    prevText = i;
  }
  return count;
}

for (const page of PAGES) {
  const file = new URL(`../dist/${page}`, import.meta.url);
  const html = readFileSync(file, "utf8");
  if (html.includes('id="phrase-wrap"')) continue;
  const bodyAt = html.search(/<body[\s>]/);
  if (bodyAt < 0) throw new Error(`${page}: <body> が見つからない`);

  const head = html.slice(0, bodyAt).replace("</head>", `${STYLE}\n</head>`);
  const tokens = html.slice(bodyAt).split(/(<!--[\s\S]*?-->|<[^>]*>)/).filter((t) => t !== "");
  let skipping = null;
  let run = [];
  let count = 0;
  // nowrap（.hk-nw）の内側には <wbr> を置かない。Chrome は nowrap の中の <wbr> でも改行してしまう
  const nwDepth = [];
  const stack = [];
  let depth = 0;
  const flush = () => { count += processRun(tokens, run, nwDepth); run = []; };

  tokens.forEach((tok, i) => {
    if (tok.startsWith("<!--")) return;
    if (tok.startsWith("<")) {
      const m = tok.match(/^<(\/?)([a-zA-Z0-9-]+)/);
      const name = m ? m[2].toLowerCase() : "";
      if (skipping) { if (m && m[1] && name === skipping) skipping = null; return; }
      if (m && !m[1] && SKIP.has(name) && !tok.endsWith("/>")) { flush(); skipping = name; return; }
      if (INLINE.has(name)) {
        if (name !== "wbr" && !tok.endsWith("/>")) {
          if (m[1]) { if (stack.pop()) depth--; }
          else { const nw = /class="[^"]*\bhk-nw\b|white-space:\s*nowrap/.test(tok); stack.push(nw); if (nw) depth++; }
        }
        nwDepth[i] = depth;
        run.push(i);
      } else flush();
      return;
    }
    nwDepth[i] = depth;
    if (!skipping) run.push(i);
  });
  flush();

  writeFileSync(file, head + tokens.join(""));
  console.log(`  ✓ ${page}: 文節の区切り ${count} か所`);
}
