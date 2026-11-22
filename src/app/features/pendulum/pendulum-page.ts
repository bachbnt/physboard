import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild, afterNextRender } from '@angular/core';
import { Chalk } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { prefersReducedMotion } from '../../core/motion';
import { Seo } from '../../core/seo';
import { syncUrlParams, urlParam } from '../../core/url-params';
import { I18n } from '../../i18n/i18n';
import {
  energy,
  exactPeriod,
  PendulumParams,
  PendulumState,
  PeriodMeter,
  restAt,
  smallAnglePeriod,
  stepPendulum,
} from '../../physics/pendulum-motion';
import { Board } from '../../ui/board';
import { Challenge, ChallengePanel } from '../../ui/challenge-panel';
import { FormulaList } from '../../ui/formula-list';
import { ReadoutList } from '../../ui/readout-list';
import { BoardPointer, BoardSize, Scene } from '../../ui/scene';
import { SimShell } from '../../ui/sim-shell';
import { TraySlider } from '../../ui/tray-slider';

const STEP = 1 / 240;
const SAMPLE = 1 / 90;
const WINDOW = 8;
const rad = (deg: number) => (deg * Math.PI) / 180;

const PRESET = { l: 1, th: 5, g: 9.81, b: 0 };
export const PENDULUM_CHALLENGES: readonly Challenge[] = [
  { params: PRESET, answer: smallAnglePeriod(1, 9.81), unit: 's', tolerance: 0.02, digits: 2 },
  { params: { ...PRESET, l: 0.25 }, answer: smallAnglePeriod(0.25, 9.81), unit: 's', tolerance: 0.02, digits: 2 },
  { params: { ...PRESET, th: 120 }, answer: exactPeriod(1, 9.81, rad(120)), unit: 's', tolerance: 0.02, digits: 2 },
];

@Component({
  selector: 'app-pendulum-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimShell, Board, TraySlider, ReadoutList, FormulaList, ChallengePanel],
  templateUrl: './pendulum-page.html',
})
export class PendulumPage implements Scene {
  protected readonly i18n = inject(I18n);
  protected readonly challenges = PENDULUM_CHALLENGES;

  protected readonly length = urlParam('l', 1, 0.2, 3);
  protected readonly angle = urlParam('th', 30, 5, 170);
  protected readonly gravity = urlParam('g', 9.81, 1.6, 24.8);
  protected readonly damping = urlParam('b', 0, 0, 1);
  protected readonly playing = signal(true);

  private readonly board = viewChild(Board);
  private state: PendulumState = restAt(rad(30));
  private readonly meter = new PeriodMeter();
  private accumulator = 0;
  private sampleClock = 0;
  private readoutClock = 0;
  private held = false;
  private startEnergy = 1;
  private samples: { t: number; theta: number }[] = [];
  private pivot = { x: 0, y: 0, rope: 0 };

  private readonly snapshot = signal<{ measured: number | null; drift: number | null }>({ measured: null, drift: null });

  private readonly params = computed<PendulumParams>(() => ({
    length: this.length(),
    gravity: this.gravity(),
    damping: this.damping(),
  }));

  protected readonly rows = computed(() => {
    const i = this.i18n;
    const p = this.params();
    const snap = this.snapshot();
    const amplitude = rad(this.angle());
    return [
      {
        label: i.t('sims.pendulum.readouts.measured'),
        value: snap.measured === null ? i.t('sims.pendulum.readouts.waiting') : i.fmt(snap.measured, 2, true),
        unit: snap.measured === null ? '' : 's',
      },
      { label: i.t('sims.pendulum.readouts.small'), value: i.fmt(smallAnglePeriod(p.length, p.gravity), 2, true), unit: 's' },
      { label: i.t('sims.pendulum.readouts.exact'), value: i.fmt(exactPeriod(p.length, p.gravity, amplitude), 2, true), unit: 's' },
      {
        label: i.t('sims.pendulum.readouts.drift'),
        value: snap.drift === null ? '—' : i.fmt(snap.drift, 5),
        unit: snap.drift === null ? '' : '%',
      },
    ];
  });

