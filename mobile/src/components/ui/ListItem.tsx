import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  meta?: string;
  rightSlot?: ReactNode;
  onPress?: () => void;
}

export function ListItem({ title, subtitle, meta, rightSlot, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-ink-100 bg-white px-4 py-3 active:bg-ink-50"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-ink-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text className="text-xs text-ink-400 mt-0.5">{meta}</Text> : null}
      </View>
      {rightSlot}
      {onPress ? <ChevronRight size={18} color="#94a3b8" /> : null}
    </Pressable>
  );
}
