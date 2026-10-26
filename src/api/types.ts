/** Shapes returned by erp-billing-api. Money values are 2-decimal strings, e.g. "11800.00". */

export type InvoiceStatus = 'draft' | 'issued' | 'partly_paid' | 'paid';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  gstNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customer: { id: number; name: string; email: string } | null;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}

export interface InvoicePayment {
  id: number;
  date: string;
  amount: string;
  method: PaymentMethod;
  referenceNumber: string | null;
}

export interface InvoiceJournalEntry {
  id: number;
  date: string;
  description: string;
  paymentId: number | null;
  lines: { accountCode: string | null; accountName: string | null; debit: string; credit: string }[];
}

export interface InvoiceDetail extends Omit<InvoiceSummary, 'customer'> {
  customer: { id: number; name: string; email: string; phone: string; gstNumber: string | null } | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  journalEntries: InvoiceJournalEntry[];
}

export interface InvoiceLinePayload {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface CreateInvoicePayload {
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceLinePayload[];
  issue?: boolean;
}

export interface InvoiceListFilters {
  status?: InvoiceStatus;
  customerId?: number;
}