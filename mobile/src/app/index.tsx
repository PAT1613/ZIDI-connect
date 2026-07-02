import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { initializing, isAuthenticated, locked } = useAuth();

  if (locked) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 px-8">
        <Lock size={40} color="#0e7490" />
        <Text className="mt-4 text-lg font-bold text-ink-900">Unlock ZIDI Connect</Text>
        <Text className="mt-1 text-center text-sm text-ink-500">
          Waiting for biometric authentication…
        </Text>
      </View>
    );
  }

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50">
        <ActivityIndicator color="#0e7490" size="large" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
