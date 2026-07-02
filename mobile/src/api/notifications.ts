import { api } from './client';
import { ListParams, Paginated } from './types';

export interface Notification {
  id: string | number;
  channel: 'sms' | 'email' | 'in_app' | string;
  subject?: string;
  message: string;
  status?: string;
  delivery_status?: string;
  sent_at?: string;
  created_at?: string;
  read_at?: string | null;
  [key: string]: unknown;
}

export async function listNotifications(params: ListParams = {}): Promise<Paginated<Notification>> {
  const { data } = await api.get<Paginated<Notification>>('/notifications/', { params });
  return data;
}

export async function markNotificationRead(id: string | number): Promise<Notification> {
  const { data } = await api.post<Notification>(`/notifications/${id}/read/`);
  return data;
}
