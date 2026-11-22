import { thinLensImage } from './thin-lens';

describe('thinLensImage', () => {
  it('forms a real, inverted, reduced image beyond 2f', () => {
    const i = thinLensImage(10, 30);
    expect(i.distance).toBeCloseTo(15, 9);
    expect(i.magnification).toBeCloseTo(-0.5, 9);
    expect(i.real && i.inverted && !i.enlarged).toBe(true);
  });

  it('forms a real image the same size at 2f', () => {
    const i = thinLensImage(10, 20);
    expect(i.distance).toBeCloseTo(20, 9);
    expect(i.magnification).toBeCloseTo(-1, 9);
  });

  it('forms a virtual, upright, enlarged image inside f (a magnifier)', () => {
    const i = thinLensImage(10, 5);
    expect(i.distance).toBeCloseTo(-10, 9);
    expect(i.magnification).toBeCloseTo(2, 9);
    expect(!i.real && !i.inverted && i.enlarged).toBe(true);
  });

  it('places the image at infinity when the object is at the focal point', () => {
    expect(thinLensImage(10, 10).atInfinity).toBe(true);
  });

  it('always makes a virtual, upright, reduced image with a diverging lens', () => {
    const i = thinLensImage(-10, 30);
    expect(i.distance).toBeCloseTo(-7.5, 9);
    expect(i.magnification).toBeCloseTo(0.25, 9);
    expect(!i.real && !i.inverted && !i.enlarged).toBe(true);
  });

  it('satisfies 1/f = 1/d + 1/d′', () => {
    const f = 12;
    const d = 47;
    expect(1 / d + 1 / thinLensImage(f, d).distance).toBeCloseTo(1 / f, 12);
  });
});
