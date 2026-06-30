import { api } from './client';

export async function getIntegrationSettings() {
  const res = await api.get('/integrations/settings/');
  return res.data;
}

export async function updateIntegrationSettings(settings) {
  const res = await api.put('/integrations/settings/', { settings });
  return res.data;
}

export async function sendTestSMS({ phone, message }) {
  const res = await api.post('/integrations/test-sms/', { phone, message });
  return res.data;
}

export async function sendTestEmail({ email, subject, message }) {
  const res = await api.post('/integrations/test-email/', { email, subject, message });
  return res.data;
}
