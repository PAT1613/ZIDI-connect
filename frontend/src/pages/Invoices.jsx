import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createInvoice, deleteInvoice, downloadInvoicePdf, listInvoices, updateInvoice,
} from '../api/invoices';
import { listCustomers } from '../api/customers';
import { listSubscriptions } from '../api/subscriptions';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { INVOICE_STATUS, ROLES } from '../lib/constants';
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
import { formatCurrency, formatDate } from '../lib/format';

const EMPTY = {
  customer_id: '', customer_service_id: '', amount: '', tax: '0',
  status: 'pending', issued_date: '', due_date: '', notes: '',
};

export default function Invoices() {
  const { hasRole, user } = useAuth();
  const canWrite = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN, ROLES.FINANCE]);
  const canDelete = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN]);
  const qc = useQueryClient();

  const list = useListQuery(['invoices'], listInvoices);
  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => listCustomers({ page_size: 200, ordering: 'full_name' }),
  });
  const { data: subs } = useQuery({
    queryKey: ['subscriptions', 'lookup'],
    queryFn: () => listSubscriptions({ page_size: 200 }),
  });

  const customerOptions = useMemo(
    () => (customers?.results || []).map((c) => ({ value: c.id, label: `${c.full_name} (${c.customer_code})` })),
    [customers],
  );
  const subOptions = useMemo(
    () => (subs?.results || []).map((s) => ({
      value: s.id,
      label: `${s.customer?.full_name || ''} → ${s.service?.name || ''}`,
    })),
    [subs],
  );

  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        amount: Number(form.amount),
        tax: Number(form.tax || 0),
      };
      if (!payload.customer_service_id) delete payload.customer_service_id;
      if (!payload.issued_date) delete payload.issued_date;
      if (!payload.due_date) delete payload.due_date;
      delete payload.id; delete payload.invoice_number; delete payload.customer;
      delete payload.customer_service; delete payload.payments; delete payload.balance;
      delete payload.total; delete payload.created_at; delete payload.updated_at;
      return editing?.id ? updateInvoice(editing.id, payload) : createInvoice(payload);
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setEditing(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(confirming.id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setConfirming(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  async function handleDownload(row) {
    try {
      await downloadInvoicePdf(row.id, row.invoice_number);
    } catch (err) {
      toast.error(extractError(err, 'Could not download PDF'));
    }
  }

  const columns = [
    { key: 'invoice_number', header: 'Number', sortable: true },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.full_name || '—' },
    { key: 'total', header: 'Total', align: 'right', sortable: true, render: (r) => formatCurrency(r.total) },
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => formatCurrency(r.balance) },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
    { key: 'issued_date', header: 'Issued', sortable: true, render: (r) => formatDate(r.issued_date) },
    { key: 'due_date', header: 'Due', sortable: true, render: (r) => formatDate(r.due_date) },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleDownload(r)} aria-label="PDF">
            <FileDown className="h-3.5 w-3.5" />
          </Button>
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => {
              setForm({
                ...EMPTY,
                ...r,
                customer_id: r.customer?.id || '',
                customer_service_id: r.customer_service?.id || '',
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
        title="Invoices"
        description="Issue, track and export customer invoices."
        actions={canWrite ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setEditing({}); }}>
            New invoice
          </Button>
        ) : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search number or customer…"
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
        title={editing?.id ? `Edit ${editing.invoice_number}` : 'New invoice'}
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
            <Select value={form.customer_id} options={customerOptions} placeholder="Select customer"
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })} />
          </FormField>
          <FormField label="Subscription (optional)">
            <Select value={form.customer_service_id || ''} options={subOptions}
                    placeholder="None"
                    onChange={(e) => setForm({ ...form, customer_service_id: e.target.value })} />
          </FormField>
          <FormField label="Amount (KES)" required>
            <Input type="number" step="0.01" value={form.amount}
                   onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </FormField>
          <FormField label="Tax (KES)">
            <Input type="number" step="0.01" value={form.tax}
                   onChange={(e) => setForm({ ...form, tax: e.target.value })} />
          </FormField>
          <FormField label="Issued date">
            <Input type="date" value={form.issued_date || ''}
                   onChange={(e) => setForm({ ...form, issued_date: e.target.value })} />
          </FormField>
          <FormField label="Due date">
            <Input type="date" value={form.due_date || ''}
                   onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} options={INVOICE_STATUS}
                    onChange={(e) => setForm({ ...form, status: e.target.value })} />
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
        title="Delete invoice?"
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
