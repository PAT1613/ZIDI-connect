import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createEscalation, listEscalations, updateEscalation,
} from '../api/escalations';
import { listSubscriptions } from '../api/subscriptions';
import { listUsers } from '../api/users';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { ESCALATION_STATUS, ROLES } from '../lib/constants';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';

const EMPTY = { customer_service_id: '', status: 'open', assigned_to: '', reason: '', notes: '' };

export default function Escalations() {
  const { hasRole, user } = useAuth();
  const canWrite = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS, ROLES.MANAGER]);
  const qc = useQueryClient();

  const list = useListQuery(['escalations'], listEscalations);
  const { data: subs } = useQuery({
    queryKey: ['subscriptions', 'lookup'],
    queryFn: () => listSubscriptions({ page_size: 200 }),
  });
  const { data: users } = useQuery({
    queryKey: ['users', 'lookup'],
    queryFn: () => listUsers({ page_size: 100 }),
    retry: false,
  });

  const subOptions = useMemo(
    () => (subs?.results || []).map((s) => ({
      value: s.id, label: `${s.customer?.full_name || ''} → ${s.service?.name || ''}`,
    })),
    [subs],
  );
  const userOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }].concat(
      (users?.results || []).map((u) => ({ value: u.id, label: u.full_name || u.email })),
    ),
    [users],
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (!payload.assigned_to) payload.assigned_to = null;
      delete payload.id; delete payload.customer_service;
      delete payload.created_at; delete payload.updated_at; delete payload.opened_at;
      delete payload.resolved_at; delete payload.assigned_to_name;
      return editing?.id ? updateEscalation(editing.id, payload) : createEscalation(payload);
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['escalations'] });
      setEditing(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const columns = [
    { key: 'opened_at', header: 'Opened', sortable: true, render: (r) => formatDateTime(r.opened_at) },
    {
      key: 'customer_service', header: 'Subscription',
      render: (r) => r.customer_service
        ? `${r.customer_service.customer?.full_name || ''} → ${r.customer_service.service?.name || ''}`
        : '—',
    },
    { key: 'reason', header: 'Reason' },
    { key: 'assigned_to_name', header: 'Assigned to', render: (r) => r.assigned_to_name || '—' },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
    { key: 'resolved_at', header: 'Resolved', render: (r) => r.resolved_at ? formatDateTime(r.resolved_at) : '—' },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => canWrite ? (
        <Button variant="ghost" size="sm" onClick={() => {
          setForm({
            ...EMPTY,
            ...r,
            customer_service_id: r.customer_service?.id || '',
            assigned_to: r.assigned_to || '',
          });
          setEditing(r);
        }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Escalations"
        description="Track unresolved customer issues and overdue subscriptions."
        actions={canWrite ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setEditing({}); }}>
            New escalation
          </Button>
        ) : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search reason or customer…"
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
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Update escalation' : 'New escalation'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Subscription" required className="sm:col-span-2">
            <Select value={form.customer_service_id} options={subOptions} placeholder="Select subscription"
                    onChange={(e) => setForm({ ...form, customer_service_id: e.target.value })} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} options={ESCALATION_STATUS}
                    onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </FormField>
          <FormField label="Assigned to">
            <Select value={form.assigned_to || ''} options={userOptions}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
          </FormField>
          <FormField label="Reason" className="sm:col-span-2">
            <Input value={form.reason || ''}
                   onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes || ''}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
