import { useMemo } from 'react';
import { detectLang, LANGS, localeFor, translator, type Lang } from '../i18n/translate';
import { readJSON, writeJSON } from '../services/storage';
import { createStore, useStore } from './store';

const KEY = 'vespera.lang';
const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

const langStore = createStore<Lang>(
  readJSON<Lang | null>(KEY, null, (v): v is Lang | null => isLang(v)) ??
    detectLang(typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]),
);

export function setLang(lang: Lang): void {
  langStore.set(lang);
  writeJSON(KEY, lang);
  document.documentElement.lang = lang;
}

export function currentLang(): Lang {
  return langStore.get();
}

export function useI18n() {
  const lang = useStore(langStore);
  const t = useMemo(() => translator(lang), [lang]);
  return { lang, t, locale: localeFor(lang) };
}
