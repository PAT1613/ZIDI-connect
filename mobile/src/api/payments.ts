import { api } from './client';
import { ListParams, Paginated } from './types';

export interface Payment {
  id: string | number;
  invoice?: string | number;
  invoice_number?: string;
  amount?: string | number;
  method?: 'mobile_money' | 'bank_transfer' | 'cash' | string;
  reference?: string;
  paid_at?: string;
  [key: string]: unknown;
}

export async function listPayments(params: ListParams = {}): Promise<Paginated<Payment>> {
  const { data } = await api.get<Paginated<Payment>>('/payments/', { params });
  return data;
}

export async function getPayment(id: string | number): Promise<Payment> {
  const { data } = await api.get<Payment>(`/payments/${id}/`);
  return data;
}

export async function createPayment(payload: Partial<Payment>): Promise<Payment> {
  const { data } = await api.post<Payment>('/payments/', payload);
  return data;
}

export async function deletePayment(id: string | number): Promise<void> {
  await api.delete(`/payments/${id}/`);
}
