export type SimId = 'projectile' | 'pendulum' | 'interference' | 'orbit' | 'rlc' | 'lens';
export type GroupId = 'mechanics' | 'waves' | 'electricity' | 'optics';

export interface SimInfo {
  id: SimId;
  group: GroupId;
}

/** Every simulation, in the order it appears on the home page. */
export const SIMS: readonly SimInfo[] = [
  { id: 'projectile', group: 'mechanics' },
  { id: 'orbit', group: 'mechanics' },
  { id: 'pendulum', group: 'waves' },
  { id: 'interference', group: 'waves' },
  { id: 'rlc', group: 'electricity' },
  { id: 'lens', group: 'optics' },
];

export const GROUPS: readonly GroupId[] = ['mechanics', 'waves', 'electricity', 'optics'];
