import { api } from './client';

export async function listNotifications(params = {}) {
  const { data } = await api.get('/notifications/', { params });
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.post(`/notifications/${id}/read/`);
  return data;
}
