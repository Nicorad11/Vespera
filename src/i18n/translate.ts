import { da, en, WEEKDAYS_LONG, WEEKDAYS_SHORT, type Message, type MessageKey } from './strings';

export type Lang = 'en' | 'da';
export const LANGS: readonly Lang[] = ['en', 'da'];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', da: 'Dansk' };

export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

const dictionaries: Record<Lang, Record<MessageKey, Message>> = { en, da };
const pluralRules = new Map<Lang, Intl.PluralRules>();

function pluralCategory(lang: Lang, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(lang);
    pluralRules.set(lang, rules);
  }
  return rules.select(count);
}

export function translate(lang: Lang, key: MessageKey, params: Params = {}): string {
  const message = dictionaries[lang][key] ?? en[key];
  const template =
    typeof message === 'string'
      ? message
      : pluralCategory(lang, Number(params.count ?? 0)) === 'one'
        ? message.one
        : message.other;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function translator(lang: Lang): Translate {
  return (key, params) => translate(lang, key, params);
}

export function weekdayShort(lang: Lang, weekday: number): string {
  return WEEKDAYS_SHORT[lang][weekday] ?? '';
}

export function weekdayLong(lang: Lang, weekday: number): string {
  return WEEKDAYS_LONG[lang][weekday] ?? '';
}

/** BCP 47 locale used for Intl formatting in each app language. */
export function localeFor(lang: Lang): string {
  return lang === 'da' ? 'da-DK' : 'en-GB';
}

export function detectLang(languages: readonly string[]): Lang {
  const first = languages.find((l) => /^(da|en)\b/i.test(l));
  return first?.toLowerCase().startsWith('da') ? 'da' : 'en';
}
