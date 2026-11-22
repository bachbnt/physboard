import { energy, exactPeriod, PendulumParams, PeriodMeter, restAt, smallAnglePeriod, stepPendulum } from './pendulum-motion';

const p: PendulumParams = { length: 1, gravity: 9.81, damping: 0 };
const deg = (d: number) => (d * Math.PI) / 180;

describe('pendulum periods', () => {
  it('uses T₀ = 2π√(L/g) for small swings', () => {
    expect(smallAnglePeriod(1, 9.81)).toBeCloseTo(2.00607, 4);
  });

  it('reduces to T₀ as the amplitude goes to zero', () => {
    expect(exactPeriod(1, 9.81, 1e-6)).toBeCloseTo(smallAnglePeriod(1, 9.81), 8);
  });

  it('matches the known large-angle period at 120°', () => {
    // K(sin 60°) gives T/T₀ ≈ 1.3729
    expect(exactPeriod(1, 9.81, deg(120)) / smallAnglePeriod(1, 9.81)).toBeCloseTo(1.3729, 3);
  });
});

describe('stepPendulum', () => {
  it('conserves energy over many swings without damping', () => {
    let s = restAt(deg(60));
    const e0 = energy(s, p).total;
    for (let i = 0; i < 240 * 30; i++) s = stepPendulum(s, p, 1 / 240);
    expect(Math.abs(energy(s, p).total - e0) / e0).toBeLessThan(1e-7);
  });

  it('loses energy when damped', () => {
    const damped = { ...p, damping: 0.4 };
    let s = restAt(deg(60));
    const e0 = energy(s, damped).total;
    for (let i = 0; i < 240 * 10; i++) s = stepPendulum(s, damped, 1 / 240);
    expect(energy(s, damped).total).toBeLessThan(e0 * 0.5);
  });

  it('measures the period it simulates, within about one and a quarter periods', () => {
    for (const amplitude of [10, 60, 120]) {
      const meter = new PeriodMeter();
      let s = restAt(deg(amplitude));
      const quick = 1.25 * exactPeriod(1, 9.81, deg(amplitude)) + 0.1;
      for (let i = 0; i < Math.ceil(quick * 240); i++) {
        const next = stepPendulum(s, p, 1 / 240);
        meter.push(s, next);
        s = next;
      }
      expect(meter.period).not.toBeNull();
      expect(meter.period! / exactPeriod(1, 9.81, deg(amplitude))).toBeCloseTo(1, 3);
    }
  });
});
