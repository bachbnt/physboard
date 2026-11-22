export interface WaveParams {
  /** Wavelength, cm. */
  wavelength: number;
  /** Distance between the two sources, cm. */
  separation: number;
  /** Phase of source 2 relative to source 1, degrees. */
  phaseDeg: number;
}

/** Nearest distance used for the 1/√r amplitude, so the field stays finite at a source. */
const CORE = 0.4;

const amplitude = (r: number) => 1 / Math.sqrt(Math.max(r, CORE));
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distances from (x, y) to the two sources, which sit at (−d/2, 0) and (d/2, 0). */
export function distances(x: number, y: number, p: WaveParams): [number, number] {
  return [Math.hypot(x + p.separation / 2, y), Math.hypot(x - p.separation / 2, y)];
}

/** Displacement at one instant: two circular waves, each fading as 1/√r. */
export function instantField(x: number, y: number, t: number, p: WaveParams): number {
  const k = (2 * Math.PI) / p.wavelength;
  const omega = 2 * Math.PI; // one cycle per second, slow enough to follow by eye
  const [r1, r2] = distances(x, y, p);
  return (
    amplitude(r1) * Math.cos(k * r1 - omega * t) + amplitude(r2) * Math.cos(k * r2 - omega * t + rad(p.phaseDeg))
  );
}

/** Time-averaged intensity: the standing interference pattern. */
export function meanIntensity(x: number, y: number, p: WaveParams): number {
  const k = (2 * Math.PI) / p.wavelength;
  const [r1, r2] = distances(x, y, p);
  const a1 = amplitude(r1);
  const a2 = amplitude(r2);
  return 0.5 * a1 * a1 + 0.5 * a2 * a2 + a1 * a2 * Math.cos(k * (r1 - r2) - rad(p.phaseDeg));
}

/**
 * Integers m for which r₁ − r₂ = (m + offset)·λ lies strictly between the sources,
 * i.e. |(m + offset)·λ| < d.
 */
function countOnSegment(p: WaveParams, offset: number): number {
  const reach = p.separation / p.wavelength;
  let n = 0;
  const lo = Math.floor(-reach - offset) - 1;
  const hi = Math.ceil(reach - offset) + 1;
  for (let m = lo; m <= hi; m++) if (Math.abs(m + offset) < reach - 1e-9) n++;
  return n;
}

/** Points of maximum amplitude on the segment between the sources (textbook counting). */
export const maximaOnSegment = (p: WaveParams) => countOnSegment(p, p.phaseDeg / 360);

/** Points of minimum amplitude on the segment between the sources. */
export const minimaOnSegment = (p: WaveParams) => countOnSegment(p, p.phaseDeg / 360 + 0.5);
