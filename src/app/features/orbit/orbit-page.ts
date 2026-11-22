import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Chalk, Point } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { prefersReducedMotion } from '../../core/motion';
import { Seo } from '../../core/seo';
import { syncUrlParams, urlParam } from '../../core/url-params';
import { I18n } from '../../i18n/i18n';
import {
  advanceOrbit,
  circularSpeed,
  escapeSpeed,
  OrbitShape,
  OrbitState,
  orbitalPeriod,
  orbitShape,
  R_EARTH,
  startOrbit,
} from '../../physics/orbit-motion';
import { Board } from '../../ui/board';
import { Challenge, ChallengePanel } from '../../ui/challenge-panel';
import { FormulaList } from '../../ui/formula-list';
import { ReadoutList } from '../../ui/readout-list';
import { BoardSize, Scene } from '../../ui/scene';
import { SimShell } from '../../ui/sim-shell';
import { TraySlider } from '../../ui/tray-slider';

/** A circular orbit at the starting radius lasts this many real seconds on screen. */
const SECONDS_PER_REVOLUTION = 12;
const TIME_RATE = (2 * Math.PI) / SECONDS_PER_REVOLUTION;

const radius = (altKm: number) => R_EARTH + altKm;
export const ORBIT_CHALLENGES: readonly Challenge[] = [
  { params: { alt: 400, s: 1 }, answer: circularSpeed(radius(400)), unit: 'km/s', tolerance: 0.02, digits: 2 },
  { params: { alt: 35786, s: 1 }, answer: orbitalPeriod(radius(35786)) / 3600, unit: 'h', tolerance: 0.02, digits: 1 },
  { params: { alt: 400, s: 1 }, answer: escapeSpeed(radius(400)), unit: 'km/s', tolerance: 0.02, digits: 2 },
];

@Component({
  selector: 'app-orbit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimShell, Board, TraySlider, ReadoutList, FormulaList, ChallengePanel],
  templateUrl: './orbit-page.html',
})
export class OrbitPage implements Scene {
  protected readonly i18n = inject(I18n);
  protected readonly challenges = ORBIT_CHALLENGES;

  protected readonly altitude = urlParam('alt', 400, 200, 36000);
  protected readonly ratio = urlParam('s', 1.15, 0.6, 1.5);
  protected readonly playing = signal(true);
  protected readonly crashed = signal(false);

  private readonly board = viewChild(Board);
  private state: OrbitState = startOrbit(1.15);

  private readonly r0 = computed(() => radius(this.altitude()));
  private readonly shape = computed<OrbitShape>(() => orbitShape(this.ratio()));
  /** Earth's radius in starting radii. */
  private readonly earth = computed(() => R_EARTH / this.r0());
  private readonly willCrash = computed(() => this.shape().periapsis <= this.earth());

  protected readonly rows = computed(() => {
    const i = this.i18n;
    const r0 = this.r0();
    const shape = this.shape();
    const vc = circularSpeed(r0);
    const bound = shape.eccentricity < 1 - 1e-9;
    const minutes = bound ? orbitalPeriod(shape.semiMajor * r0) / 60 : null;
    const kind = this.willCrash() ? 'crash' : shape.kind;
    return [
      { label: i.t('sims.orbit.readouts.circular'), value: i.fmt(vc, 2, true), unit: 'km/s' },
      { label: i.t('sims.orbit.readouts.escape'), value: i.fmt(escapeSpeed(r0), 2, true), unit: 'km/s' },
      { label: i.t('sims.orbit.readouts.launch'), value: i.fmt(vc * this.ratio(), 2, true), unit: 'km/s' },
      {
        label: i.t('sims.orbit.readouts.period'),
        value: minutes === null ? i.t('sims.orbit.readouts.openOrbit') : minutes >= 180 ? i.fmt(minutes / 60, 1, true) : i.fmt(minutes, 1, true),
        unit: minutes === null ? '' : minutes >= 180 ? 'h' : 'min',
      },
      { label: i.t('sims.orbit.readouts.kind'), value: i.t(`sims.orbit.kinds.${kind}`) },
    ];
  });

  protected readonly timelapse = computed(() => {
    // Real time per second on screen: a revolution at the starting radius lasts 2π·√(r³/μ) of real seconds.
    const tau = orbitalPeriod(this.r0()) / (2 * Math.PI);
    const minutesPerSecond = (TIME_RATE * tau) / 60;
    return this.i18n.t('sims.orbit.timelapse', { value: this.i18n.fmt(minutesPerSecond, minutesPerSecond < 10 ? 1 : 0) });
  });

