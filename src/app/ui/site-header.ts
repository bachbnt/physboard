import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../i18n/i18n';
import { LangSwitch } from './lang-switch';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LangSwitch],
  template: `
    <header class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <a [routerLink]="i18n.path('/')" class="flex items-center gap-3" [attr.aria-label]="i18n.t('site.name')">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="#efece0" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M5 4h24" />
          <path d="M17 4l-8.5 21" stroke="#f3d56a" />
          <circle cx="8" cy="27" r="4" fill="#efece0" />
          <path d="M17 4l8.5 21" stroke-dasharray="1 4" opacity="0.5" />
          <circle cx="26" cy="27" r="4" stroke-dasharray="1 4" opacity="0.5" />
        </svg>
        <span class="font-chalk text-[2rem] leading-none text-chalk">{{ i18n.t('site.name') }}</span>
      </a>
      <app-lang-switch />
    </header>
  `,
})
export class SiteHeader {
  protected readonly i18n = inject(I18n);
}
