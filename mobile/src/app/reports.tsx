import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

import { exportReport, type ReportFormat, type ReportType } from '../api/reports';
import { extractError } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/ui/Header';
import { Screen } from '../components/ui/Screen';
import { Select } from '../components/ui/Select';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../lib/constants';

const TYPES: { value: ReportType; label: string; roles?: string[] }[] = [
  { value: 'customers', label: 'Customers' },
  { value: 'services', label: 'Services' },
  { value: 'subscriptions' as ReportType, label: 'Subscriptions' },
  { value: 'revenue', label: 'Revenue', roles: [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER] },
  { value: 'invoices', label: 'Invoices', roles: [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER] },
  { value: 'payments', label: 'Payments', roles: [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER] },
  { value: 'notifications', label: 'Notifications' },
];

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel' },
];

export default function ReportsScreen() {
  const { hasRole } = useAuth();
  const allowed = TYPES.filter((t) => !t.roles || hasRole(t.roles));
  const [type, setType] = useState<ReportType>(allowed[0]?.value ?? 'customers');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    try {
      const uri = await exportReport(type, format);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else {
        Toast.show({ type: 'success', text1: `Saved to ${uri}` });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: extractError(e, 'Export failed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header title="Reports" back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <Text className="text-base font-semibold text-ink-900">Export a report</Text>
          <Text className="mt-1 text-sm text-ink-500">
            Pick a type and format. The file will be saved to your device cache and the share sheet will open.
          </Text>
        </Card>

        <Card>
          <View className="gap-4">
            <Select label="Type" value={type} onChange={(v) => setType(v as ReportType)} options={allowed} />
            <Select label="Format" value={format} onChange={(v) => setFormat(v as ReportFormat)} options={FORMATS} />
            <Button label={busy ? 'Generating…' : 'Export & share'} onPress={onExport} loading={busy} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
