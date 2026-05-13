import ko from '@/messages/ko.json';
import ja from '@/messages/ja.json';

export type Locale = 'ko' | 'ja';
export type Country = 'KR' | 'JP' | 'GLOBAL';

const messages = { ko, ja } as const;

type Messages = typeof ko;
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K) : never }[keyof T]
  : never;
export type MessageKey = NestedKeyOf<Messages>;

export function getLocale(): Locale {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang === 'ja') return 'ja';
  }
  return 'ko';
}

export function countryToLocale(country: Country): Locale {
  return country === 'JP' ? 'ja' : 'ko';
}

export function t(key: string, locale: Locale = 'ko'): string {
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = messages[locale];
  for (const part of parts) {
    value = value?.[part];
  }
  if (typeof value === 'string') return value;
  // fallback to ko
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallback: any = messages['ko'];
  for (const part of parts) {
    fallback = fallback?.[part];
  }
  return typeof fallback === 'string' ? fallback : key;
}
