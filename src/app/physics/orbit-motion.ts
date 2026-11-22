import { rk4Step } from './rk4';

/** Earth's gravitational parameter GM, km³/s². */
export const MU_EARTH = 398600.4418;
/** Mean Earth radius, km. */
export const R_EARTH = 6371;

/**
 * The motion itself runs in normalised units (GM = 1, starting radius = 1, so a circular orbit has
 * speed 1 and period 2π). Real-world numbers are obtained by scaling afterwards.
 */
export interface OrbitState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type OrbitKind = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';

export interface OrbitShape {
  kind: OrbitKind;
  eccentricity: number;
  /** Semi-latus rectum, in starting radii. */
  p: number;
  /** Closest distance to the centre, in starting radii. */
  periapsis: number;
  /** Farthest distance, in starting radii (Infinity when the orbit is open). */
  apoapsis: number;
  /** Semi-major axis, in starting radii (Infinity for a parabola). */
  semiMajor: number;
  /** Where the start point sits on the orbit: the nearest point when ratio ≥ 1, the farthest otherwise. */
  startsAtPeriapsis: boolean;
}

/** Circular speed at radius r (km) around Earth, km/s. */
export const circularSpeed = (rKm: number) => Math.sqrt(MU_EARTH / rKm);
/** Escape speed at radius r (km) around Earth, km/s. */
export const escapeSpeed = (rKm: number) => Math.SQRT2 * circularSpeed(rKm);
/** Orbital period for semi-major axis a (km), seconds. */
export const orbitalPeriod = (aKm: number) => 2 * Math.PI * Math.sqrt((aKm * aKm * aKm) / MU_EARTH);

/**
 * Orbit launched tangentially at the start radius with `ratio` times the circular speed.
 * e = |ratio² − 1| follows from energy and angular momentum.
 */
export function orbitShape(ratio: number): OrbitShape {
  const e = Math.abs(ratio * ratio - 1);
  const p = ratio * ratio;
  const startsAtPeriapsis = ratio >= 1;
  const kind: OrbitKind =
    e < 1e-9 ? 'circle' : ratio * ratio < 2 - 1e-9 ? 'ellipse' : ratio * ratio <= 2 + 1e-9 ? 'parabola' : 'hyperbola';
  const periapsis = p / (1 + e);
  const apoapsis = e < 1 ? p / (1 - e) : Infinity;
  const semiMajor = e < 1 ? p / (1 - e * e) : e === 1 ? Infinity : p / (e * e - 1);
  return { kind, eccentricity: e, p, periapsis, apoapsis, semiMajor, startsAtPeriapsis };
}

export const startOrbit = (ratio: number): OrbitState => ({ t: 0, x: 1, y: 0, vx: 0, vy: ratio });

function accel(x: number, y: number): [number, number] {
  const r2 = x * x + y * y;
  const k = -1 / (r2 * Math.sqrt(r2));
  return [k * x, k * y];
}

/**
 * Advances the orbit by `dt` (normalised time). The step shrinks near the centre, where the
 * motion is fastest, so close passes stay accurate.
 */
export function advanceOrbit(s: OrbitState, dt: number): OrbitState {
  let state = s;
  let remaining = dt;
  while (remaining > 1e-12) {
    const r = Math.hypot(state.x, state.y);
    const v = Math.hypot(state.vx, state.vy);
    const h = Math.min(remaining, 0.004 * (r / Math.max(v, 1e-3)));
    const [x, y, vx, vy] = rk4Step([state.x, state.y, state.vx, state.vy], state.t, h, (u) => {
      const [ax, ay] = accel(u[0], u[1]);
      return [u[2], u[3], ax, ay];
    });
    state = { t: state.t + h, x, y, vx, vy };
    remaining -= h;
  }
  return state;
}

/** Specific orbital energy ½v² − 1/r (normalised). */
export const orbitEnergy = (s: OrbitState) => 0.5 * (s.vx * s.vx + s.vy * s.vy) - 1 / Math.hypot(s.x, s.y);
