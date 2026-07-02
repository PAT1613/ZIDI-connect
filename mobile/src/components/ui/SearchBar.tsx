import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…' }: Props) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2">
      <Search size={18} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCorrect={false}
        autoCapitalize="none"
        className="flex-1 text-base text-ink-900"
      />
    </View>
  );
}
