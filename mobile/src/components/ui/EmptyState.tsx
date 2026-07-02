import { Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';

interface Props {
  title?: string;
  message?: string;
}

export function EmptyState({ title = 'Nothing here yet', message }: Props) {
  return (
    <View className="items-center justify-center px-8 py-16">
      <Inbox size={36} color="#94a3b8" />
      <Text className="mt-3 text-base font-semibold text-ink-700">{title}</Text>
      {message ? <Text className="mt-1 text-center text-sm text-ink-500">{message}</Text> : null}
    </View>
  );
}
