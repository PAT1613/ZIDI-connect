import { Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';

interface Props {
  onPress: () => void;
}

export function FAB({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-700 active:bg-brand-800 shadow-lg"
    >
      <Plus color="white" size={26} />
    </Pressable>
  );
}
