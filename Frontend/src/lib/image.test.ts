import { describe, expect, it } from 'vitest';
import { fitWithin, jpegName, needsShrink } from './image';

const MB = 1024 * 1024;

describe('fitWithin', () => {
  it('scales the long edge down to the limit, keeping aspect ratio', () => {
    expect(fitWithin(3000, 4000, 2500)).toEqual({ width: 1875, height: 2500 });
    expect(fitWithin(8064, 6048, 2500)).toEqual({ width: 2500, height: 1875 });
  });

  it('never upscales', () => {
    expect(fitWithin(1200, 1600, 2500)).toEqual({ width: 1200, height: 1600 });
  });
});

describe('needsShrink', () => {
  it('shrinks images whose long edge is over the limit', () => {
    expect(needsShrink(3024, 4032, 1 * MB)).toBe(true);
  });

  it('shrinks small-dimension images that are still heavy', () => {
    expect(needsShrink(2000, 2400, 5 * MB)).toBe(true);
  });

  it('leaves small, light images alone', () => {
    expect(needsShrink(1200, 1600, 800 * 1024)).toBe(false);
  });
});

describe('jpegName', () => {
  it('keeps names that are already jpeg', () => {
    expect(jpegName('IMG_0001.jpg')).toBe('IMG_0001.jpg');
    expect(jpegName('scan.JPEG')).toBe('scan.JPEG');
  });

  it('swaps other extensions for .jpg', () => {
    expect(jpegName('screenshot.png')).toBe('screenshot.jpg');
    expect(jpegName('noext')).toBe('noext.jpg');
  });
});
