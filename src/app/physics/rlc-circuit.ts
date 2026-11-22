export interface RlcParams {
  /** Resistance, Ω. */
  resistance: number;
  /** Inductance, H. */
  inductance: number;
  /** Capacitance, F. */
  capacitance: number;
  /** Source frequency, Hz. */
  frequency: number;
  /** RMS source voltage, V. */
  voltage: number;
}

export interface RlcResult {
  omega: number;
  /** Inductive reactance ωL, Ω. */
  xl: number;
  /** Capacitive reactance 1/(ωC), Ω. */
  xc: number;
  /** Impedance, Ω. */
  z: number;
  /** RMS current, A. */
  current: number;
  /** Phase of voltage ahead of current, rad. Positive when the circuit is inductive. */
  phase: number;
  powerFactor: number;
  /** Average power, W. */
  power: number;
  /** RMS voltages across R, L and C, V. */
  ur: number;
  ul: number;
  uc: number;
}

/** Series RLC circuit driven by a sinusoidal source. */
export function analyzeRlc(p: RlcParams): RlcResult {
  const omega = 2 * Math.PI * p.frequency;
  const xl = omega * p.inductance;
  const xc = 1 / (omega * p.capacitance);
  const z = Math.hypot(p.resistance, xl - xc);
  const current = p.voltage / z;
  const phase = Math.atan2(xl - xc, p.resistance);
  const powerFactor = p.resistance / z;
  return {
    omega,
    xl,
    xc,
    z,
    current,
    phase,
    powerFactor,
    power: current * current * p.resistance,
    ur: current * p.resistance,
    ul: current * xl,
    uc: current * xc,
  };
}

/** Resonant frequency f₀ = 1 / (2π√(LC)), Hz. */
export const resonantFrequency = (inductance: number, capacitance: number) =>
  1 / (2 * Math.PI * Math.sqrt(inductance * capacitance));

/** Quality factor Q = (1/R)·√(L/C). */
export const qualityFactor = (resistance: number, inductance: number, capacitance: number) =>
  Math.sqrt(inductance / capacitance) / resistance;
