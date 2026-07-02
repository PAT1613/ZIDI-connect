import { api } from './client';
import { ListParams, Paginated } from './types';

export interface Subscription {
  id: string | number;
  customer?: string | number;
  customer_name?: string;
  service?: string | number;
  service_name?: string;
  due_date?: string;
  next_renewal_at?: string;
  status?: string;
  auto_renew?: boolean;
  [key: string]: unknown;
}

export async function listSubscriptions(params: ListParams = {}): Promise<Paginated<Subscription>> {
  const { data } = await api.get<Paginated<Subscription>>('/subscriptions/', { params });
  return data;
}

export async function getSubscription(id: string | number): Promise<Subscription> {
  const { data } = await api.get<Subscription>(`/subscriptions/${id}/`);
  return data;
}

export async function createSubscription(payload: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/subscriptions/', payload);
  return data;
}

export async function updateSubscription(id: string | number, payload: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.patch<Subscription>(`/subscriptions/${id}/`, payload);
  return data;
}

export async function deleteSubscription(id: string | number): Promise<void> {
  await api.delete(`/subscriptions/${id}/`);
}

export async function renewSubscription(id: string | number): Promise<Subscription> {
  const { data } = await api.post<Subscription>(`/subscriptions/${id}/renew/`);
  return data;
}

export async function suspendSubscription(id: string | number): Promise<Subscription> {
  const { data } = await api.post<Subscription>(`/subscriptions/${id}/suspend/`);
  return data;
}

export async function terminateSubscription(id: string | number): Promise<Subscription> {
  const { data } = await api.post<Subscription>(`/subscriptions/${id}/terminate/`);
  return data;
}
