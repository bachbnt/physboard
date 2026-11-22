import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Chalk, Point } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { niceStep } from '../../core/nice-step';
import { Seo } from '../../core/seo';
import { syncUrlParams, urlParam } from '../../core/url-params';
import { I18n } from '../../i18n/i18n';
import { idealFlight, launch, ProjectileParams, ProjectileState, stepProjectile } from '../../physics/projectile-motion';
import { Board } from '../../ui/board';
import { Challenge, ChallengePanel } from '../../ui/challenge-panel';
import { FormulaList } from '../../ui/formula-list';
import { ReadoutList } from '../../ui/readout-list';
import { BoardSize, Scene } from '../../ui/scene';
import { SimShell } from '../../ui/sim-shell';
import { TraySlider } from '../../ui/tray-slider';

const STEP = 1 / 240;
const rad = (deg: number) => (deg * Math.PI) / 180;

const PRESET = { v: 20, a: 30, h: 0, g: 9.8, c: 0 };
const flight = (p: { v: number; a: number; h: number; g: number }) =>
  idealFlight({ speed: p.v, angleDeg: p.a, height: p.h, gravity: p.g });

export const PROJECTILE_CHALLENGES: readonly Challenge[] = [
  { params: PRESET, answer: flight(PRESET).range, unit: 'm', tolerance: 0.02, digits: 1 },
  // The range v²·sin(2α)/g peaks where sin(2α) = 1.
  { params: PRESET, answer: 45, unit: '°', tolerance: 0.02, digits: 0 },
  { params: { v: 20, a: 45, h: 0, g: 1.62, c: 0 }, answer: flight({ v: 20, a: 45, h: 0, g: 1.62 }).range, unit: 'm', tolerance: 0.02, digits: 0 },
];

interface Plan {
  path: Point[];
  range: number;
  maxHeight: number;
  time: number;
  impactSpeed: number;
}

/** Flies the projectile to the ground in one go, to preview the path and measure it. */
function planFlight(p: ProjectileParams): Plan {
  let s = launch(p);
  const path: Point[] = [[s.x, s.y]];
  let maxHeight = s.y;
  for (let i = 0; i < 200_000 && !s.landed; i++) {
    s = stepProjectile(s, p, STEP);
    maxHeight = Math.max(maxHeight, s.y);
    if (i % 3 === 0 || s.landed) path.push([s.x, s.y]);
  }
  return { path, range: s.x, maxHeight, time: s.t, impactSpeed: Math.hypot(s.vx, s.vy) };
}

@Component({
  selector: 'app-projectile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimShell, Board, TraySlider, ReadoutList, FormulaList, ChallengePanel],
  templateUrl: './projectile-page.html',
})
export class ProjectilePage implements Scene {
  protected readonly i18n = inject(I18n);
  protected readonly challenges = PROJECTILE_CHALLENGES;

  protected readonly speed = urlParam('v', 20, 5, 50);
  protected readonly angle = urlParam('a', 40, 0, 90);
  protected readonly height = urlParam('h', 0, 0, 30);
  protected readonly gravity = urlParam('g', 9.81, 1.6, 24.8);
  protected readonly drag = urlParam('c', 0, 0, 0.05);

  protected readonly flying = signal(false);
  protected readonly paused = signal(false);
  protected readonly running = computed(() => this.flying() && !this.paused());
  protected readonly landedOnce = signal(false);

  protected readonly presets = [
    { key: 'moon', g: 1.62 },
    { key: 'mars', g: 3.71 },
    { key: 'earth', g: 9.81 },
    { key: 'jupiter', g: 24.79 },
  ] as const;

  private readonly board = viewChild(Board);

  private readonly params = computed<ProjectileParams>(() => ({
    speed: this.speed(),
    angleDeg: this.angle(),
    height: this.height(),
    gravity: this.gravity(),
    drag: this.drag(),
  }));
  private readonly plan = computed(() => planFlight(this.params()));
  private readonly ideal = computed(() => idealFlight(this.params()));

  private state: ProjectileState | null = null;
  private trail: Point[] = [];
  private accumulator = 0;
  private tick = 0;
  /** Long flights (low g) are played faster so none takes more than a few seconds. */
  private readonly timeScale = computed(() => Math.max(1, this.ideal().time / 6));

