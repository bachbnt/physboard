import { idealFlight, launch, ProjectileParams, stepProjectile } from './projectile-motion';

const base: ProjectileParams = { speed: 20, angleDeg: 30, height: 0, gravity: 9.8, drag: 0 };

function fly(p: ProjectileParams, dt = 1 / 240) {
  let s = launch(p);
  for (let i = 0; i < 1_000_000 && !s.landed; i++) s = stepProjectile(s, p, dt);
  return s;
}

describe('idealFlight', () => {
  it('matches the textbook range v²·sin(2α)/g from the ground', () => {
    expect(idealFlight(base).range).toBeCloseTo((20 * 20 * Math.sin(Math.PI / 3)) / 9.8, 9);
  });

  it('gives the longest range at 45° when launched from the ground', () => {
    const range = (a: number) => idealFlight({ ...base, angleDeg: a }).range;
    expect(range(45)).toBeGreaterThan(range(40));
    expect(range(45)).toBeGreaterThan(range(50));
  });

  it('adds flight time and range when launched from a height', () => {
    expect(idealFlight({ ...base, height: 10 }).range).toBeGreaterThan(idealFlight(base).range);
  });

  it('reports the peak height v²·sin²α/(2g)', () => {
    const f = idealFlight({ ...base, angleDeg: 90 });
    expect(f.maxHeight).toBeCloseTo((20 * 20) / (2 * 9.8), 9);
    expect(f.timeToPeak).toBeCloseTo(20 / 9.8, 9);
  });
});

describe('stepProjectile', () => {
  it('agrees with the closed form when there is no drag', () => {
    const exact = idealFlight(base);
    const landed = fly({ ...base, height: 5 });
    const ideal = idealFlight({ ...base, height: 5 });
    expect(landed.x).toBeCloseTo(ideal.range, 4);
    expect(landed.t).toBeCloseTo(ideal.time, 4);
    expect(exact.range).toBeGreaterThan(0);
  });

  it('shortens the flight when air drag is on', () => {
    const drag = fly({ ...base, drag: 0.02 });
    expect(drag.x).toBeLessThan(idealFlight(base).range);
  });

  it('lands exactly on the ground and then stays put', () => {
    const p = base;
    const landed = fly(p);
    expect(landed.y).toBe(0);
    expect(stepProjectile(landed, p, 0.1)).toBe(landed);
  });
});
