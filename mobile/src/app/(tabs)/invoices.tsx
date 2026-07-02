import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Download, Share2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

import { listCustomers } from '../../api/customers';
import { extractError } from '../../api/client';
import {
  Invoice,
  createInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  listInvoices,
  updateInvoice,
} from '../../api/invoices';
import { Payment, createPayment, listPayments } from '../../api/payments';
import { InvoiceChildren } from '../../components/feature/InvoiceChildren';
import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { idOf } from '../../lib/ref';
import { Card } from '../../components/ui/Card';
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
import { formatCurrency, formatDate } from '../../lib/format';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
];

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE];

export default function InvoicesScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Partial<Invoice> | null>(null);

  const list = useListQuery<Invoice>(['invoices'], listInvoices, {
    extraParams: statusFilter ? { status: statusFilter } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Invoice>) => {
      const data: Record<string, unknown> = { ...payload };
      // Backend expects *_id for writable FK fields; the read shape uses the nested object name.
      if (data.customer !== undefined) {
        data.customer_id = data.customer;
        delete data.customer;
      }
      if (data.subscription !== undefined) {
        data.customer_service_id = data.subscription;
        delete data.subscription;
      }
      delete data.id;
      delete data.invoice_number;
      delete data.issued_at;
      delete data.paid_at;
      delete data.total;
      delete data.balance;
      delete data.payments;
      if (editing?.id) return updateInvoice(editing.id as string | number, data);
      return createInvoice(data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing?.id ? 'Invoice updated' : 'Invoice created' });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteInvoice(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Invoice deleted' });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Delete failed') }),
  });

  return (
    <Screen>
      <Header title="Invoices" subtitle={`${list.total} total`} />
      <View className="border-b border-ink-200 bg-white px-4 py-3 gap-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search invoice or customer" />
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
              title="No invoices to show"
              message="Auto-invoices generate daily for active subscriptions, or add one manually with +."
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
            title={`${item.invoice_number || '#' + String(item.id)} · ${formatCurrency(item.total ?? item.amount)}`}
            subtitle={item.customer_name || `Customer ${item.customer}`}
            meta={item.due_date ? `Due ${formatDate(item.due_date)}` : undefined}
            rightSlot={<StatusBadge status={item.status} />}
            onPress={() => setEditing(item)}
          />
        )}
      />

      {canWrite ? <FAB onPress={() => setEditing({})} /> : null}

      {editing ? (
        <InvoiceForm
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
  initial: Partial<Invoice>;
  onClose: () => void;
  onSave: (payload: Partial<Invoice>) => void;
  onDelete: () => void;
  saving: boolean;
  canWrite: boolean;
}

function InvoiceForm({ initial, onClose, onSave, onDelete, saving, canWrite }: FormProps) {
  const qc = useQueryClient();
  const isNew = !initial.id;
  const [form, setForm] = useState<Partial<Invoice>>(initial);
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState<Partial<Payment>>({ method: 'mobile_money' });
  const set = (k: keyof Invoice, v: unknown) => setForm((s) => ({ ...s, [k]: v }));

  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => listCustomers({ page_size: 200, ordering: 'full_name' }),
    enabled: isNew,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', { invoice: initial.id }],
    queryFn: () => listPayments({ invoice: String(initial.id) }),
    enabled: !isNew,
  });

  const paymentMutation = useMutation({
    mutationFn: () => createPayment({ ...payment, invoice: initial.id }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      qc.invalidateQueries({ queryKey: ['payments', { invoice: initial.id }] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setShowPayment(false);
      setPayment({ method: 'mobile_money' });
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Payment failed') }),
  });

  async function onDownload() {
    if (!initial.id) return;
    try {
      const uri = await downloadInvoicePdf(initial.id as string | number, initial.invoice_number);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Toast.show({ type: 'success', text1: `Saved to ${uri}` });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: extractError(e, 'Download failed') });
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New invoice' : form.invoice_number || `#${initial.id}`}
      footer={
        canWrite ? (
          <>
            <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
            <Button
              label={isNew ? 'Create' : 'Save'}
              onPress={() => {
                if (isNew && !form.customer) {
                  Toast.show({ type: 'error', text1: 'Pick a customer first' });
                  return;
                }
                if (form.amount === undefined || form.amount === '' || Number(form.amount) <= 0) {
                  Toast.show({ type: 'error', text1: 'Enter an amount greater than 0' });
                  return;
                }
                onSave(form);
              }}
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
          <Text className="text-2xl font-bold text-ink-900">
            {formatCurrency(form.total ?? form.amount)}
          </Text>
          <StatusBadge status={form.status} />
        </View>
      ) : (
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
      )}

      <Input
        label="Amount *"
        value={String(form.amount ?? form.total ?? '')}
        onChangeText={(v) => set('amount', v)}
        keyboardType="decimal-pad"
        editable={canWrite}
      />
      <DateField
        label="Due date"
        value={(form.due_date as string) || ''}
        onChange={(v) => set('due_date', v)}
        editable={canWrite}
      />

      {!isNew ? (
        <>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={onDownload}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 active:bg-ink-100"
            >
              <Download size={16} color="#0e7490" />
              <Text className="font-semibold text-brand-700">PDF</Text>
            </Pressable>
            <Pressable
              onPress={onDownload}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 active:bg-ink-100"
            >
              <Share2 size={16} color="#0e7490" />
              <Text className="font-semibold text-brand-700">Share</Text>
            </Pressable>
          </View>

          <Card>
            <Text className="mb-2 text-base font-semibold text-ink-800">Payments</Text>
            {payments?.results.length ? (
              payments.results.map((p) => (
                <View key={String(p.id)} className="flex-row justify-between border-b border-ink-100 py-2">
                  <Text className="text-sm text-ink-700">
                    {p.method} · {formatDate(p.paid_at)}
                  </Text>
                  <Text className="text-sm font-semibold text-ink-900">{formatCurrency(p.amount)}</Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-ink-500">No payments yet.</Text>
            )}
            {canWrite ? (
              <Button label="Record payment" className="mt-3" onPress={() => setShowPayment(true)} />
            ) : null}
          </Card>

          {canWrite ? (
            <Button label="Delete invoice" variant="danger" onPress={onDelete} />
          ) : null}

          <InvoiceChildren
            customerId={idOf(form.customer)}
            subscriptionId={idOf(form.customer_service ?? form.subscription)}
          />

          {showPayment ? (
            <Card>
              <Text className="mb-2 text-sm font-semibold text-ink-800">New payment</Text>
              <View className="gap-3">
                <Input
                  label="Amount"
                  value={String(payment.amount ?? '')}
                  onChangeText={(v) => setPayment((p) => ({ ...p, amount: v }))}
                  keyboardType="decimal-pad"
                />
                <Select
                  label="Method"
                  value={(payment.method as string) || 'mobile_money'}
                  onChange={(v) => setPayment((p) => ({ ...p, method: v }))}
                  options={PAYMENT_METHODS}
                />
                <Input
                  label="Reference"
                  value={(payment.reference as string) || ''}
                  onChangeText={(v) => setPayment((p) => ({ ...p, reference: v }))}
                />
                <View className="flex-row gap-2">
                  <Button label="Cancel" variant="secondary" className="flex-1" onPress={() => setShowPayment(false)} />
                  <Button
                    label="Save"
                    className="flex-1"
                    onPress={() => paymentMutation.mutate()}
                    loading={paymentMutation.isPending}
                  />
                </View>
              </View>
            </Card>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
