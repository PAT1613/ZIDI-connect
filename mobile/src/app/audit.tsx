import { Redirect } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';

import { AuditLog, listAuditLogs } from '../api/audit';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Header } from '../components/ui/Header';
import { Screen } from '../components/ui/Screen';
import { SearchBar } from '../components/ui/SearchBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useListQuery } from '../hooks/useListQuery';
import { usePermission } from '../hooks/usePermission';
import { ROLES } from '../lib/constants';
import { formatDateTime } from '../lib/format';

const VIEW_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

export default function AuditScreen() {
  const { allowed, isAuthenticated } = usePermission(VIEW_ROLES);
  const list = useListQuery<AuditLog>(['audit-logs'], listAuditLogs);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!allowed) return <Redirect href="/forbidden" />;

  return (
    <Screen>
      <Header title="Audit logs" subtitle={`${list.total} events`} back />
      <View className="border-b border-ink-200 bg-white px-4 py-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search actor, module, object" />
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
              title="No audit events yet"
              message="Every write (create / update / delete) will show here with the actor and object involved."
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
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <StatusBadge status={item.action} />
                <Text className="text-xs font-semibold uppercase text-brand-700">{item.module}</Text>
              </View>
              <Text className="text-xs text-ink-400">{formatDateTime(item.created_at)}</Text>
            </View>
            <Text className="mt-2 text-sm text-ink-900">{item.object_repr || '—'}</Text>
            <Text className="text-xs text-ink-500">
              {item.user_email || 'system'} · {item.ip_address || 'no IP'}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
