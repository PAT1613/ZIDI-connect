import { useQueries } from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';

import { listCommsLogs } from '../../api/communications';
import { listInvoices } from '../../api/invoices';
import { listNotifications } from '../../api/notifications';
import { listSubscriptions } from '../../api/subscriptions';
import { formatCurrency, formatDate } from '../../lib/format';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  customerId: string | number;
}

const LIMIT = 5;

export function CustomerChildren({ customerId }: Props) {
  const id = String(customerId);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['subscriptions', { customer: id, page_size: LIMIT }],
        queryFn: () => listSubscriptions({ customer: id, page_size: LIMIT }),
      },
      {
        queryKey: ['invoices', { customer: id, page_size: LIMIT }],
        queryFn: () => listInvoices({ customer: id, page_size: LIMIT }),
      },
      {
        queryKey: ['notifications', { customer: id, page_size: LIMIT }],
        queryFn: () => listNotifications({ customer: id, page_size: LIMIT }),
      },
      {
        queryKey: ['comms-logs', { customer: id, page_size: LIMIT }],
        queryFn: () => listCommsLogs({ customer: id, page_size: LIMIT }),
      },
    ],
  });

  const [subs, invs, notifs, comms] = queries;

  return (
    <View className="gap-4">
      <Section title="Subscriptions" count={subs.data?.count} loading={subs.isLoading}>
        {subs.data?.results.length ? (
          subs.data.results.map((s) => (
            <Row
              key={String(s.id)}
              left={s.service_name || `Service ${s.service}`}
              right={<StatusBadge status={s.status} />}
              meta={s.due_date ? `Due ${formatDate(s.due_date)}` : undefined}
            />
          ))
        ) : (
          <Empty />
        )}
      </Section>

      <Section title="Invoices" count={invs.data?.count} loading={invs.isLoading}>
        {invs.data?.results.length ? (
          invs.data.results.map((i) => (
            <Row
              key={String(i.id)}
              left={`${i.invoice_number || '#' + i.id} · ${formatCurrency(i.total ?? i.amount)}`}
              right={<StatusBadge status={i.status} />}
              meta={i.due_date ? `Due ${formatDate(i.due_date)}` : undefined}
            />
          ))
        ) : (
          <Empty />
        )}
      </Section>

      <Section title="Notifications" count={notifs.data?.count} loading={notifs.isLoading}>
        {notifs.data?.results.length ? (
          notifs.data.results.map((n) => (
            <Row
              key={String(n.id)}
              left={n.subject || n.message}
              right={
                <Text className="text-xs font-semibold uppercase text-brand-700">{n.channel}</Text>
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
                <Text className="text-xs font-semibold uppercase text-brand-700">{c.channel}</Text>
              }
              meta={formatDate(c.created_at)}
            />
          ))
        ) : (
          <Empty />
        )}
      </Section>
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
