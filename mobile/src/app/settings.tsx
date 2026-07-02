import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/ui/Header';
import { Screen } from '../components/ui/Screen';
import { useAuth } from '../hooks/useAuth';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  promptBiometricUnlock,
  setBiometricEnabled,
} from '../lib/biometric';

export default function SettingsScreen() {
  const { user, roleName, logout } = useAuth();
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBioSupported(await isBiometricAvailable());
      setBioEnabledState(await isBiometricEnabled());
    })();
  }, []);

  async function onToggleBio(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        // Verify the user CAN actually pass before enabling — avoids locking
        // themselves out with a broken sensor.
        const ok = await promptBiometricUnlock();
        if (!ok) {
          Toast.show({ type: 'error', text1: 'Biometric check failed' });
          return;
        }
      }
      await setBiometricEnabled(next);
      setBioEnabledState(next);
      Toast.show({ type: 'success', text1: next ? 'Biometric unlock on' : 'Biometric unlock off' });
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    try {
      await logout();
      Toast.show({ type: 'success', text1: 'Signed out' });
    } catch {
      Toast.show({ type: 'error', text1: 'Logout failed' });
    }
  }

  return (
    <Screen>
      <Header title="Settings" back />
      <View className="p-4 gap-4">
        <Card>
          <Text className="text-xs uppercase tracking-wide text-ink-500">Account</Text>
          <Text className="mt-2 text-base font-semibold text-ink-900">
            {user?.full_name || '—'}
          </Text>
          <Text className="text-sm text-ink-500">{user?.email}</Text>
          <Text className="mt-2 text-xs text-ink-500">Role: {roleName || '—'}</Text>
        </Card>

        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-ink-900">Biometric unlock</Text>
              <Text className="mt-1 text-xs text-ink-500">
                {bioSupported
                  ? 'Require Face ID / fingerprint on app launch.'
                  : 'Not available on this device.'}
              </Text>
            </View>
            <Switch
              value={bioEnabled}
              onValueChange={onToggleBio}
              disabled={!bioSupported || busy}
            />
          </View>
        </Card>

        <Button label="Sign out" variant="danger" onPress={onLogout} />
      </View>
    </Screen>
  );
}
