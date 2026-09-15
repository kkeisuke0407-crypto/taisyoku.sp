import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve('docs/retirement-relief/ppc-launch/2026-07-31-taishoku-relief-initial');
const campaign = '退職リリーフ｜初期検証';
const finalUrlBase = 'https://taishoku-relief.com/';
const csvHeaders = {
  campaign: ['Campaign', 'Campaign type', 'Status', 'Networks', 'Budget', 'Bid strategy type', 'Languages', 'Targeting method', 'Exclusion method', 'Enhanced CPC', 'EU political ads', 'Customer acquisition', 'Broad match keywords', 'AI Max', 'Text customization', 'Final URL expansion', 'Ad rotation'],
  adGroups: ['Campaign', 'Ad group', 'Status', 'Max CPC'],
  keywords: ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Status', 'Max CPC', 'Final URL'],
  rsa: ['Campaign', 'Ad group', 'Ad type', 'Status', 'Final URL', 'Path 1', 'Path 2', 'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5', 'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10', 'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15', 'Description 1', 'Description 2', 'Description 3', 'Description 4'],
};

function toCsv(headers, rows) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
function writeCsv(name, headers, rows) { fs.writeFileSync(path.join(outputDir, name), `\ufeff${toCsv(headers, rows)}`, 'utf8'); }
function url(content, term) { return `${finalUrlBase}?utm_source=google&utm_medium=cpc&utm_campaign=taishoku_relief_initial&utm_content=${encodeURIComponent(content)}&utm_term=${encodeURIComponent(term)}`; }
function checkRsa(rsa) {
  if (rsa.headlines.length !== 15 || rsa.descriptions.length !== 4) throw new Error(`${rsa.content}: RSA asset count invalid`);
  for (const value of rsa.headlines) if ([...value].length > 30) throw new Error(`${rsa.content}: headline exceeds 30 chars: ${value}`);
  for (const value of rsa.descriptions) if ([...value].length > 90) throw new Error(`${rsa.content}: description exceeds 90 chars: ${value}`);
}

const adGroups = [
  ['AG01_サポート比較', 250], ['AG02_退職給付金_金額', 150], ['AG03_自己都合_開始時期', 80],
  ['AG04_解雇会社都合', 90], ['AG05_雇止め契約満了', 85], ['AG06_退職勧奨倒産', 90],
  ['AG07_離職票手続き', 70], ['AG08_休職体調', 100], ['AG09_生活事情', 70],
];

const groupedKeywords = {
  AG01_サポート比較: [['失業保険 サポート',250],['失業保険 申請サポート',230],['退職給付金 サポート',210],['退職給付金 申請サポート',210],['退職 給付金 相談',180],['失業保険 サポート 料金',200]],
  AG02_退職給付金_金額: [['退職給付金 200万',150],['退職給付金 300万',150],['退職給付金 最大',140],['退職給付金 受給額',130],['退職 給付金 いくら',120],['失業保険 いくら',110]],
  AG03_自己都合_開始時期: [['自己都合 退職 失業保険 いつから',75],['自己都合 退職 失業保険 待機期間',75],['退職 失業保険 自己都合',80],['退職前 失業保険',70]],
  AG04_解雇会社都合: [['解雇 失業保険 いつから',95],['会社都合 失業保険 いつから',95],['会社都合 失業保険 いくら',90],['会社都合 失業保険 日数',90]],
  AG05_雇止め契約満了: [['雇止め 失業保険',90],['雇止め 失業保険 いつから',90],['契約満了 失業保険',85],['派遣 契約満了 失業保険',80],['契約社員 契約満了 失業保険',80]],
  AG06_退職勧奨倒産: [['退職勧奨 失業保険',95],['退職勧奨 失業保険 いつから',95],['会社 倒産 失業保険',90],['事業所閉鎖 失業保険',90]],
  AG07_離職票手続き: [['離職票 いつ届く',70],['離職票 届かない',70],['離職票 失業保険',75],['離職票 離職理由',75],['離職票 会社都合',75],['退職後 失業保険',75],['退職 失業保険 手続き',80],['退職 失業保険 申請',80],['退職後 生活費',55]],
  AG08_休職体調: [['休職満了 退職 失業保険',100],['復職できない 退職 失業保険',95],['体調不良 退職 給付金',100]],
  AG09_生活事情: [['配偶者 転勤 失業保険',70],['介護 退職 失業保険',70],['育児 退職 失業保険',70],['通勤困難 退職 失業保険',70],['会社移転 退職 失業保険',70]],
};
const keywords = Object.entries(groupedKeywords).flatMap(([adGroup, terms]) => terms.map(([keyword, cpc]) => [adGroup, keyword, cpc]));

