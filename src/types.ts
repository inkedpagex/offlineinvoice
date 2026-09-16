export type PaperFormat = 'A4' | 'A5' | 'thermal80';

export interface Product {
  id: string;
  name: string;
  baseName?: string;
  mrp?: number;
  rate: number;
  cfcRate?: number;
  pacRate?: number;
  packaging?: string;
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
}

export interface EstimateItem {
  id: string;
  description: string;
  qty: number | '';
  rate: number | '';
  amount: number;
}

export interface ActiveEstimate {
  estimateNumber: string;
  date: string;
  customerName: string;
  customerContact: string;
  items: EstimateItem[];
  discount: number | '';
  notes: string;
}

export interface SavedEstimate {
  id: string;
  estimateNumber: string;
  date: string;
  customerName: string;
  customerContact: string;
  items: EstimateItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  notes: string;
  createdAt: string;
}
