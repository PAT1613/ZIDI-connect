import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';

import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { Screen } from '../components/ui/Screen';

export default function ForbiddenScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Forbidden" back />
      <View className="flex-1 items-center justify-center px-8">
        <ShieldAlert size={48} color="#dc2626" />
        <Text className="mt-4 text-lg font-bold text-ink-900">Access denied</Text>
        <Text className="mt-1 text-center text-sm text-ink-500">
          You don&apos;t have permission to view this. Talk to a Super Admin if you need access.
        </Text>
        <Button label="Go back" className="mt-6" onPress={() => router.replace('/(tabs)')} />
      </View>
    </Screen>
  );
}