const commonHeadlines = ['退職後に受け取れるお金を確認','LINEで今の状況を確認','退職前後の制度を整理','受給額と期間は条件で異なる','給付の可否は行政審査で決定','契約前に料金と条件を確認','必要な手続きの順番を整理','退職リリーフで無料確認','本人が申請する公的制度','制度の対象になるかを確認'];
function makeRsa(adGroup, content, specific, descriptions) { const rsa = { adGroup, content, headlines: [...specific, ...commonHeadlines], descriptions }; checkRsa(rsa); return rsa; }
const rsas = [
  makeRsa('AG01_サポート比較','support_compare',['失業保険サポートを比較中の方へ','サポート内容と料金を確認','失業保険の手続きで迷ったら','退職給付金の相談先を確認','LINEで案内内容を確認'],['失業保険サポートを比較中の方へ。LINEで状況を確認し、サポート内容と料金を見てから判断できます。','退職後に対象になり得る制度と手続きの順番を整理。受給の可否・金額・期間は条件で異なります。','申請はご本人が行う公的な手続きです。給付の可否は行政機関が決定します。','契約前に費用・返金条件・支援範囲を確認できます。']),
  makeRsa('AG02_退職給付金_金額','amount_query',['退職給付金200万円を調べた方へ','退職給付金300万円を調べた方へ','退職給付金の受給額を確認','最大額ではなく条件を確認','退職後のお金を無料で確認'],['退職給付金の金額を調べている方へ。対象になり得る制度と受給額の目安をLINEで無料確認します。','受給額・期間は給与、加入期間、退職理由、就労状況などで異なります。給付の可否は行政審査で決まります。','誰でも一律に受け取れる給付ではありません。自分の状況で確認する制度を整理できます。','案内内容と契約条件を確認してから、利用するかを判断できます。']),
  makeRsa('AG03_自己都合_開始時期','self_reason_timing',['自己都合退職後のお金を確認','失業保険はいつから？','待機期間と手順を確認','自己都合でも制度を確認','退職前に確認したい手続き'],['自己都合退職の開始時期・待機期間・必要な手続きを、LINEで無料確認。給付の可否は行政機関が決定します。','退職前・退職直後の状況から、確認する制度と手続きの順番を整理。受給額と期間は条件により異なります。','退職後のお金が不安な方へ。LINEで状況を確認し、案内内容を見てから次を判断できます。','失業手当など対象になり得る制度を確認。申請と審査はご本人・公的機関で行います。']),
  makeRsa('AG04_解雇会社都合','dismissal_company_reason',['解雇後の失業保険を確認','会社都合の手続きを確認','失業保険はいつから？','給付日数は条件で異なります','離職理由と必要書類を確認'],['解雇・会社都合で退職した方へ。離職理由、必要書類、退職後の手続きをLINEで整理できます。','受給の可否、金額、日数は離職理由や加入期間などの条件により異なり、行政機関が決定します。','離職票の内容に応じて、確認する制度と手続きの順番を案内します。','会社都合への変更や給付の増額を約束するサービスではありません。']),
  makeRsa('AG05_雇止め契約満了','contract_end',['雇止め後の制度を確認','契約満了後の手続きを確認','派遣の契約満了で迷ったら','契約社員の退職後を確認','離職理由と必要書類を確認'],['雇止め・契約満了で退職した方へ。雇用形態や更新状況に応じて確認する制度を整理します。','受給の可否・開始時期・日数は、加入期間や離職理由などの条件で異なります。','退職後の手続きと必要書類をLINEで確認。給付の可否は行政機関が決定します。','まずは案内内容と契約条件を確認してから利用を判断できます。']),
  makeRsa('AG06_退職勧奨倒産','retirement_recommendation',['退職勧奨後の手続きを確認','倒産・閉鎖後の制度を確認','退職理由を確認したい方へ','離職票の記載を確認','退職後のお金の不安を整理'],['退職勧奨、倒産、事業所閉鎖による退職後に、確認する制度と手続きの順番を整理します。','離職理由の最終判断、受給の可否・金額・日数はハローワーク等の行政機関が決定します。','会社との紛争解決や離職理由の変更を約束するサービスではありません。','LINEで状況を確認し、案内内容と契約条件を見てから判断できます。']),
  makeRsa('AG07_離職票手続き','separation_notice',['離職票が届かない方へ','離職票と失業保険を確認','退職後の手続きを整理','離職票の到着時期を確認','必要書類を先に確認'],['離職票の到着、退職後の申請、必要書類で迷う方へ。今の状況から手順を整理します。','離職票の未着や記載内容の最終的な対応は、会社や管轄のハローワークへ確認が必要です。','受給の可否・金額・期間は条件で異なり、行政機関が決定します。','LINEで案内内容を確認し、必要な手続きを把握してから次を判断できます。']),
  makeRsa('AG08_休職体調','leave_health',['休職満了後の制度を確認','体調不良で退職を考える方へ','復職が難しい場合の手続き','休職後の退職前に確認','現在の状況から制度を整理'],['休職満了・体調不良で退職を考える方へ。退職前後に確認する制度と手続きの順番を整理します。','受給の可否・開始時期は就労状況、加入状況などの条件で異なり、行政機関が決定します。','医療機関の受診や診断取得を案内する広告ではありません。LINEで現在の状況を確認できます。','案内内容と契約条件を確認してから、利用するかを判断できます。']),
  makeRsa('AG09_生活事情','life_event',['介護で退職を考える方へ','配偶者転勤後の制度を確認','育児と退職後の手続きを確認','会社移転後の制度を確認','通勤困難で退職を考える方へ'],['介護・育児・転居などの事情で退職を考える方へ。確認する制度と手続きの順番を整理します。','受給の可否・開始時期・期間は、離職理由や就労状況などの個別条件で異なります。','給付の可否は行政機関が決定します。LINEで現在の状況を確認できます。','案内内容と契約条件を確認してから、利用するかを判断できます。']),
];
const amountReviewRsa = {
  adGroup: 'AG02_退職給付金_金額',
  content: 'amount_365_cr_review',
  headlines: ['条件により最大365万円','制度上の上限を確認','退職給付金の金額を確認','受給条件をLINEで確認','最大額だけで決めない', ...commonHeadlines],
  descriptions: ['条件を満たした場合の制度上の上限を例示する広告案です。受給額・期間は個別条件で異なります。','受給は保証されず、給付の可否は行政機関が決定します。CR承認前は配信しません。'],
};
if (amountReviewRsa.headlines.length !== 15 || amountReviewRsa.descriptions.length !== 2) throw new Error('amount review RSA asset count invalid');
for (const value of amountReviewRsa.headlines) if ([...value].length > 30) throw new Error(`amount review headline exceeds 30 chars: ${value}`);
for (const value of amountReviewRsa.descriptions) if ([...value].length > 90) throw new Error(`amount review description exceeds 90 chars: ${value}`);
if (new Set(keywords.map(([, keyword]) => keyword)).size !== keywords.length) throw new Error('Duplicate keyword detected.');

