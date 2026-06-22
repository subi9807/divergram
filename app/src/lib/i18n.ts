import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import ko from '../locales/ko.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zh from '../locales/zh.json';

export const supportedLanguages = ['ko', 'en', 'ja', 'zh'] as const;

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
};

const i18n = createInstance();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: (Localization.getLocales?.()[0]?.languageCode || 'ko'),
    load: 'languageOnly',
    fallbackLng: 'ko',
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
