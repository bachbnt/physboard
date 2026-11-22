import { analyzeRlc, qualityFactor, resonantFrequency, RlcParams } from './rlc-circuit';

const circuit: RlcParams = { resistance: 50, inductance: 0.1, capacitance: 20e-6, frequency: 50, voltage: 12 };

describe('resonance', () => {
  const f0 = resonantFrequency(circuit.inductance, circuit.capacitance);

  it('is 1/(2π√(LC))', () => {
    expect(f0).toBeCloseTo(112.54, 1);
  });

  it('makes the reactances cancel so that Z = R and the phase is zero', () => {
    const r = analyzeRlc({ ...circuit, frequency: f0 });
    expect(r.xl).toBeCloseTo(r.xc, 9);
    expect(r.z).toBeCloseTo(circuit.resistance, 9);
    expect(r.phase).toBeCloseTo(0, 9);
    expect(r.powerFactor).toBeCloseTo(1, 9);
  });

  it('gives the largest current at resonance', () => {
    const peak = analyzeRlc({ ...circuit, frequency: f0 }).current;
    for (const f of [0.5 * f0, 0.9 * f0, 1.1 * f0, 2 * f0]) {
      expect(analyzeRlc({ ...circuit, frequency: f }).current).toBeLessThan(peak);
    }
  });

  it('has Q equal to the voltage magnification across L at resonance', () => {
    const r = analyzeRlc({ ...circuit, frequency: f0 });
    expect(r.ul / circuit.voltage).toBeCloseTo(qualityFactor(50, 0.1, 20e-6), 9);
  });
});

describe('analyzeRlc', () => {
  it('is capacitive below resonance and inductive above it', () => {
    expect(analyzeRlc({ ...circuit, frequency: 50 }).phase).toBeLessThan(0);
    expect(analyzeRlc({ ...circuit, frequency: 300 }).phase).toBeGreaterThan(0);
  });

  it('gives Z ≈ 137.2 Ω at 50 Hz', () => {
    expect(analyzeRlc(circuit).z).toBeCloseTo(137.2, 1);
  });

  it('dissipates power only in the resistor: P = I²R = U·I·cosφ', () => {
    const r = analyzeRlc(circuit);
    expect(r.power).toBeCloseTo(circuit.voltage * r.current * r.powerFactor, 9);
  });
});