  protected readonly rows = computed(() => {
    const i = this.i18n;
    const useDrag = this.drag() > 0;
    const r = useDrag ? this.plan() : this.ideal();
    return [
      { label: i.t('sims.projectile.readouts.range'), value: i.fmt(r.range, 1, true), unit: 'm' },
      { label: i.t('sims.projectile.readouts.maxHeight'), value: i.fmt(r.maxHeight, 1, true), unit: 'm' },
      { label: i.t('sims.projectile.readouts.time'), value: i.fmt(r.time, 2, true), unit: 's' },
      { label: i.t('sims.projectile.readouts.impact'), value: i.fmt(r.impactSpeed, 1, true), unit: 'm/s' },
    ];
  });

  protected readonly formulas = computed(() => {
    this.i18n.lang();
    const captions = this.i18n.list('sims.projectile.formulas');
    const tex = [
      'x = v_0\\cos\\alpha\\cdot t',
      'y = h_0 + v_0\\sin\\alpha\\cdot t - \\tfrac12 g t^2',
      'L = \\dfrac{v_0^{\\,2}\\sin 2\\alpha}{g}',
      'H = h_0 + \\dfrac{v_0^{\\,2}\\sin^2\\alpha}{2g}',
    ];
    return tex.map((t, i) => ({ tex: t, caption: captions[i] ?? '' }));
  });

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('sims.projectile.title'),
      description: this.i18n.t('sims.projectile.lead'),
      route: '/projectile',
    });
    syncUrlParams({ v: this.speed, a: this.angle, h: this.height, g: this.gravity, c: this.drag });

    // Changing any setting cancels the flight in progress and updates the preview.
    effect(() => {
      this.params();
      this.cancel();
    });
    afterNextRender(() => this.board()?.invalidate());
  }

  protected launchNow() {
    this.cancel();
    this.state = launch(this.params());
    this.trail = [[this.state.x, this.state.y]];
    this.flying.set(true);
    this.paused.set(false);
    this.landedOnce.set(false);
  }

  private cancel() {
    this.state = null;
    this.trail = [];
    this.accumulator = 0;
    this.flying.set(false);
    this.landedOnce.set(false);
    this.board()?.invalidate();
  }

  protected apply(values: Readonly<Record<string, number>>) {
    if (values['v'] !== undefined) this.speed.set(values['v']);
    if (values['a'] !== undefined) this.angle.set(values['a']);
    if (values['h'] !== undefined) this.height.set(values['h']);
    if (values['g'] !== undefined) this.gravity.set(values['g']);
    if (values['c'] !== undefined) this.drag.set(values['c']);
  }

  // ----- Scene -----

  step(dt: number) {
    if (!this.state || this.state.landed) return;
    const p = this.params();
    this.accumulator += dt * this.timeScale();
    while (this.accumulator >= STEP && !this.state.landed) {
      this.state = stepProjectile(this.state, p, STEP);
      this.accumulator -= STEP;
      if (++this.tick % 2 === 0 || this.state.landed) this.trail.push([this.state.x, this.state.y]);
    }
    if (this.state.landed) {
      this.flying.set(false);
      this.landedOnce.set(true);
    }
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    const t = this.i18n;
    const plan = this.plan();
    const ideal = this.ideal();
    const p = this.params();

    const margin = { l: 54, r: 28, t: 30, b: 46 };
    const plotW = w - margin.l - margin.r;
    const plotH = h - margin.t - margin.b;
    const xMax = Math.max(10, Math.max(ideal.range, plan.range) * 1.08);
    const yMax = Math.max(4, Math.max(ideal.maxHeight, plan.maxHeight) * 1.18);
    const scale = Math.min(plotW / xMax, plotH / yMax);
    const sx = (x: number) => margin.l + x * scale;
    const sy = (y: number) => margin.t + plotH - y * scale;

    // Ground, with hatching below it.
    const groundEnd = sx(xMax);
    g.line(margin.l - 12, sy(0), groundEnd, sy(0), { width: 3, seed: 1 });
    for (let x = margin.l; x < groundEnd; x += 18) g.line(x, sy(0) + 1, x - 9, sy(0) + 11, { width: 1.2, alpha: 0.4, seed: 100 + x });

    // Ticks along the ground.
    const stepX = niceStep(xMax, Math.max(3, plotW / 110));
    for (let x = 0; x <= xMax; x += stepX) {
      g.line(sx(x), sy(0), sx(x), sy(0) + 7, { width: 1.5, seed: 200 + x });
      g.text(t.fmt(x, 0), sx(x), sy(0) + 28, { size: 16, color: CHALK.dim, align: 'center' });
    }
    g.text('m', groundEnd - 4, sy(0) + 28, { size: 16, color: CHALK.dim, align: 'right' });

    // Height scale on the left.
    const stepY = niceStep(yMax, 4);
    for (let y = stepY; y <= yMax; y += stepY) {
      g.line(sx(0) - 6, sy(y), sx(0), sy(y), { width: 1.4, color: CHALK.dim, seed: 300 + y });
      g.text(t.fmt(y, 0), sx(0) - 10, sy(y) + 5, { size: 16, color: CHALK.dim, align: 'right' });
    }

    // Launch platform.
    if (p.height > 0) {
      g.line(sx(0), sy(0), sx(0), sy(p.height), { width: 2.2, seed: 400 });
      g.line(sx(0) - 14, sy(p.height), sx(0), sy(p.height), { width: 2.2, seed: 401 });
    }

    // The ideal parabola, then (with drag) the predicted real path.
    const idealPath: Point[] = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const time = (ideal.time * i) / n;
      idealPath.push([sx(p.speed * Math.cos(rad(p.angleDeg)) * time), sy(p.height + p.speed * Math.sin(rad(p.angleDeg)) * time - 0.5 * p.gravity * time * time)]);
    }
    g.polyline(idealPath, { width: 1.8, dash: [3, 8], color: CHALK.dim, seed: 500 });
    if (p.drag > 0) {
      g.polyline(plan.path.map(([x, y]) => [sx(x), sy(y)] as const), { width: 2, color: CHALK.sky, alpha: 0.4, seed: 501 });
    }

    // Landing and apex marks.
    const rangeShown = p.drag > 0 ? plan.range : ideal.range;
    g.line(sx(rangeShown), sy(0) - 6, sx(rangeShown), sy(0) + 6, { width: 2.2, color: CHALK.sky, seed: 600 });
    g.text(`L = ${t.fmt(rangeShown, 1)} m`, sx(rangeShown), sy(0) - 14, { size: 19, color: CHALK.sky, align: rangeShown > xMax * 0.8 ? 'right' : 'center' });

    // The launcher: velocity arrow with its angle.
    const a = rad(p.angleDeg);
    const arrow = Math.min(70, 28 + p.speed * 1.1);
    const x0 = sx(0);
    const y0 = sy(p.height);
    if (!this.state) {
      g.arrow(x0, y0, x0 + Math.cos(a) * arrow, y0 - Math.sin(a) * arrow, { color: CHALK.rose, width: 2.6, seed: 700 });
      if (p.angleDeg > 3) g.arc(x0, y0, arrow * 0.42, -a, 0, { color: CHALK.yellow, width: 1.8, seed: 701 });
      g.text('α', x0 + arrow * 0.5, y0 - Math.sin(a / 2) * arrow * 0.18 + 4, { size: 21, color: CHALK.yellow });
      g.text('v₀', x0 + Math.cos(a) * arrow + 6, y0 - Math.sin(a) * arrow - 6, { size: 21, color: CHALK.rose });
      g.disc(x0, y0, 7, { seed: 702 });
    }

    // The flight itself.
    const s = this.state;
    if (s) {
      if (this.trail.length > 1) g.polyline(this.trail.map(([x, y]) => [sx(x), sy(y)] as const), { width: 2.6, seed: 800 });
      const bx = sx(s.x);
      const by = sy(s.y);
      if (!s.landed) {
        const k = 2.2; // px per m/s
        g.arrow(bx, by, bx + s.vx * k, by - s.vy * k, { color: CHALK.rose, width: 2.2, seed: 810 });
        g.line(bx, by, bx + s.vx * k, by, { color: CHALK.rose, width: 1.3, dash: [2, 6], seed: 811, alpha: 0.7 });
        g.line(bx + s.vx * k, by, bx + s.vx * k, by - s.vy * k, { color: CHALK.rose, width: 1.3, dash: [2, 6], seed: 812, alpha: 0.7 });
        g.arrow(bx, by, bx, by + 30, { color: CHALK.yellow, width: 2.2, seed: 813 });
        g.text('g', bx + 8, by + 30, { size: 19, color: CHALK.yellow });
      }
      g.disc(bx, by, 8, { seed: 820 });
      g.text(`t = ${t.fmt(s.t, 2, true)} s`, margin.l + 10, margin.t + 6, { size: 22, color: CHALK.white });
    }
  }
}
