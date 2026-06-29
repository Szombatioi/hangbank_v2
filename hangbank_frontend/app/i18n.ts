import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../public/locales/en/common.json';
import hu from '../public/locales/hu/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      hu: { common: hu },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    // Region codes (e.g. "hu-HU", "en-US") fall back to the base language resource
    nonExplicitSupportedLngs: true,
    supportedLngs: ['en', 'hu'],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    defaultNS: 'common',
  });

export default i18n;