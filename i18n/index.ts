import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { sw } from './sw';

const resources = {
    en: { translation: en },
    sw: { translation: sw },
};

const languageDetector = {
    type: 'languageDetector',
    async: true,
    detect: (callback: (lang: string) => void) => {
        const locales = Localization.getLocales();
        const lang = locales[0]?.languageCode || 'en';
        callback(lang);
    },
    init: () => { },
    cacheUserLanguage: () => { },
};

i18n
    .use(initReactI18next)
    // .use(languageDetector as any) // Optional: detect device language
    .init({
        resources,
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
