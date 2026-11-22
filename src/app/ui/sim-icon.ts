import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SimId } from '../catalog';

/** A small chalk doodle for each simulation. */
@Component({
  selector: 'app-sim-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#efece0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (id()) {
        @case ('projectile') {
          <path d="M6 54h52" opacity="0.5" />
          <path d="M8 52C16 14 40 6 56 52" stroke-dasharray="1 5" />
          <circle cx="30" cy="16" r="5" fill="#f3d56a" stroke="#f3d56a" />
          <path d="M30 16l11 3" stroke="#f0929f" />
        }
        @case ('pendulum') {
          <path d="M16 8h32" />
          <path d="M32 8l-14 36" stroke="#f3d56a" />
          <circle cx="16" cy="48" r="7" fill="#efece0" />
          <path d="M32 8v42" stroke-dasharray="1 5" opacity="0.5" />
          <path d="M20 55c8 5 16 5 24 0" stroke-dasharray="1 4" opacity="0.5" />
        }
        @case ('interference') {
          <circle cx="12" cy="32" r="2.5" fill="#8fc7ea" stroke="#8fc7ea" />
          <circle cx="12" cy="52" r="2.5" fill="#8fc7ea" stroke="#8fc7ea" />
          <path d="M20 22a14 14 0 0 1 0 20M30 14a24 24 0 0 1 0 36M40 8a34 34 0 0 1 0 48" stroke="#8fc7ea" />
          <path d="M20 42a14 14 0 0 1 0 20M30 34a24 24 0 0 1 0 36" stroke="#8fc7ea" opacity="0.55" />
        }
        @case ('orbit') {
          <ellipse cx="32" cy="32" rx="25" ry="14" transform="rotate(-18 32 32)" stroke-dasharray="1 5" />
          <circle cx="32" cy="32" r="8" fill="#8fc7ea" stroke="#8fc7ea" />
          <circle cx="53" cy="24" r="3.5" fill="#f3d56a" stroke="#f3d56a" />
        }
        @case ('rlc') {
          <path d="M4 34c6-24 10-24 16 0s10 24 16 0 10-24 16 0 4 8 8 6" stroke="#f0929f" />
          <path d="M4 34c6-14 10-14 16 0s10 14 16 0 10-14 16 0 4 5 8 4" stroke="#f3d56a" opacity="0.7" />
        }
        @case ('lens') {
          <path d="M6 32h52" opacity="0.5" />
          <path d="M32 8c-9 10-9 38 0 48 9-10 9-38 0-48z" />
          <path d="M6 22l26 0 22 10M6 42l26 0 22-10" stroke="#8fc7ea" />
        }
      }
    </svg>
  `,
})
export class SimIcon {
  readonly id = input.required<SimId>();
}
