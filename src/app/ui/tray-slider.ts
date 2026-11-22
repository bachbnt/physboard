import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { I18n } from '../i18n/i18n';

let nextId = 0;

/** A labelled range input styled as a chalk line with a chalk-lump handle. */
@Component({
  selector: 'app-tray-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="mb-1.5 flex items-baseline justify-between gap-3">
      <label [for]="id" class="text-[0.95rem] leading-snug text-chalk-dim">{{ label() }}</label>
      <output [for]="id" class="shrink-0 font-chalk text-[1.35rem] leading-none text-chalk">
        {{ display() }}<span class="ml-1 text-chalk-dim">{{ unit() }}</span>
      </output>
    </div>
    <input
      type="range"
      [id]="id"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [style.--fill.%]="fill()"
      (input)="onInput($event)"
    />
  `,
  styles: `
    input[type='range'] {
      appearance: none;
      display: block;
      width: 100%;
      height: 28px;
      margin: 0;
      background: transparent;
      cursor: pointer;
    }
    input[type='range']::-webkit-slider-runnable-track {
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(to right, #f3d56a var(--fill), rgba(239, 236, 224, 0.3) var(--fill));
    }
    input[type='range']::-moz-range-track {
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(to right, #f3d56a var(--fill), rgba(239, 236, 224, 0.3) var(--fill));
    }
    input[type='range']::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      margin-top: -8.5px;
      border-radius: 50% 46% 52% 48%;
      background: radial-gradient(circle at 35% 30%, #fffdf2, #d9d4be 70%);
      border: 0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    }
    input[type='range']::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50% 46% 52% 48%;
      background: radial-gradient(circle at 35% 30%, #fffdf2, #d9d4be 70%);
      border: 0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    }
    input[type='range']:focus-visible {
      outline: 2px solid #f3d56a;
      outline-offset: 2px;
      border-radius: 4px;
    }
  `,
})
export class TraySlider {
  readonly label = input.required<string>();
  readonly unit = input('');
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly step = input(1);
  /** Decimal places shown next to the label. */
  readonly digits = input(0);
  readonly value = model.required<number>();

  protected readonly id = `slider-${nextId++}`;
  private readonly i18n = inject(I18n);
  protected readonly display = computed(() => this.i18n.fmt(this.value(), this.digits()));
  protected readonly fill = computed(() => ((this.value() - this.min()) / (this.max() - this.min())) * 100);

  protected onInput(event: Event) {
    this.value.set(Number((event.target as HTMLInputElement).value));
  }
}
