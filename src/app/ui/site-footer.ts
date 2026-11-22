import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n } from '../i18n/i18n';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div class="chalk-rule mb-5"></div>
      <p class="max-w-prose text-[0.95rem] leading-relaxed text-chalk-dim">{{ i18n.t('home.method') }}</p>
      <p class="mt-2 text-[0.95rem] text-chalk-dim">{{ i18n.t('home.free') }}</p>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly i18n = inject(I18n);
}
