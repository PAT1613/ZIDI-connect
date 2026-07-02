import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: Props) {
  return (
    <RNModal visible={open} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView className="flex-1 bg-ink-50" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between border-b border-ink-200 bg-white px-4 py-3">
            <Text className="flex-1 text-lg font-bold text-ink-900">{title}</Text>
            <Pressable onPress={onClose} className="p-1 active:opacity-60">
              <X size={22} color="#475569" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
            {children}
          </ScrollView>
          {footer ? (
            <View className="flex-row gap-3 border-t border-ink-200 bg-white px-4 py-3">{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RNModal>
  );
}
