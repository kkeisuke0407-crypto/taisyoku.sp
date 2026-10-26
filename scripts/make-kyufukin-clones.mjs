/**
 * make-kyufukin-clones.mjs — 主力LP /taishoku-kyufukin/ から、広告グループ別の複製LPを作り直す
 * ---------------------------------------------------------------
 * 複製は「本体を直したら同じ修正を入れる」決まりだったが、手作業では漏れた
 * （2026-10-26 時点で /shitsugyo-hoken/ だけ旧ASPのタグのまま残っていた）。
 * 本体を直したら、このスクリプトを実行して複製を上書きする：
 *
 *   node scripts/make-kyufukin-clones.mjs
 *
 * 複製で変えるのは CLONES に書いた箇所だけ。本文・CTA・計測タグ・送客リンクは本体と同じ。
 *   - title / description / canonical / OG / 構造化データの URL・名前
 *   - FVタブ、H1直前の橋渡し1行（任意）、④や⑦の見出し（任意）
 *   - 計測の LANDING（GA4 でどのLPかを分けるため。CVイベント名は本体と同じ）
 *   - 画像は /taishoku-kyufukin/assets/ を参照（二重コピーしない）
 *   - noindex（広告専用の複製は検索に出さない）
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "public/taishoku-kyufukin/index.html";
const BASE = "https://taisyoku.navolio.net/taishoku-kyufukin/";
const TITLE = "退職後にもらえるお金、失業保険だけじゃありません｜最大310万円の給付金";
const DESC = "病気やケガで働けず退職する場合、失業保険とは別に傷病手当金を受け取れる制度があります。給与の約3分の2を通算1年6か月まで。条件・申請の流れ・ひとりでやるとつまずく9つのポイントを解説します。";
const OG_DESC = "病気やケガで働けず退職する場合、失業保険とは別に傷病手当金を受け取れる制度があります。給与の約3分の2を通算1年6か月まで。";

const CLONES = [
  {
    slug: "shitsugyo-hoken",
    note: "AG03_UNEMPLOYMENT（失業保険）専用LP（2026-09-30 追加）。広告「失業保険」→LPの意味的一致を強めるための複製\n  ★広告のサイトリンク・深いアンカーからこのページへ流入させないこと（FVを飛ばすとCPAが悪化した実測あり）",
    title: "失業保険だけじゃない？退職後に確認したい制度｜退職給付金ガイド",
    desc: "失業保険・失業手当を調べている方へ。退職後に確認したい制度は失業保険だけではありません。自分が対象になる制度をLINEで確認できます。",
    landing: "shitsugyo_hoken",
    tab: "失業保険を調べている方へ",
    bridge: ["失業保険とは別に、", "確認しておきたい制度があります。"],
    h2Money: "退職後に受け取れるお金は、失業保険だけじゃない",
    noindex: false, // 2026-09-30 の公開時からインデックス可。挙動を変えない
  },
  {
    slug: "taishoku-taicho",
    note: "体調・ストレスで退職を考えている人向けの複製（2026-10-26 追加）。TR_P1_INTENT の AG04（傷病手当金）の着地先。よりみちの対象者条件「退職理由がストレスや健康」に合わせた入口",
    title: "体調やストレスで退職を考えている方へ｜辞める前に確認したいお金の制度",
    desc: "体や心の不調で退職を考えている方へ。傷病手当金や失業保険など、辞める前に確認しておきたい制度と、ひとりでやるとつまずくポイントをまとめました。",
    landing: "taishoku_taicho",
    tab: "体調・ストレスで退職予定の方へ",
    bridge: ["辞める前に、", "確認しておきたいお金の制度があります。"],
    h2Money: "体調がつらいときに受け取れるお金は、1つじゃない",
    noindex: true,
  },
  {
    slug: "taishoku-junbi",
    note: "「退職前にやること」を調べている人向けの複製（2026-10-26 追加）。TR_P1_INTENT の AG05（辞め方・退職前にやること）の着地先",
    title: "会社を辞める前にやること｜退職前に確認したいお金の手続き",
    desc: "会社を辞める前にやることの中でも、迷いやすいのがお金の手続き。辞める日の決め方や傷病手当金・失業保険の順番など、退職前に確認したいポイントをまとめました。",
    landing: "taishoku_junbi",
    tab: "会社を辞める前の方へ",
    bridge: ["辞める前に決めないと、", "受け取れなくなるお金も。"],
    h2Why: "辞める前に決めておくこと、ひとりだとこの9つ",
    leadWhy: "辞める前にやることの中でも、お金の手続きは迷いやすいところ。ひとりだと、この9つを全部自分で決めることになります。",
    noindex: true,
  },
];

const BRIDGE_CSS = `
/* 複製LPの橋渡し1行。H1より弱く、FVタブより少し強い階層にする。
   タブの下余白を詰めて、この1行ぶんCTAが下がりすぎないようにしている */
