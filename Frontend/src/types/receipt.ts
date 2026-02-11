export interface LineItem {
  name: string;
  price: number;
}

export interface ExtractedData {
  fileId: string;
  merchant?: string;
  date?: string;
  total: number;
  tax?: number;
  subtotal?: number;
  paymentMethod?: string;
  items: LineItem[];
}
