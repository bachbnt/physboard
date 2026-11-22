import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Text with subscripts: `Z_L` shows as Z with a small L below the line.
 * Dictionary strings use this plain form so translators never touch markup.
 */
@Component({
  selector: 'app-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (part of parts(); track $index) {@if (part.sub) {<sub class="text-[0.72em]">{{ part.text }}</sub>} @else {<span>{{ part.text }}</span>}}`,
})
export class RichText {
  readonly text = input.required<string>();

  protected readonly parts = computed(() => splitSubscripts(this.text()));
}

export interface TextPart {
  text: string;
  sub: boolean;
}

/** Splits `v_circular = √(GM/r)` into plain and subscript runs. */
export function splitSubscripts(value: string): TextPart[] {
  const parts: TextPart[] = [];
  const pattern = /_([\p{L}\p{N}]+)/gu;
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: value.slice(last, match.index), sub: false });
    parts.push({ text: match[1], sub: true });
    last = match.index + match[0].length;
  }
  if (last < value.length) parts.push({ text: value.slice(last), sub: false });
  return parts;
}
