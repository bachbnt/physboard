import { TestBed } from '@angular/core/testing';
import { Challenge, ChallengePanel, isCorrect, parseAnswer } from './challenge-panel';
import { I18n } from '../i18n/i18n';
import { splitSubscripts } from './rich-text';

describe('parseAnswer', () => {
  it('accepts a decimal comma or point, and ignores spaces', () => {
    expect(parseAnswer('35,4')).toBe(35.4);
    expect(parseAnswer(' 35.4 ')).toBe(35.4);
    expect(parseAnswer('-7,5')).toBe(-7.5);
  });

  it('rejects empty and non-numeric input', () => {
    expect(parseAnswer('')).toBeNaN();
    expect(parseAnswer('abc')).toBeNaN();
  });
});

describe('isCorrect', () => {
  it('allows the relative tolerance either side', () => {
    const c = { answer: 100, tolerance: 0.02 };
    expect(isCorrect(101.9, c)).toBe(true);
    expect(isCorrect(98.1, c)).toBe(true);
    expect(isCorrect(102.5, c)).toBe(false);
  });

  it('demands an exact match when tolerance is zero (counting answers)', () => {
    expect(isCorrect(7, { answer: 7, tolerance: 0 })).toBe(true);
    expect(isCorrect(6, { answer: 7, tolerance: 0 })).toBe(false);
  });

  it('works for negative answers', () => {
    expect(isCorrect(-7.5, { answer: -7.5, tolerance: 0.02 })).toBe(true);
    expect(isCorrect(7.5, { answer: -7.5, tolerance: 0.02 })).toBe(false);
  });
});

describe('splitSubscripts', () => {
  it('turns Z_L into a plain Z and a subscript L', () => {
    expect(splitSubscripts('Z_L = ωL')).toEqual([
      { text: 'Z', sub: false },
      { text: 'L', sub: true },
      { text: ' = ωL', sub: false },
    ]);
  });

  it('handles words as subscripts and text without any', () => {
    expect(splitSubscripts('v_thoát')).toEqual([
      { text: 'v', sub: false },
      { text: 'thoát', sub: true },
    ]);
    expect(splitSubscripts('plain')).toEqual([{ text: 'plain', sub: false }]);
  });
});

describe('ChallengePanel', () => {
  const challenge: Challenge = { params: { l: 1, th: 5, g: 9.81, b: 0 }, answer: 2.01, unit: 's', tolerance: 0.02, digits: 2 };

  async function setup() {
    TestBed.inject(I18n).setLang('en');
    const fixture = TestBed.createComponent(ChallengePanel);
    fixture.componentRef.setInput('challenges', [challenge]);
    fixture.componentRef.setInput('i18nKey', 'sims.pendulum.challenges');
    await fixture.whenStable();
    return fixture;
  }

  const type = async (fixture: Awaited<ReturnType<typeof setup>>, value: string) => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('.btn-yellow') as HTMLButtonElement).click();
    await fixture.whenStable();
    return (fixture.nativeElement.querySelector('p[aria-live]') as HTMLElement).textContent!.trim();
  };

  it('fills the question with the preset values', async () => {
    const fixture = await setup();
    expect(fixture.nativeElement.textContent).toContain('A pendulum 1 m long');
    expect(fixture.nativeElement.textContent).toContain('g = 9.81 m/s²');
  });

  it('confirms a right answer, rejects a wrong one, and flags non-numbers', async () => {
    const fixture = await setup();
    expect(await type(fixture, '2,0')).toContain('Correct');
    expect(await type(fixture, '5')).toContain('Not quite');
    expect(await type(fixture, 'abc')).toContain('Enter a number');
  });

  it('emits the preset when asked to set the values', async () => {
    const fixture = await setup();
    const emitted: unknown[] = [];
    fixture.componentInstance.applied.subscribe((v) => emitted.push(v));
    (fixture.nativeElement.querySelector('.btn-ghost') as HTMLButtonElement).click();
    expect(emitted).toEqual([challenge.params]);
  });

  it('reveals the answer and its explanation on request', async () => {
    const fixture = await setup();
    (fixture.nativeElement.querySelector('.link-quiet') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Answer: 2.01 s');
  });
});