const routingNegatives = {
  AG01_サポート比較:['200万','300万','最大','いくら','自己都合','解雇','会社都合','雇止め','契約満了','退職勧奨','倒産','事業所閉鎖','離職票','休職満了','体調不良','介護','育児','配偶者転勤','通勤困難','会社移転'],
  AG02_退職給付金_金額:['サポート','料金','比較','自己都合','解雇','会社都合','雇止め','契約満了','退職勧奨','倒産','離職票','休職満了','介護','育児','配偶者転勤'],
  AG03_自己都合_開始時期:['サポート','料金','200万','300万','最大','解雇','会社都合','雇止め','契約満了','退職勧奨','倒産','離職票','休職満了','介護','育児','配偶者転勤'],
  AG04_解雇会社都合:['自己都合','雇止め','契約満了','退職勧奨','倒産','事業所閉鎖','離職票','休職満了','体調不良','介護','育児','配偶者転勤'],
  AG05_雇止め契約満了:['自己都合','解雇','会社都合','退職勧奨','倒産','事業所閉鎖','離職票','休職満了','介護','育児','配偶者転勤'],
  AG06_退職勧奨倒産:['自己都合','解雇','会社都合','雇止め','契約満了','離職票','休職満了','体調不良','介護','育児','配偶者転勤'],
  AG07_離職票手続き:['自己都合','解雇','会社都合','雇止め','契約満了','退職勧奨','倒産','休職満了','体調不良','介護','育児','配偶者転勤'],
  AG08_休職体調:['自己都合','解雇','会社都合','雇止め','契約満了','退職勧奨','倒産','離職票','介護','育児','配偶者転勤'],
  AG09_生活事情:['自己都合','解雇','会社都合','雇止め','契約満了','退職勧奨','倒産','離職票','休職満了','体調不良'],
};
const campaignNegatives = [
  ['退職代行','Campaign Negative Phrase'],['即日退職','Campaign Negative Phrase'],['退職願','Campaign Negative Phrase'],['退職届','Campaign Negative Phrase'],
  ['診断','Campaign Negative Phrase'],['診断書','Campaign Negative Phrase'],['オンライン診療','Campaign Negative Phrase'],['クリニック','Campaign Negative Phrase'],['精神科','Campaign Negative Phrase'],['うつ','Campaign Negative Phrase'],['適応障害','Campaign Negative Phrase'],
  ['増額','Campaign Negative Phrase'],['延長','Campaign Negative Phrase'],['早くもらう','Campaign Negative Phrase'],['不正受給','Campaign Negative Phrase'],
  ['不当解雇','Campaign Negative Phrase'],['解雇無効','Campaign Negative Phrase'],['解雇裁判','Campaign Negative Phrase'],['弁護士','Campaign Negative Phrase'],['労基署','Campaign Negative Phrase'],['残業代','Campaign Negative Phrase'],['未払い賃金','Campaign Negative Phrase'],
  ['未来退職','Campaign Negative Phrase'],['退職コンシェルジュ','Campaign Negative Phrase'],['よりみち給付金サポート','Campaign Negative Phrase'],['社会保険給付金アシスト','Campaign Negative Phrase'],['退職サポーターズ','Campaign Negative Phrase'],['退職前アドバイザー','Campaign Negative Phrase'],
  ['ハローワーク 電話','Campaign Negative Exact'],['ハローワーク 営業時間','Campaign Negative Exact'],['ハローワーク 管轄','Campaign Negative Exact'],['ハローワーク 求人','Campaign Negative Exact'],['職業訓練','Campaign Negative Exact'],['年金','Campaign Negative Exact'],['65歳','Campaign Negative Exact'],['高年齢','Campaign Negative Exact'],['公務員','Campaign Negative Exact'],['特例一時金','Campaign Negative Exact'],['退職金 計算','Campaign Negative Exact'],['退職 給付金 詐欺','Campaign Negative Exact'],['退職給付金 詐欺','Campaign Negative Exact'],['退職給付金 怪しい','Campaign Negative Exact'],['退職給付金 返金','Campaign Negative Exact'],['退職給付金 解約','Campaign Negative Exact'],
];

