import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createUser, deleteUser, listRoles, listUsers, updateUser,
} from '../api/users';
import { useListQuery } from '../hooks/useListQuery';
import { useAuth } from '../hooks/useAuth';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormField from '../components/ui/FormField';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';

const EMPTY = { email: '', full_name: '', phone: '', role_id: '', is_active: true, password: '' };

export default function Users() {
  const { user } = useAuth();
  const canWrite = user?.is_superuser || (user?.role?.name === 'Super Admin');
  const qc = useQueryClient();

  const list = useListQuery(['users'], listUsers);
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRoles({ page_size: 50 }),
  });
  const roleOptions = useMemo(
    () => [{ value: '', label: '— No role —' }].concat(
      (roles?.results || []).map((r) => ({ value: r.id, label: r.name })),
    ),
    [roles],
  );

  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.role_id) delete payload.role_id;
      delete payload.id; delete payload.role; delete payload.is_superuser;
      delete payload.date_joined; delete payload.last_login;
      delete payload.created_at; delete payload.updated_at;
      return editing?.id ? updateUser(editing.id, payload) : createUser(payload);
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditing(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(confirming.id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
      setConfirming(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const columns = [
    { key: 'email', header: 'Email', sortable: true },
    { key: 'full_name', header: 'Full name', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'role', header: 'Role', render: (r) => r.role?.name || (r.is_superuser ? 'Super Admin' : '—') },
    { key: 'is_active', header: 'Active', render: (r) => <Badge status={r.is_active ? 'active' : 'inactive'} /> },
    { key: 'last_login', header: 'Last login', render: (r) => r.last_login ? formatDateTime(r.last_login) : '—' },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => canWrite ? (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => {
            setForm({ ...EMPTY, ...r, role_id: r.role?.id || '', password: '' });
            setEditing(r);
          }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!r.is_superuser && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(r)}>
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage staff accounts and their roles."
        actions={canWrite ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setForm(EMPTY); setEditing({}); }}>
            New user
          </Button>
        ) : null}
      />
      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search email or name…"
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
        title={editing?.id ? 'Edit user' : 'New user'}
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
          <FormField label="Email" required>
            <Input type="email" value={form.email}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Full name" required>
            <Input value={form.full_name}
                   onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <Input value={form.phone || ''}
                   onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Role">
            <Select value={form.role_id || ''} options={roleOptions}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })} />
          </FormField>
          <FormField label={editing?.id ? 'Reset password (optional)' : 'Password'} required={!editing?.id}>
            <Input type="password" value={form.password || ''}
                   onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <FormField label="Active">
            <Select value={form.is_active ? 'true' : 'false'}
                    options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Disabled' }]}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} />
          </FormField>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete user?"
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
