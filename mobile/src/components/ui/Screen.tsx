import { SafeAreaView } from 'react-native-safe-area-context';
import { View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  className?: string;
  safe?: boolean;
}

export function Screen({ className = '', safe = true, children, ...rest }: Props) {
  const inner = (
    <View className={`flex-1 bg-ink-50 ${className}`} {...rest}>
      {children}
    </View>
  );
  if (!safe) return inner;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50">
      {inner}
    </SafeAreaView>
  );
}
