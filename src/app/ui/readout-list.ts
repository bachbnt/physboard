import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RichText } from './rich-text';

export interface ReadoutRow {
  label: string;
  value: string;
  unit?: string;
}

/** Measurements written like a table of contents: the label, a dotted leader, then the value. */
@Component({
  selector: 'app-readout-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RichText],
  template: `
    <dl class="space-y-1.5" aria-live="off">
      @for (row of rows(); track row.label) {
        <div class="flex items-baseline gap-2.5">
          <dt class="text-chalk-dim"><app-rich-text [text]="row.label" /></dt>
          <span class="flex-1 -translate-y-1 border-b-2 border-dotted border-chalk/25" aria-hidden="true"></span>
          <dd class="m-0 whitespace-nowrap font-chalk text-[1.55rem] leading-none text-chalk">
            {{ row.value }}@if (row.unit) {<span class="ml-1 text-chalk-dim">{{ row.unit }}</span>}
          </dd>
        </div>
      }
    </dl>
  `,
})
export class ReadoutList {
  readonly rows = input.required<readonly ReadoutRow[]>();
}
