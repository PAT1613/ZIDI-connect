import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { extractError } from '../api/client';
import { Service, createService, deleteService, listServices, updateService } from '../api/services';
import { Button } from '../components/ui/Button';
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
import { BILLING_CYCLES, ROLES } from '../lib/constants';
import { formatCurrency } from '../lib/format';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OPERATIONS];

export default function ServicesScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);

  const list = useListQuery<Service>(['services'], listServices);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Service>) => {
      const data = { ...payload };
      delete data.id;
      if (editing?.id) return updateService(editing.id as string | number, data);
      return createService(data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing?.id ? 'Service updated' : 'Service created' });
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteService(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Service removed' });
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Delete failed') }),
  });

  return (
    <Screen>
      <Header title="Services" subtitle={`${list.total} total`} back />
      <View className="border-b border-ink-200 bg-white px-4 py-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search services" />
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
              title="No services in the catalog"
              message="Add your first billable service — name, price, and billing cycle."
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
            title={item.name || `Service ${item.id}`}
            subtitle={`${formatCurrency(item.price)} · ${item.billing_cycle || 'n/a'}`}
            meta={item.sla_days ? `${item.sla_days}-day SLA` : undefined}
            rightSlot={<StatusBadge status={item.status} />}
            onPress={() => setEditing(item)}
          />
        )}
      />

      {canWrite ? <FAB onPress={() => setEditing({ status: 'active', billing_cycle: 'monthly' })} /> : null}

      {editing ? (
        <ServiceForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveMutation.mutate(payload)}
          onDelete={() => editing.id && deleteMutation.mutate(editing.id as string | number)}
          saving={saveMutation.isPending}
          canWrite={canWrite}
        />
      ) : null}
    </Screen>
  );
}

interface FormProps {
  initial: Partial<Service>;
  onClose: () => void;
  onSave: (payload: Partial<Service>) => void;
  onDelete: () => void;
  saving: boolean;
  canWrite: boolean;
}

function ServiceForm({ initial, onClose, onSave, onDelete, saving, canWrite }: FormProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Partial<Service>>(initial);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const set = (k: keyof Service, v: unknown) => setForm((s) => ({ ...s, [k]: v }));

  const priceStr = form.price == null ? '' : String(form.price).trim();
  const priceNum = Number(priceStr);
  const priceError =
    priceStr === ''
      ? 'Price is required'
      : !Number.isFinite(priceNum)
        ? 'Enter a valid number (e.g. 500 or 500.00)'
        : priceNum <= 0
          ? 'Price must be greater than 0'
          : undefined;

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    if (priceError) return;
    onSave(form);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New service' : form.name || `Service ${initial.id}`}
      footer={
        canWrite ? (
          <>
            <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
            <Button
              label={isNew ? 'Create' : 'Save'}
              onPress={handleSubmit}
              loading={saving}
              className="flex-1"
            />
          </>
        ) : (
          <Button label="Close" variant="secondary" onPress={onClose} className="flex-1" />
        )
      }
    >
      <Input label="Name *" value={(form.name as string) || ''} onChangeText={(v) => set('name', v)} editable={canWrite} />
      <Input
        label="Description"
        value={(form.description as string) || ''}
        onChangeText={(v) => set('description', v)}
        multiline
        numberOfLines={3}
        editable={canWrite}
      />
      <Input
        label="Price *"
        value={String(form.price ?? '')}
        onChangeText={(v) => set('price', v)}
        keyboardType="decimal-pad"
        placeholder="e.g. 500.00"
        editable={canWrite}
        error={attemptedSubmit ? priceError : undefined}
      />
      <Select
        label="Billing cycle"
        value={(form.billing_cycle as string) || 'monthly'}
        onChange={(v) => set('billing_cycle', v)}
        options={BILLING_CYCLES}
      />
      <Input
        label="SLA days"
        value={String(form.sla_days ?? '')}
        onChangeText={(v) => set('sla_days', v ? Number(v) : undefined)}
        keyboardType="number-pad"
        editable={canWrite}
      />
      <Select
        label="Status"
        value={(form.status as string) || 'active'}
        onChange={(v) => set('status', v)}
        options={STATUS_OPTIONS}
      />

      {!isNew && canWrite ? (
        <Button label="Delete" variant="danger" onPress={onDelete} className="mt-4" />
      ) : null}
    </Modal>
  );
}
