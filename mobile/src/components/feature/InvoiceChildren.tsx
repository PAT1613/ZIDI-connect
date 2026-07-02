import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';

import { listCommsLogs } from '../../api/communications';
import { getCustomer } from '../../api/customers';
import { listNotifications } from '../../api/notifications';
import { getSubscription } from '../../api/subscriptions';
import { formatDate } from '../../lib/format';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  customerId?: string | number | null;
  subscriptionId?: string | number | null;
}

const LIMIT = 5;

export function InvoiceChildren({ customerId, subscriptionId }: Props) {
  const customerQuery = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId as string | number),
    enabled: !!customerId,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', subscriptionId],
    queryFn: () => getSubscription(subscriptionId as string | number),
    enabled: !!subscriptionId,
  });

  const cid = customerId ? String(customerId) : '';
  const childQueries = useQueries({
    queries: [
      {
        queryKey: ['notifications', { customer: cid, page_size: LIMIT }],
        queryFn: () => listNotifications({ customer: cid, page_size: LIMIT }),
        enabled: !!customerId,
      },
      {
        queryKey: ['comms-logs', { customer: cid, page_size: LIMIT }],
        queryFn: () => listCommsLogs({ customer: cid, page_size: LIMIT }),
        enabled: !!customerId,
      },
    ],
  });
  const [notifs, comms] = childQueries;

  return (
    <View className="gap-4">
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
              {customerQuery.data.customer_code ? (
                <Text className="text-xs text-ink-400">{customerQuery.data.customer_code}</Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-ink-500">Customer not loaded.</Text>
          )}
        </Card>
      ) : null}

      {subscriptionId ? (
        <Card>
          <Text className="mb-2 text-base font-semibold text-ink-800">Subscription</Text>
          {subscriptionQuery.isLoading ? (
            <ActivityIndicator color="#0e7490" />
          ) : subscriptionQuery.data ? (
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-ink-900">
                  {subscriptionQuery.data.service_name || `Service ${subscriptionQuery.data.service}`}
                </Text>
                <StatusBadge status={subscriptionQuery.data.status} />
              </View>
              {subscriptionQuery.data.due_date ? (
                <Text className="text-sm text-ink-600">
                  Due {formatDate(subscriptionQuery.data.due_date)}
                </Text>
              ) : null}
              {subscriptionQuery.data.next_renewal_at ? (
                <Text className="text-sm text-ink-600">
                  Renews {formatDate(subscriptionQuery.data.next_renewal_at)}
                </Text>
              ) : null}
              <Text className="text-xs text-ink-400">
                Auto-renew · {subscriptionQuery.data.auto_renew ? 'on' : 'off'}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-ink-500">Subscription not loaded.</Text>
          )}
        </Card>
      ) : null}

      {customerId ? (
        <>
          <Section
            title="Notifications"
            count={notifs.data?.count}
            loading={notifs.isLoading}
          >
            {notifs.data?.results.length ? (
              notifs.data.results.map((n) => (
                <Row
                  key={String(n.id)}
                  left={n.subject || n.message}
                  right={
                    <Text className="text-xs font-semibold uppercase text-brand-700">
                      {n.channel}
                    </Text>
                  }
                  meta={formatDate(n.created_at || n.sent_at)}
                />
              ))
            ) : (
              <Empty />
            )}
          </Section>

          <Section title="Communications" count={comms.data?.count} loading={comms.isLoading}>
            {comms.data?.results.length ? (
              comms.data.results.map((c) => (
                <Row
                  key={String(c.id)}
                  left={c.subject || c.message}
                  right={
                    <Text className="text-xs font-semibold uppercase text-brand-700">
                      {c.channel}
                    </Text>
                  }
                  meta={formatDate(c.created_at)}
                />
              ))
            ) : (
              <Empty />
            )}
          </Section>
        </>
      ) : null}
    </View>
  );
}

function Section({
  title,
  count,
  loading,
  children,
}: {
  title: string;
  count?: number;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-ink-800">{title}</Text>
        <Text className="text-xs text-ink-500">{count ?? '—'} total</Text>
      </View>
      {loading ? (
        <View className="py-4 items-center">
          <ActivityIndicator color="#0e7490" />
        </View>
      ) : (
        children
      )}
    </Card>
  );
}

function Row({ left, right, meta }: { left: string; right?: React.ReactNode; meta?: string }) {
  return (
    <View className="border-b border-ink-100 py-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-sm text-ink-900" numberOfLines={1}>
          {left}
        </Text>
        {right}
      </View>
      {meta ? <Text className="text-xs text-ink-400 mt-0.5">{meta}</Text> : null}
    </View>
  );
}

function Empty() {
  return <Text className="text-sm text-ink-500">None.</Text>;
}
