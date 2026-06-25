import { api } from './client';

export async function sendSms(payload) {
  const { data } = await api.post('/communications/sms/', payload);
  return data;
}

export async function sendEmail(payload) {
  const { data } = await api.post('/communications/email/', payload);
  return data;
}

export async function listCommsLogs(params = {}) {
  const { data } = await api.get('/communications/logs/', { params });
  return data;
}
