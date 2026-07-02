import { api } from './client';

export interface IntegrationSettings {
  at_username?: string;
  at_api_key?: string;
  at_sender_id?: string;
  email_host?: string;
  email_port?: number;
  email_host_user?: string;
  email_host_password?: string;
  email_use_tls?: boolean;
  default_from_email?: string;
  [key: string]: unknown;
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  const { data } = await api.get<IntegrationSettings>('/integrations/settings/');
  return data;
}

export async function updateIntegrationSettings(settings: IntegrationSettings): Promise<IntegrationSettings> {
  const { data } = await api.put<IntegrationSettings>('/integrations/settings/', settings);
  return data;
}

export async function sendTestSMS(payload: { phone: string; message: string }): Promise<unknown> {
  const { data } = await api.post('/integrations/test-sms/', payload);
  return data;
}

export async function sendTestEmail(payload: { email: string; subject: string; message: string }): Promise<unknown> {
  const { data } = await api.post('/integrations/test-email/', payload);
  return data;
}
