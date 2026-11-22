import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, UrlTree } from '@angular/router';
import { filter, map } from 'rxjs';
import { I18n, Lang, switchLangUrl } from '../i18n/i18n';

@Component({
  selector: 'app-lang-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav class="flex gap-4" [attr.aria-label]="i18n.t('nav.language')">
      @for (option of options; track option.lang) {
        <a
          [routerLink]="target(option.lang)"
          [attr.hreflang]="option.lang"
          [attr.lang]="option.lang"
          [attr.aria-current]="option.lang === i18n.lang() ? 'true' : null"
          class="border-b-2 pb-0.5 text-[0.95rem] transition-colors"
          [class]="option.lang === i18n.lang() ? 'border-chalk-yellow text-chalk' : 'border-transparent text-chalk-dim hover:text-chalk'"
        >
          {{ option.name }}
        </a>
      }
    </nav>
  `,
})
export class LangSwitch {
  protected readonly i18n = inject(I18n);
  private readonly router = inject(Router);
  protected readonly options: { lang: Lang; name: string }[] = [
    { lang: 'vi', name: 'Tiếng Việt' },
    { lang: 'en', name: 'English' },
  ];
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** A URL tree, not a string, so the query string stays a query string instead of being escaped into the path. */
  protected target(lang: Lang): UrlTree {
    return this.router.parseUrl(switchLangUrl(this.url(), lang));
  }
}
