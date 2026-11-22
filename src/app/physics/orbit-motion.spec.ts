import {
  advanceOrbit,
  circularSpeed,
  escapeSpeed,
  orbitalPeriod,
  orbitEnergy,
  orbitShape,
  R_EARTH,
  startOrbit,
} from './orbit-motion';

describe('orbit speeds', () => {
  it('gives ~7.67 km/s at 400 km altitude', () => {
    expect(circularSpeed(R_EARTH + 400)).toBeCloseTo(7.673, 2);
  });

  it('gives a period of about 24 h at geostationary radius', () => {
    const hours = orbitalPeriod(R_EARTH + 35786) / 3600;
    expect(hours).toBeCloseTo(23.93, 1);
  });

  it('makes escape speed √2 times the circular speed', () => {
    expect(escapeSpeed(7000) / circularSpeed(7000)).toBeCloseTo(Math.SQRT2, 12);
  });
});

describe('orbitShape', () => {
  it('is a circle at the circular speed', () => {
    const s = orbitShape(1);
    expect(s.kind).toBe('circle');
    expect(s.eccentricity).toBe(0);
  });

  it('is an ellipse between circular and escape speed, with the start at periapsis', () => {
    const s = orbitShape(1.2);
    expect(s.kind).toBe('ellipse');
    expect(s.startsAtPeriapsis).toBe(true);
    expect(s.periapsis).toBeCloseTo(1, 12);
    expect(s.apoapsis).toBeGreaterThan(1);
  });

  it('starts at apoapsis when slower than circular', () => {
    const s = orbitShape(0.8);
    expect(s.startsAtPeriapsis).toBe(false);
    expect(s.apoapsis).toBeCloseTo(1, 12);
    expect(s.periapsis).toBeLessThan(1);
  });

  it('opens up at and above escape speed', () => {
    expect(orbitShape(Math.SQRT2).kind).toBe('parabola');
    expect(orbitShape(1.5).kind).toBe('hyperbola');
  });
});

describe('advanceOrbit', () => {
  it('keeps a circular orbit circular for many revolutions', () => {
    let s = startOrbit(1);
    for (let i = 0; i < 1000; i++) s = advanceOrbit(s, (2 * Math.PI * 10) / 1000);
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(1, 5);
  });

  it('conserves energy on an eccentric ellipse', () => {
    let s = startOrbit(1.25);
    const e0 = orbitEnergy(s);
    for (let i = 0; i < 2000; i++) s = advanceOrbit(s, 0.05);
    expect(Math.abs(orbitEnergy(s) - e0)).toBeLessThan(1e-6);
  });

  it("obeys Kepler's third law: the period is 2π·a^1.5", () => {
    const ratio = 1.2;
    const { semiMajor } = orbitShape(ratio);
    const period = 2 * Math.PI * Math.pow(semiMajor, 1.5);
    let s = startOrbit(ratio);
    s = advanceOrbit(s, period);
    expect(s.x).toBeCloseTo(1, 4);
    expect(s.y).toBeCloseTo(0, 4);
  });
});
