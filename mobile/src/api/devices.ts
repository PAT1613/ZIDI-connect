import { api } from './client';

export interface DeviceToken {
  id: number;
  expo_push_token: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

export async function registerDevice(payload: {
  expo_push_token: string;
  platform: string;
}): Promise<DeviceToken> {
  const { data } = await api.post<DeviceToken>('/devices/register/', payload);
  return data;
}

export async function unregisterDevice(expo_push_token: string): Promise<void> {
  await api.delete('/devices/register/', { params: { expo_push_token } });
}
