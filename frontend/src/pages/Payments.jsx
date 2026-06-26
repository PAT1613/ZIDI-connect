import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPayment, listPayments } from '../api/payments';
import { listInvoices } from '../api/invoices';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { PAYMENT_METHODS, ROLES } from '../lib/constants';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../lib/format';

const EMPTY = { invoice: '', amount: '', method: 'mobile_money', reference: '' };

export default function Payments() {
  const { hasRole, user } = useAuth();
  const canWrite = user?.is_superuser || hasRole([ROLES.SUPER_ADMIN, ROLES.FINANCE]);
  const qc = useQueryClient();

  const list = useListQuery(['payments'], listPayments);
  const { data: invoices } = useQuery({
    queryKey: ['invoices', 'unpaid'],
    queryFn: () => listInvoices({ page_size: 200, status: 'pending' }),
  });

  const invoiceOptions = useMemo(
    () => (invoices?.results || []).map((i) => ({
      value: i.id,
      label: `${i.invoice_number} — ${i.customer?.full_name || ''} (${formatCurrency(i.balance || i.total)})`,
    })),
    [invoices],
  );

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const saveMutation = useMutation({
    mutationFn: () => createPayment({ ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setCreating(false);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const columns = [
    { key: 'paid_at', header: 'When', sortable: true, render: (r) => formatDateTime(r.paid_at) },
    { key: 'invoice_number', header: 'Invoice' },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: (r) => formatCurrency(r.amount) },
    { key: 'method', header: 'Method', render: (r) => <Badge color="brand">{r.method.replace('_', ' ')}</Badge> },
    { key: 'reference', header: 'Reference' },
    { key: 'received_by_name', header: 'Received by' },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Record and view customer payments. Payments auto-mark invoices paid."
        actions={canWrite ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setCreating(true); }}>
            Record payment
          </Button>
        ) : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search reference or invoice…"
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
        open={creating}
        onClose={() => setCreating(false)}
        title="Record payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              Record
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <FormField label="Invoice" required>
            <Select value={form.invoice} options={invoiceOptions} placeholder="Select invoice"
                    onChange={(e) => setForm({ ...form, invoice: e.target.value })} />
          </FormField>
          <FormField label="Amount (KES)" required>
            <Input type="number" step="0.01" value={form.amount}
                   onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </FormField>
          <FormField label="Method">
            <Select value={form.method} options={PAYMENT_METHODS}
                    onChange={(e) => setForm({ ...form, method: e.target.value })} />
          </FormField>
          <FormField label="Reference">
            <Input value={form.reference}
                   onChange={(e) => setForm({ ...form, reference: e.target.value })}
                   placeholder="MPESA confirmation code, etc." />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
