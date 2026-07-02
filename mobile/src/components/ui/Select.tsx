import { Pressable, Text, View } from 'react-native';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  value?: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export function Select({ label, value, onChange, options }: Props) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-ink-700">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`rounded-full px-3 py-1.5 ${active ? 'bg-brand-700' : 'bg-white border border-ink-200'}`}
            >
              <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink-700'}`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