  protected readonly formulas = computed(() => {
    this.i18n.lang();
    const captions = this.i18n.list('sims.orbit.formulas');
    const tex = [
      'v = \\sqrt{\\dfrac{GM}{r}}',
      'v_{th} = \\sqrt{\\dfrac{2GM}{r}} = \\sqrt{2}\\,v',
      'T = 2\\pi\\sqrt{\\dfrac{a^3}{GM}}',
    ];
    return tex.map((t, i) => ({ tex: t, caption: captions[i] ?? '' }));
  });

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('sims.orbit.title'),
      description: this.i18n.t('sims.orbit.lead'),
      route: '/orbit',
    });
    syncUrlParams({ alt: this.altitude, s: this.ratio });
    effect(() => {
      this.altitude();
      this.ratio();
      this.restart();
    });
    afterNextRender(() => {
      if (prefersReducedMotion()) this.playing.set(false);
    });
  }

  protected restart() {
    this.state = startOrbit(this.ratio());
    this.crashed.set(false);
    this.playing.set(!prefersReducedMotion());
    this.board()?.invalidate();
  }

  protected apply(values: Readonly<Record<string, number>>) {
    if (values['alt'] !== undefined) this.altitude.set(values['alt']);
    if (values['s'] !== undefined) this.ratio.set(values['s']);
  }

  // ----- Scene -----

  step(dt: number) {
    if (this.crashed()) return;
    this.state = advanceOrbit(this.state, dt * TIME_RATE);
    if (Math.hypot(this.state.x, this.state.y) <= this.earth()) {
      this.crashed.set(true);
      this.playing.set(false);
    }
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    const t = this.i18n;
    const shape = this.shape();
    const earth = this.earth();
    const bound = shape.eccentricity < 1 - 1e-9;

    // Fit the whole orbit (or a fixed window for orbits that leave).
    let xMin: number, xMax: number, yMin: number, yMax: number;
    if (bound) {
      const a = shape.semiMajor;
      const b = a * Math.sqrt(1 - shape.eccentricity ** 2);
      [xMin, xMax] = shape.startsAtPeriapsis ? [-shape.apoapsis, shape.periapsis] : [-shape.periapsis, shape.apoapsis];
      yMin = -Math.max(b, earth);
      yMax = Math.max(b, earth);
      xMin = Math.min(xMin, -earth);
      xMax = Math.max(xMax, earth);
    } else {
      [xMin, xMax, yMin, yMax] = [-3, 3, -3, 3];
    }
    const pad = 0.1;
    const spanX = (xMax - xMin) * (1 + pad * 2);
    const spanY = (yMax - yMin) * (1 + pad * 2);
    const scale = Math.min(w / spanX, h / spanY);
    const cx = w / 2 - ((xMin + xMax) / 2) * scale;
    const cy = h / 2 + ((yMin + yMax) / 2) * scale;
    const sx = (x: number) => cx + x * scale;
    const sy = (y: number) => cy - y * scale;

    // Earth.
    const er = earth * scale;
    g.disc(sx(0), sy(0), er, { color: CHALK.sky, alpha: 0.38, width: 2.2, seed: 1 });
    g.arc(sx(0), sy(0), er * 0.62, 0.3, 1.9, { color: CHALK.sky, width: 1.4, seed: 2, alpha: 0.6 });
    g.arc(sx(0), sy(0), er * 0.36, 3.4, 5.2, { color: CHALK.sky, width: 1.4, seed: 3, alpha: 0.6 });
    if (er > 26) g.text(t.t('sims.orbit.earth'), sx(0), sy(0) + 6, { size: Math.min(24, er * 0.34), color: CHALK.white, align: 'center' });

    // The predicted path, stopping where it meets the ground.
    g.polyline(this.orbitPath(shape, earth, sx, sy), { width: 1.8, dash: [3, 8], color: CHALK.dim, seed: 10 });

    // Satellite with its velocity and the pull of gravity.
    const s = this.state;
    const bx = sx(s.x);
    const by = sy(s.y);
    const r = Math.hypot(s.x, s.y);
    if (!this.crashed()) {
      g.line(sx(0), sy(0), bx, by, { width: 1.2, dash: [2, 7], color: CHALK.dim, seed: 11 });
      const speed = Math.hypot(s.vx, s.vy);
      const vlen = Math.min(60, 26 + speed * 20);
      g.arrow(bx, by, bx + (s.vx / speed) * vlen, by - (s.vy / speed) * vlen, { color: CHALK.rose, width: 2.4, seed: 12 });
      g.arrow(bx, by, bx - (s.x / r) * 30, by + (s.y / r) * 30, { color: CHALK.yellow, width: 2.4, seed: 13 });
    }
    g.disc(bx, by, 7, { color: CHALK.white, width: 2, seed: 14 });
    g.text('v', bx + 4, by - 12, { size: 20, color: CHALK.rose });

    if (this.crashed()) {
      g.text(t.t('sims.orbit.kinds.crash'), w / 2, h - 24, { size: 28, color: CHALK.rose, align: 'center' });
    }
  }

  private orbitPath(shape: OrbitShape, earth: number, sx: (x: number) => number, sy: (y: number) => number): Point[] {
    const phi0 = shape.startsAtPeriapsis ? 0 : Math.PI;
    const e = shape.eccentricity;
    const limit = e < 1 - 1e-9 ? Infinity : 3.4;
    const reach = e < 1 + 1e-9 ? Math.PI : Math.acos(-1 / e) * 0.985;
    const points: Point[] = [];
    const n = 220;
    for (let i = 0; i <= n; i++) {
      const phi = -reach + (2 * reach * i) / n;
      const rr = shape.p / (1 + e * Math.cos(phi));
      if (rr <= 0 || rr > limit) continue;
      const theta = phi0 + phi;
      const x = rr * Math.cos(theta);
      const y = rr * Math.sin(theta);
      if (rr <= earth) break;
      points.push([sx(x), sy(y)]);
    }
    return points;
  }
}
