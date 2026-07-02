import { Pressable, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightSlot?: ReactNode;
}

export function Header({ title, subtitle, back, rightSlot }: Props) {
  const router = useRouter();
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  return (
    <View className="flex-row items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
      {back ? (
        <Pressable
          onPress={handleBack}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-ink-100"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text className="text-lg font-bold text-ink-900">{title}</Text>
        {subtitle ? <Text className="text-xs text-ink-500">{subtitle}</Text> : null}
      </View>
      {rightSlot}
    </View>
  );
}
