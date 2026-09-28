import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from './receipt';

describe('parseMoney', () => {
  it.each([
    ['$4.99', 4.99],
    ['$1,234.50', 1234.5],
    ['-15.00', -15],
    [' 4.99 ', 4.99],
    ['.99', 0.99],
    [12, 12],
  ])('parses %j as %d', (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  it.each([['abc'], [''], [undefined], [null], [NaN]])('returns null for %j', (raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats to two decimals with a dollar sign', () => {
    expect(formatMoney(4.5)).toBe('$4.50');
  });

  it('puts the minus sign before the dollar sign', () => {
    expect(formatMoney(-15)).toBe('-$15.00');
  });

  it('shows a dash for missing values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });
});
