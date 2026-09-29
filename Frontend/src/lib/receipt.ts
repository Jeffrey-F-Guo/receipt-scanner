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

const EXPORT_HEADER = ['Merchant', 'Date', 'Total', 'Item', 'Price'];

function exportMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : value.toFixed(2);
}

// Header plus one row per line item (merchant, date and total repeated); failed receipts skipped.
function exportRows(receipts: ExtractedData[]): string[][] {
  const rows = [EXPORT_HEADER];
  for (const r of receipts.filter(r => !r.error)) {
    const base = [r.merchant ?? '', r.date ?? '', exportMoney(r.total)];
    if (r.items.length === 0) {
      rows.push([...base, '', '']);
    }
    for (const item of r.items) {
      rows.push([...base, item.name, exportMoney(item.price)]);
    }
  }
  return rows;
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsv(receipts: ExtractedData[]): string {
  return exportRows(receipts).map(row => row.map(csvField).join(',')).join('\n') + '\n';
}

function tsvCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ');
}

// Summary fields as label/value rows, then an Item/Price table. Tab-separated so
// pasting into Google Sheets or Excel fills cells.
export function buildTsv(r: ExtractedData): string {
  const rows = [
    ['Merchant', r.merchant ?? ''],
    ['Date', r.date ?? ''],
    ['Total', exportMoney(r.total)],
    [],
    ['Item', 'Price'],
    ...r.items.map(item => [item.name, exportMoney(item.price)]),
  ];
  return rows.map(row => row.map(tsvCell).join('\t')).join('\n');
}
