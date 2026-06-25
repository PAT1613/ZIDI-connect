import { api } from './client';

export async function listEscalations(params = {}) {
  const { data } = await api.get('/escalations/', { params });
  return data;
}

export async function getEscalation(id) {
  const { data } = await api.get(`/escalations/${id}/`);
  return data;
}

export async function createEscalation(payload) {
  const { data } = await api.post('/escalations/', payload);
  return data;
}

export async function updateEscalation(id, payload) {
  const { data } = await api.patch(`/escalations/${id}/`, payload);
  return data;
}
