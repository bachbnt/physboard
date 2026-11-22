import { ChangeDetectionStrategy, Component, computed, effect, inject, viewChild } from '@angular/core';
import { Chalk } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { Seo } from '../../core/seo';
import { syncUrlParams, urlParam } from '../../core/url-params';
import { I18n } from '../../i18n/i18n';
import { thinLensImage } from '../../physics/thin-lens';
import { Board } from '../../ui/board';
import { Challenge, ChallengePanel } from '../../ui/challenge-panel';
import { FormulaList } from '../../ui/formula-list';
import { ReadoutList } from '../../ui/readout-list';
import { BoardPointer, BoardSize, Scene } from '../../ui/scene';
import { SimShell } from '../../ui/sim-shell';
import { TraySlider } from '../../ui/tray-slider';

/** Farthest object distance, cm. Sets the horizontal scale so dragging never rescales the board. */
const D_MAX = 80;

export const LENS_CHALLENGES: readonly Challenge[] = [
  { params: { f: 10, k: 0, d: 30, h: 3 }, answer: thinLensImage(10, 30).distance, unit: 'cm', tolerance: 0.02, digits: 1 },
  { params: { f: 10, k: 0, d: 15, h: 3 }, answer: thinLensImage(10, 15).magnification, unit: '', tolerance: 0.02, digits: 1 },
  { params: { f: 10, k: 1, d: 30, h: 3 }, answer: thinLensImage(-10, 30).distance, unit: 'cm', tolerance: 0.02, digits: 1 },
];

@Component({
  selector: 'app-lens-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimShell, Board, TraySlider, ReadoutList, FormulaList, ChallengePanel],
  templateUrl: './lens-page.html',
})
export class LensPage implements Scene {
  protected readonly i18n = inject(I18n);
  protected readonly challenges = LENS_CHALLENGES;

  protected readonly focal = urlParam('f', 10, 5, 30);
  /** 0 for a converging lens, 1 for a diverging one. */
  protected readonly diverging = urlParam('k', 0, 0, 1);
  protected readonly distance = urlParam('d', 30, 5, D_MAX);
  protected readonly objectHeight = urlParam('h', 3, 1, 6);

  private readonly board = viewChild(Board);
  private dragging = false;
  private geometry = { lensX: 0, scaleX: 1 };

  private readonly signedFocal = computed(() => (this.diverging() ? -this.focal() : this.focal()));
  private readonly image = computed(() => thinLensImage(this.signedFocal(), this.distance()));

  protected readonly rows = computed(() => {
    const i = this.i18n;
    const img = this.image();
    if (img.atInfinity) {
      return [
        { label: i.t('sims.lens.readouts.imageDistance'), value: '∞' },
        { label: i.t('sims.lens.readouts.nature'), value: i.t('sims.lens.readouts.infinity') },
      ];
    }
    const size = Math.abs(Math.abs(img.magnification) - 1) < 0.005 ? 'same' : img.enlarged ? 'enlarged' : 'reduced';
    const nature = [
      i.t(`sims.lens.readouts.${img.real ? 'real' : 'virtual'}`),
      i.t(`sims.lens.readouts.${img.inverted ? 'inverted' : 'upright'}`),
      i.t(`sims.lens.readouts.${size}`),
    ].join(', ');
    return [
      { label: i.t('sims.lens.readouts.imageDistance'), value: i.fmt(img.distance, 1, true), unit: 'cm' },
      { label: i.t('sims.lens.readouts.magnification'), value: i.fmt(img.magnification, 2, true) },
      { label: i.t('sims.lens.readouts.nature'), value: nature },
    ];
  });

  protected readonly formulas = computed(() => {
    this.i18n.lang();
    const captions = this.i18n.list('sims.lens.formulas');
    const tex = [
      '\\dfrac{1}{f} = \\dfrac{1}{d} + \\dfrac{1}{d\'}',
      'k = -\\dfrac{d\'}{d} = \\dfrac{\\overline{A\'B\'}}{\\overline{AB}}',
    ];
    return tex.map((t, i) => ({ tex: t, caption: captions[i] ?? '' }));
  });

  constructor() {
    inject(Seo).set({
      title: this.i18n.t('sims.lens.title'),
      description: this.i18n.t('sims.lens.lead'),
      route: '/lens',
    });
    syncUrlParams({ f: this.focal, k: this.diverging, d: this.distance, h: this.objectHeight });
    effect(() => {
      this.signedFocal();
      this.distance();
      this.objectHeight();
      this.board()?.invalidate();
    });
  }

  protected apply(values: Readonly<Record<string, number>>) {
    if (values['f'] !== undefined) this.focal.set(values['f']);
    if (values['k'] !== undefined) this.diverging.set(values['k']);
    if (values['d'] !== undefined) this.distance.set(values['d']);
    if (values['h'] !== undefined) this.objectHeight.set(values['h']);
  }

  // ----- Scene -----

