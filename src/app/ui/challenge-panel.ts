import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output } from '@angular/core';
import { I18n } from '../i18n/i18n';
import { RichText } from './rich-text';

/** A practice question: a preset to load into the simulation and a numeric answer to check. */
export interface Challenge {
  /** Values to set on the simulation, keyed by the simulation's URL parameter names. */
  readonly params: Readonly<Record<string, number>>;
  readonly answer: number;
  /** Shown after the input and after the revealed answer. */
  readonly unit: string;
  /** Accepted relative error, such as 0.02 for 2%. */
  readonly tolerance: number;
  /** Decimal places used when showing the answer. */
  readonly digits: number;
}

interface ChallengeState {
  input: string;
  status: 'idle' | 'right' | 'wrong' | 'invalid';
  revealed: boolean;
}

/** Accepts both `35.4` and `35,4`, since Vietnamese writes the decimal comma. */
export function parseAnswer(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
  return cleaned === '' ? NaN : Number(cleaned);
}

export function isCorrect(value: number, challenge: Pick<Challenge, 'answer' | 'tolerance'>): boolean {
  const allowed = Math.max(Math.abs(challenge.answer) * challenge.tolerance, 1e-9);
  return Math.abs(value - challenge.answer) <= allowed;
}

@Component({
  selector: 'app-challenge-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RichText],
  template: `
    <ol class="space-y-8">
      @for (c of challenges(); track $index) {
        <li class="max-w-[62ch]">
          <p class="leading-relaxed"><app-rich-text [text]="question(c, $index)" /></p>
          <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button type="button" class="btn-ghost" (click)="applied.emit(c.params)">
              {{ i18n.t('challenge.setValues') }}
            </button>
            <label class="sr-only" [for]="'answer-' + $index">{{ i18n.t('challenge.answer') }}</label>
            <input
              [id]="'answer-' + $index"
              class="answer-input"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              [placeholder]="i18n.t('challenge.answer')"
              [value]="states()[$index].input"
              (input)="setInput($index, $event)"
              (keydown.enter)="check($index)"
            />
            @if (c.unit) {
              <span class="text-chalk-dim">{{ c.unit }}</span>
            }
            <button type="button" class="btn-ghost btn-yellow" (click)="check($index)">{{ i18n.t('challenge.check') }}</button>
          </div>

          <p class="mt-2.5 min-h-6 leading-snug" aria-live="polite">
            @switch (states()[$index].status) {
              @case ('right') {
                <span class="text-chalk-mint">✓ {{ i18n.t('challenge.correct') }}</span>
              }
              @case ('wrong') {
                <span class="text-chalk-rose">{{ i18n.t('challenge.wrong') }}</span>
              }
              @case ('invalid') {
                <span class="text-chalk-rose">{{ i18n.t('challenge.invalid') }}</span>
              }
            }
          </p>

          @if (states()[$index].revealed) {
            <div class="mt-1 border-l-2 border-chalk-yellow/70 pl-4">
              <p class="font-chalk text-[1.3rem] text-chalk-yellow">
                {{ i18n.t('challenge.reveal', { value: i18n.fmt(c.answer, c.digits) + (c.unit ? ' ' + c.unit : '') }) }}
              </p>
              <p class="mt-1 leading-relaxed text-chalk-dim"><app-rich-text [text]="i18n.t(i18nKey() + '.' + $index + '.why')" /></p>
            </div>
          } @else {
            <button type="button" class="link-quiet" (click)="reveal($index)">{{ i18n.t('challenge.showAnswer') }}</button>
          }
        </li>
      }
    </ol>
  `,
})
export class ChallengePanel {
  readonly challenges = input.required<readonly Challenge[]>();
  /** Dictionary key whose children are `0`, `1`, … each holding `q` and `why`. */
  readonly i18nKey = input.required<string>();
  /** Fires with a challenge's preset so the page can load it into its sliders. */
  readonly applied = output<Readonly<Record<string, number>>>();

  protected readonly i18n = inject(I18n);
  /** One state per challenge; rebuilt if the list of challenges changes. */
  protected readonly states = linkedSignal<readonly Challenge[], ChallengeState[]>({
    source: this.challenges,
    computation: (list) => list.map(() => ({ input: '', status: 'idle', revealed: false })),
  });

  protected question(c: Challenge, index: number): string {
    const values: Record<string, string> = {};
    for (const [name, value] of Object.entries(c.params)) values[name] = this.i18n.fmt(value, 3);
    return this.i18n.t(`${this.i18nKey()}.${index}.q`, values);
  }

  private update(index: number, patch: Partial<ChallengeState>) {
    this.states.update((all) => all.map((state, i) => (i === index ? { ...state, ...patch } : state)));
  }

  protected setInput(index: number, event: Event) {
    this.update(index, { input: (event.target as HTMLInputElement).value, status: 'idle' });
  }

  protected check(index: number) {
    const value = parseAnswer(this.states()[index].input);
    if (Number.isNaN(value)) return this.update(index, { status: 'invalid' });
    this.update(index, { status: isCorrect(value, this.challenges()[index]) ? 'right' : 'wrong' });
  }

  protected reveal(index: number) {
    this.update(index, { revealed: true });
  }
}
