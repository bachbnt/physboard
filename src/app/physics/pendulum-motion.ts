import { rk4Step } from './rk4';

export interface PendulumParams {
  /** Length, m. */
  length: number;
  /** Gravitational acceleration, m/s². */
  gravity: number;
  /** Viscous damping coefficient, 1/s. Zero is the lossless case. */
  damping: number;
}

export interface PendulumState {
  t: number;
  /** Angle from the downward vertical, rad. */
  theta: number;
  /** Angular velocity, rad/s. */
  omega: number;
}

export const restAt = (thetaRad: number): PendulumState => ({ t: 0, theta: thetaRad, omega: 0 });

/** Full nonlinear equation of motion: θ'' = −(g/L)·sin θ − b·θ'. */
export function stepPendulum(s: PendulumState, p: PendulumParams, dt: number): PendulumState {
  const [theta, omega] = rk4Step([s.theta, s.omega], s.t, dt, (v) => [
    v[1],
    -(p.gravity / p.length) * Math.sin(v[0]) - p.damping * v[1],
  ]);
  return { t: s.t + dt, theta, omega };
}

/** Mechanical energy per unit mass, J/kg: kinetic + potential (zero at the lowest point). */
export function energy(s: PendulumState, p: PendulumParams): { kinetic: number; potential: number; total: number } {
  const kinetic = 0.5 * p.length * p.length * s.omega * s.omega;
  const potential = p.gravity * p.length * (1 - Math.cos(s.theta));
  return { kinetic, potential, total: kinetic + potential };
}

/** Period for small swings: T₀ = 2π√(L/g). */
export const smallAnglePeriod = (length: number, gravity: number) => 2 * Math.PI * Math.sqrt(length / gravity);

/** Arithmetic–geometric mean. */
function agm(a: number, b: number): number {
  for (let i = 0; i < 32 && Math.abs(a - b) > 1e-15; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return a;
}

/** Exact period for any amplitude below 180°: T = T₀ / AGM(1, cos(θ₀/2)). */
export function exactPeriod(length: number, gravity: number, amplitudeRad: number): number {
  return smallAnglePeriod(length, gravity) / agm(1, Math.cos(amplitudeRad / 2));
}

/** Measures the period from successive zero crossings of the angle going the same way. */
export class PeriodMeter {
  private last: Record<'up' | 'down', number | null> = { up: null, down: null };
  /** Latest measured period in seconds, or null until a direction has been crossed twice. */
  period: number | null = null;

  reset() {
    this.last = { up: null, down: null };
    this.period = null;
  }

  push(before: PendulumState, after: PendulumState) {
    const up = before.theta < 0 && after.theta >= 0;
    const down = before.theta > 0 && after.theta <= 0;
    if (!up && !down) return;
    const f = before.theta / (before.theta - after.theta);
    const crossing = before.t + (after.t - before.t) * f;
    const direction = up ? 'up' : 'down';
    const previous = this.last[direction];
    if (previous !== null) this.period = crossing - previous;
    this.last[direction] = crossing;
  }
}
