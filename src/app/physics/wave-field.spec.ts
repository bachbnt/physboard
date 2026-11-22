import { instantField, maximaOnSegment, meanIntensity, minimaOnSegment, WaveParams } from './wave-field';

const inPhase: WaveParams = { wavelength: 2, separation: 8, phaseDeg: 0 };

describe('maximaOnSegment', () => {
  it('counts 2·⌈d/λ⌉−1 points for in-phase sources (strict inequality)', () => {
    expect(maximaOnSegment(inPhase)).toBe(7); // |m| < 4
    expect(maximaOnSegment({ ...inPhase, wavelength: 4 })).toBe(3); // |m| < 2
    expect(maximaOnSegment({ ...inPhase, wavelength: 3 })).toBe(5); // |m| < 8/3
  });

  it('counts the shifted set for opposite-phase sources', () => {
    expect(maximaOnSegment({ ...inPhase, phaseDeg: 180 })).toBe(8); // −4 < m + ½ < 4 → m = −4…3
  });

  it('swaps maxima and minima when the phase shifts by half a cycle', () => {
    expect(minimaOnSegment({ ...inPhase, phaseDeg: 180 })).toBe(maximaOnSegment(inPhase));
    expect(minimaOnSegment(inPhase)).toBe(maximaOnSegment({ ...inPhase, phaseDeg: 180 }));
  });
});

describe('meanIntensity', () => {
  const points: [number, number][] = [[0, 5], [3.3, 2], [-6, 4], [10, -7]];

  it('equals the time average of the instantaneous field squared', () => {
    for (const phaseDeg of [0, 90, 180]) {
      const p = { ...inPhase, phaseDeg };
      for (const [x, y] of points) {
        let sum = 0;
        const n = 720;
        for (let i = 0; i < n; i++) sum += instantField(x, y, i / n, p) ** 2;
        expect(meanIntensity(x, y, p)).toBeCloseTo(sum / n, 6);
      }
    }
  });

  it('is brightest on the midline when the sources are in phase and darkest when opposed', () => {
    expect(meanIntensity(0, 6, inPhase)).toBeGreaterThan(meanIntensity(0, 6, { ...inPhase, phaseDeg: 180 }));
  });
});
