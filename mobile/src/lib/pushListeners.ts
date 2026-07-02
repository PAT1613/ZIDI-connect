/**
 * Foreground display + tap-to-navigate wiring for Expo push notifications.
 *
 * Kept out of ``_layout.tsx`` to keep that file legible.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

// Show notifications while the app is foregrounded (default is to suppress).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // iOS 14+: banner + list.
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PushData {
  type?: 'notification' | 'escalation';
  notification_id?: string;
  escalation_id?: string;
}

/**
 * Register the tap-response listener. Returns a teardown function.
 * ``router`` from ``useRouter()`` — passed in because expo-router hooks
 * can only be called inside a component.
 */
export function subscribeToPushTaps(router: Router): () => void {
  if (Platform.OS === 'web') return () => undefined;

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data ?? {}) as PushData;
    if (data.type === 'escalation') {
      router.push('/escalations');
    } else if (data.type === 'notification') {
      router.push('/(tabs)/notifications');
    }
  });

  return () => sub.remove();
}
