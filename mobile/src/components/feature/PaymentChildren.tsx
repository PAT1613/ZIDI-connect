import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { getCustomer } from '../../api/customers';
import { getInvoice } from '../../api/invoices';
import { listPayments } from '../../api/payments';
import { formatCurrency, formatDate } from '../../lib/format';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  paymentId: string | number;
  invoiceId?: string | number | null;
}

const LIMIT = 10;

export function PaymentChildren({ paymentId, invoiceId }: Props) {
  const invoiceQuery = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId as string | number),
    enabled: !!invoiceId,
  });

  const customerId = (invoiceQuery.data?.customer as string | number | undefined) ?? null;

  const customerQuery = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId as string | number),
    enabled: !!customerId,
  });

  const siblingsQuery = useQuery({
    queryKey: ['payments', { invoice: invoiceId, page_size: LIMIT }],
    queryFn: () => listPayments({ invoice: String(invoiceId), page_size: LIMIT }),
    enabled: !!invoiceId,
  });

  const siblings = useMemo(
    () => siblingsQuery.data?.results.filter((p) => String(p.id) !== String(paymentId)) ?? [],
    [siblingsQuery.data, paymentId],
  );

  return (
    <View className="gap-4">
      {invoiceId ? (
        <Card>
          <Text className="mb-2 text-base font-semibold text-ink-800">Invoice</Text>
          {invoiceQuery.isLoading ? (
            <ActivityIndicator color="#0e7490" />
          ) : invoiceQuery.data ? (
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-ink-900">
                  {invoiceQuery.data.invoice_number || `#${invoiceQuery.data.id}`}
                </Text>
                <StatusBadge status={invoiceQuery.data.status} />
              </View>
              <Text className="text-sm text-ink-600">
                {formatCurrency(invoiceQuery.data.total ?? invoiceQuery.data.amount)}
              </Text>
              {invoiceQuery.data.due_date ? (
                <Text className="text-xs text-ink-500">
                  Due {formatDate(invoiceQuery.data.due_date)}
                </Text>
              ) : null}
              {invoiceQuery.data.issued_at ? (
                <Text className="text-xs text-ink-500">
                  Issued {formatDate(invoiceQuery.data.issued_at)}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-ink-500">Invoice not loaded.</Text>
          )}
        </Card>
      ) : null}

      {customerId ? (
        <Card>
          <Text className="mb-2 text-base font-semibold text-ink-800">Customer</Text>
          {customerQuery.isLoading ? (
            <ActivityIndicator color="#0e7490" />
          ) : customerQuery.data ? (
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-ink-900">
                  {customerQuery.data.full_name || customerQuery.data.customer_code || '—'}
                </Text>
                <StatusBadge status={customerQuery.data.status} />
              </View>
              {customerQuery.data.email ? (
                <Text className="text-sm text-ink-600">{customerQuery.data.email}</Text>
              ) : null}
              {customerQuery.data.phone ? (
                <Text className="text-sm text-ink-600">{customerQuery.data.phone}</Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-ink-500">Customer not loaded.</Text>
          )}
        </Card>
      ) : null}

      {invoiceId ? (
        <Card>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-ink-800">Other payments</Text>
            <Text className="text-xs text-ink-500">{siblings.length}</Text>
          </View>
          {siblingsQuery.isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : siblings.length ? (
            siblings.map((p) => (
              <View key={String(p.id)} className="border-b border-ink-100 py-2">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-sm text-ink-900" numberOfLines={1}>
                    {formatCurrency(p.amount)} · {p.method || '—'}
                  </Text>
                  <Text className="text-xs text-ink-400">{formatDate(p.paid_at)}</Text>
                </View>
                {p.reference ? (
                  <Text className="text-xs text-ink-500 mt-0.5">Ref · {p.reference}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text className="text-sm text-ink-500">No other payments on this invoice.</Text>
          )}
        </Card>
      ) : null}
    </View>
  );
}
