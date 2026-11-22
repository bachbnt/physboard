import { computed, Injectable, signal } from '@angular/core';
import { Dict } from './dictionary';
import { en } from './en';
import { vi } from './vi';

export type Lang = 'vi' | 'en';
export const LANGS: readonly Lang[] = ['vi', 'en'];

const DICTIONARIES: Record<Lang, Dict> = { vi: vi as unknown as Dict, en };
const LOCALES: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US' };

/** `/projectile` in Vietnamese stays `/projectile`; in English it becomes `/en/projectile`. */
export function pathFor(lang: Lang, route: string): string {
  if (lang === 'vi') return route;
  return route === '/' ? '/en' : `/en${route}`;
}

/** The language a URL is written in, taken from its `/en` prefix. */
export function langOfUrl(url: string): Lang {
  return /^\/en(?=[/?#]|$)/.test(url) ? 'en' : 'vi';
}

/** The same page in another language, keeping the query string and hash. */
export function switchLangUrl(url: string, to: Lang): string {
  const bare = url.replace(/^\/en(?=[/?#]|$)/, '');
  const rest = bare === '' || bare[0] === '?' || bare[0] === '#' ? `/${bare}` : bare;
  const path = rest.split(/[?#]/)[0];
  return pathFor(to, path) + rest.slice(path.length);
}

/** Looks up `a.b.0.c` in a dictionary; numeric segments index into arrays. */
function lookup(dict: unknown, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Signal-based translations. Templates call `t()`, so they update the moment the language changes. */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>('vi');
  private readonly dict = computed(() => DICTIONARIES[this.lang()]);
  private readonly formatters = new Map<string, Intl.NumberFormat>();

  setLang(lang: Lang) {
    this.lang.set(lang);
  }

  /** Translates a key and fills `{name}` placeholders. A missing key returns the key itself. */
  t(key: string, params?: Record<string, string | number>): string {
    const value = lookup(this.dict(), key);
    if (typeof value !== 'string') return key;
    return params ? value.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : value;
  }

  /** Translates a key that holds a list of strings. */
  list(key: string): string[] {
    const value = lookup(this.dict(), key);
    return Array.isArray(value) ? (value as string[]) : [];
  }

  /** Builds an in-app link that keeps the current language. */
  path(route: string): string {
    return pathFor(this.lang(), route);
  }

  /** Formats a number the way readers of the current language write it (Vietnamese uses a decimal comma). */
  fmt(value: number, digits = 2, fixed = false): string {
    if (!Number.isFinite(value)) return '∞';
    const locale = LOCALES[this.lang()];
    const id = `${locale}|${digits}|${fixed}`;
    let nf = this.formatters.get(id);
    if (!nf) {
      nf = new Intl.NumberFormat(locale, {
        maximumFractionDigits: digits,
        minimumFractionDigits: fixed ? digits : 0,
        useGrouping: false,
      });
      this.formatters.set(id, nf);
    }
    return nf.format(value);
  }
}
