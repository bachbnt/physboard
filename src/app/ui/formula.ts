import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import katex from 'katex';

/**
 * Renders a LaTeX formula with KaTeX. The formulas are constants written in this codebase, never
 * user input, which is why the output is trusted instead of being run through the sanitizer
 * (which would strip the markup KaTeX needs).
 */
@Component({
  selector: 'app-formula',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<span [innerHTML]="html()"></span>`,
})
export class Formula {
  readonly tex = input.required<string>();
  readonly display = input(true);

  private readonly sanitizer = inject(DomSanitizer);
  protected readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      katex.renderToString(this.tex(), { displayMode: this.display(), throwOnError: false, output: 'htmlAndMathml' }),
    ),
  );
}
