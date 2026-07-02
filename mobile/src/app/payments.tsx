import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { extractError } from '../api/client';
import { listInvoices } from '../api/invoices';
import { Payment, createPayment, deletePayment, listPayments } from '../api/payments';
import { PaymentChildren } from '../components/feature/PaymentChildren';
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
import { useListQuery } from '../hooks/useListQuery';
import { usePermission } from '../hooks/usePermission';
import { ROLES } from '../lib/constants';
import { formatCurrency, formatDate } from '../lib/format';

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
];

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.FINANCE];

export default function PaymentsScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const { allowed: canDelete } = usePermission([ROLES.SUPER_ADMIN]);
  const [creating, setCreating] = useState<Partial<Payment> | null>(null);
  const [viewing, setViewing] = useState<Payment | null>(null);

  const list = useListQuery<Payment>(['payments'], listPayments);

  const { data: invoices } = useQuery({
    queryKey: ['invoices', 'lookup'],
    queryFn: () => listInvoices({ page_size: 200, status: 'pending' }),
    enabled: !!creating,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Payment>) => createPayment(payload),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setCreating(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deletePayment(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment removed' });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setViewing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Delete failed') }),
  });

  return (
    <Screen>
      <Header title="Payments" subtitle={`${list.total} total`} back />
      <View className="border-b border-ink-200 bg-white px-4 py-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search reference or invoice" />
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
              title="No payments recorded"
              message="Record a payment against an invoice with the + button — mobile money, bank transfer, or cash."
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
            title={`${formatCurrency(item.amount)} · ${item.method || '—'}`}
            subtitle={item.invoice_number || `Invoice ${item.invoice}`}
            meta={item.paid_at ? formatDate(item.paid_at) : undefined}
            onPress={() => setViewing(item)}
          />
        )}
      />

      {canWrite ? <FAB onPress={() => setCreating({ method: 'mobile_money' })} /> : null}

      {creating ? (
        <Modal
          open
          onClose={() => setCreating(null)}
          title="Record payment"
          footer={
            <>
              <Button label="Cancel" variant="secondary" onPress={() => setCreating(null)} className="flex-1" />
              <Button
                label="Save"
                onPress={() => saveMutation.mutate(creating)}
                loading={saveMutation.isPending}
                className="flex-1"
              />
            </>
          }
        >
          <Select
            label="Invoice *"
            value={String(creating.invoice || '')}
            onChange={(v) => setCreating((p) => ({ ...(p || {}), invoice: v }))}
            options={
              invoices?.results.map((i) => ({
                value: String(i.id),
                label: `${i.invoice_number || '#' + i.id} · ${formatCurrency(i.total ?? i.amount)}`,
              })) || []
            }
          />
          <Input
            label="Amount *"
            value={String(creating.amount ?? '')}
            onChangeText={(v) => setCreating((p) => ({ ...(p || {}), amount: v }))}
            keyboardType="decimal-pad"
          />
          <Select
            label="Method *"
            value={(creating.method as string) || 'mobile_money'}
            onChange={(v) => setCreating((p) => ({ ...(p || {}), method: v }))}
            options={PAYMENT_METHODS}
          />
          <Input
            label="Reference"
            value={(creating.reference as string) || ''}
            onChangeText={(v) => setCreating((p) => ({ ...(p || {}), reference: v }))}
          />
        </Modal>
      ) : null}

      {viewing ? (
        <Modal
          open
          onClose={() => setViewing(null)}
          title="Payment"
          footer={
            canDelete ? (
              <>
                <Button label="Close" variant="secondary" onPress={() => setViewing(null)} className="flex-1" />
                <Button
                  label="Delete"
                  variant="danger"
                  onPress={() => deleteMutation.mutate(viewing.id)}
                  className="flex-1"
                  loading={deleteMutation.isPending}
                />
              </>
            ) : (
              <Button label="Close" variant="secondary" onPress={() => setViewing(null)} className="flex-1" />
            )
          }
        >
          <View className="gap-2">
            <Text className="text-3xl font-bold text-ink-900">{formatCurrency(viewing.amount)}</Text>
            <Text className="text-sm text-ink-600">Method · {viewing.method}</Text>
            <Text className="text-sm text-ink-600">Invoice · {viewing.invoice_number || viewing.invoice}</Text>
            <Text className="text-sm text-ink-600">Reference · {viewing.reference || '—'}</Text>
            <Text className="text-sm text-ink-600">Paid · {formatDate(viewing.paid_at)}</Text>
          </View>

          <PaymentChildren
            paymentId={viewing.id}
            invoiceId={(viewing.invoice as string | number) ?? null}
          />
        </Modal>
      ) : null}
    </Screen>
  );
}
