import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { extractError } from '../../api/client';
import { Notification, listNotifications, markNotificationRead } from '../../api/notifications';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Header } from '../../components/ui/Header';
import { Screen } from '../../components/ui/Screen';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useListQuery } from '../../hooks/useListQuery';
import { formatDateTime, formatRelative } from '../../lib/format';

const VIEWS = [
  { value: 'feed', label: 'Feed' },
  { value: 'sent', label: 'Sent (audit)' },
];

const CHANNEL_FILTERS = [
  { value: '', label: 'All channels' },
  { value: 'in_app', label: 'In-app' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const [view, setView] = useState<'feed' | 'sent'>('feed');
  const [channel, setChannel] = useState('');

  const extraParams =
    view === 'feed'
      ? { ...(channel ? { channel } : {}) }
      : { ...(channel ? { channel } : {}), audit: 1 };

  const list = useListQuery<Notification>(['notifications', view], listNotifications, {
    extraParams,
  });

  const markRead = useMutation({
    mutationFn: (id: string | number) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Could not mark read') }),
  });

  return (
    <Screen>
      <Header title="Alerts" />
      <View className="border-b border-ink-200 bg-white px-4 py-3 gap-3">
        <Select value={view} onChange={(v) => setView(v as 'feed' | 'sent')} options={VIEWS} />
        <Select value={channel} onChange={setChannel} options={CHANNEL_FILTERS} />
      </View>

      <FlatList
        data={list.rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} />}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={
          list.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : (
            <EmptyState
              title={view === 'feed' ? 'No new notifications' : 'No sent notifications'}
              message={
                view === 'feed'
                  ? "You're all caught up. Alerts about subscriptions and escalations will show here."
                  : 'The audit log of outbound SMS/email/in-app pushes will populate as the system sends them.'
              }
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card className={item.read_at ? 'opacity-70' : ''}>
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-2">
                  <Text className="text-xs font-semibold uppercase text-brand-700">{item.channel}</Text>
                  <StatusBadge status={item.delivery_status || item.status} />
                </View>
                {item.subject ? (
                  <Text className="font-semibold text-ink-900">{item.subject}</Text>
                ) : null}
                <Text className="mt-1 text-sm text-ink-700">{item.message}</Text>
                <Text className="mt-2 text-xs text-ink-400">
                  {formatDateTime(item.created_at || item.sent_at)} · {formatRelative(item.created_at || item.sent_at)}
                </Text>
              </View>
              {view === 'feed' && !item.read_at ? (
                <Pressable
                  onPress={() => markRead.mutate(item.id)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-brand-100 active:bg-brand-200"
                >
                  <CheckCheck size={16} color="#0e7490" />
                </Pressable>
              ) : null}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
