import { CHALK, CHALK_FONT } from './palette';

export type Point = readonly [number, number];

export interface StrokeOptions {
  color?: string;
  width?: number;
  /** Seeds the hand-drawn wobble, so the same shape always wobbles the same way. */
  seed?: number;
  dash?: number[];
  alpha?: number;
}

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  alpha?: number;
}

/** A repeatable pseudo-random number in [0, 1) from any number. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Longest straight piece before a line is split so it can wobble. */
const SEGMENT = 28;

/**
 * Draws with a chalk look: every stroke is two slightly offset, uneven passes. The wobble depends
 * only on the shape and its seed, so a still drawing never shimmers.
 */
export class Chalk {
  constructor(readonly ctx: CanvasRenderingContext2D) {}

  line(x1: number, y1: number, x2: number, y2: number, o: StrokeOptions = {}) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const pieces = Math.max(1, Math.round(length / SEGMENT));
    const points: Point[] = [];
    for (let i = 0; i <= pieces; i++) points.push([x1 + ((x2 - x1) * i) / pieces, y1 + ((y2 - y1) * i) / pieces]);
    this.stroke(points, o);
  }

  polyline(points: readonly Point[], o: StrokeOptions = {}) {
    this.stroke(points, o);
  }

  circle(cx: number, cy: number, r: number, o: StrokeOptions = {}) {
    const n = Math.max(20, Math.min(72, Math.round(r * 1.6)));
    const seed = o.seed ?? 0;
    const points: Point[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r + (hash(seed + (i % n) * 3.7) - 0.5) * Math.min(1.6, r * 0.08);
      points.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    this.stroke(points, o);
  }

  arc(cx: number, cy: number, r: number, from: number, to: number, o: StrokeOptions = {}) {
    const n = Math.max(6, Math.round((Math.abs(to - from) * r) / 10));
    const points: Point[] = [];
    for (let i = 0; i <= n; i++) {
      const a = from + ((to - from) * i) / n;
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    this.stroke(points, o);
  }

  /** A filled chalk blob: solid in the middle, with a rough ring around it. */
  disc(cx: number, cy: number, r: number, o: StrokeOptions = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = (o.alpha ?? 1) * 0.9;
    ctx.fillStyle = o.color ?? CHALK.white;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.circle(cx, cy, r, { ...o, width: o.width ?? 1.6 });
  }

  arrow(x1: number, y1: number, x2: number, y2: number, o: StrokeOptions = {}) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 2) return;
    this.line(x1, y1, x2, y2, o);
    const head = Math.min(12, Math.max(6, length * 0.28));
    const a = Math.atan2(y2 - y1, x2 - x1);
    const spread = Math.PI / 7;
    for (const side of [-1, 1]) {
      this.line(x2, y2, x2 - Math.cos(a + side * spread) * head, y2 - Math.sin(a + side * spread) * head, {
        ...o,
        seed: (o.seed ?? 0) + side * 17,
        dash: undefined,
      });
    }
  }

  text(value: string, x: number, y: number, o: TextOptions = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.font = `${o.size ?? 18}px ${CHALK_FONT}`;
    ctx.fillStyle = o.color ?? CHALK.white;
    ctx.globalAlpha = o.alpha ?? 0.96;
    ctx.textAlign = o.align ?? 'left';
    ctx.textBaseline = o.baseline ?? 'alphabetic';
    ctx.fillText(value, x, y);
    ctx.restore();
  }

  /** A symbol with a subscript, such as U with a small R: `label('U', 'R', x, y)`. */
  label(base: string, subscript: string, x: number, y: number, o: TextOptions = {}) {
    const size = o.size ?? 18;
    const { ctx } = this;
    ctx.save();
    ctx.font = `${size}px ${CHALK_FONT}`;
    const width = ctx.measureText(base).width;
    ctx.restore();
    this.text(base, x, y, o);
    this.text(subscript, x + width + 1, y + size * 0.26, { ...o, size: size * 0.68 });
  }

  private stroke(points: readonly Point[], o: StrokeOptions) {
    if (points.length < 2) return;
    const { ctx } = this;
    const width = o.width ?? 2;
    const seed = o.seed ?? 0;
    const wobble = 0.5 + width * 0.22;
    const passes = [
      { alpha: 0.92, widthFactor: 1, offset: 0 },
      { alpha: 0.34, widthFactor: 0.55, offset: 1 },
    ];

    ctx.save();
    ctx.strokeStyle = o.color ?? CHALK.white;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(o.dash ?? []);
    for (const pass of passes) {
      ctx.globalAlpha = (o.alpha ?? 1) * pass.alpha;
      ctx.lineWidth = width * pass.widthFactor;
      ctx.beginPath();
      points.forEach(([px, py], i) => {
        const jx = (hash(seed + i * 1.91 + pass.offset * 53) - 0.5) * wobble * 2;
        const jy = (hash(seed + i * 2.37 + pass.offset * 97 + 11) - 0.5) * wobble * 2;
        if (i === 0) ctx.moveTo(px + jx, py + jy);
        else ctx.lineTo(px + jx, py + jy);
      });
      ctx.stroke();
    }
    ctx.restore();
  }
}
