import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, UserMinus, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCustomer, deactivateCustomer, deleteCustomer,
  listCustomers, purgeCustomer, updateCustomer,
} from '../api/customers';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../lib/constants';
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
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import { formatDate } from '../lib/format';

const EMPTY = { full_name: '', phone: '', email: '', address: '', national_id: '', status: 'active', preferred_channel: 'all', notes: '' };

export default function Customers() {
  const { hasRole, user } = useAuth();
  const canWrite = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN, ROLES.CS_OFFICER]);
  const canDelete = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN]);
  const qc = useQueryClient();

  const list = useListQuery(['customers'], listCustomers);
  const [editing, setEditing] = useState(null); // null | {} | row
  const [confirming, setConfirming] = useState(null);
  const [purging, setPurging] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function openCreate() { setForm(EMPTY); setEditing({}); }
  function openEdit(row) { setForm({ ...EMPTY, ...row }); setEditing(row); }
  function closeEdit() { setEditing(null); }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      delete payload.id; delete payload.customer_code; delete payload.registration_date;
      delete payload.created_at; delete payload.updated_at;
      return editing?.id ? updateCustomer(editing.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      toast.success(editing?.id ? 'Customer updated' : 'Customer created');
      qc.invalidateQueries({ queryKey: ['customers'] });
      closeEdit();
    },
    onError: (e) => toast.error(extractError(e, 'Save failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(confirming.id),
    onSuccess: () => {
      toast.success('Customer deleted');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setConfirming(null);
    },
    onError: (e) => toast.error(extractError(e, 'Delete failed')),
  });

  const purgeMutation = useMutation({
    mutationFn: () => purgeCustomer(purging.id),
    onSuccess: (data) => {
      const d = data?.deleted || {};
      const parts = Object.entries(d).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k.replace(/_/g, ' ')}`);
      toast.success(`Purged. Removed: ${parts.join(', ') || 'no related records'}.`);
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['escalations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['comms-logs'] });
      setPurging(null);
    },
    onError: (e) => toast.error(extractError(e, 'Purge failed')),
  });

  async function handleDeactivate(row) {
    try {
      await deactivateCustomer(row.id);
      toast.success('Customer deactivated');
      qc.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      toast.error(extractError(err));
    }
  }

  const columns = [
    { key: 'customer_code', header: 'Code', sortable: true, sortKey: 'customer_code' },
    { key: 'full_name', header: 'Name', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
    { key: 'registration_date', header: 'Registered', sortable: true, render: (r) => formatDate(r.registration_date) },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => openEdit(r)} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canWrite && r.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => handleDeactivate(r)} aria-label="Deactivate">
              <UserMinus className="h-3.5 w-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(r)} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => setPurging(r)} aria-label="Force delete (purge)" title="Purge: deletes this customer and ALL related records">
              <Flame className="h-3.5 w-3.5 text-red-700" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer records, status and contact details."
        actions={canWrite ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>New customer</Button> : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search code, name, phone, email…"
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
        onClose={closeEdit}
        title={editing?.id ? `Edit ${editing.customer_code}` : 'New customer'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              {editing?.id ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Full name" required>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </FormField>
          <FormField label="National ID" required>
            <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254712345678" />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormField>
          <FormField label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            />
          </FormField>
          <FormField label="Reminder channel">
            <Select
              value={form.preferred_channel || 'all'}
              onChange={(e) => setForm({ ...form, preferred_channel: e.target.value })}
              options={[
                { value: 'all', label: 'All channels' },
                { value: 'sms', label: 'SMS only' },
                { value: 'email', label: 'Email only' },
                { value: 'in_app', label: 'In-app only' },
              ]}
            />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete customer?"
        description={confirming ? `This will permanently delete ${confirming.full_name}. If they have any related records (subscriptions, invoices, comms), this will fail — use Force Delete instead.` : ''}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={!!purging}
        onClose={() => setPurging(null)}
        onConfirm={() => purgeMutation.mutate()}
        loading={purgeMutation.isPending}
        title="Force delete customer?"
        description={purging
          ? `DESTRUCTIVE — this will permanently delete ${purging.full_name} (${purging.customer_code}) AND every related record: subscriptions, invoices, payments, communication logs, notifications, escalations. Financial history will be lost. Continue?`
          : ''}
        confirmLabel="Yes, purge everything"
        variant="danger"
      />
    </>
  );
}
