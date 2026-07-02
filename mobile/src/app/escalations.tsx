import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { extractError } from '../api/client';
import {
  Escalation,
  createEscalation,
  listEscalations,
  updateEscalation,
} from '../api/escalations';
import { listSubscriptions } from '../api/subscriptions';
import { listUsers } from '../api/users';
import { EscalationChildren } from '../components/feature/EscalationChildren';
import { Button } from '../components/ui/Button';
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
import { formatRelative } from '../lib/format';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_OPTIONS = STATUS_FILTERS.slice(1);

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS, ROLES.MANAGER];

export default function EscalationsScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const [statusFilter, setStatusFilter] = useState('open');
  const [editing, setEditing] = useState<Partial<Escalation> | null>(null);

  const list = useListQuery<Escalation>(['escalations'], listEscalations, {
    extraParams: statusFilter ? { status: statusFilter } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Escalation>) => {
      const data: Record<string, unknown> = { ...payload };
      // Backend's writable FK is customer_service_id; the read shape exposes customer_service
      // as a nested object, so unwrap it to the id.
      if (data.customer_service !== undefined && data.customer_service_id === undefined) {
        const id = idOf(data.customer_service);
        if (id !== null) data.customer_service_id = id;
      }
      delete data.customer_service;
      delete data.customer_name;
      delete data.assigned_to_name;
      delete data.id;
      delete data.opened_at;
      delete data.created_at;
      delete data.updated_at;
      if (editing?.id) return updateEscalation(editing.id as string | number, data);
      return createEscalation(data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing?.id ? 'Escalation updated' : 'Escalation created' });
      qc.invalidateQueries({ queryKey: ['escalations'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  return (
    <Screen>
      <Header title="Escalations" subtitle={`${list.total} total`} back />
      <View className="border-b border-ink-200 bg-white px-4 py-3 gap-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search customer or notes" />
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
              title="No open escalations"
              message="Escalations are auto-opened for overdue subscriptions. Change the status filter to see resolved ones."
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
            title={item.customer_name || `Escalation ${item.id}`}
            subtitle={item.assigned_to_name ? `→ ${item.assigned_to_name}` : 'Unassigned'}
            meta={formatRelative(item.updated_at || item.created_at)}
            rightSlot={<StatusBadge status={item.status} />}
            onPress={() => setEditing(item)}
          />
        )}
      />

      {canWrite ? <FAB onPress={() => setEditing({ status: 'open' })} /> : null}

      {editing ? (
        <EscalationForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveMutation.mutate(payload)}
          saving={saveMutation.isPending}
          canWrite={canWrite}
        />
      ) : null}
    </Screen>
  );
}

interface FormProps {
  initial: Partial<Escalation>;
  onClose: () => void;
  onSave: (payload: Partial<Escalation>) => void;
  saving: boolean;
  canWrite: boolean;
}

function EscalationForm({ initial, onClose, onSave, saving, canWrite }: FormProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Partial<Escalation>>(initial);
  const set = (k: keyof Escalation, v: unknown) => setForm((s) => ({ ...s, [k]: v }));

  const { data: subs } = useQuery({
    queryKey: ['subscriptions', 'lookup'],
    queryFn: () => listSubscriptions({ page_size: 200, status: 'expired' }),
    enabled: isNew,
  });
  const { data: users } = useQuery({
    queryKey: ['users', 'lookup'],
    queryFn: () => listUsers({ page_size: 200 }),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New escalation' : form.customer_name || `Escalation ${initial.id}`}
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
      {isNew ? (
        <Select
          label="Subscription *"
          value={String(form.customer_service_id || form.customer_service || '')}
          onChange={(v) => set('customer_service_id', v)}
          options={
            subs?.results.map((s) => ({
              value: String(s.id),
              label: `${s.customer_name || s.customer} · ${s.service_name || s.service}`,
            })) || []
          }
        />
      ) : null}

      <Select
        label="Status"
        value={(form.status as string) || 'open'}
        onChange={(v) => set('status', v)}
        options={STATUS_OPTIONS}
      />

      <Select
        label="Assignee"
        value={String(form.assigned_to || '')}
        onChange={(v) => set('assigned_to', v)}
        options={[
          { value: '', label: 'Unassigned' },
          ...(users?.results.map((u) => ({
            value: String(u.id),
            label: u.full_name || u.email,
          })) || []),
        ]}
      />

      <Input
        label="Reason"
        value={(form.reason as string) || ''}
        onChangeText={(v) => set('reason', v)}
        editable={canWrite}
      />

      <Input
        label="Notes"
        value={(form.notes as string) || ''}
        onChangeText={(v) => set('notes', v)}
        multiline
        numberOfLines={4}
        editable={canWrite}
      />

      {!isNew ? (
        <EscalationChildren subscriptionId={idOf(form.customer_service)} />
      ) : null}
    </Modal>
  );
}
