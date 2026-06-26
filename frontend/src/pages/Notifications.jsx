import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCheck } from 'lucide-react';
import { listNotifications, markNotificationRead } from '../api/notifications';
import { useListQuery } from '../hooks/useListQuery';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { formatDateTime } from '../lib/format';

export default function Notifications() {
  const qc = useQueryClient();
  const list = useListQuery(['notifications'], listNotifications);

  const readMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const columns = [
    { key: 'created_at', header: 'When', sortable: true, render: (r) => formatDateTime(r.created_at) },
    { key: 'channel', header: 'Channel', render: (r) => <Badge color="brand">{r.channel.toUpperCase()}</Badge> },
    { key: 'subject', header: 'Subject', render: (r) => r.subject || '—' },
    {
      key: 'message', header: 'Message',
      render: (r) => <span className="block max-w-md truncate" title={r.message}>{r.message}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
    {
      key: 'read_at', header: '', align: 'right',
      render: (r) => r.read_at ? (
        <span className="text-xs text-slate-400">Read</span>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => readMutation.mutate(r.id)}>
          <CheckCheck className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Your in-app notification feed. SMS and email delivery events also appear here."
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search subject or message…"
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
