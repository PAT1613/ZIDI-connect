import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Swallows a render-time crash and shows a friendly
 * retry screen with the error text (dev) or a generic message (prod). Reset
 * by tapping "Try again" — clears the caught error and re-renders children.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Ship to Sentry / logging in prod. For now, console.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Something went wrong.';
    return (
      <ScrollView className="flex-1 bg-ink-50" contentContainerStyle={{ padding: 24 }}>
        <View className="items-center gap-3 py-8">
          <AlertTriangle size={48} color="#dc2626" />
          <Text className="text-2xl font-bold text-ink-900">Something broke</Text>
          <Text className="text-center text-sm text-ink-600">
            The app hit an unexpected error. You can try again or restart the app.
          </Text>
        </View>

        {__DEV__ ? (
          <View className="mt-4 rounded-2xl border border-ink-200 bg-white p-4">
            <Text className="text-xs font-semibold uppercase text-ink-500">Dev details</Text>
            <Text className="mt-2 text-xs text-red-700" selectable>
              {message}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={this.handleReset}
          className="mt-6 items-center rounded-xl bg-brand-700 py-3 active:bg-brand-800"
        >
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      </ScrollView>
    );
  }
}
