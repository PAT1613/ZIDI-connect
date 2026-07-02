import { View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  className?: string;
}

export function Card({ className = '', children, ...rest }: Props) {
  return (
    <View
      className={`rounded-2xl border border-ink-100 bg-white p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
