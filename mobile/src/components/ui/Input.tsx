import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, containerClassName = '', className = '', ...rest },
  ref,
) {
  return (
    <View className={`gap-1.5 ${containerClassName}`}>
      {label ? <Text className="text-sm font-medium text-ink-700">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#94a3b8"
        className={`rounded-xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 ${error ? 'border-red-500' : ''} ${className}`}
        {...rest}
      />
      {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
    </View>
  );
});
