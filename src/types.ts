export type PaperFormat = 'A4' | 'A5' | 'thermal80' | 'A4_2in1';

export interface Product {
  id: string;
  name: string;
  baseName?: string;
  mrp?: number;
  rate: number;
  cfcRate?: number;
  pacRate?: number;
  packaging?: string;
  unit?: string;
  caseCount?: number;
  cfcUnit?: string;
}

export interface ShopProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  estimateTitle: string;
  defaultTerms: string;
  paperFormat: PaperFormat;
  currencySymbol: string;
  logoUrl?: string;
  upiId?: string;
  qrCodeUrl?: string;
}

export interface EstimateItem {
  id: string;
  description: string;
  dp?: string;
  cfc?: number | string;
  qty: number | string;
  rate: number | string;
  amount: number;
  unit?: string;
  caseCount?: number;
  looseQty?: number;
}

export interface ActiveEstimate {
  estimateNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerContact: string;
  dpName?: string;
  items: EstimateItem[];
  discount: number | '';
  notes: string;
}

export interface SavedEstimate {
  id: string;
  estimateNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerContact: string;
  dpName?: string;
  items: EstimateItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  notes: string;
  createdAt: string;
}