.fv__tab{ margin-bottom:8px; }
/* 390px端末の本文幅358pxに1行で入る大きさ。文言を伸ばしたら折り返すので、必ず390pxで実測すること */
.fv__bridge{
  margin:0 0 6px; font-size:14px; font-weight:800; line-height:1.5;
  color:var(--navy); letter-spacing:0; white-space:nowrap;
}
.fv__bridge-br{ display:none; }   /* 1行に入る幅では改行しない */
/* 375px以下は1行に入らない。語の途中ではなく読点で割る */
@media (max-width:379px){
  .fv__bridge{ white-space:normal; }
  .fv__bridge-br{ display:inline; }
}
`;

function replaceOnce(s, from, to, label) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}: ${n}件（1件のはず）`);
  return s.replace(from, to);
}
function replaceAll(s, from, to, label, expect) {
  const n = s.split(from).length - 1;
  if (n !== expect) throw new Error(`${label}: ${n}件（${expect}件のはず）`);
  return s.split(from).join(to);
}

const raw = readFileSync(SRC, "utf8");
const crlf = raw.includes("\r\n");
const src = raw.replace(/\r\n/g, "\n");

for (const c of CLONES) {
  const url = `https://taisyoku.navolio.net/${c.slug}/`;
  let s = src;
  s = replaceAll(s, TITLE, c.title, "title", 3);                  // <title>・og:title・構造化データ
  s = replaceAll(s, DESC, c.desc, "description", 2);              // meta・構造化データ
  s = replaceOnce(s, OG_DESC, c.desc, "og:description");
  s = replaceAll(s, `${BASE}"`, `${url}"`, "canonical/og:url", 3); // canonical・og:url・構造化データurl
  s = replaceOnce(s, `${BASE}#webpage`, `${url}#webpage`, "構造化データ@id");
  s = replaceAll(s, 'src="./assets/', 'src="/taishoku-kyufukin/assets/', "画像", 6);
  s = replaceOnce(s, 'url("./assets/', 'url("/taishoku-kyufukin/assets/', "CSS背景画像");
  if (c.noindex) {
    s = replaceOnce(s, '<meta name="viewport" content="width=device-width, initial-scale=1">\n',
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex, follow">\n', "robots");
  }
  s = replaceOnce(s, "<!--\n  ============================================================\n  2026-10-14",
    `<!--\n  ============================================================\n  ${c.note}\n  ★ scripts/make-kyufukin-clones.mjs が /taishoku-kyufukin/ から生成。ここを直接編集しない\n    （本体を直してスクリプトを実行する。複製だけ変えたい箇所はスクリプトの CLONES に書く）\n  ============================================================\n  2026-10-14`, "冒頭メモ");
  s = replaceOnce(s, '<p class="fv__tab" data-todo="copy">退職予定の方へ</p>',
    `<p class="fv__tab" data-todo="copy">${c.tab}</p>` +
    (c.bridge ? `\n    <p class="fv__bridge">${c.bridge[0]}<br class="fv__bridge-br">${c.bridge[1]}</p>` : ""), "FVタブ");
  if (c.bridge) s = s.replace("</style>", `${BRIDGE_CSS}</style>`);
  if (c.h2Money) s = replaceOnce(s, '<h2 class="h2" data-todo="copy">退職後に受け取れるお金は、1つじゃない</h2>',
    `<h2 class="h2" data-todo="copy">${c.h2Money}</h2>`, "④見出し");
  if (c.h2Why) s = replaceOnce(s, '<h2 class="h2" data-todo="copy">ひとりでやると、ここでつまずきます</h2>',
    `<h2 class="h2" data-todo="copy">${c.h2Why}</h2>`, "⑦見出し");
  if (c.leadWhy) s = replaceOnce(s, '<p class="lead" data-todo="copy">0円でできるのはうれしいですよね。でもひとりだと、この9つを全部自分で決めることになります。</p>',
    `<p class="lead" data-todo="copy">${c.leadWhy}</p>`, "⑦リード");
  s = replaceOnce(s, 'var LANDING = "taishoku_kyufukin";', `var LANDING = "${c.landing}";   // 複製LP。主力LPは "taishoku_kyufukin"`, "LANDING");

  mkdirSync(`public/${c.slug}`, { recursive: true });
  writeFileSync(`public/${c.slug}/index.html`, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`  ✓ /${c.slug}/`);
}
