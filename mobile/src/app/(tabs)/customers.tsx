import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  Customer,
  createCustomer,
  deactivateCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '../../api/customers';
import { extractError } from '../../api/client';
import { CustomerChildren } from '../../components/feature/CustomerChildren';
import { Button } from '../../components/ui/Button';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { Header } from '../../components/ui/Header';
import { Input } from '../../components/ui/Input';
import { ListItem } from '../../components/ui/ListItem';
import { Modal } from '../../components/ui/Modal';
import { Screen } from '../../components/ui/Screen';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useListQuery } from '../../hooks/useListQuery';
import { usePermission } from '../../hooks/usePermission';
import { ROLES } from '../../lib/constants';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'All channels' },
  { value: 'sms', label: 'SMS only' },
  { value: 'email', label: 'Email only' },
  { value: 'in_app', label: 'In-app only' },
];

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER];

export default function CustomersScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const { allowed: canDelete } = usePermission([ROLES.SUPER_ADMIN]);
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);

  const list = useListQuery<Customer>(['customers'], listCustomers, {
    extraParams: statusFilter ? { status: statusFilter } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Customer>) => {
      const data = { ...payload };
      delete data.id;
      delete data.customer_code;
      delete data.registration_date;
      delete data.created_at;
      delete data.updated_at;
      if (editing?.id) return updateCustomer(editing.id as string | number, data);
      return createCustomer(data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing?.id ? 'Customer updated' : 'Customer created' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string | number) => deactivateCustomer(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Customer deactivated' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Deactivate failed') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteCustomer(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Customer deleted' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Delete failed') }),
  });

  return (
    <Screen>
      <Header title="Customers" subtitle={`${list.total} total`} />
      <View className="border-b border-ink-200 bg-white px-4 py-3 gap-3">
        <SearchBar
          value={list.search}
          onChangeText={list.setSearch}
          placeholder="Search code, name, phone, email"
        />
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
            <ListSkeleton count={6} />
          ) : (
            <EmptyState
              title="No customers yet"
              message="Register your first customer to start tracking subscriptions, invoices, and reminders."
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
            title={item.full_name || item.customer_code || '—'}
            subtitle={item.email || item.phone || item.customer_code}
            meta={item.phone && item.email ? item.phone : undefined}
            rightSlot={<StatusBadge status={item.status} />}
            onPress={() => setEditing(item)}
          />
        )}
      />

      {canWrite ? <FAB onPress={() => setEditing({})} /> : null}

      {editing ? (
        <CustomerForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveMutation.mutate(payload)}
          onDeactivate={() => editing.id && deactivateMutation.mutate(editing.id as string | number)}
          onDelete={() => editing.id && deleteMutation.mutate(editing.id as string | number)}
          saving={saveMutation.isPending}
          canWrite={canWrite}
          canDelete={canDelete}
        />
      ) : null}
    </Screen>
  );
}

interface FormProps {
  initial: Partial<Customer>;
  onClose: () => void;
  onSave: (payload: Partial<Customer>) => void;
  onDeactivate: () => void;
  onDelete: () => void;
  saving: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

function CustomerForm({
  initial,
  onClose,
  onSave,
  onDeactivate,
  onDelete,
  saving,
  canWrite,
  canDelete,
}: FormProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Partial<Customer>>(initial);

  const set = (k: keyof Customer, v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New customer' : form.full_name || form.customer_code || 'Customer'}
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
        <View className="flex-row items-center justify-between">
          <Text className="text-xs uppercase text-ink-500">{form.customer_code}</Text>
          <StatusBadge status={form.status} />
        </View>
      ) : null}

      <Input
        label="Full name *"
        value={(form.full_name as string) || ''}
        onChangeText={(v) => set('full_name', v)}
        editable={canWrite}
      />
      <Input
        label="National ID *"
        value={(form.national_id as string) || ''}
        onChangeText={(v) => set('national_id', v)}
        editable={canWrite}
      />
      <Input
        label="Email"
        value={(form.email as string) || ''}
        onChangeText={(v) => set('email', v)}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={canWrite}
      />
      <Input
        label="Phone"
        value={(form.phone as string) || ''}
        onChangeText={(v) => set('phone', v)}
        keyboardType="phone-pad"
        editable={canWrite}
      />
      <Input
        label="Address"
        value={(form.address as string) || ''}
        onChangeText={(v) => set('address', v)}
        editable={canWrite}
        multiline
      />
      <Input
        label="Notes"
        value={(form.notes as string) || ''}
        onChangeText={(v) => set('notes', v)}
        editable={canWrite}
        multiline
        numberOfLines={3}
      />
      <Select
        label="Reminder channel"
        value={(form.preferred_channel as string) || 'all'}
        onChange={(v) => set('preferred_channel', v)}
        options={CHANNEL_OPTIONS}
      />

      {!isNew && canWrite ? (
        <View className="mt-4 gap-2">
          <Button label="Deactivate" variant="secondary" onPress={onDeactivate} />
          {canDelete ? <Button label="Delete" variant="danger" onPress={onDelete} /> : null}
        </View>
      ) : null}

      {!isNew && initial.id ? <CustomerChildren customerId={initial.id} /> : null}
    </Modal>
  );
}
