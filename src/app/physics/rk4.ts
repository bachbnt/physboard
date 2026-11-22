/** Time derivative of a state vector: given the state and time, returns d(state)/dt. */
export type Derivative = (state: readonly number[], t: number) => number[];

/**
 * One classical fourth-order Runge–Kutta step.
 *
 * Fourth order keeps the energy of an oscillator or an orbit steady over many cycles, which is
 * what lets the simulations be trusted as physics and not only as animation.
 */
export function rk4Step(state: readonly number[], t: number, dt: number, f: Derivative): number[] {
  const k1 = f(state, t);
  const k2 = f(state.map((v, i) => v + 0.5 * dt * k1[i]), t + dt / 2);
  const k3 = f(state.map((v, i) => v + 0.5 * dt * k2[i]), t + dt / 2);
  const k4 = f(state.map((v, i) => v + dt * k3[i]), t + dt);
  return state.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
