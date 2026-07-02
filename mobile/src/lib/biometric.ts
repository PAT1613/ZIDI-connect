/**
 * Biometric unlock — opt-in, off by default.
 *
 * When enabled in Settings, the app blocks the UI on cold start until
 * biometrics pass. Web / no-hardware devices always bypass gracefully.
 */
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PREF_KEY = 'zidi.biometric_enabled';

async function readPref(): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(PREF_KEY) === '1';
    } catch {
      return false;
    }
  }
  try {
    return (await SecureStore.getItemAsync(PREF_KEY)) === '1';
  } catch {
    return false;
  }
}

async function writePref(enabled: boolean): Promise<void> {
  const value = enabled ? '1' : '0';
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(PREF_KEY, value);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(PREF_KEY, value);
  } catch {
    /* ignore */
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  return readPref();
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await writePref(enabled);
}

/**
 * Does the device actually have biometric hardware + at least one enrollment?
 * The Settings toggle is disabled when this is false.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Prompt the user. Resolves true on success or if biometrics are unavailable
 * (fail-open) — the toggle only makes sense to gate on when hardware exists.
 */
export async function promptBiometricUnlock(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    if (!(await isBiometricAvailable())) return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock ZIDI Connect',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
