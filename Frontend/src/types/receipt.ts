export interface LineItem {
  name: string;
  price: number | null;
}

export interface ExtractedData {
  fileId: string;
  merchant?: string;
  date?: string;
  total: number | null;
  paymentMethod?: string;
  items: LineItem[];
  // Set when extraction failed; the other fields are empty.
  error?: string;
}
