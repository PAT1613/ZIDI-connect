import { api } from './client';
import { ListParams, Paginated } from './types';

export type CustomerChannelPref = 'all' | 'sms' | 'email' | 'in_app';

export interface Customer {
  id: string | number;
  customer_code?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  national_id?: string;
  address?: string;
  notes?: string;
  status?: string;
  preferred_channel?: CustomerChannelPref;
  registration_date?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export async function listCustomers(params: ListParams = {}): Promise<Paginated<Customer>> {
  const { data } = await api.get<Paginated<Customer>>('/customers/', { params });
  return data;
}

export async function getCustomer(id: string | number): Promise<Customer> {
  const { data } = await api.get<Customer>(`/customers/${id}/`);
  return data;
}

export async function createCustomer(payload: Partial<Customer>): Promise<Customer> {
  const { data } = await api.post<Customer>('/customers/', payload);
  return data;
}

export async function updateCustomer(id: string | number, payload: Partial<Customer>): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/customers/${id}/`, payload);
  return data;
}

export async function deleteCustomer(id: string | number): Promise<void> {
  await api.delete(`/customers/${id}/`);
}

export async function deactivateCustomer(id: string | number): Promise<Customer> {
  const { data } = await api.post<Customer>(`/customers/${id}/deactivate/`);
  return data;
}

export async function purgeCustomer(id: string | number): Promise<void> {
  await api.delete(`/customers/${id}/purge/`);
}