  pointer(e: BoardPointer) {
    const { lensX, scaleX } = this.geometry;
    if (e.type === 'down') {
      const objectX = lensX - this.distance() * scaleX;
      this.dragging = Math.abs(e.x - objectX) < 46;
    }
    if (this.dragging && (e.type === 'down' || e.type === 'move')) {
      const d = (lensX - e.x) / scaleX;
      this.distance.set(Math.round(Math.max(5, Math.min(D_MAX, d)) * 2) / 2);
    }
    if (e.type === 'up') this.dragging = false;
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    const t = this.i18n;
    const f = this.signedFocal();
    const d = this.distance();
    const ho = this.objectHeight();
    const img = this.image();

    const lensX = w * 0.5;
    const axisY = h * 0.56;
    const sx = (w * 0.46) / D_MAX;
    const sy = (h * 0.34) / 8;
    this.geometry = { lensX, scaleX: sx };
    const X = (x: number) => lensX + x * sx;
    const Y = (y: number) => axisY - y * sy;
    const lensHalf = h * 0.4;

    // Axis, focal points and the lens itself.
    g.line(10, axisY, w - 10, axisY, { width: 1.5, color: CHALK.dim, seed: 1 });
    g.text(t.t('sims.lens.labels.axis'), w - 14, axisY + 22, { size: 16, color: CHALK.dim, align: 'right' });
    for (const [x, label] of [[-f, t.t('sims.lens.labels.focus')], [f, t.t('sims.lens.labels.focusPrime')]] as const) {
      g.line(X(x), axisY - 6, X(x), axisY + 6, { width: 2, seed: 10 + Math.round(x) });
      g.text(label, X(x), axisY + 28, { size: 21, color: CHALK.white, align: 'center' });
    }
    this.drawLens(g, lensX, axisY, lensHalf, f > 0);

    // The object.
    g.arrow(X(-d), axisY, X(-d), Y(ho), { color: CHALK.yellow, width: 3.2, seed: 20 });
    g.text(t.t('sims.lens.labels.object'), X(-d), axisY + 28, { size: 19, color: CHALK.yellow, align: 'center' });

    // Three principal rays, from the object's tip.
    const tip = [-d, ho] as const;
    const reach = (w - lensX) / sx; // how far right the rays are drawn, in cm
    const incoming = (yAtLens: number, seed: number) =>
      g.line(X(tip[0]), Y(tip[1]), X(0), Y(yAtLens), { color: CHALK.sky, width: 2.2, seed });
    const outgoing = (yAtLens: number, slope: number, seed: number) => {
      g.line(X(0), Y(yAtLens), X(reach), Y(yAtLens + slope * reach), { color: CHALK.sky, width: 2.2, seed });
      if (!img.real && !img.atInfinity) {
        // Virtual image: the rays only appear to come from the image, so trace them back with dashes.
        g.line(X(0), Y(yAtLens), X(img.distance), Y(img.magnification * ho), { color: CHALK.sky, width: 1.5, dash: [3, 7], seed: seed + 50, alpha: 0.8 });
      }
    };
    // 1. parallel to the axis, leaves through the image-side focus.
    incoming(ho, 30);
    outgoing(ho, -ho / f, 31);
    // 2. through the centre of the lens, goes straight.
    g.line(X(tip[0]), Y(tip[1]), X(reach), Y((-ho / d) * reach), { color: CHALK.sky, width: 2.2, seed: 32 });
    if (!img.real && !img.atInfinity) {
      g.line(X(0), Y(0), X(img.distance), Y(img.magnification * ho), { color: CHALK.sky, width: 1.5, dash: [3, 7], seed: 82, alpha: 0.8 });
    }
    // 3. aimed at the object-side focus, leaves parallel to the axis.
    if (!img.atInfinity) {
      const y3 = (-ho * f) / (d - f);
      incoming(y3, 33);
      outgoing(y3, 0, 34);
    }

    // The image.
    if (!img.atInfinity) {
      const x = img.distance;
      const y = img.magnification * ho;
      g.arrow(X(x), axisY, X(x), Y(y), { color: CHALK.mint, width: 3.2, seed: 40, dash: img.real ? undefined : [7, 6] });
      g.text(t.t('sims.lens.labels.image'), X(x), axisY + (y > 0 ? 28 : -14), { size: 19, color: CHALK.mint, align: 'center' });
    }

    if (!this.dragging && d === 30) g.text(t.t('sims.lens.drag'), X(-d), Y(ho) - 16, { size: 18, color: CHALK.rose, align: 'center' });
  }

  private drawLens(g: Chalk, x: number, axisY: number, half: number, converging: boolean) {
    const bulge = 16;
    const top = axisY - half;
    const bottom = axisY + half;
    const side = (dir: number, seed: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const y = top + (bottom - top) * u;
        const curve = converging ? Math.sin(Math.PI * u) * bulge : Math.sin(Math.PI * u) * -bulge * 0.4;
        pts.push([x + dir * (curve + (converging ? 0 : 7)), y]);
      }
      g.polyline(pts, { color: CHALK.white, width: 2.6, seed });
    };
    side(-1, 60);
    side(1, 61);
    if (converging) {
      g.line(x - 2, top, x + 2, top, { width: 2.6, seed: 62 });
      g.line(x - 2, bottom, x + 2, bottom, { width: 2.6, seed: 63 });
    } else {
      g.line(x - 7, top, x + 7, top, { width: 2.6, seed: 62 });
      g.line(x - 7, bottom, x + 7, bottom, { width: 2.6, seed: 63 });
    }
    // Arrow tips mark the kind of lens, as in textbook symbols.
    const tipDir = converging ? 1 : -1;
    for (const [y, sign] of [[top, -1], [bottom, 1]] as const) {
      g.line(x, y, x - 8, y + sign * -tipDir * 12, { width: 2.2, seed: 64 + sign });
      g.line(x, y, x + 8, y + sign * -tipDir * 12, { width: 2.2, seed: 66 + sign });
    }
  }
}
