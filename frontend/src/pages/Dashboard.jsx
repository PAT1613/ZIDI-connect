import { useQuery } from '@tanstack/react-query';
import {
  Users, Receipt, Wallet, AlertTriangle, Clock, Briefcase,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { getDashboardReport } from '../api/reports';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';
import { formatCurrency, formatNumber } from '../lib/format';

function Kpi({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <Card padded>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-lg font-semibold text-slate-900">{value}</div>
          {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardReport,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (error || !data) {
    return <div className="text-sm text-red-600">Failed to load dashboard.</div>;
  }

  const chartData = (data.revenue?.by_month || []).map((m) => ({
    month: m.month,
    total: Number(m.total) || 0,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of customers, services, billing and notifications."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Active Customers" value={formatNumber(data.customers?.active)}
             sub={`${formatNumber(data.customers?.total)} total`} color="brand" />
        <Kpi icon={Briefcase} label="Active Services" value={formatNumber(data.services?.active)} color="slate" />
        <Kpi icon={Clock} label="Subs Renewing (14d)" value={formatNumber(data.subscriptions?.upcoming_renewals)}
             sub={`${formatNumber(data.subscriptions?.expired)} expired`} color="amber" />
        <Kpi icon={Wallet} label="Revenue (MTD)" value={formatCurrency(data.revenue?.month_to_date)}
             sub={`${formatCurrency(data.revenue?.total)} all-time`} color="green" />
        <Kpi icon={Receipt} label="Pending Invoices" value={formatNumber(data.invoices?.pending)} color="amber" />
        <Kpi icon={Receipt} label="Overdue Invoices" value={formatNumber(data.invoices?.overdue)} color="red" />
        <Kpi icon={AlertTriangle} label="Open Escalations" value={formatNumber(data.escalations?.open)} color="red" />
        <Kpi icon={Users} label="Active Subscriptions" value={formatNumber(data.subscriptions?.active)} color="brand" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Revenue (last 6 months)" className="lg:col-span-2">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Notifications (30 days)">
          <ul className="divide-y divide-slate-100 text-sm">
            {(data.notifications_30d || []).map((row, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="capitalize">{row.channel} — {row.status}</span>
                <span className="font-semibold">{formatNumber(row.count)}</span>
              </li>
            ))}
            {(!data.notifications_30d || data.notifications_30d.length === 0) ? (
              <li className="py-2 text-slate-500">No notifications yet</li>
            ) : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