  protected readonly formulas = computed(() => {
    this.i18n.lang();
    const captions = this.i18n.list('sims.pendulum.formulas');
    const tex = [
      'T_0 = 2\\pi\\sqrt{\\dfrac{l}{g}}',
      'W = \\tfrac12 m\\,l^2\\dot\\theta^{\\,2} + m g l\\,(1-\\cos\\theta)',
      'W_t = m g l\\,(1-\\cos\\theta)',
    ];
    return tex.map((t, i) => ({ tex: t, caption: captions[i] ?? '' }));
  });

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('sims.pendulum.title'),
      description: this.i18n.t('sims.pendulum.lead'),
      route: '/pendulum',
    });
    syncUrlParams({ l: this.length, th: this.angle, g: this.gravity, b: this.damping });

    // Any change to the setup lets the pendulum go again from the chosen angle.
    effect(() => {
      this.params();
      this.angle();
      this.restart();
    });
    afterNextRender(() => {
      if (prefersReducedMotion()) this.playing.set(false);
    });
  }

  protected restart() {
    this.state = restAt(rad(this.angle()));
    this.meter.reset();
    this.accumulator = 0;
    this.samples = [];
    this.sampleClock = 0;
    this.startEnergy = energy(this.state, this.params()).total;
    this.snapshot.set({ measured: null, drift: null });
    this.board()?.invalidate();
  }

  protected apply(values: Readonly<Record<string, number>>) {
    if (values['l'] !== undefined) this.length.set(values['l']);
    if (values['th'] !== undefined) this.angle.set(values['th']);
    if (values['g'] !== undefined) this.gravity.set(values['g']);
    if (values['b'] !== undefined) this.damping.set(values['b']);
  }

  // ----- Scene -----

  step(dt: number) {
    if (this.held) return;
    const p = this.params();
    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      const next = stepPendulum(this.state, p, STEP);
      this.meter.push(this.state, next);
      this.state = next;
      this.accumulator -= STEP;
      this.sampleClock += STEP;
      if (this.sampleClock >= SAMPLE) {
        this.sampleClock -= SAMPLE;
        this.samples.push({ t: this.state.t, theta: this.state.theta });
      }
    }
    const horizon = this.state.t - WINDOW;
    while (this.samples.length && this.samples[0].t < horizon) this.samples.shift();

    this.readoutClock += dt;
    if (this.readoutClock > 0.12) {
      this.readoutClock = 0;
      const drift = p.damping === 0 ? (Math.abs(energy(this.state, p).total - this.startEnergy) / this.startEnergy) * 100 : null;
      this.snapshot.set({ measured: this.meter.period, drift });
    }
  }

  pointer(e: BoardPointer) {
    const { x, y } = this.pivot;
    if (e.type === 'down') {
      const bob = this.bobAt();
      if (Math.hypot(e.x - bob.x, e.y - bob.y) < 44) this.held = true;
    }
    if (this.held && (e.type === 'down' || e.type === 'move')) {
      const theta = Math.atan2(e.x - x, e.y - y);
      const degrees = Math.max(5, Math.min(170, Math.round(Math.abs(theta) * (180 / Math.PI))));
      this.angle.set(degrees);
      this.state = restAt(Math.sign(theta || 1) * rad(degrees));
    }
    if (e.type === 'up' && this.held) {
      this.held = false;
      this.state = { ...this.state, omega: 0 };
      this.meter.reset();
      this.startEnergy = energy(this.state, this.params()).total;
      this.playing.set(true);
    }
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    const wide = w >= 640;
    const stage = wide ? { x: 0, y: 0, w: w * 0.5, h } : { x: 0, y: 0, w, h: h * 0.56 };
    const panel = wide ? { x: w * 0.52, y: h * 0.08, w: w * 0.45, h: h * 0.84 } : { x: w * 0.06, y: h * 0.58, w: w * 0.88, h: h * 0.4 };

    this.drawPendulum(g, stage);
    this.drawGraphs(g, panel);
  }

  private bobRadius() {
    return 15;
  }

  private ropePx(stageH: number) {
    const l = this.length();
    return stageH * 0.5 + ((l - 0.2) / 2.8) * stageH * 0.34;
  }

  private bobAt() {
    const { x, y, rope } = this.pivot;
    return { x: x + rope * Math.sin(this.state.theta), y: y + rope * Math.cos(this.state.theta) };
  }

  private drawPendulum(g: Chalk, stage: { x: number; y: number; w: number; h: number }) {
    const px = stage.x + stage.w / 2;
    const py = stage.y + stage.h * 0.1;
    const rope = this.ropePx(stage.h);
    this.pivot = { x: px, y: py, rope };
    const bob = this.bobAt();
    const r = this.bobRadius();

    g.line(px - stage.w * 0.2, py, px + stage.w * 0.2, py, { width: 3, seed: 1 });
    for (let i = -3; i <= 3; i++) g.line(px + i * stage.w * 0.05, py, px + i * stage.w * 0.05 - 9, py - 11, { width: 1.4, seed: 30 + i, alpha: 0.55 });
    g.line(px, py, px, py + rope + r * 2, { width: 1.3, dash: [2, 7], color: CHALK.dim, seed: 2 });

    // The turning points set by the chosen amplitude.
    const amp = rad(this.angle());
    for (const side of [-1, 1]) {
      g.line(px, py, px + rope * Math.sin(side * amp), py + rope * Math.cos(side * amp), { width: 1.2, dash: [1, 8], color: CHALK.dim, seed: 3 + side });
    }
    const angleDeg = this.state.theta;
    if (Math.abs(angleDeg) > 0.1) {
      const arcR = rope * 0.32;
      const a = Math.PI / 2;
      const b = Math.PI / 2 - angleDeg;
      g.arc(px, py, arcR, Math.min(a, b), Math.max(a, b), { width: 1.8, color: CHALK.yellow, seed: 7 });
      g.text('θ', px + Math.sin(angleDeg / 2) * arcR * 1.4 + 4, py + Math.cos(angleDeg / 2) * arcR * 1.4 + 6, { size: 22, color: CHALK.yellow, align: 'center' });
    }

    g.line(px, py, bob.x, bob.y, { width: 2.4, color: CHALK.yellow, seed: 9 });
    g.disc(px, py, 4, { seed: 10 });
    g.disc(bob.x, bob.y, r, { color: this.held ? CHALK.yellow : CHALK.white, width: 2, seed: 11 });
  }

  private drawGraphs(g: Chalk, a: { x: number; y: number; w: number; h: number }) {
    const t = this.i18n;
    const p = this.params();
    const graphH = a.h * 0.58;

    // ---- θ(t) ----
    g.text(t.t('sims.pendulum.graphs.angle'), a.x, a.y + 14, { size: 17, color: CHALK.dim });
    const gy = a.y + 28;
    const gh = graphH - 34;
    const mid = gy + gh / 2;
    g.line(a.x, mid, a.x + a.w, mid, { width: 1.3, color: CHALK.dim, seed: 40 });
    g.line(a.x, gy, a.x, gy + gh, { width: 1.3, color: CHALK.dim, seed: 41 });
    const amp = Math.max(rad(this.angle()), 0.2);
    const now = this.state.t;
    const pts = this.samples.map((s) => [a.x + ((s.t - (now - WINDOW)) / WINDOW) * a.w, mid - (s.theta / amp) * (gh / 2) * 0.92] as const);
    if (pts.length > 1) g.polyline(pts, { color: CHALK.sky, width: 2.2, seed: 42 });

    // ---- energy ----
    const e = energy(this.state, p);
    const e0 = Math.max(this.startEnergy, 1e-9);
    const by = a.y + graphH + 14;
    g.text(t.t('sims.pendulum.graphs.energy'), a.x, by + 8, { size: 17, color: CHALK.dim });
    const bars: [string, number, string][] = [
      [t.t('sims.pendulum.graphs.kinetic'), e.kinetic / e0, CHALK.rose],
      [t.t('sims.pendulum.graphs.potential'), e.potential / e0, CHALK.sky],
    ];
    const barH = Math.min(24, (a.h - graphH - 40) / 2.4);
    bars.forEach(([name, share, color], i) => {
      const y = by + 22 + i * (barH + 12);
      const full = a.w * 0.62;
      g.line(a.x, y + barH + 2, a.x + full, y + barH + 2, { width: 1.1, color: CHALK.dim, seed: 50 + i });
      const width = Math.max(0, Math.min(1, share)) * full;
      if (width > 1) g.line(a.x, y + barH / 2, a.x + width, y + barH / 2, { width: barH, color, seed: 52 + i, alpha: 0.85 });
      g.text(name, a.x + full + 10, y + barH * 0.9, { size: 17, color });
    });
  }
}
