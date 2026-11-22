export interface LensImage {
  /** Image distance d′, cm. Positive: real image on the far side. Negative: virtual image. Infinity at d = f. */
  distance: number;
  /** Lateral magnification k = −d′/d. Negative means inverted. */
  magnification: number;
  real: boolean;
  inverted: boolean;
  enlarged: boolean;
  atInfinity: boolean;
}

/**
 * Thin-lens image of an object at distance d (cm) for focal length f (cm).
 * f > 0 for a converging lens, f < 0 for a diverging one.
 */
export function thinLensImage(f: number, d: number): LensImage {
  if (Math.abs(d - f) < 1e-9) {
    return { distance: Infinity, magnification: Infinity, real: true, inverted: true, enlarged: true, atInfinity: true };
  }
  const distance = (d * f) / (d - f);
  const magnification = -distance / d;
  return {
    distance,
    magnification,
    real: distance > 0,
    inverted: magnification < 0,
    enlarged: Math.abs(magnification) > 1,
    atInfinity: false,
  };
}
