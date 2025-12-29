export interface LineItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ExtractedData {
  receiptId: string;
  merchant: string;
  date: string;
  total: number;
  tax?: number;
  subtotal?: number;
  paymentMethod?: string;
  items: LineItem[];
}
