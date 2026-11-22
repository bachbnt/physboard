import { rk4Step } from './rk4';

export interface ProjectileParams {
  /** Launch speed, m/s. */
  speed: number;
  /** Launch angle above the horizontal, degrees. */
  angleDeg: number;
  /** Launch height above the ground, m. */
  height: number;
  /** Gravitational acceleration, m/s². */
  gravity: number;
  /** Quadratic air drag, 1/m: a = −drag·|v|·v. Zero is the ideal (vacuum) case. */
  drag: number;
}

export interface ProjectileState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  landed: boolean;
}

export interface IdealFlight {
  /** Time until the projectile reaches the ground, s. */
  time: number;
  /** Horizontal distance at landing, m. */
  range: number;
  /** Highest point above the ground, m. */
  maxHeight: number;
  timeToPeak: number;
  /** Speed at impact, m/s. */
  impactSpeed: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export function launch(p: ProjectileParams): ProjectileState {
  const a = rad(p.angleDeg);
  return { t: 0, x: 0, y: p.height, vx: p.speed * Math.cos(a), vy: p.speed * Math.sin(a), landed: false };
}

/** Closed-form flight without drag. */
export function idealFlight(p: Omit<ProjectileParams, 'drag'>): IdealFlight {
  const a = rad(p.angleDeg);
  const vx = p.speed * Math.cos(a);
  const vy = p.speed * Math.sin(a);
  const time = (vy + Math.sqrt(vy * vy + 2 * p.gravity * p.height)) / p.gravity;
  const timeToPeak = Math.max(0, vy / p.gravity);
  return {
    time,
    range: vx * time,
    maxHeight: p.height + (vy > 0 ? (vy * vy) / (2 * p.gravity) : 0),
    timeToPeak,
    impactSpeed: Math.hypot(vx, vy - p.gravity * time),
  };
}

/** Advances the projectile by `dt` seconds (RK4). Stops exactly on the ground when it lands. */
export function stepProjectile(s: ProjectileState, p: ProjectileParams, dt: number): ProjectileState {
  if (s.landed) return s;
  const next = rk4Step([s.x, s.y, s.vx, s.vy], s.t, dt, (v) => {
    const speed = Math.hypot(v[2], v[3]);
    return [v[2], v[3], -p.drag * speed * v[2], -p.gravity - p.drag * speed * v[3]];
  });
  const [x, y, vx, vy] = next;

  if (y >= 0) return { t: s.t + dt, x, y, vx, vy, landed: false };

  // Crossed the ground within this step: interpolate to y = 0.
  const f = s.y / (s.y - y);
  return {
    t: s.t + dt * f,
    x: s.x + (x - s.x) * f,
    y: 0,
    vx: s.vx + (vx - s.vx) * f,
    vy: s.vy + (vy - s.vy) * f,
    landed: true,
  };
}
