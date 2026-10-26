import type { PaymentMethod } from '../api/types';

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'upi'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
};

/** Matches the server: positive, at most 2 decimal places. */
export const TWO_DP = /^\d+(\.\d{1,2})?$/;