import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import ko from '../locales/ko.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zh from '../locales/zh.json';
import { getLayoutPreviewPayload } from './layoutPreview';

export const supportedLanguages = ['ko', 'en', 'ja', 'zh'] as const;

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
};

const i18n = createInstance();

function fallbackLanguages(languageCode?: string) {
  const language = String(languageCode || '').toLowerCase().split(/[-_]/)[0];
  return language === 'ko' ? ['ko'] : ['en'];
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: (getLayoutPreviewPayload()?.locale || Localization.getLocales?.()[0]?.languageCode || 'ko'),
    load: 'languageOnly',
    // A non-Korean UI must never fall back to Korean when a key is missing.
    fallbackLng: fallbackLanguages,
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
  });

const translate = i18n.t.bind(i18n);
i18n.t = ((key: any, options?: any) => {
  const language = String(i18n.resolvedLanguage || i18n.language || 'ko').toLowerCase();
  if (!language.startsWith('ko') && options && typeof options === 'object') {
    const defaultValue = String(options.defaultValue || '');
    if (/[가-힣]/.test(defaultValue)) {
      const { defaultValue: _koreanDefault, ...safeOptions } = options;
      return translate(key, safeOptions);
    }
  }
  return translate(key, options);
}) as typeof i18n.t;

export default i18n;
