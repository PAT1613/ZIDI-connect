import { Text, View } from 'react-native';
import { Card } from './Card';

type Tone = 'brand' | 'amber' | 'red' | 'green' | 'violet' | 'slate';

const toneClasses: Record<Tone, string> = {
  brand: 'text-brand-700',
  amber: 'text-accent-600',
  red: 'text-red-600',
  green: 'text-green-600',
  violet: 'text-violet-600',
  slate: 'text-ink-600',
};

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  tone?: Tone;
}

export function StatCard({ label, value, sub, tone = 'brand' }: Props) {
  return (
    <Card className="flex-1">
      <Text className="text-xs uppercase tracking-wide text-ink-500">{label}</Text>
      <Text className={`mt-2 text-2xl font-bold ${toneClasses[tone]}`}>{value}</Text>
      {sub ? <Text className="mt-1 text-xs text-ink-500">{sub}</Text> : null}
    </Card>
  );
}
