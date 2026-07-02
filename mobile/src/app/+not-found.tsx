import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '../components/ui/Screen';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl font-bold text-ink-300">404</Text>
          <Text className="mt-2 text-base text-ink-600">This screen doesn&apos;t exist.</Text>
          <Link href="/" className="mt-6 text-sm font-semibold text-brand-700">
            Go home
          </Link>
        </View>
      </Screen>
    </>
  );
}
