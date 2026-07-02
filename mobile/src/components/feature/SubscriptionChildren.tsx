import { useQueries, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';

import { listCommsLogs } from '../../api/communications';
import { getCustomer } from '../../api/customers';
import { listEscalations } from '../../api/escalations';
import { listInvoices } from '../../api/invoices';
import { getService } from '../../api/services';
import { listUsage } from '../../api/usage';
import { formatCurrency, formatDate } from '../../lib/format';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  subscriptionId: string | number;
  customerId?: string | number | null;
  serviceId?: string | number | null;
}

const LIMIT = 5;

export function SubscriptionChildren({ subscriptionId, customerId, serviceId }: Props) {
  const customerQuery = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId as string | number),
    enabled: !!customerId,
  });

  const serviceQuery = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => getService(serviceId as string | number),
    enabled: !!serviceId,
  });

  const sid = String(subscriptionId);
  const cid = customerId ? String(customerId) : '';
  const childQueries = useQueries({
    queries: [
      {
        queryKey: ['invoices', { subscription: sid, page_size: LIMIT }],
        queryFn: () => listInvoices({ subscription: sid, page_size: LIMIT }),
      },
      {
        queryKey: ['escalations', { subscription: sid, page_size: LIMIT }],
        queryFn: () => listEscalations({ subscription: sid, page_size: LIMIT }),
      },
      {
        queryKey: ['comms-logs', { customer: cid, page_size: LIMIT }],
        queryFn: () => listCommsLogs({ customer: cid, page_size: LIMIT }),
        enabled: !!customerId,
      },
      {
        queryKey: ['usage', { subscription: sid, page_size: 1, ordering: '-period_end' }],
        queryFn: () => listUsage({ subscription: sid, page_size: 1, ordering: '-period_end' }),
      },
    ],
  });
  const [invs, escs, comms, latestUsage] = childQueries;
  const latest = latestUsage.data?.results[0];

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

      {serviceId ? (
        <Card>
          <Text className="mb-2 text-base font-semibold text-ink-800">Service</Text>
          {serviceQuery.isLoading ? (
            <ActivityIndicator color="#0e7490" />
          ) : serviceQuery.data ? (
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-ink-900">
                  {serviceQuery.data.name || `Service ${serviceQuery.data.id}`}
                </Text>
                <StatusBadge status={serviceQuery.data.status} />
              </View>
              <Text className="text-sm text-ink-600">
                {formatCurrency(serviceQuery.data.price)} ·{' '}
                {serviceQuery.data.billing_cycle || 'n/a'}
              </Text>
              {serviceQuery.data.sla_days ? (
                <Text className="text-xs text-ink-400">{serviceQuery.data.sla_days}-day SLA</Text>
              ) : null}
              {serviceQuery.data.description ? (
                <Text className="text-xs text-ink-500" numberOfLines={3}>
                  {serviceQuery.data.description}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-ink-500">Service not loaded.</Text>
          )}
        </Card>
      ) : null}

      <Card>
        <Text className="mb-2 text-base font-semibold text-ink-800">Latest usage</Text>
        {latestUsage.isLoading ? (
          <ActivityIndicator color="#0e7490" />
        ) : latest ? (
          <View className="gap-1">
            <Text className="text-base font-semibold text-ink-900">
              {latest.quantity} {latest.unit || ''}
            </Text>
            <Text className="text-xs text-ink-500">
              {formatDate(latest.period_start)} → {formatDate(latest.period_end)}
            </Text>
            {latest.notes ? <Text className="text-xs text-ink-500">{latest.notes}</Text> : null}
          </View>
        ) : (
          <Text className="text-sm text-ink-500">No usage recorded yet.</Text>
        )}
      </Card>

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

      <Section title="Escalations" count={escs.data?.count} loading={escs.isLoading}>
        {escs.data?.results.length ? (
          escs.data.results.map((e) => (
            <Row
              key={String(e.id)}
              left={e.assignee_name ? `→ ${e.assignee_name}` : 'Unassigned'}
              right={<StatusBadge status={e.status} />}
              meta={formatDate(e.updated_at || e.created_at)}
            />
          ))
        ) : (
          <Empty />
        )}
      </Section>

      {customerId ? (
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
