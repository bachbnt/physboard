import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../i18n/i18n';
import { RichText } from './rich-text';

/**
 * The page every simulation lives in. It reads the title, topic, lead, hints and explanation from
 * the dictionary (`sims.<key>`), and arranges the board, the controls and the supporting panels.
 */
@Component({
  selector: 'app-sim-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RichText],
  template: `
    <article class="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <a [routerLink]="i18n.path('/')" class="inline-block pb-1 text-[0.95rem] text-chalk-dim hover:text-chalk">
        {{ i18n.t('sim.backToList') }}
      </a>

      <header class="mb-7 mt-2 max-w-3xl">
        <h1 class="font-chalk text-[clamp(2.6rem,6vw,4.2rem)] leading-[1.02] text-chalk">{{ i18n.t(base() + '.title') }}</h1>
        <p class="mt-1 text-chalk-dim">{{ i18n.t(base() + '.topic') }}</p>
        <p class="mt-4 max-w-[62ch] text-[1.12rem] leading-relaxed">{{ i18n.t(base() + '.lead') }}</p>
      </header>

      <section [attr.aria-label]="i18n.t('sim.board')">
        <ng-content select="[data-slot=board]" />
      </section>
      <div class="ledge" aria-hidden="true"></div>

      <section class="mt-5" aria-labelledby="controls-title">
        <h2 id="controls-title" class="sr-only">{{ i18n.t('sim.controls') }}</h2>
        <ng-content select="[data-slot=controls]" />
      </section>

      <div class="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <section aria-labelledby="measure-title">
          <h2 id="measure-title" class="section-title">{{ i18n.t('sim.measurements') }}</h2>
          <ng-content select="[data-slot=measurements]" />
        </section>
        <section aria-labelledby="formula-title">
          <h2 id="formula-title" class="section-title">{{ i18n.t('sim.formulas') }}</h2>
          <ng-content select="[data-slot=formulas]" />
        </section>
      </div>

      <div class="mt-14 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <section aria-labelledby="explain-title">
          <h2 id="explain-title" class="section-title">{{ i18n.t('sim.explanation') }}</h2>
          <div class="max-w-[62ch] space-y-3.5 leading-relaxed">
            @for (paragraph of explain(); track $index) {
              <p><app-rich-text [text]="paragraph" /></p>
            }
          </div>
          <h3 class="mt-7 font-chalk text-2xl text-chalk-yellow">{{ i18n.t('sim.tryIt') }}</h3>
          <ul class="mt-2 max-w-[62ch] list-disc space-y-2 pl-5 leading-relaxed marker:text-chalk-yellow">
            @for (tip of tryIt(); track $index) {
              <li><app-rich-text [text]="tip" /></li>
            }
          </ul>
        </section>
        <section aria-labelledby="challenge-title">
          <h2 id="challenge-title" class="section-title">{{ i18n.t('sim.challenges') }}</h2>
          <ng-content select="[data-slot=challenges]" />
        </section>
      </div>
    </article>
  `,
})
export class SimShell {
  /** Dictionary key under `sims`, such as `pendulum`. */
  readonly sim = input.required<string>();

  protected readonly i18n = inject(I18n);
  protected readonly base = computed(() => `sims.${this.sim()}`);
  protected readonly explain = computed(() => {
    this.i18n.lang();
    return this.i18n.list(`${this.base()}.explain`);
  });
  protected readonly tryIt = computed(() => {
    this.i18n.lang();
    return this.i18n.list(`${this.base()}.tryIt`);
  });
}
