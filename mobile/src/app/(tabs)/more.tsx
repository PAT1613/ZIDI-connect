import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import {
  Activity,
  Briefcase,
  LogOut,
  Mail,
  Megaphone,
  PieChart,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  User2,
  Wallet,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card } from '../../components/ui/Card';
import { Header } from '../../components/ui/Header';
import { ListItem } from '../../components/ui/ListItem';
import { Screen } from '../../components/ui/Screen';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../lib/constants';

interface Entry {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  href: string;
  roles?: string[];
}

const ENTRIES: Entry[] = [
  { title: 'Services', subtitle: 'Catalog', icon: Briefcase, href: '/services' },
  { title: 'Subscriptions', subtitle: 'Customer ↔ service', icon: RefreshCw, href: '/subscriptions' },
  { title: 'Payments', subtitle: 'Record & list', icon: Wallet, href: '/payments' },
  { title: 'Communications', subtitle: 'SMS / email log', icon: Megaphone, href: '/communications' },
  { title: 'Escalations', subtitle: 'Follow-ups', icon: Activity, href: '/escalations' },
  { title: 'Reports', subtitle: 'PDF / Excel export', icon: PieChart, href: '/reports' },
  {
    title: 'Users & Roles',
    subtitle: 'Staff accounts',
    icon: User2,
    href: '/users',
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    title: 'Audit logs',
    icon: ShieldCheck,
    href: '/audit',
    roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER],
  },
  { title: 'Settings', icon: SettingsIcon, href: '/settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { user, roleName, hasRole, logout } = useAuth();

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
      <Header title="More" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <Mail size={20} color="#0e7490" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink-900">
                {user?.full_name || user?.email || 'Account'}
              </Text>
              <Text className="text-xs text-ink-500">{roleName || 'No role'}</Text>
            </View>
          </View>
        </Card>

        <Card className="p-0 overflow-hidden">
          {ENTRIES.filter((e) => !e.roles || hasRole(e.roles)).map((e) => {
            const Icon = e.icon;
            return (
              <ListItem
                key={e.href}
                title={e.title}
                subtitle={e.subtitle}
                onPress={() => router.push(e.href as never)}
                rightSlot={<Icon size={18} color="#64748b" />}
              />
            );
          })}
        </Card>

        <ListItem
          title="Sign out"
          onPress={onLogout}
          rightSlot={<LogOut size={18} color="#dc2626" />}
        />
      </ScrollView>
    </Screen>
  );
}
