import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const output = path.join(site, 'content', 'policies');
const pages = [
  'terms', 'privacy', 'location', 'marketing', 'third-party', 'consent',
  'youth', 'security', 'cookie', 'copyright', 'openapi', 'license', 'account-deletion', 'sitemap',
];

const decode = (value) => value
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ');

const texts = new Set();
for (const page of pages) {
  const html = await fs.readFile(path.join(site, `${page}.html`), 'utf8');
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || '';
  for (const match of main.matchAll(/>([^<>]+)</g)) {
    const value = decode(match[1]).replace(/\s+/g, ' ').trim();
    if (value && !value.startsWith('{') && !value.startsWith('©')) texts.add(value);
  }
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1]?.trim();
  if (title) texts.add(decode(title));
  if (description) texts.add(decode(description));
}

const source = [...texts];
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'ko.json'), `${JSON.stringify(Object.fromEntries(source.map((text) => [text, text])), null, 2)}\n`);

const translateBatch = async (items, target) => {
  const separator = '\n[[DG_POLICY_SPLIT]]\n';
  const params = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't', q: items.join(separator) });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
  if (!response.ok) throw new Error(`Translation failed: ${response.status}`);
  const payload = await response.json();
  const translated = payload[0].map((part) => part[0]).join('');
  const parts = translated.split(/\s*\[\[DG_POLICY_SPLIT\]\]\s*/);
  if (parts.length !== items.length) throw new Error(`Batch split mismatch: ${items.length} -> ${parts.length}`);
  return parts.map((part) => part.replace(/\s+/g, ' ').trim());
};

for (const target of ['en', 'ja', 'zh-CN']) {
  const values = [];
  for (let index = 0; index < source.length; index += 18) {
    const batch = source.slice(index, index + 18);
    values.push(...await translateBatch(batch, target));
    process.stdout.write(`${target}: ${Math.min(index + batch.length, source.length)}/${source.length}\r`);
  }
  const locale = target === 'zh-CN' ? 'zh' : target;
  const dictionary = Object.fromEntries(source.map((text, index) => [text, values[index] || text]));
  if (locale === 'ja') Object.assign(dictionary, {
    'Terms':'利用規約','Service use':'サービス利用','Safety':'安全','Usage rules':'利用ルール','Clarity first':'分かりやすさを優先',
    'Privacy':'プライバシー','Policy':'ポリシー','Clear purpose':'明確な目的','Secure handling':'安全な取扱い','Rights':'権利','Transparent access':'透明なアクセス',
    'Location policy':'位置情報ポリシー','Collect':'収集','Consent-based':'同意に基づく','Use':'利用','Dive discovery':'ダイビング探索','Withdraw':'撤回','Anytime':'いつでも',
    'Marketing consent':'マーケティング同意','SMS':'SMS','Email':'メール','Third-party provision':'第三者提供','Choice':'選択','Minimum':'最小限',
    'Privacy consent':'個人情報同意','Clear':'明確','Safe':'安全','Youth protection':'青少年保護','Age gate':'年齢確認','Fast action':'迅速な対応',
    'Least privilege':'最小権限','At rest / in transit':'保存時・通信時','Audit':'監査','Traceable logs':'追跡可能なログ','Necessary':'必要','Required':'必須',
    'Analytics':'分析','Preference':'設定','Copyright':'著作権','Own':'所有','Brand assets':'ブランド資産','Third-party':'第三者','Notice':'通知','Rights request':'権利申請',
    'Platform API terms':'プラットフォームAPI規約','Auth':'認証','Limit':'制限','Rate capped':'レート制限','No abuse':'不正利用禁止',
    'Libraries':'ライブラリ','Fonts':'フォント','Webfont':'ウェブフォント','Attribution':'帰属表示','Account control':'アカウント管理','Pages':'ページ','Docs':'文書','Single navigation':'統合ナビゲーション',
  });
  await fs.writeFile(path.join(output, `${locale}.json`), `${JSON.stringify(dictionary, null, 2)}\n`);
  process.stdout.write(`\n`);
}

console.log(`Generated ${source.length} policy strings for ko, en, ja and zh.`);
