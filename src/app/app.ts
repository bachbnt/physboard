import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18n } from './i18n/i18n';
import { SiteFooter } from './ui/site-footer';
import { SiteHeader } from './ui/site-header';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-board-deep focus:px-3 focus:py-2"
    >
      {{ i18n.t('nav.skip') }}
    </a>
    <app-site-header />
    <main id="main"><router-outlet /></main>
    <app-site-footer />
  `,
})
export class App {
  protected readonly i18n = inject(I18n);
}
