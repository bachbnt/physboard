import { ChangeDetectionStrategy, Component, computed, inject, signal, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GROUPS, SIMS } from '../../catalog';
import { prefersReducedMotion } from '../../core/motion';
import { Seo } from '../../core/seo';
import { I18n } from '../../i18n/i18n';
import { Board } from '../../ui/board';
import { SimIcon } from '../../ui/sim-icon';
import { HeroPendulum } from './hero-pendulum';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Board, RouterLink, SimIcon],
  templateUrl: './home-page.html',
})
export class HomePage {
  protected readonly i18n = inject(I18n);
  protected readonly running = signal(true);

  protected readonly hero: HeroPendulum = new HeroPendulum(
    {
      hint: () => this.i18n.t('home.dragHint'),
      period: (): string => `${this.i18n.fmt(this.hero.predictedPeriod, 1, true)} s`,
    },
    () => this.running.set(true),
  );

  protected readonly groups = computed(() => {
    this.i18n.lang();
    return GROUPS.map((group) => ({
      group,
      title: this.i18n.t(`groups.${group}`),
      sims: SIMS.filter((s) => s.group === group).map((s) => ({
        id: s.id,
        path: this.i18n.path(`/${s.id}`),
        title: this.i18n.t(`sims.${s.id}.title`),
        short: this.i18n.t(`sims.${s.id}.short`),
      })),
    }));
  });

  constructor() {
    inject(Seo).set({ description: this.i18n.t('site.description'), route: '/' });
    // Visitors who asked for less motion get the pendulum parked until they pick it up.
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        this.hero.rewind();
        this.running.set(false);
      }
    });
  }
}
