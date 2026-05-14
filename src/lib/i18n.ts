import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import ko from '../locales/ko.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: Localization.locale.split('-')[0] || 'ko',
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;