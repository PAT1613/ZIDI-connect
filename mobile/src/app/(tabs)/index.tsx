import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, Dimensions, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';

import { getDashboardReport, type DashboardReport } from '../../api/reports';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatNumber } from '../../lib/format';

const PIE_COLORS = ['#0e7490', '#22d3ee', '#f59e0b', '#ef4444', '#8b5cf6'];

function n(v: unknown): number {
  const x = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
}

export default function DashboardScreen() {
  const { user, roleName } = useAuth();
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardReport,
    refetchInterval: 60_000,
  });

  const chartWidth = Dimensions.get('window').width - 64;

  const revenueData = useMemo(
    () =>
      (data?.revenue.by_month ?? []).map((m) => ({
        value: n(m.total),
        label: m.month?.slice(5) ?? '',
      })),
    [data],
  );

  const notifData = useMemo(
    () =>
      (data?.notifications_30d ?? []).map((item, i) => ({
        value: n(item.count),
        text: `${item.channel}/${item.status}`,
        color: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [data],
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View>
          <Text className="text-2xl font-bold text-ink-900">Dashboard</Text>
          <Text className="text-sm text-ink-500">
            {user?.full_name || user?.email} · {roleName || 'No role'}
          </Text>
        </View>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <Card>
            <Text className="text-red-600">Could not load dashboard.</Text>
          </Card>
        ) : data ? (
          <DashboardBody data={data} chartWidth={chartWidth} revenueData={revenueData} notifData={notifData} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function DashboardBody({
  data,
  chartWidth,
  revenueData,
  notifData,
}: {
  data: DashboardReport;
  chartWidth: number;
  revenueData: { value: number; label: string }[];
  notifData: { value: number; text: string; color: string }[];
}) {
  return (
    <>
      <View className="flex-row gap-3">
        <StatCard
          label="Active Customers"
          value={formatNumber(data.customers.active)}
          sub={`of ${formatNumber(data.customers.total)} total`}
          tone="brand"
        />
        <StatCard label="Active Services" value={formatNumber(data.services.active)} tone="violet" />
      </View>

      <View className="flex-row gap-3">
        <StatCard
          label="Renewing in 14d"
          value={formatNumber(data.subscriptions.upcoming_renewals)}
          sub={`${formatNumber(data.subscriptions.expired)} expired`}
          tone="amber"
        />
        <StatCard
          label="Revenue MTD"
          value={formatCurrency(data.revenue.month_to_date)}
          sub={`${formatCurrency(data.revenue.total)} all-time`}
          tone="green"
        />
      </View>

      <View className="flex-row gap-3">
        <StatCard label="Pending Invoices" value={formatNumber(data.invoices.pending)} tone="amber" />
        <StatCard label="Overdue Invoices" value={formatNumber(data.invoices.overdue)} tone="red" />
      </View>

      <View className="flex-row gap-3">
        <StatCard label="Open Escalations" value={formatNumber(data.escalations.open)} tone="red" />
        <StatCard
          label="Active Subscriptions"
          value={formatNumber(data.subscriptions.active)}
          tone="brand"
        />
      </View>

      <Card>
        <Text className="mb-3 text-base font-semibold text-ink-800">Revenue trend</Text>
        {revenueData.length ? (
          <LineChart
            data={revenueData}
            width={chartWidth}
            height={180}
            color="#0e7490"
            thickness={2}
            startFillColor="#0e7490"
            endFillColor="#ffffff"
            startOpacity={0.3}
            endOpacity={0}
            areaChart
            curved
            yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
            initialSpacing={8}
            spacing={Math.max(28, chartWidth / Math.max(revenueData.length, 1))}
            hideRules
            hideDataPoints={Platform.OS === 'web'}
          />
        ) : (
          <Text className="text-sm text-ink-500">No data yet.</Text>
        )}
      </Card>

      <Card>
        <Text className="mb-3 text-base font-semibold text-ink-800">Notifications · last 30 days</Text>
        {notifData.length ? (
          <View className="items-center gap-3">
            <PieChart data={notifData} donut innerRadius={45} radius={75} />
            <View className="w-full gap-1">
              {notifData.map((d) => (
                <View key={d.text} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View style={{ width: 10, height: 10, backgroundColor: d.color, borderRadius: 2 }} />
                    <Text className="text-xs text-ink-600">{d.text}</Text>
                  </View>
                  <Text className="text-xs font-semibold text-ink-700">{formatNumber(d.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text className="text-sm text-ink-500">No notifications in the last 30 days.</Text>
        )}
      </Card>

    </>
  );
}
