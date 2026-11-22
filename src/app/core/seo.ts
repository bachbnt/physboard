import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { I18n, LANGS, pathFor } from '../i18n/i18n';

export const SITE_URL = 'https://physboard.web.app';

const OG_LOCALE = { vi: 'vi_VN', en: 'en_US' } as const;

/** Sets the title, description, canonical URL and language alternates for the current page. */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly i18n = inject(I18n);

  /** `route` is the language-neutral path, such as `/pendulum` (or `/` for home). */
  set(options: { title?: string; description: string; route: string }) {
    const lang = this.i18n.lang();
    const name = this.i18n.t('site.name');
    const fullTitle = options.title ? `${options.title} · ${name}` : `${name}: ${this.i18n.t('site.tagline')}`;
    const url = SITE_URL + pathFor(lang, options.route);

    this.title.setTitle(fullTitle);
    this.doc.documentElement.lang = lang;

    const tags: Record<string, string> = {
      description: options.description,
      'og:title': fullTitle,
      'og:description': options.description,
      'og:type': 'website',
      'og:url': url,
      'og:site_name': name,
      'og:locale': OG_LOCALE[lang],
      'twitter:card': 'summary',
    };
    for (const [key, content] of Object.entries(tags)) {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
    }

    this.setLinks([
      { rel: 'canonical', href: url },
      ...LANGS.map((l) => ({ rel: 'alternate', hreflang: l, href: SITE_URL + pathFor(l, options.route) })),
      { rel: 'alternate', hreflang: 'x-default', href: SITE_URL + pathFor('vi', options.route) },
    ]);
  }

  private setLinks(links: { rel: string; href: string; hreflang?: string }[]) {
    const head = this.doc.head;
    head.querySelectorAll('link[data-seo]').forEach((el) => el.remove());
    for (const link of links) {
      const el = this.doc.createElement('link');
      el.setAttribute('rel', link.rel);
      el.setAttribute('href', link.href);
      if (link.hreflang) el.setAttribute('hreflang', link.hreflang);
      el.setAttribute('data-seo', '');
      head.appendChild(el);
    }
  }
}
