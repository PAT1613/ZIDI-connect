import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

import { requestPasswordReset } from '../../api/auth';
import { extractError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      Toast.show({ type: 'success', text1: 'Welcome back' });
    } catch (err) {
      Toast.show({ type: 'error', text1: extractError(err, 'Login failed') });
    } finally {
      setSubmitting(false);
    }
  });

  async function onForgot() {
    const email = getValues('email')?.trim();
    if (!email) {
      Toast.show({ type: 'info', text1: 'Enter your email first' });
      return;
    }
    setResetting(true);
    try {
      await requestPasswordReset(email);
      Toast.show({ type: 'success', text1: 'Reset link sent if account exists' });
    } catch (err) {
      Toast.show({ type: 'error', text1: extractError(err, 'Could not send reset') });
    } finally {
      setResetting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-ink-900">ZIDI Connect</Text>
            <Text className="mt-1 text-base text-ink-500">Sign in to your account</Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="admin@zidi.local"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  placeholder="••••••••"
                  error={errors.password?.message}
                />
              )}
            />

            <Button label="Sign in" onPress={onSubmit} loading={submitting} className="mt-2" />

            <Pressable onPress={onForgot} disabled={resetting} className="items-center py-2">
              <Text className="text-sm font-medium text-brand-700">
                {resetting ? 'Sending…' : 'Forgot password?'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
