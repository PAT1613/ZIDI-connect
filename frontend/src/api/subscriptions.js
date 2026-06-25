import { api } from './client';

export async function listSubscriptions(params = {}) {
  const { data } = await api.get('/subscriptions/', { params });
  return data;
}

export async function getSubscription(id) {
  const { data } = await api.get(`/subscriptions/${id}/`);
  return data;
}

export async function createSubscription(payload) {
  const { data } = await api.post('/subscriptions/', payload);
  return data;
}

export async function updateSubscription(id, payload) {
  const { data } = await api.patch(`/subscriptions/${id}/`, payload);
  return data;
}

export async function deleteSubscription(id) {
  await api.delete(`/subscriptions/${id}/`);
}

export async function renewSubscription(id) {
  const { data } = await api.post(`/subscriptions/${id}/renew/`);
  return data;
}

export async function suspendSubscription(id) {
  const { data } = await api.post(`/subscriptions/${id}/suspend/`);
  return data;
}

export async function terminateSubscription(id) {
  const { data } = await api.post(`/subscriptions/${id}/terminate/`);
  return data;
}
