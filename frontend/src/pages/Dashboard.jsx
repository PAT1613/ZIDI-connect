import { useQuery } from '@tanstack/react-query';
import {
  Users, Receipt, Wallet, AlertTriangle, Clock, Briefcase, TrendingUp, MessageSquare,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getDashboardReport } from '../api/reports';
import Card from '../components/ui/Card';
import PageHeader from '../components/layout/PageHeader';
import { formatCurrency, formatNumber } from '../lib/format';

const KPI_PALETTE = {
  brand: { bg: 'bg-brand-50', fg: 'text-brand-700', ring: 'ring-brand-100', bar: 'bg-brand-500' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-700', ring: 'ring-amber-100', bar: 'bg-amber-500' },
  red:   { bg: 'bg-red-50',   fg: 'text-red-700',   ring: 'ring-red-100',   bar: 'bg-red-500' },
  slate: { bg: 'bg-ink-100',  fg: 'text-ink-600',   ring: 'ring-ink-200',   bar: 'bg-ink-400' },
  green: { bg: 'bg-emerald-50', fg: 'text-emerald-700', ring: 'ring-emerald-100', bar: 'bg-emerald-500' },
  violet:{ bg: 'bg-violet-50', fg: 'text-violet-700', ring: 'ring-violet-100', bar: 'bg-violet-500' },
};

function Kpi({ icon: Icon, label, value, sub, color = 'brand' }) {
  const c = KPI_PALETTE[color] || KPI_PALETTE.brand;
  return (
    <div className="kpi-card">
      <div className={`absolute left-0 top-0 h-full w-1 ${c.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink-900">{value}</div>
          {sub ? <div className="mt-0.5 text-xs text-ink-500">{sub}</div> : null}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${c.bg} ${c.fg} ${c.ring}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="kpi-card">
      <div className="skeleton mb-2 h-3 w-24" />
      <div className="skeleton h-7 w-20" />
      <div className="skeleton mt-1 h-3 w-32" />
    </div>
  );
}

const PIE_COLORS = ['#0e7490', '#f59e0b', '#06b6d4', '#dc2626', '#64748b'];

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardReport,
    refetchInterval: 60_000,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Failed to load dashboard. Please refresh.
      </div>
    );
  }

  const chartData = (data?.revenue?.by_month || []).map((m) => ({
    month: m.month,
    total: Number(m.total) || 0,
  }));

  const notifData = (data?.notifications_30d || []).reduce((acc, row) => {
    const k = `${row.channel}-${row.status}`;
    acc.push({ name: `${row.channel}/${row.status}`, value: Number(row.count) || 0, key: k });
    return acc;
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of customers, services, billing and notifications."
        actions={
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 md:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live · refreshes every 60s
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <Kpi icon={Users} label="Active Customers" value={formatNumber(data.customers?.active)}
                 sub={`${formatNumber(data.customers?.total)} total`} color="brand" />
            <Kpi icon={Briefcase} label="Active Services" value={formatNumber(data.services?.active)} color="violet" />
            <Kpi icon={Clock} label="Renewing in 14d" value={formatNumber(data.subscriptions?.upcoming_renewals)}
                 sub={`${formatNumber(data.subscriptions?.expired)} expired`} color="amber" />
            <Kpi icon={TrendingUp} label="Revenue (MTD)" value={formatCurrency(data.revenue?.month_to_date)}
                 sub={`${formatCurrency(data.revenue?.total)} all-time`} color="green" />
            <Kpi icon={Receipt} label="Pending Invoices" value={formatNumber(data.invoices?.pending)} color="amber" />
            <Kpi icon={Receipt} label="Overdue Invoices" value={formatNumber(data.invoices?.overdue)} color="red" />
            <Kpi icon={AlertTriangle} label="Open Escalations" value={formatNumber(data.escalations?.open)} color="red" />
            <Kpi icon={Wallet} label="Active Subscriptions" value={formatNumber(data.subscriptions?.active)} color="brand" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          title="Revenue trend"
          subtitle="Monthly totals over the last 6 months"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e7490" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0e7490" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15,23,42,0.08)' }}
                  cursor={{ stroke: '#0e7490', strokeOpacity: 0.15, strokeWidth: 30 }}
                />
                <Area type="monotone" dataKey="total" stroke="#0e7490" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Notifications (30d)" subtitle="By channel and status">
          {notifData.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-ink-500">
              <div className="text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-ink-300" />
                <div className="mt-2">No notifications yet</div>
              </div>
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={notifData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {notifData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, color: '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
