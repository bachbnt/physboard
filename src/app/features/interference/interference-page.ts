import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Chalk, Point } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { prefersReducedMotion } from '../../core/motion';
import { Seo } from '../../core/seo';
import { syncUrlParams, urlParam } from '../../core/url-params';
import { I18n } from '../../i18n/i18n';
import { distances, instantField, maximaOnSegment, meanIntensity, minimaOnSegment, WaveParams } from '../../physics/wave-field';
import { Board } from '../../ui/board';
import { Challenge, ChallengePanel } from '../../ui/challenge-panel';
import { FormulaList } from '../../ui/formula-list';
import { ReadoutList } from '../../ui/readout-list';
import { BoardSize, Scene } from '../../ui/scene';
import { SimShell } from '../../ui/sim-shell';
import { TraySlider } from '../../ui/tray-slider';

/** Width of the region shown, in cm. */
const VIEW = 40;
const OMEGA = 2 * Math.PI;

const BOARD_RGB = [31, 56, 50];
const SKY_RGB = [143, 199, 234];

const wave = (lam: number, d: number, ph: number): WaveParams => ({ wavelength: lam, separation: d, phaseDeg: ph });
export const INTERFERENCE_CHALLENGES: readonly Challenge[] = [
  { params: { lam: 2, d: 8, ph: 0 }, answer: maximaOnSegment(wave(2, 8, 0)), unit: '', tolerance: 0, digits: 0 },
  { params: { lam: 4, d: 8, ph: 0 }, answer: maximaOnSegment(wave(4, 8, 0)), unit: '', tolerance: 0, digits: 0 },
  { params: { lam: 2, d: 8, ph: 180 }, answer: maximaOnSegment(wave(2, 8, 180)), unit: '', tolerance: 0, digits: 0 },
];

@Component({
  selector: 'app-interference-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimShell, Board, TraySlider, ReadoutList, FormulaList, ChallengePanel],
  templateUrl: './interference-page.html',
})
export class InterferencePage implements Scene {
  protected readonly i18n = inject(I18n);
  protected readonly challenges = INTERFERENCE_CHALLENGES;

  protected readonly wavelength = urlParam('lam', 3, 1, 6);
  protected readonly separation = urlParam('d', 8, 2, 16);
  protected readonly phase = urlParam('ph', 0, 0, 360);
  protected readonly view = signal<'wave' | 'intensity'>('wave');
  protected readonly lines = signal(true);
  protected readonly playing = signal(true);
  protected readonly running = computed(() => this.playing() && this.view() === 'wave');

  private readonly board = viewChild(Board);
  private time = 0;
  private field: HTMLCanvasElement | null = null;
  private image: ImageData | null = null;

  private readonly params = computed<WaveParams>(() => wave(this.wavelength(), this.separation(), this.phase()));

  protected readonly rows = computed(() => {
    const p = this.params();
    return [
      { label: this.i18n.t('sims.interference.readouts.maxima'), value: String(maximaOnSegment(p)) },
      { label: this.i18n.t('sims.interference.readouts.minima'), value: String(minimaOnSegment(p)) },
    ];
  });

