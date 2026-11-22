import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Formula } from './formula';

export interface FormulaItem {
  tex: string;
  caption: string;
}

@Component({
  selector: 'app-formula-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Formula],
  template: `
    <ul class="space-y-5">
      @for (item of items(); track item.tex) {
        <li>
          <p class="text-[0.95rem] text-chalk-dim">{{ item.caption }}</p>
          <app-formula [tex]="item.tex" />
        </li>
      }
    </ul>
  `,
})
export class FormulaList {
  readonly items = input.required<readonly FormulaItem[]>();
}
