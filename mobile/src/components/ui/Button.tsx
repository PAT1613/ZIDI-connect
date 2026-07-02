import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(Pressable, { className: 'style' });

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
}

const base = 'flex-row items-center justify-center rounded-xl px-4 py-3';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 active:bg-brand-800',
  secondary: 'bg-ink-100 active:bg-ink-200',
  ghost: 'bg-transparent active:bg-ink-100',
  danger: 'bg-red-600 active:bg-red-700',
};

const textVariants: Record<Variant, string> = {
  primary: 'text-white font-semibold',
  secondary: 'text-ink-800 font-semibold',
  ghost: 'text-ink-700 font-semibold',
  danger: 'text-white font-semibold',
};

export function Button({ label, variant = 'primary', loading, disabled, className = '', ...rest }: Props) {
  const isDisabled = !!disabled || !!loading;
  return (
    <Pressable
      disabled={isDisabled}
      className={`${base} ${variants[variant]} ${isDisabled ? 'opacity-60' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? 'white' : '#0e7490'} />
      ) : (
        <Text className={textVariants[variant]}>{label}</Text>
      )}
    </Pressable>
  );
}
