import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RefreshCw, PauseCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createSubscription, deleteSubscription, listSubscriptions,
  renewSubscription, suspendSubscription, terminateSubscription, updateSubscription,
} from '../api/subscriptions';
import { listCustomers } from '../api/customers';
import { listServices } from '../api/services';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { ROLES, SUBSCRIPTION_STATUS } from '../lib/constants';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormField from '../components/ui/FormField';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { formatDate } from '../lib/format';

const EMPTY = { customer_id: '', service_id: '', start_date: '', due_date: '', status: 'active', auto_renew: true, notes: '' };

export default function Subscriptions() {
  const { hasRole, user } = useAuth();
  const canWrite = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS]);
  const canDelete = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN]);
  const qc = useQueryClient();

  const list = useListQuery(['subscriptions'], listSubscriptions);

  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => listCustomers({ page_size: 200, ordering: 'full_name' }),
  });
  const { data: services } = useQuery({
    queryKey: ['services', 'lookup'],
    queryFn: () => listServices({ page_size: 200, ordering: 'name', status: 'active' }),
  });

  const customerOptions = useMemo(
    () => (customers?.results || []).map((c) => ({ value: c.id, label: `${c.full_name} (${c.customer_code})` })),
    [customers],
  );
  const serviceOptions = useMemo(
    () => (services?.results || []).map((s) => ({ value: s.id, label: `${s.name} (${s.service_code})` })),
    [services],
  );

  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.due_date) delete payload.due_date;
      delete payload.id; delete payload.customer; delete payload.service;
      delete payload.created_at; delete payload.updated_at;
      delete payload.renewal_date; delete payload.end_date;
      return editing?.id ? updateSubscription(editing.id, payload) : createSubscription(payload);
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setEditing(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSubscription(confirming.id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setConfirming(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  async function runAction(fn, row, label) {
    try {
      await fn(row.id);
      toast.success(label);
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch (err) {
      toast.error(extractError(err));
    }
  }

  const columns = [
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.full_name || '—' },
    { key: 'service', header: 'Service', render: (r) => r.service?.name || '—' },
    { key: 'start_date', header: 'Start', sortable: true, render: (r) => formatDate(r.start_date) },
    { key: 'due_date', header: 'Due', sortable: true, render: (r) => formatDate(r.due_date) },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
    { key: 'auto_renew', header: 'Auto', render: (r) => r.auto_renew ? 'Yes' : 'No' },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {canWrite && r.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => runAction(renewSubscription, r, 'Renewed')} aria-label="Renew">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          {canWrite && r.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => runAction(suspendSubscription, r, 'Suspended')} aria-label="Suspend">
              <PauseCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {canWrite && r.status !== 'terminated' && (
            <Button variant="ghost" size="sm" onClick={() => runAction(terminateSubscription, r, 'Terminated')} aria-label="Terminate">
              <XCircle className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => {
              setForm({
                ...EMPTY,
                ...r,
                customer_id: r.customer?.id || '',
                service_id: r.service?.id || '',
              });
              setEditing(r);
            }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(r)}>
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Customer service subscriptions, renewals and lifecycle actions."
        actions={canWrite ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setEditing({}); }}>
            New subscription
          </Button>
        ) : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search by customer or service…"
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
        title={editing?.id ? 'Edit subscription' : 'New subscription'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              {editing?.id ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Customer" required>
            <Select value={form.customer_id} options={customerOptions} placeholder="Select a customer"
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })} />
          </FormField>
          <FormField label="Service" required>
            <Select value={form.service_id} options={serviceOptions} placeholder="Select a service"
                    onChange={(e) => setForm({ ...form, service_id: e.target.value })} />
          </FormField>
          <FormField label="Start date">
            <Input type="date" value={form.start_date || ''}
                   onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </FormField>
          <FormField label="Due date" hint="Leave empty to auto-compute from billing cycle">
            <Input type="date" value={form.due_date || ''}
                   onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} options={SUBSCRIPTION_STATUS}
                    onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </FormField>
          <FormField label="Auto-renew">
            <Select value={form.auto_renew ? 'true' : 'false'}
                    options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                    onChange={(e) => setForm({ ...form, auto_renew: e.target.value === 'true' })} />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes || ''}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete subscription?"
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
