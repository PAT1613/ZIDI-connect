import { api, downloadToCache } from './client';
import { ListParams, Paginated } from './types';

export interface Invoice {
  id: string | number;
  invoice_number?: string;
  customer?: string | number;
  customer_name?: string;
  subscription?: string | number;
  amount?: string | number;
  total?: string | number;
  status?: string;
  due_date?: string;
  issued_at?: string;
  paid_at?: string | null;
  [key: string]: unknown;
}

export async function listInvoices(params: ListParams = {}): Promise<Paginated<Invoice>> {
  const { data } = await api.get<Paginated<Invoice>>('/invoices/', { params });
  return data;
}

export async function getInvoice(id: string | number): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${id}/`);
  return data;
}

export async function createInvoice(payload: Partial<Invoice>): Promise<Invoice> {
  const { data } = await api.post<Invoice>('/invoices/', payload);
  return data;
}

export async function updateInvoice(id: string | number, payload: Partial<Invoice>): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(`/invoices/${id}/`, payload);
  return data;
}

export async function deleteInvoice(id: string | number): Promise<void> {
  await api.delete(`/invoices/${id}/`);
}

export async function downloadInvoicePdf(id: string | number, invoiceNumber?: string): Promise<string> {
  const filename = `invoice-${invoiceNumber || id}.pdf`;
  return downloadToCache(`/invoices/${id}/pdf/`, filename);
}
