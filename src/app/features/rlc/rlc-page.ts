import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Chalk, Point } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { prefersReducedMotion } from '../../core/motion';
import { Seo } from '../../core/seo';
import { syncUrlParams, urlParam } from '../../core/url-params';
import { I18n } from '../../i18n/i18n';
import { analyzeRlc, resonantFrequency, RlcParams } from '../../physics/rlc-circuit';
import { Board } from '../../ui/board';
import { Challenge, ChallengePanel } from '../../ui/challenge-panel';
import { FormulaList } from '../../ui/formula-list';
import { ReadoutList } from '../../ui/readout-list';
import { BoardSize, Scene } from '../../ui/scene';
import { SimShell } from '../../ui/sim-shell';
import { TraySlider } from '../../ui/tray-slider';

const SOURCE_VOLTS = 12;
const F_MIN = 20;
const F_MAX = 600;

const circuit = (R: number, L: number, C: number, f: number): RlcParams => ({
  resistance: R,
  inductance: L / 1000,
  capacitance: C * 1e-6,
  frequency: f,
  voltage: SOURCE_VOLTS,
});
const BASE = { R: 50, L: 100, C: 20, f: 50 };
const f0 = resonantFrequency(0.1, 20e-6);

export const RLC_CHALLENGES: readonly Challenge[] = [
  { params: BASE, answer: f0, unit: 'Hz', tolerance: 0.02, digits: 1 },
  { params: { ...BASE, f: 112.5 }, answer: analyzeRlc(circuit(50, 100, 20, f0)).current, unit: 'A', tolerance: 0.03, digits: 2 },
  { params: BASE, answer: analyzeRlc(circuit(50, 100, 20, 50)).z, unit: 'Ω', tolerance: 0.02, digits: 1 },
];

@Component({
  selector: 'app-rlc-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimShell, Board, TraySlider, ReadoutList, FormulaList, ChallengePanel],
  templateUrl: './rlc-page.html',
})
export class RlcPage implements Scene {
  protected readonly i18n = inject(I18n);
  protected readonly challenges = RLC_CHALLENGES;

  protected readonly resistance = urlParam('R', 50, 5, 200);
  protected readonly inductance = urlParam('L', 100, 10, 500);
  protected readonly capacitance = urlParam('C', 20, 1, 100);
  protected readonly frequency = urlParam('f', 80, F_MIN, F_MAX);
  protected readonly playing = signal(true);

  private readonly board = viewChild(Board);
  private phase = 0;

  private readonly params = computed(() => circuit(this.resistance(), this.inductance(), this.capacitance(), this.frequency()));
  private readonly result = computed(() => analyzeRlc(this.params()));
  private readonly resonance = computed(() => resonantFrequency(this.params().inductance, this.params().capacitance));

  protected readonly rows = computed(() => {
    const i = this.i18n;
    const r = this.result();
    const deg = (r.phase * 180) / Math.PI;
    return [
      { label: i.t('sims.rlc.readouts.xl'), value: i.fmt(r.xl, 1, true), unit: 'Ω' },
      { label: i.t('sims.rlc.readouts.xc'), value: i.fmt(r.xc, 1, true), unit: 'Ω' },
      { label: i.t('sims.rlc.readouts.z'), value: i.fmt(r.z, 1, true), unit: 'Ω' },
      { label: i.t('sims.rlc.readouts.current'), value: i.fmt(r.current, 3, true), unit: 'A' },
      { label: i.t('sims.rlc.readouts.phase'), value: i.fmt(deg, 1, true), unit: '°' },
      { label: i.t('sims.rlc.readouts.powerFactor'), value: i.fmt(r.powerFactor, 3, true) },
      { label: i.t('sims.rlc.readouts.power'), value: i.fmt(r.power, 2, true), unit: 'W' },
      { label: i.t('sims.rlc.readouts.f0'), value: i.fmt(this.resonance(), 1, true), unit: 'Hz' },
    ];
  });

  protected readonly phaseText = computed(() => {
    const phi = this.result().phase;
    const key = Math.abs(phi) < 0.02 ? 'resonance' : phi > 0 ? 'inductive' : 'capacitive';
    return this.i18n.t(`sims.rlc.phaseText.${key}`);
  });

