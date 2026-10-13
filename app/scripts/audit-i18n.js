/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const appRoot = path.resolve(__dirname, '..');
const localeRoot = path.join(appRoot, 'src', 'locales');
const languages = ['ko', 'en', 'ja', 'zh'];
const sharedLocaleValueAllowlist = new Set([
  'auth.emailPlaceholder',
  'brand.tagline',
  'diveEducation.eyebrow',
  'diveGuide.eyebrow',
  'explore.eyebrow',
  'feed.meta.gasWithPercent',
  'logsForm.fields.buddyPlaceholder',
  'marineLife.search.wikipedia',
  'pages.profileEdit.freedivingLevels.level_1',
  'pages.profileEdit.freedivingLevels.level_2',
  'pages.profileEdit.freedivingLevels.level_3',
  'pages.profileEdit.freedivingLevels.level_4',
  'pages.profileEdit.license.issuedAtPlaceholder',
  'settingsPage.languages.en',
  'settingsPage.options.gasUnit.bar',
  'settingsPage.options.gasUnit.psi',
  'stampPage.catalogTitle',
]);
const internalKoreanSourcePrefixes = [
  'src/screens/admin/',
  'src/lib/adminDashboard.ts',
  'src/legal/policyCatalog.ts',
];
const reviewedOperationalKorean = new Set([
  '한국어',
  '회원',
  '가입',
  '실패',
  '필요',
  '대기',
  '미지원',
  '동기화중',
  '처리중',
  '요청',
  '준비',
  '없음',
  '활성',
  'API Key 필요',
  '연결 대기',
  '기기 미연결',
  '공유만 지원',
  '무서명 업로드 가능',
  '업로드 preset 필요',
  '설정 필요',
  '동기화 완료',
  '등록됨',
  '연결됨',
]);

function flatten(value, prefix = '', result = {}) {
  Object.entries(value).forEach(([key, child]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, nextKey, result);
    else result[nextKey] = child;
  });
  return result;
}

function interpolationKeys(value) {
  return [...String(value ?? '').matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map((match) => match[1]).sort();
}

function collectSourceFiles(directory, result = []) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    if (['locales', 'node_modules', 'dist', 'mock'].includes(entry.name)) return;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(absolutePath, result);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/(\.test|\.spec)\./.test(entry.name)) result.push(absolutePath);
  });
  return result;
}

function isInsideTranslationCall(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isCallExpression(parent)) {
      const expression = parent.expression.getText();
      if (expression === 't' || expression === 'tx' || expression === 'i18n.t' || expression.endsWith('.t')) return true;
    }
    if (ts.isStatement(parent) || ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) break;
  }
  return false;
}

const localeData = Object.fromEntries(
  languages.map((language) => [language, flatten(JSON.parse(fs.readFileSync(path.join(localeRoot, `${language}.json`), 'utf8')))])
);
const allKeys = [...new Set(languages.flatMap((language) => Object.keys(localeData[language])))].sort();
const report = {
  keyCounts: Object.fromEntries(languages.map((language) => [language, Object.keys(localeData[language]).length])),
  unionKeyCount: allKeys.length,
  missing: {},
  empty: {},
  koreanRemaining: {},
  sameAsEnglish: {},
  reviewedSameAsEnglish: {},
  placeholderMismatch: {},
  hardcodedKorean: [],
  reviewedHardcodedKorean: [],
};

languages.forEach((language) => {
  report.missing[language] = allKeys.filter((key) => !(key in localeData[language]));
  report.empty[language] = allKeys.filter((key) => key in localeData[language] && String(localeData[language][key]).trim() === '');
  report.placeholderMismatch[language] = allKeys.filter(
    (key) => interpolationKeys(localeData.ko[key]).join(',') !== interpolationKeys(localeData[language][key]).join(',')
  );
});

['en', 'ja', 'zh'].forEach((language) => {
  report.koreanRemaining[language] = allKeys.filter((key) => /[가-힣]/.test(String(localeData[language][key] ?? '')));
});
['ja', 'zh'].forEach((language) => {
  const matches = allKeys.filter(
    (key) => localeData[language][key] === localeData.en[key] && /[A-Za-z]{3}/.test(String(localeData.en[key] ?? ''))
  );
  report.reviewedSameAsEnglish[language] = matches.filter((key) => sharedLocaleValueAllowlist.has(key));
  report.sameAsEnglish[language] = matches.filter((key) => !sharedLocaleValueAllowlist.has(key));
});

collectSourceFiles(path.join(appRoot, 'app'))
  .concat(collectSourceFiles(path.join(appRoot, 'src')))
  .forEach((absolutePath) => {
    const sourceText = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      absolutePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    function visit(node) {
      let value = '';
      let kind = '';
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        value = node.text;
        kind = 'string';
      } else if (ts.isTemplateExpression(node)) {
        value = node.getText(sourceFile);
        kind = 'template';
      } else if (ts.isJsxText(node)) {
        value = node.getText(sourceFile).trim();
        kind = 'jsx';
      }
      if (value && /[가-힣]/.test(value) && !isInsideTranslationCall(node)) {
        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const item = {
          file: path.relative(appRoot, absolutePath),
          line: location.line + 1,
          kind,
          text: value.replace(/\s+/g, ' ').trim().slice(0, 300),
        };
        const isInternalSource = internalKoreanSourcePrefixes.some((prefix) => item.file.startsWith(prefix));
        if (isInternalSource || reviewedOperationalKorean.has(item.text)) {
          report.reviewedHardcodedKorean.push({
            ...item,
            reason: isInternalSource ? 'internal_admin_or_canonical_korean_source' : 'non_ui_compatibility_or_native_language_label',
          });
        } else {
          report.hardcodedKorean.push(item);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  });

const outputPath = path.join(appRoot, 'i18n-audit.json');
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Locale keys: ${report.unionKeyCount}`);
console.log(`Missing: ${languages.map((language) => `${language}=${report.missing[language].length}`).join(', ')}`);
console.log(`Empty: ${languages.map((language) => `${language}=${report.empty[language].length}`).join(', ')}`);
console.log(`Same as English: ja=${report.sameAsEnglish.ja.length}, zh=${report.sameAsEnglish.zh.length}`);
console.log(`Hardcoded Korean: ${report.hardcodedKorean.length} unreviewed, ${report.reviewedHardcodedKorean.length} reviewed`);
console.log(`Report: ${outputPath}`);

const unexpectedKorean = Object.fromEntries(
  Object.entries(report.koreanRemaining).map(([language, keys]) => [
    language,
    keys.filter((key) => key !== 'settingsPage.languages.ko'),
  ])
);
const hasStructuralFailure = languages.some(
  (language) => report.missing[language].length || report.empty[language].length || report.placeholderMismatch[language].length
);
const hasUnexpectedKorean = Object.values(unexpectedKorean).some((keys) => keys.length);
const hasUnreviewedSharedEnglish = Object.values(report.sameAsEnglish).some((keys) => keys.length);
const hasUnreviewedHardcodedKorean = report.hardcodedKorean.length > 0;
if (hasStructuralFailure || hasUnexpectedKorean || hasUnreviewedSharedEnglish || hasUnreviewedHardcodedKorean) {
  console.error('i18n audit failed: locale structure, translation quality, or source hardcoding requires review.');
  process.exitCode = 1;
}