  protected readonly formulas = computed(() => {
    this.i18n.lang();
    const captions = this.i18n.list('sims.interference.formulas');
    const tex = [
      'd_2 - d_1 = k\\lambda,\\quad k \\in \\mathbb{Z}',
      '-\\dfrac{d}{\\lambda} < k < \\dfrac{d}{\\lambda}',
      '\\Delta d = |d_2 - d_1| = \\dfrac{\\Delta\\varphi}{2\\pi}\\,\\lambda + k\\lambda',
    ];
    return tex.map((t, i) => ({ tex: t, caption: captions[i] ?? '' }));
  });

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('sims.interference.title'),
      description: this.i18n.t('sims.interference.lead'),
      route: '/interference',
    });
    syncUrlParams({ lam: this.wavelength, d: this.separation, ph: this.phase });
    effect(() => {
      this.params();
      this.view();
      this.lines();
      this.board()?.invalidate();
    });
    afterNextRender(() => {
      if (prefersReducedMotion()) this.playing.set(false);
    });
  }

  protected apply(values: Readonly<Record<string, number>>) {
    if (values['lam'] !== undefined) this.wavelength.set(values['lam']);
    if (values['d'] !== undefined) this.separation.set(values['d']);
    if (values['ph'] !== undefined) this.phase.set(values['ph']);
  }

  // ----- Scene -----

  step(dt: number) {
    this.time += dt;
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    const p = this.params();
    const margin = 10;
    const plot = { x: margin, y: margin, w: w - margin * 2, h: h - margin * 2 };
    const pxPerCm = plot.w / VIEW;
    const halfH = plot.h / pxPerCm / 2;
    const toX = (cm: number) => plot.x + plot.w / 2 + cm * pxPerCm;
    const toY = (cm: number) => plot.y + plot.h / 2 - cm * pxPerCm;

    this.paintField(g.ctx, plot, p, halfH);

    if (this.lines()) this.drawMaxima(g, p, toX, toY, halfH);

    // Sources and the distance between them.
    const s1 = toX(-p.separation / 2);
    const s2 = toX(p.separation / 2);
    const cy = toY(0);
    for (const [x, label] of [[s1, 'S₁'], [s2, 'S₂']] as const) {
      g.disc(x, cy, 6, { color: CHALK.yellow, seed: Math.round(x) });
      g.text(label, x, cy - 14, { size: 22, color: CHALK.yellow, align: 'center' });
    }
    const dimY = cy + Math.min(46, plot.h * 0.1);
    g.line(s1, dimY, s2, dimY, { color: CHALK.yellow, width: 1.6, seed: 900 });
    g.line(s1, dimY - 5, s1, dimY + 5, { color: CHALK.yellow, width: 1.6, seed: 901 });
    g.line(s2, dimY - 5, s2, dimY + 5, { color: CHALK.yellow, width: 1.6, seed: 902 });
    g.text('d', (s1 + s2) / 2, dimY + 22, { size: 22, color: CHALK.yellow, align: 'center' });

    // Wavelength ruler in the corner.
    const rx = plot.x + 16;
    const ry = plot.y + plot.h - 26;
    g.line(rx, ry, rx + p.wavelength * pxPerCm, ry, { color: CHALK.white, width: 2, seed: 910 });
    g.line(rx, ry - 6, rx, ry + 6, { color: CHALK.white, width: 2, seed: 911 });
    g.line(rx + p.wavelength * pxPerCm, ry - 6, rx + p.wavelength * pxPerCm, ry + 6, { color: CHALK.white, width: 2, seed: 912 });
    g.text('λ', rx + (p.wavelength * pxPerCm) / 2, ry - 10, { size: 22, color: CHALK.white, align: 'center' });
  }

  /** Renders the field into a small canvas, then scales it up so the pattern is smooth. */
  private paintField(ctx: CanvasRenderingContext2D, plot: { x: number; y: number; w: number; h: number }, p: WaveParams, halfH: number) {
    const cell = Math.max(3, Math.round(plot.w / 260));
    const gw = Math.max(8, Math.floor(plot.w / cell));
    const gh = Math.max(8, Math.floor(plot.h / cell));
    if (!this.field || this.field.width !== gw || this.field.height !== gh) {
      this.field = document.createElement('canvas');
      this.field.width = gw;
      this.field.height = gh;
      this.image = null;
    }
    const fctx = this.field.getContext('2d');
    if (!fctx) return;
    const image = (this.image ??= fctx.createImageData(gw, gh));
    const data = image.data;
    const intensityMode = this.view() === 'intensity';

    for (let iy = 0; iy < gh; iy++) {
      const y = halfH - ((iy + 0.5) / gh) * halfH * 2;
      for (let ix = 0; ix < gw; ix++) {
        const x = -VIEW / 2 + ((ix + 0.5) / gw) * VIEW;
        let level: number;
        if (intensityMode) {
          const [r1, r2] = distances(x, y, p);
          const a1 = 1 / Math.sqrt(Math.max(r1, 0.4));
          const a2 = 1 / Math.sqrt(Math.max(r2, 0.4));
          level = Math.pow(Math.min(1.1, meanIntensity(x, y, p) / (a1 * a1 + a2 * a2)), 1.15);
        } else {
          level = Math.tanh(instantField(x, y, this.time, p) * 0.85);
        }
        // Positive displacement glows in sky chalk; negative darkens the slate.
        const lit = Math.max(0, level);
        const dark = intensityMode ? 0 : Math.max(0, -level) * 0.55;
        const o = (iy * gw + ix) * 4;
        for (let c = 0; c < 3; c++) {
          const base = BOARD_RGB[c] * (1 - dark);
          data[o + c] = base + (SKY_RGB[c] - base) * Math.pow(lit, 1.1) * 0.92;
        }
        data[o + 3] = 255;
      }
    }
    fctx.putImageData(image, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.field, plot.x, plot.y, plot.w, plot.h);
    ctx.restore();
    // Frame the plot like a chalk-drawn box.
    const g = new Chalk(ctx);
    g.polyline(
      [
        [plot.x, plot.y],
        [plot.x + plot.w, plot.y],
        [plot.x + plot.w, plot.y + plot.h],
        [plot.x, plot.y + plot.h],
        [plot.x, plot.y],
      ],
      { width: 1.4, color: CHALK.dim, seed: 5 },
    );
  }

  /** Hyperbolas where the path difference is a whole number of wavelengths (plus the source offset). */
  private drawMaxima(g: Chalk, p: WaveParams, toX: (cm: number) => number, toY: (cm: number) => number, halfH: number) {
    const offset = p.phaseDeg / 360;
    const reach = p.separation / p.wavelength;
    const c = p.separation / 2;
    for (let m = Math.floor(-reach - offset); m <= Math.ceil(reach - offset); m++) {
      const delta = (m + offset) * p.wavelength; // r1 − r2
      if (Math.abs(delta) >= p.separation - 1e-6) continue;
      const a = Math.abs(delta) / 2;
      const b = Math.sqrt(c * c - a * a);
      const points: Point[] = [];
      if (a < 1e-9) {
        points.push([toX(0), toY(-halfH)], [toX(0), toY(halfH)]);
      } else {
        const sign = Math.sign(delta);
        const uMax = Math.asinh(halfH / b);
        for (let i = 0; i <= 36; i++) {
          const u = -uMax + (2 * uMax * i) / 36;
          points.push([toX(sign * a * Math.cosh(u)), toY(b * Math.sinh(u))]);
        }
      }
      g.polyline(points, { color: CHALK.white, width: 1.4, dash: [6, 7], seed: 1000 + m, alpha: 0.75 });
    }
  }
}
