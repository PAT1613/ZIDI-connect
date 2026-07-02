import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { listCustomers } from '../api/customers';
import { listServices } from '../api/services';
import { extractError } from '../api/client';
import {
  Subscription,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  renewSubscription,
  suspendSubscription,
  terminateSubscription,
  updateSubscription,
} from '../api/subscriptions';
import { SubscriptionChildren } from '../components/feature/SubscriptionChildren';
import { Button } from '../components/ui/Button';
import { DateField } from '../components/ui/DateField';
import { idOf } from '../lib/ref';
import { EmptyState } from '../components/ui/EmptyState';
import { FAB } from '../components/ui/FAB';
import { Header } from '../components/ui/Header';
import { Input } from '../components/ui/Input';
import { ListItem } from '../components/ui/ListItem';
import { Modal } from '../components/ui/Modal';
import { Screen } from '../components/ui/Screen';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useListQuery } from '../hooks/useListQuery';
import { usePermission } from '../hooks/usePermission';
import { ROLES } from '../lib/constants';
import { formatDate } from '../lib/format';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
];

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS];

export default function SubscriptionsScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Partial<Subscription> | null>(null);

  const list = useListQuery<Subscription>(['subscriptions'], listSubscriptions, {
    extraParams: statusFilter ? { status: statusFilter } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Subscription>) => {
      const data: Record<string, unknown> = { ...payload };
      if (data.customer !== undefined) {
        data.customer_id = data.customer;
        delete data.customer;
      }
      if (data.service !== undefined) {
        data.service_id = data.service;
        delete data.service;
      }
      delete data.id;
      delete data.customer_name;
      delete data.service_name;
      delete data.created_at;
      delete data.updated_at;
      if (editing?.id) return updateSubscription(editing.id as string | number, data);
      return createSubscription(data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing?.id ? 'Subscription updated' : 'Subscription created' });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, id }: { action: 'renew' | 'suspend' | 'terminate' | 'delete'; id: string | number }) => {
      if (action === 'renew') return renewSubscription(id);
      if (action === 'suspend') return suspendSubscription(id);
      if (action === 'terminate') return terminateSubscription(id);
      return deleteSubscription(id);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Done' });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Action failed') }),
  });

  return (
    <Screen>
      <Header title="Subscriptions" subtitle={`${list.total} total`} back />
      <View className="border-b border-ink-200 bg-white px-4 py-3 gap-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search customer or service" />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
      </View>

      <FlatList
        data={list.rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} />}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          list.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : (
            <EmptyState
              title="No subscriptions match"
              message="Try clearing the status filter, or create a new subscription with the + button."
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
          <ListItem
            title={`${item.customer_name || item.customer || '—'} · ${item.service_name || item.service || '—'}`}
            subtitle={`Due ${formatDate(item.due_date)}`}
            meta={item.next_renewal_at ? `Renews ${formatDate(item.next_renewal_at)}` : undefined}
            rightSlot={<StatusBadge status={item.status} />}
            onPress={() => setEditing(item)}
          />
        )}
      />

      {canWrite ? <FAB onPress={() => setEditing({ auto_renew: true })} /> : null}

      {editing ? (
        <SubscriptionForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveMutation.mutate(payload)}
          onAction={(action) => editing.id && actionMutation.mutate({ action, id: editing.id as string | number })}
          saving={saveMutation.isPending}
          canWrite={canWrite}
        />
      ) : null}
    </Screen>
  );
}

interface FormProps {
  initial: Partial<Subscription>;
  onClose: () => void;
  onSave: (payload: Partial<Subscription>) => void;
  onAction: (action: 'renew' | 'suspend' | 'terminate' | 'delete') => void;
  saving: boolean;
  canWrite: boolean;
}

function SubscriptionForm({ initial, onClose, onSave, onAction, saving, canWrite }: FormProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Partial<Subscription>>(initial);
  const set = (k: keyof Subscription, v: unknown) => setForm((s) => ({ ...s, [k]: v }));

  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => listCustomers({ page_size: 200, ordering: 'full_name' }),
    enabled: isNew,
  });
  const { data: services } = useQuery({
    queryKey: ['services', 'lookup'],
    queryFn: () => listServices({ page_size: 200, ordering: 'name' }),
    enabled: isNew,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New subscription' : `${form.customer_name || ''} · ${form.service_name || ''}`}
      footer={
        canWrite ? (
          <>
            <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
            <Button
              label={isNew ? 'Create' : 'Save'}
              onPress={() => onSave(form)}
              loading={saving}
              className="flex-1"
            />
          </>
        ) : (
          <Button label="Close" variant="secondary" onPress={onClose} className="flex-1" />
        )
      }
    >
      {!isNew ? (
        <View className="gap-1">
          <Text className="text-sm text-ink-500">Customer · Service</Text>
          <Text className="text-base font-semibold text-ink-900">
            {(form.customer as { full_name?: string })?.full_name ||
              form.customer_name ||
              String(idOf(form.customer) ?? '—')}{' '}
            ·{' '}
            {(form.service as { name?: string })?.name ||
              form.service_name ||
              String(idOf(form.service) ?? '—')}
          </Text>
          <View className="mt-2">
            <StatusBadge status={form.status} />
          </View>
        </View>
      ) : (
        <>
          <Select
            label="Customer *"
            value={String(form.customer || '')}
            onChange={(v) => set('customer', v)}
            options={
              customers?.results.map((c) => ({
                value: String(c.id),
                label: c.full_name || c.customer_code || String(c.id),
              })) || []
            }
          />
          <Select
            label="Service *"
            value={String(form.service || '')}
            onChange={(v) => set('service', v)}
            options={
              services?.results.map((s) => ({ value: String(s.id), label: s.name || String(s.id) })) || []
            }
          />
        </>
      )}

      <DateField
        label="Due date *"
        value={(form.due_date as string) || ''}
        onChange={(v) => set('due_date', v)}
        editable={canWrite}
      />

      <View className="flex-row items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3">
        <Text className="text-sm font-medium text-ink-700">Auto renew</Text>
        <Switch
          value={!!form.auto_renew}
          onValueChange={(v) => set('auto_renew', v)}
          disabled={!canWrite}
        />
      </View>

      {!isNew && canWrite ? (
        <View className="mt-4 gap-2">
          <Button label="Renew now" variant="secondary" onPress={() => onAction('renew')} />
          <Button label="Suspend" variant="secondary" onPress={() => onAction('suspend')} />
          <Button label="Terminate" variant="danger" onPress={() => onAction('terminate')} />
        </View>
      ) : null}

      {!isNew && initial.id ? (
        <SubscriptionChildren
          subscriptionId={initial.id}
          customerId={idOf(form.customer)}
          serviceId={idOf(form.service)}
        />
      ) : null}
    </Modal>
  );
}
