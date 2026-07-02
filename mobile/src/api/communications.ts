import { api } from './client';
import { ListParams, Paginated } from './types';

export interface CommsLog {
  id: string | number;
  channel: 'sms' | 'email' | string;
  customer?: string | number;
  customer_name?: string;
  subject?: string;
  message: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SendSmsPayload {
  customer?: string | number;
  customers?: (string | number)[];
  message: string;
  [key: string]: unknown;
}

export interface SendEmailPayload {
  customer?: string | number;
  customers?: (string | number)[];
  subject: string;
  message: string;
  [key: string]: unknown;
}

export async function sendSms(payload: SendSmsPayload): Promise<CommsLog | CommsLog[]> {
  const { data } = await api.post('/communications/sms/', payload);
  return data;
}

export async function sendEmail(payload: SendEmailPayload): Promise<CommsLog | CommsLog[]> {
  const { data } = await api.post('/communications/email/', payload);
  return data;
}

export interface BulkSendPayload {
  channel: 'sms' | 'email';
  message: string;
  subject?: string;
  customer_ids?: (string | number)[];
  filter?: 'all_active' | 'selected' | 'overdue';
}

export interface BulkSendResult {
  queued: number;
  skipped: number;
  total: number;
}

export async function sendBulk(payload: BulkSendPayload): Promise<BulkSendResult> {
  const { data } = await api.post<BulkSendResult>('/communications/bulk/', payload);
  return data;
}

export async function listCommsLogs(params: ListParams = {}): Promise<Paginated<CommsLog>> {
  const { data } = await api.get<Paginated<CommsLog>>('/communications/logs/', { params });
  return data;
}

export async function deleteCommsLog(id: string | number): Promise<void> {
  await api.delete(`/communications/logs/${id}/`);
}
