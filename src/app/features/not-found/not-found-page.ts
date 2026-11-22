import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from '../../core/seo';
import { I18n } from '../../i18n/i18n';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p class="font-chalk text-[6rem] leading-none text-chalk-yellow">404</p>
      <h1 class="mt-2 text-4xl text-chalk">{{ i18n.t('common.notFoundTitle') }}</h1>
      <p class="mt-3 text-chalk-dim">{{ i18n.t('common.notFoundText') }}</p>
      <a [routerLink]="i18n.path('/')" class="btn btn-primary mt-8">{{ i18n.t('common.backHome') }}</a>
    </section>
  `,
})
export class NotFoundPage {
  protected readonly i18n = inject(I18n);

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('common.notFoundTitle'),
      description: this.i18n.t('common.notFoundText'),
      route: '/',
    });
  }
}
