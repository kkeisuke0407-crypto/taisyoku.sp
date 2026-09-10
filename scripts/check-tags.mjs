#!/usr/bin/env node
/*
 * check-tags.mjs — ビルド成果物に計測タグが実在するかを検査する
 * ------------------------------------------------------------------
 * なぜ必要か：
 *   Astro は属性の無い <script src="..."> を ESモジュールの import に
 *   変換する。モジュールimportはCORSを要求するため、CDNの素のJSは
 *   読み込みに失敗し、タグが一度も実行されない。
 *   ソースには書いてあるのにビルド後のHTMLから消えるため、
 *   ソースを読むだけでは気づけない。実際に9/9〜LP③でこれが起き、
 *   Google広告のオフラインCVが0件になった。
 *
 *   → 外部タグは「ビルド後のHTMLに文字列として在るか」で検査する。
 *
 * 使い方: npm run check-tags   （build のあとに実行）
 */
import { readFileSync, existsSync } from "node:fs";

const PAGES = ["taishoku-kyufukin", "taisyoku-365"];

// [表示名, 出力HTMLに必ず含まれるべき文字列, 追加の条件]
const REQUIRED = [
  ["SLVRbullet 公式パラメータ引き継ぎタグ", 'src="https://js.slvrbullet.com/pt.min.js"'],
  ["オフラインCVフェイルセーフ",            'src="/offline-cv.js"'],
  ["Googleタグ (gtag)",                     "googletagmanager.com/gtag/js"],
];

// これがHTMLに在ったら、Astroがモジュール化してしまっている
const FORBIDDEN = [
  ["公式タグがESモジュール化されている（is:inline が必要）", "astro_type_script"],
];

let ng = 0;
for (const slug of PAGES) {
  const f = `dist/${slug}/index.html`;
  if (!existsSync(f)) { console.error(`✗ ${f} が無い`); ng++; continue; }
  const html = readFileSync(f, "utf-8");
  console.log(`\n/${slug}/`);

  for (const [label, needle] of REQUIRED) {
    const ok = html.includes(needle);
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
    if (!ok) ng++;
  }
  for (const [label, needle] of FORBIDDEN) {
    if (html.includes(needle)) { console.log(`  ✗ ${label}`); ng++; }
  }
  // CTAが計測対象として印付けされているか
  const ctas = (html.match(/data-offline-cv-link/g) || []).length;
  console.log(`  ${ctas > 0 ? "✓" : "✗"} 送客CTA ${ctas}件 (data-offline-cv-link)`);
  if (ctas === 0) ng++;
}

console.log("");
if (ng) { console.error(`✗ ${ng}件の問題。公開前に直すこと。`); process.exit(1); }
console.log("✓ 計測タグはすべてビルド成果物に存在する");
