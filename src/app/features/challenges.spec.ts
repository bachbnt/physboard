import { analyzeRlc, resonantFrequency } from '../physics/rlc-circuit';
import { exactPeriod, smallAnglePeriod } from '../physics/pendulum-motion';
import { idealFlight } from '../physics/projectile-motion';
import { circularSpeed, escapeSpeed, orbitalPeriod, R_EARTH } from '../physics/orbit-motion';
import { maximaOnSegment } from '../physics/wave-field';
import { thinLensImage } from '../physics/thin-lens';
import { INTERFERENCE_CHALLENGES } from './interference/interference-page';
import { LENS_CHALLENGES } from './lens/lens-page';
import { ORBIT_CHALLENGES } from './orbit/orbit-page';
import { PENDULUM_CHALLENGES } from './pendulum/pendulum-page';
import { PROJECTILE_CHALLENGES } from './projectile/projectile-page';
import { RLC_CHALLENGES } from './rlc/rlc-page';

/**
 * Each challenge stores the answer next to the preset it asks about. These tests recompute the
 * answer from the preset with the physics code, so a typo in either place is caught.
 */
describe('challenge answers match their presets', () => {
  it('projectile: range from a preset, the 45° optimum, and the Moon', () => {
    const [range, best, moon] = PROJECTILE_CHALLENGES;
    const p = range.params;
    expect(range.answer).toBeCloseTo(idealFlight({ speed: p['v'], angleDeg: p['a'], height: p['h'], gravity: p['g'] }).range, 9);
    const rangeAt = (a: number) => idealFlight({ speed: p['v'], angleDeg: a, height: 0, gravity: p['g'] }).range;
    expect(best.answer).toBe(45);
    expect(rangeAt(45)).toBeGreaterThan(rangeAt(44));
    expect(rangeAt(45)).toBeGreaterThan(rangeAt(46));
    const m = moon.params;
    expect(moon.answer).toBeCloseTo(idealFlight({ speed: m['v'], angleDeg: m['a'], height: m['h'], gravity: m['g'] }).range, 9);
    expect(m['g']).toBeCloseTo(1.62, 2);
  });

  it('pendulum: small-angle periods and the large-angle exact period', () => {
    const [a, b, c] = PENDULUM_CHALLENGES;
    expect(a.answer).toBeCloseTo(smallAnglePeriod(a.params['l'], a.params['g']), 9);
    expect(b.answer).toBeCloseTo(smallAnglePeriod(b.params['l'], b.params['g']), 9);
    expect(b.answer).toBeCloseTo(a.answer / 2, 3); // a quarter of the length halves the period
    expect(c.answer).toBeCloseTo(exactPeriod(c.params['l'], c.params['g'], (c.params['th'] * Math.PI) / 180), 9);
    expect(c.answer).toBeGreaterThan(smallAnglePeriod(c.params['l'], c.params['g']));
  });

  it('interference: counts match the textbook inequality', () => {
    const answers = INTERFERENCE_CHALLENGES.map((c) => c.answer);
    expect(answers).toEqual([7, 3, 8]);
    for (const c of INTERFERENCE_CHALLENGES) {
      expect(c.answer).toBe(maximaOnSegment({ wavelength: c.params['lam'], separation: c.params['d'], phaseDeg: c.params['ph'] }));
    }
  });

  it('orbit: circular speed, geostationary period and escape speed', () => {
    const [v, period, escape] = ORBIT_CHALLENGES;
    expect(v.answer).toBeCloseTo(circularSpeed(R_EARTH + v.params['alt']), 9);
    expect(period.answer).toBeCloseTo(orbitalPeriod(R_EARTH + period.params['alt']) / 3600, 9);
    expect(period.answer).toBeCloseTo(23.93, 1);
    expect(escape.answer).toBeCloseTo(escapeSpeed(R_EARTH + escape.params['alt']), 9);
  });

  it('rlc: resonance, current at resonance, and impedance at 50 Hz', () => {
    const [f0, current, z] = RLC_CHALLENGES;
    const circuit = (c: { params: Readonly<Record<string, number>> }, frequency = c.params['f']) => ({
      resistance: c.params['R'],
      inductance: c.params['L'] / 1000,
      capacitance: c.params['C'] * 1e-6,
      frequency,
      voltage: 12,
    });
    const expected = resonantFrequency(0.1, 20e-6);
    expect(f0.answer).toBeCloseTo(expected, 9);
    expect(current.answer).toBeCloseTo(0.24, 9);
    expect(Math.abs(current.params['f'] - expected)).toBeLessThan(1); // the preset sits on resonance
    expect(z.answer).toBeCloseTo(analyzeRlc(circuit(z)).z, 9);
  });

  it('lens: image distance, magnification and the diverging case', () => {
    const [real, magnification, diverging] = LENS_CHALLENGES;
    expect(real.answer).toBeCloseTo(thinLensImage(real.params['f'], real.params['d']).distance, 9);
    expect(magnification.answer).toBeCloseTo(thinLensImage(magnification.params['f'], magnification.params['d']).magnification, 9);
    expect(diverging.params['k']).toBe(1);
    expect(diverging.answer).toBeCloseTo(thinLensImage(-diverging.params['f'], diverging.params['d']).distance, 9);
  });
});