function makeCrDocument() {
  const out = ['# 退職リリーフ｜Google検索広告文 CR確認依頼','','確認対象は下記の**広告文（RSA見出し・説明文）だけ**です。キーワード、入札、LP、URL、アセット、媒体設定は含めません。','','確認してほしい点: 金額・期間・受給可否の誤認、受給額等を増やせる示唆、診断・受診の誘導、行政判断の断定がないか。',''];
  for (const entry of rsas) { out.push(`## ${entry.adGroup}`,'','### 見出し'); entry.headlines.forEach((x,i)=>out.push(`${i+1}. ${x}`)); out.push('','### 説明文'); entry.descriptions.forEach((x,i)=>out.push(`${i+1}. ${x}`)); out.push(''); }
  out.push('## 数値訴求案（承認前は配信しない）','','### 見出し'); amountReviewRsa.headlines.forEach((x,i)=>out.push(`${i+1}. ${x}`)); out.push('','### 説明文'); amountReviewRsa.descriptions.forEach((x,i)=>out.push(`${i+1}. ${x}`)); out.push('');
  return out.join('\n');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(path.join(outputDir, '04_GAE_ADD_EXACT_KEYWORDS_UTF8_BOM.csv'), { force: true });
writeCsv('01_GAE_ADD_CAMPAIGN_PAUSED_UTF8_BOM.csv',csvHeaders.campaign,[[campaign,'Search','Paused','Google Search','3000','Manual CPC','Japanese','Location of presence','Location of presence','Disabled',"Doesn't have EU political ads",'Bid equally','Off','Disabled','Disabled','Disabled','Optimize for clicks']]);
writeCsv('02_GAE_ADD_LOCATION_JAPAN_UTF8_BOM.csv',['Campaign','Location ID','Location','Status'],[[campaign,'2392','Japan','Enabled']]);
writeCsv('03_GAE_ADD_ADGROUPS_UTF8_BOM.csv',csvHeaders.adGroups,adGroups.map(([group,cpc])=>[campaign,group,'Enabled',cpc]));
writeCsv('04_GAE_ADD_BROAD_KEYWORDS_UTF8_BOM.csv',csvHeaders.keywords,keywords.map(([group,keyword,cpc])=>[campaign,group,keyword,'Broad','Enabled',cpc,url(group,keyword)]));
writeCsv('05_GAE_ADD_RSA_CONTROL_UTF8_BOM.csv',csvHeaders.rsa,rsas.map((entry)=>[campaign,entry.adGroup,'Responsive search ad','Enabled',url(entry.content,'rsa'),'taishoku','shindan',...entry.headlines,...entry.descriptions]));
writeCsv('06_CR_REVIEW_AMOUNT_RSA_DO_NOT_IMPORT_UTF8_BOM.csv',csvHeaders.rsa,[[campaign,amountReviewRsa.adGroup,'Responsive search ad','Paused',url(amountReviewRsa.content,'rsa'),'taishoku','shindan',...amountReviewRsa.headlines,...Array(5).fill(''),...amountReviewRsa.descriptions,'','']]);
writeCsv('07_GAE_ADD_CAMPAIGN_SITELINKS_UTF8_BOM.csv',['Campaign','Sitelink text','Final URL','Description line 1','Description line 2','Status'],[[campaign,'給付金の仕組み',`${finalUrlBase}about/?utm_source=google&utm_medium=cpc&utm_campaign=taishoku_relief_initial&utm_content=sitelink_about`,'受給条件と開始時期','制度の基本を確認','Enabled'],[campaign,'サポート内容',`${finalUrlBase}service/?utm_source=google&utm_medium=cpc&utm_campaign=taishoku_relief_initial&utm_content=sitelink_service`,'できること・できないこと','相談前に確認','Enabled'],[campaign,'受給までの流れ',`${finalUrlBase}flow/?utm_source=google&utm_medium=cpc&utm_campaign=taishoku_relief_initial&utm_content=sitelink_flow`,'退職前後の手続きを確認','状況別の流れを見る','Enabled'],[campaign,'料金・返金条件',`${finalUrlBase}commerce/?utm_source=google&utm_medium=cpc&utm_campaign=taishoku_relief_initial&utm_content=sitelink_commerce`,'契約前に総額を確認','支払方法と条件を見る','Enabled']]);
writeCsv('08_GAE_ADD_CAMPAIGN_CALLOUTS_UTF8_BOM.csv',['Campaign','Callout text','Status'],[[campaign,'LINEで無料確認','Enabled'],[campaign,'退職前後の状況を確認','Enabled'],[campaign,'本人が申請する制度','Enabled'],[campaign,'受給額・期間は条件で異なる','Enabled'],[campaign,'給付の可否は行政審査','Enabled'],[campaign,'契約前に料金・条件を確認','Enabled']]);
writeCsv('09_GAE_ADD_STRUCTURED_SNIPPETS_SEPARATE_UTF8_BOM.csv',['Campaign','Structured snippet header','Structured snippet values','Status'],[[campaign,'サービス','無料確認, 受給設計, 申請サポート, 受給後フォロー','Enabled']]);
writeCsv('10_GAE_ADD_CAMPAIGN_NEGATIVES_UTF8_BOM.csv',['Campaign','Keyword','Criterion Type','Status'],campaignNegatives.map(([keyword,criterion])=>[campaign,keyword,criterion,'Enabled']));
writeCsv('11_GAE_ADD_ADGROUP_ROUTING_NEGATIVES_UTF8_BOM.csv',['Campaign','Ad group','Keyword','Criterion Type','Status'],Object.entries(routingNegatives).flatMap(([group,terms])=>terms.map((keyword)=>[campaign,group,keyword,'Negative Phrase','Enabled'])));
writeCsv('12_GAE_ENABLE_CAMPAIGN_AFTER_CR_APPROVAL_UTF8_BOM.csv',['Campaign','Status'],[[campaign,'Enabled']]);
fs.writeFileSync(path.join(outputDir,'ASP_CR_CONFIRMATION_REQUEST.md'),makeCrDocument(),'utf8');
console.log(JSON.stringify({outputDir,campaign,adGroups:adGroups.length,keywords:keywords.length,controlRsas:rsas.length,amountReviewRsas:1,campaignNegatives:campaignNegatives.length,routingNegatives:Object.values(routingNegatives).flat().length},null,2));
