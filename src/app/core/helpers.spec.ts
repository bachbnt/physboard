import { niceStep } from './nice-step';
import { readNumber } from './url-params';

describe('niceStep', () => {
  it('rounds to 1, 2 or 5 times a power of ten', () => {
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(37, 6)).toBe(5);
    expect(niceStep(1.2, 6)).toBe(0.2);
    expect(niceStep(1000, 4)).toBe(200);
  });

  it('copes with empty ranges', () => {
    expect(niceStep(0)).toBe(1);
  });
});

describe('readNumber', () => {
  it('uses the URL value when it is a number in range', () => {
    expect(readNumber('45', 30, 0, 90)).toBe(45);
  });

  it('clamps to the range', () => {
    expect(readNumber('500', 30, 0, 90)).toBe(90);
    expect(readNumber('-3', 30, 0, 90)).toBe(0);
  });

  it('falls back to the default for missing or junk values', () => {
    expect(readNumber(null, 30, 0, 90)).toBe(30);
    expect(readNumber('', 30, 0, 90)).toBe(30);
    expect(readNumber('abc', 30, 0, 90)).toBe(30);
  });
});
