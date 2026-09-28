import type { ExtractedData } from '../types/receipt';

// `body` of the extractText WebSocket message (Backend/lambda_s3_textract.py).
// Success and failure bodies have different shapes.
export interface ExtractionBody {
  statusCode?: number;
  data?: {
    store_name?: string;
    date?: string;
    total?: string;
    items?: { item_name?: string; price?: string }[];
  }[];
  error?: { message?: string };
  body?: { error?: string };
}

// Textract returns money as strings like "$1,234.50"; parse once at ingestion.
export function parseMoney(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function toExtractedData(fileId: string, body: ExtractionBody): ExtractedData {
  const receipt = body.statusCode === 200 ? body.data?.[0] : undefined;
  if (!receipt) {
    return {
      fileId,
      total: null,
      items: [],
      error: body.error?.message ?? body.body?.error ?? 'Could not read this receipt.',
    };
  }
  return {
    fileId,
    merchant: receipt.store_name,
    date: receipt.date,
    total: parseMoney(receipt.total),
    items: (receipt.items ?? []).map(item => ({
      name: item.item_name ?? '',
      price: parseMoney(item.price),
    })),
  };
}

const CSV_HEADER = ['Merchant', 'Date', 'Subtotal', 'Tax', 'Total', 'Item', 'Price'];

function csvField(value: string | undefined): string {
  if (value === undefined) return '';
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : value.toFixed(2);
}

export function buildCsv(receipts: ExtractedData[]): string {
  const rows = [CSV_HEADER.join(',')];
  for (const r of receipts.filter(r => !r.error)) {
    const base = [
      csvField(r.merchant), csvField(r.date),
      csvMoney(r.subtotal), csvMoney(r.tax), csvMoney(r.total),
    ];
    if (r.items.length === 0) {
      rows.push([...base, '', ''].join(','));
    }
    for (const item of r.items) {
      rows.push([...base, csvField(item.name), csvMoney(item.price)].join(','));
    }
  }
  return rows.join('\n') + '\n';
}

export function buildClipboardText(r: ExtractedData): string {
  return [
    `Merchant: ${r.merchant ?? 'Unknown'}`,
    `Date: ${r.date ?? 'N/A'}`,
    `Subtotal: ${formatMoney(r.subtotal)}`,
    `Tax: ${formatMoney(r.tax)}`,
    `Total: ${formatMoney(r.total)}`,
    '',
    'Items:',
    ...r.items.map(item => `${item.name} - Price: ${formatMoney(item.price)}`),
  ].join('\n');
}
