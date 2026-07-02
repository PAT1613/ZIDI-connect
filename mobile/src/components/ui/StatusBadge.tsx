import { Text, View } from 'react-native';
import { STATUS_COLORS } from '../../lib/constants';

const palettes: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green-100', text: 'text-green-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  red: { bg: 'bg-red-100', text: 'text-red-700' },
  slate: { bg: 'bg-ink-100', text: 'text-ink-600' },
  brand: { bg: 'bg-brand-100', text: 'text-brand-700' },
};

interface Props {
  status?: string | null;
  label?: string;
}

export function StatusBadge({ status, label }: Props) {
  const key = (status || 'slate').toLowerCase();
  const color = STATUS_COLORS[key] || 'slate';
  const palette = palettes[color] || palettes.slate;
  const text = (label || status || '—').toString();
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${palette.bg}`}>
      <Text className={`text-xs font-semibold uppercase ${palette.text}`}>{text}</Text>
    </View>
  );
}
