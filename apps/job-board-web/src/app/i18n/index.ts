import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../public/locales/en.json';
import hi from '../../../public/locales/hi.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const t = i18n.t.bind(i18n);
export { i18n };
export default i18n;
