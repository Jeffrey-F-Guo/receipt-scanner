import { describe, expect, it } from 'vitest';
import type { ExtractedData } from '../types/receipt';
import {
  buildClipboardText,
  buildCsv,
  formatMoney,
  parseMoney,
  toExtractedData,
} from './receipt';

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
    expect(formatMoney(NaN)).toBe('—');
  });
});

describe('toExtractedData', () => {
  it('maps a successful body, including date and parsed money', () => {
    const result = toExtractedData('f1', {
      statusCode: 200,
      data: [{
        store_name: "Trader Joe's",
        date: '12/20/2025',
        total: '$23.47',
        items: [{ item_name: 'BANANAS', price: '$0.95' }],
      }],
    });
    expect(result).toEqual({
      fileId: 'f1',
      merchant: "Trader Joe's",
      date: '12/20/2025',
      total: 23.47,
      items: [{ name: 'BANANAS', price: 0.95 }],
    });
  });

  it('returns an error for a 422 body', () => {
    const result = toExtractedData('f1', {
      statusCode: 422,
      error: { message: 'No receipt data found in image.' },
    });
    expect(result).toEqual({
      fileId: 'f1', total: null, items: [], error: 'No receipt data found in image.',
    });
  });

  it('returns an error for a 500 body', () => {
    const result = toExtractedData('f1', {
      statusCode: 500,
      body: { error: 'Internal processing error.' },
    });
    expect(result.error).toBe('Internal processing error.');
  });

  it('falls back to a generic error when data is empty', () => {
    expect(toExtractedData('f1', { statusCode: 200, data: [] }).error)
      .toBe('Could not read this receipt.');
  });
});

const traderJoes: ExtractedData = {
  fileId: 'a',
  merchant: "Trader Joe's",
  date: '12/20/2025',
  total: 23.47,
  items: [
    { name: 'BANANAS', price: 0.95 },
    { name: 'MILK, "2%"', price: 5.49 },
  ],
};

describe('buildCsv', () => {
  it('writes one row per item with as many columns as the header', () => {
    expect(buildCsv([traderJoes])).toBe(
      'Merchant,Date,Total,Item,Price\n' +
      "Trader Joe's,12/20/2025,23.47,BANANAS,0.95\n" +
      'Trader Joe\'s,12/20/2025,23.47,"MILK, ""2%""",5.49\n',
    );
  });

  it('writes a single row for a receipt with no items', () => {
    const shop: ExtractedData = { fileId: 'b', merchant: 'Shop', total: 10, items: [] };
    expect(buildCsv([shop])).toBe(
      'Merchant,Date,Total,Item,Price\nShop,,10.00,,\n',
    );
  });

  it('skips receipts that failed extraction', () => {
    const failed: ExtractedData = { fileId: 'c', total: null, items: [], error: 'x' };
    expect(buildCsv([failed])).toBe('Merchant,Date,Total,Item,Price\n');
  });
});

describe('buildClipboardText', () => {
  it('formats a receipt with its items', () => {
    expect(buildClipboardText(traderJoes)).toBe(
      "Merchant: Trader Joe's\n" +
      'Date: 12/20/2025\n' +
      'Total: $23.47\n' +
      '\n' +
      'Items:\n' +
      'BANANAS - Price: $0.95\n' +
      'MILK, "2%" - Price: $5.49',
    );
  });
});
