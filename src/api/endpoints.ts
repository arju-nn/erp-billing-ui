import { api } from './client';
import type {
  CreateInvoicePayload,
  Customer,
  InvoiceDetail,
  InvoiceListFilters,
  InvoiceSummary,
  OutstandingReport,
  RecordPaymentPayload,
  RecordPaymentResult,
  TrialBalance,
} from './types';

export const customersApi = {
  list: (signal?: AbortSignal) => api.get<Customer[]>('/customers', undefined, signal),
};

export const invoicesApi = {
  list: (filters: InvoiceListFilters, signal?: AbortSignal) =>
    api.get<InvoiceSummary[]>('/invoices', { status: filters.status, customerId: filters.customerId }, signal),
  get: (id: number, signal?: AbortSignal) => api.get<InvoiceDetail>(`/invoices/${id}`, undefined, signal),
  create: (payload: CreateInvoicePayload) => api.post<InvoiceDetail>('/invoices', payload),
  update: (id: number, payload: Omit<CreateInvoicePayload, 'issue'>) =>
    api.put<InvoiceDetail>(`/invoices/${id}`, payload),
  remove: (id: number) => api.del(`/invoices/${id}`),
  issue: (id: number) => api.post<InvoiceDetail>(`/invoices/${id}/issue`),
};

export const paymentsApi = {
  create: (payload: RecordPaymentPayload) => api.post<RecordPaymentResult>('/payments', payload),
};

export const reportsApi = {
  outstanding: (asOf: string | undefined, signal?: AbortSignal) =>
    api.get<OutstandingReport>('/reports/outstanding', { asOf }, signal),
  trialBalance: (asOf: string | undefined, signal?: AbortSignal) =>
    api.get<TrialBalance>('/reports/trial-balance', { asOf }, signal),
};