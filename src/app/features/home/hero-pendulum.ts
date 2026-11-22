import { Chalk } from '../../chalk/chalk';
import { CHALK } from '../../chalk/palette';
import { PendulumParams, PendulumState, restAt, smallAnglePeriod, stepPendulum } from '../../physics/pendulum-motion';
import { BoardPointer, BoardSize, Scene } from '../../ui/scene';

const PARAMS: PendulumParams = { length: 1, gravity: 9.81, damping: 0 };
const STEP = 1 / 240;
const MAX_ANGLE = 2.9;

/** The pendulum on the home page: a real simulation you can pick up and let go. */
export class HeroPendulum implements Scene {
  private state: PendulumState = restAt(0.9);
  private dragging = false;
  private touched = false;
  private pivot = { x: 0, y: 0 };
  private rope = 0;
  private bobRadius = 16;
  private accumulator = 0;

  constructor(
    private readonly text: { hint: () => string; period: () => string },
    private readonly onRelease: () => void,
  ) {}

  /** Starts from the pose shown before anyone touches it. */
  rewind() {
    this.state = restAt(0.9);
  }

  step(dt: number) {
    if (this.dragging) return;
    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      this.state = stepPendulum(this.state, PARAMS, STEP);
      this.accumulator -= STEP;
    }
  }

  pointer(e: BoardPointer) {
    if (e.type === 'down') {
      const bob = this.bob();
      if (Math.hypot(e.x - bob.x, e.y - bob.y) < this.bobRadius * 2.6) {
        this.dragging = true;
        this.touched = true;
        this.aim(e);
      }
    } else if (e.type === 'move' && this.dragging) {
      this.aim(e);
    } else if (e.type === 'up' && this.dragging) {
      this.dragging = false;
      this.state = { ...this.state, omega: 0 };
      this.onRelease();
    }
  }

  draw(g: Chalk, { w, h }: BoardSize) {
    this.pivot = { x: w * 0.5, y: h * 0.1 };
    this.rope = Math.min(h * 0.7, w * 0.42);
    this.bobRadius = Math.max(13, Math.min(22, w * 0.03));
    const { x: px, y: py } = this.pivot;
    const bob = this.bob();

    // Ceiling and the vertical the pendulum swings about.
    g.line(px - w * 0.14, py, px + w * 0.14, py, { width: 3, seed: 1 });
    for (let i = -4; i <= 4; i++) g.line(px + i * w * 0.03, py, px + i * w * 0.03 - 9, py - 11, { width: 1.4, seed: 20 + i, alpha: 0.6 });
    g.line(px, py, px, py + this.rope + this.bobRadius * 1.4, { width: 1.4, dash: [2, 7], color: CHALK.dim, seed: 3 });

    // The path the bob follows.
    g.arc(px, py, this.rope, Math.PI / 2 - MAX_ANGLE * 0.9, Math.PI / 2 + MAX_ANGLE * 0.9, { width: 1.3, dash: [1, 8], color: CHALK.dim, seed: 4 });

    // Angle mark.
    const theta = this.state.theta;
    if (Math.abs(theta) > 0.12) {
      const r = this.rope * 0.34;
      const from = Math.PI / 2;
      const to = Math.PI / 2 - theta;
      g.arc(px, py, r, Math.min(from, to), Math.max(from, to), { width: 1.8, color: CHALK.yellow, seed: 5 });
      g.text('θ', px + Math.sin(theta / 2) * r * 1.35 + 4, py + Math.cos(theta / 2) * r * 1.35 + 6, {
        size: Math.max(20, w * 0.034),
        color: CHALK.yellow,
        align: 'center',
      });
    }

    // String and bob.
    g.line(px, py, bob.x, bob.y, { width: 2.4, seed: 6, color: CHALK.yellow });
    g.disc(px, py, 4, { color: CHALK.white, seed: 7 });
    g.disc(bob.x, bob.y, this.bobRadius, { color: this.dragging ? CHALK.yellow : CHALK.white, width: 2, seed: 8 });

    // The formula, written on the board, and the period it predicts.
    const size = Math.max(22, Math.min(40, w * 0.06));
    g.text('T = 2π√(l / g)', w * 0.06, h * 0.27, { size, color: CHALK.white });
    g.text(`≈ ${this.text.period()}`, w * 0.06, h * 0.27 + size * 1.15, { size, color: CHALK.yellow });

    if (!this.touched) {
      const hx = bob.x + this.bobRadius * 1.6;
      g.text(this.text.hint(), Math.min(hx, w - 12), bob.y + this.bobRadius * 3.2, {
        size: Math.max(18, Math.min(26, w * 0.04)),
        color: CHALK.rose,
        align: hx > w * 0.6 ? 'right' : 'left',
      });
    }
  }

  /** Period predicted by T₀ = 2π√(l/g), in seconds. */
  get predictedPeriod(): number {
    return smallAnglePeriod(PARAMS.length, PARAMS.gravity);
  }

  private bob() {
    const { x, y } = this.pivot;
    return { x: x + this.rope * Math.sin(this.state.theta), y: y + this.rope * Math.cos(this.state.theta) };
  }

  private aim(e: BoardPointer) {
    const theta = Math.atan2(e.x - this.pivot.x, e.y - this.pivot.y);
    this.state = restAt(Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, theta)));
  }
}
