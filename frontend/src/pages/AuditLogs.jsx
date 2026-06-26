import { listAuditLogs } from '../api/audit';
import { useListQuery } from '../hooks/useListQuery';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';

const ACTION_COLORS = {
  create: 'green',
  update: 'amber',
  delete: 'red',
};

export default function AuditLogs() {
  const list = useListQuery(['audit-logs'], listAuditLogs);

  const columns = [
    { key: 'created_at', header: 'When', sortable: true, render: (r) => formatDateTime(r.created_at) },
    { key: 'user_email', header: 'User', render: (r) => r.user_email || 'system' },
    { key: 'action', header: 'Action', render: (r) => <Badge color={ACTION_COLORS[r.action] || 'slate'}>{r.action}</Badge> },
    { key: 'module', header: 'Module', render: (r) => <Badge color="brand">{r.module}</Badge> },
    { key: 'object_repr', header: 'Object' },
    { key: 'ip_address', header: 'IP' },
  ];

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable trail of mutations across the system."
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search object or user…"
      />
      <Table
        columns={columns}
        rows={list.rows}
        loading={list.loading}
        ordering={list.ordering}
        onSort={list.setOrdering}
        page={list.page}
        total={list.total}
        onPageChange={list.setPage}
      />
    </>
  );
}