  protected readonly formulas = computed(() => {
    this.i18n.lang();
    const captions = this.i18n.list('sims.rlc.formulas');
    const tex = [
      'Z = \\sqrt{R^2 + (Z_L - Z_C)^2},\\ \\ Z_L = \\omega L,\\ \\ Z_C = \\dfrac{1}{\\omega C}',
      '\\tan\\varphi = \\dfrac{Z_L - Z_C}{R}',
      'I = \\dfrac{U}{Z}',
      'f_0 = \\dfrac{1}{2\\pi\\sqrt{LC}}',
      'P = UI\\cos\\varphi = I^2 R',
    ];
    return tex.map((t, i) => ({ tex: t, caption: captions[i] ?? '' }));
  });

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('sims.rlc.title'),
      description: this.i18n.t('sims.rlc.lead'),
      route: '/rlc',
    });
    syncUrlParams({ R: this.resistance, L: this.inductance, C: this.capacitance, f: this.frequency });
    effect(() => {
      this.params();
      this.board()?.invalidate();
    });
    afterNextRender(() => {
      if (prefersReducedMotion()) this.playing.set(false);
    });
  }

  protected apply(values: Readonly<Record<string, number>>) {
    if (values['R'] !== undefined) this.resistance.set(values['R']);
    if (values['L'] !== undefined) this.inductance.set(values['L']);
    if (values['C'] !== undefined) this.capacitance.set(values['C']);
    if (values['f'] !== undefined) this.frequency.set(values['f']);
  }

  // ----- Scene -----

  step(dt: number) {
    this.phase += dt * 2 * Math.PI * 0.35;
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    const wide = w >= 720;
    const pad = 14;
    const phasor = wide ? { x: pad, y: pad, w: w * 0.36 - pad, h: h - pad * 2 } : { x: pad, y: pad, w: w - pad * 2, h: h * 0.36 };
    const waves = wide
      ? { x: w * 0.38, y: pad, w: w * 0.6 - pad, h: h * 0.46 - pad }
      : { x: pad, y: h * 0.38, w: w - pad * 2, h: h * 0.28 };
    const curve = wide
      ? { x: w * 0.38, y: h * 0.52, w: w * 0.6 - pad, h: h * 0.44 }
      : { x: pad, y: h * 0.68, w: w - pad * 2, h: h * 0.3 };

    this.drawPhasors(g, phasor);
    this.drawWaves(g, waves);
    this.drawCurve(g, curve);
  }

  private drawPhasors(g: Chalk, a: { x: number; y: number; w: number; h: number }) {
    const t = this.i18n;
    const r = this.result();
    g.text(t.t('sims.rlc.graphs.phasor'), a.x, a.y + 14, { size: 17, color: CHALK.dim });

    const biggest = Math.max(r.ur, r.ul, r.uc, SOURCE_VOLTS, Math.abs(r.ul - r.uc));
    const scale = Math.min((a.w * 0.62) / Math.max(r.ur, SOURCE_VOLTS), (a.h * 0.4) / biggest);
    const ox = a.x + a.w * 0.12;
    const oy = a.y + a.h * 0.52;

    g.line(ox - 8, oy, ox + a.w * 0.82, oy, { width: 1.1, color: CHALK.dim, seed: 1 });
    const ur = r.ur * scale;
    const ul = r.ul * scale;
    const uc = r.uc * scale;
    const net = (r.ul - r.uc) * scale;

    g.arrow(ox, oy, ox + ur, oy, { color: CHALK.white, width: 2.6, seed: 2 });
    g.arrow(ox, oy, ox, oy - ul, { color: CHALK.sky, width: 2.6, seed: 3 });
    g.arrow(ox, oy, ox, oy + uc, { color: CHALK.mint, width: 2.6, seed: 4 });
    // The sum: U_R plus the difference of U_L and U_C.
    g.line(ox + ur, oy, ox + ur, oy - net, { color: CHALK.dim, width: 1.4, dash: [3, 6], seed: 5 });
    g.line(ox, oy - net, ox + ur, oy - net, { color: CHALK.dim, width: 1.4, dash: [3, 6], seed: 6 });
    g.arrow(ox, oy, ox + ur, oy - net, { color: CHALK.yellow, width: 3, seed: 7 });
    if (Math.abs(r.phase) > 0.03) {
      g.arc(ox, oy, Math.min(34, ur * 0.5 + 8), Math.min(0, -r.phase), Math.max(0, -r.phase), { color: CHALK.yellow, width: 1.6, seed: 8 });
    }
    g.text('I', ox + a.w * 0.8, oy - 8, { size: 20, color: CHALK.rose });
    g.arrow(ox - 4, oy + 22, ox + 40, oy + 22, { color: CHALK.rose, width: 2, seed: 9 });
    g.label('U', 'R', ox + ur + 8, oy + 20, { size: 21, color: CHALK.white });
    g.label('U', 'L', ox + 8, oy - ul + 6, { size: 21, color: CHALK.sky });
    g.label('U', 'C', ox + 8, oy + uc + 6, { size: 21, color: CHALK.mint });
    g.text('U', ox + ur + 8, oy - net - 6, { size: 21, color: CHALK.yellow });
    g.text('φ', ox + Math.min(46, ur * 0.5 + 20), oy - (r.phase > 0 ? 8 : -22), { size: 20, color: CHALK.yellow });
  }

  private drawWaves(g: Chalk, a: { x: number; y: number; w: number; h: number }) {
    const t = this.i18n;
    const r = this.result();
    g.text(t.t('sims.rlc.graphs.waves'), a.x, a.y + 14, { size: 17, color: CHALK.dim });
    const top = a.y + 26;
    const height = a.h - 30;
    const mid = top + height / 2;
    g.line(a.x, mid, a.x + a.w, mid, { width: 1.1, color: CHALK.dim, seed: 20 });

    const cycles = 3;
    const amp = height / 2 - 4;
    const uPts: Point[] = [];
    const iPts: Point[] = [];
    const n = 140;
    for (let k = 0; k <= n; k++) {
      const x = a.x + (k / n) * a.w;
      const angle = (k / n) * cycles * 2 * Math.PI - this.phase;
      uPts.push([x, mid - Math.sin(angle + r.phase) * amp]);
      iPts.push([x, mid - Math.sin(angle) * amp * 0.78]);
    }
    g.polyline(uPts, { color: CHALK.yellow, width: 2.4, seed: 21 });
    g.polyline(iPts, { color: CHALK.rose, width: 2.4, seed: 22 });
    g.text(t.t('sims.rlc.graphs.voltage'), a.x + a.w - 48, top + 14, { size: 20, color: CHALK.yellow, align: 'right' });
    g.text(t.t('sims.rlc.graphs.current'), a.x + a.w - 48, top + 36, { size: 20, color: CHALK.rose, align: 'right' });
  }

  private drawCurve(g: Chalk, a: { x: number; y: number; w: number; h: number }) {
    const t = this.i18n;
    const p = this.params();
    g.text(t.t('sims.rlc.graphs.curve'), a.x, a.y + 14, { size: 17, color: CHALK.dim });
    const left = a.x + 34;
    const right = a.x + a.w;
    const top = a.y + 28;
    const bottom = a.y + a.h - 24;
    const iMax = SOURCE_VOLTS / p.resistance;
    const sx = (f: number) => left + ((f - F_MIN) / (F_MAX - F_MIN)) * (right - left);
    const sy = (i: number) => bottom - (i / iMax) * (bottom - top);

    g.line(left, bottom, right, bottom, { width: 1.3, color: CHALK.dim, seed: 30 });
    g.line(left, top, left, bottom, { width: 1.3, color: CHALK.dim, seed: 31 });
    for (const f of [100, 200, 300, 400, 500, 600]) {
      g.line(sx(f), bottom, sx(f), bottom + 5, { width: 1.3, color: CHALK.dim, seed: 32 + f });
      g.text(`${f}`, sx(f), bottom + 20, { size: 15, color: CHALK.dim, align: 'center' });
    }
    g.text('Hz', right, bottom - 8, { size: 15, color: CHALK.dim, align: 'right' });

    const pts: Point[] = [];
    for (let k = 0; k <= 160; k++) {
      const f = F_MIN + ((F_MAX - F_MIN) * k) / 160;
      pts.push([sx(f), sy(analyzeRlc({ ...p, frequency: f }).current)]);
    }
    g.polyline(pts, { color: CHALK.sky, width: 2.4, seed: 40 });

    const f0 = this.resonance();
    if (f0 >= F_MIN && f0 <= F_MAX) {
      g.line(sx(f0), bottom, sx(f0), top, { color: CHALK.mint, width: 1.4, dash: [3, 6], seed: 41 });
      g.text('f₀', sx(f0), top - 4, { size: 19, color: CHALK.mint, align: 'center' });
    }
    g.disc(sx(p.frequency), sy(this.result().current), 6, { color: CHALK.yellow, seed: 42 });
  }
}
