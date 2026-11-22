import { TestBed } from '@angular/core/testing';
import { en } from './en';
import { I18n, langOfUrl, pathFor, switchLangUrl } from './i18n';
import { vi } from './vi';

/** Every dotted path to a string in the dictionary, with array items as numbers. */
function paths(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  if (Array.isArray(node)) return node.flatMap((item, i) => paths(item, `${prefix}.${i}`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) => paths(value, prefix ? `${prefix}.${key}` : key));
  }
  return [];
}

describe('dictionaries', () => {
  it('have the same keys in both languages', () => {
    expect(paths(en).sort()).toEqual(paths(vi).sort());
  });

  it('have no empty strings except the intentional blank unit', () => {
    for (const dict of [vi, en]) {
      for (const path of paths(dict)) {
        if (path === 'common.unitless') continue;
        const value = path.split('.').reduce<any>((node, part) => node[part], dict);
        expect(value.trim(), path).not.toBe('');
      }
    }
  });

  it('use the same {placeholders} in both languages', () => {
    const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const path of paths(vi)) {
      const get = (dict: unknown) => path.split('.').reduce<any>((node, part) => node[part], dict) as string;
      expect(slots(get(en)), path).toEqual(slots(get(vi)));
    }
  });
});

describe('language paths', () => {
  it('keeps Vietnamese at the root and puts English under /en', () => {
    expect(pathFor('vi', '/pendulum')).toBe('/pendulum');
    expect(pathFor('en', '/pendulum')).toBe('/en/pendulum');
    expect(pathFor('en', '/')).toBe('/en');
  });

  it('reads the language from a URL', () => {
    expect(langOfUrl('/en/lens?f=10')).toBe('en');
    expect(langOfUrl('/en')).toBe('en');
    expect(langOfUrl('/entropy')).toBe('vi');
    expect(langOfUrl('/lens')).toBe('vi');
  });

  it('switches language and keeps the query string', () => {
    expect(switchLangUrl('/pendulum?th=30&l=1', 'en')).toBe('/en/pendulum?th=30&l=1');
    expect(switchLangUrl('/en/pendulum?th=30', 'vi')).toBe('/pendulum?th=30');
    expect(switchLangUrl('/', 'en')).toBe('/en');
    expect(switchLangUrl('/en', 'vi')).toBe('/');
  });
});

describe('I18n', () => {
  const i18n = () => TestBed.inject(I18n);

  it('translates, fills placeholders and falls back to the key', () => {
    const t = i18n();
    t.setLang('en');
    expect(t.t('challenge.reveal', { value: '3 m' })).toBe('Answer: 3 m');
    t.setLang('vi');
    expect(t.t('challenge.reveal', { value: '3 m' })).toBe('Đáp án: 3 m');
    expect(t.t('no.such.key')).toBe('no.such.key');
  });

  it('formats numbers with a decimal comma in Vietnamese and a point in English', () => {
    const t = i18n();
    t.setLang('vi');
    expect(t.fmt(2.0061, 2, true)).toBe('2,01');
    t.setLang('en');
    expect(t.fmt(2.0061, 2, true)).toBe('2.01');
    expect(t.fmt(Infinity)).toBe('∞');
  });

  it('lists array entries', () => {
    const t = i18n();
    t.setLang('en');
    expect(t.list('sims.pendulum.tryIt')).toHaveLength(3);
  });
});
