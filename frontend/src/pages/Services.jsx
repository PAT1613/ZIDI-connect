import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createService, deleteService, listServices, updateService,
} from '../api/services';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { BILLING_CYCLES, ROLES } from '../lib/constants';
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
import { formatCurrency } from '../lib/format';

const EMPTY = { name: '', description: '', price: '', sla_days: 30, billing_cycle: 'monthly', status: 'active' };

export default function Services() {
  const { hasRole, user } = useAuth();
  const canWrite = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN, ROLES.OPERATIONS]);
  const canDelete = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN]);
  const qc = useQueryClient();

  const list = useListQuery(['services'], listServices);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        price: Number(form.price),
        sla_days: Number(form.sla_days) || 0,
      };
      delete payload.id; delete payload.service_code; delete payload.created_at; delete payload.updated_at;
      return editing?.id ? updateService(editing.id, payload) : createService(payload);
    },
    onSuccess: () => {
      toast.success(editing?.id ? 'Service updated' : 'Service created');
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(confirming.id),
    onSuccess: () => {
      toast.success('Service deleted');
      qc.invalidateQueries({ queryKey: ['services'] });
      setConfirming(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const columns = [
    { key: 'service_code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'price', header: 'Price', align: 'right', sortable: true, render: (r) => formatCurrency(r.price) },
    { key: 'billing_cycle', header: 'Cycle', render: (r) => <Badge color="brand">{r.billing_cycle}</Badge> },
    { key: 'sla_days', header: 'SLA (days)', align: 'right' },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => { setForm({ ...EMPTY, ...r }); setEditing(r); }}>
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
        title="Services"
        description="Service catalog with pricing and billing cycle."
        actions={canWrite ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setEditing({}); }}>
            New service
          </Button>
        ) : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search by code or name…"
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
        title={editing?.id ? `Edit ${editing.service_code}` : 'New service'}
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
          <FormField label="Name" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Price (KES)" required>
            <Input type="number" step="0.01" value={form.price}
                   onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </FormField>
          <FormField label="Billing cycle">
            <Select value={form.billing_cycle} options={BILLING_CYCLES}
                    onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} />
          </FormField>
          <FormField label="SLA days">
            <Input type="number" value={form.sla_days}
                   onChange={(e) => setForm({ ...form, sla_days: e.target.value })} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status}
                    options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                    onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <Textarea value={form.description || ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete service?"
        description={confirming ? `Delete ${confirming.name}? Active subscriptions will block deletion.` : ''}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
