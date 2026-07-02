/**
 * Expo push registration helpers.
 *
 * Callable from AuthContext at login (to register) and logout (to unregister).
 * Web and simulators are no-ops — Expo only issues push tokens on physical
 * iOS/Android devices with granted permission.
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { registerDevice, unregisterDevice } from '../api/devices';

const LAST_TOKEN_KEY = 'zidi.expo_push_token';

async function getStoredToken(): Promise<string | null> {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage?.getItem(LAST_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

async function setStoredToken(value: string | null) {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return;
    if (value == null) ls.removeItem(LAST_TOKEN_KEY);
    else ls.setItem(LAST_TOKEN_KEY, value);
  } catch {
    // ignore
  }
}

/**
 * Ask for permission, obtain an Expo push token, and register it with the
 * backend. Returns the token (or null if permission denied / non-device).
 * Fails soft — never throws to the caller.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // no push on emulators
  if (Platform.OS === 'web') return null; // Expo Go on web can't get a native token

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // getExpoPushTokenAsync() needs projectId under bare workflow; expo-router
    // managed apps inherit it via app.json's `extra.eas.projectId`.
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return null;

    await registerDevice({ expo_push_token: token, platform: Platform.OS });
    await setStoredToken(token);
    return token;
  } catch (err) {
    // Silent — push failure shouldn't block login.
    console.warn('[push] registerForPushNotifications failed:', err);
    return null;
  }
}

/**
 * Best-effort unregister on logout — tell the backend to stop pushing to this
 * device so a subsequent login by a different user doesn't leak notifications.
 */
export async function unregisterPushNotifications(): Promise<void> {
  const token = await getStoredToken();
  if (!token) return;
  try {
    await unregisterDevice(token);
  } catch {
    // best-effort
  } finally {
    await setStoredToken(null);
  }
}
