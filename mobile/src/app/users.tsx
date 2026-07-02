import { Redirect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import Toast from 'react-native-toast-message';

import type { AuthUser } from '../api/auth';
import { extractError } from '../api/client';
import { createUser, deleteUser, listRoles, listUsers, updateUser } from '../api/users';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FAB } from '../components/ui/FAB';
import { Header } from '../components/ui/Header';
import { Input } from '../components/ui/Input';
import { ListItem } from '../components/ui/ListItem';
import { Modal } from '../components/ui/Modal';
import { Screen } from '../components/ui/Screen';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useListQuery } from '../hooks/useListQuery';
import { usePermission } from '../hooks/usePermission';
import { ROLES } from '../lib/constants';

const ADMIN_ROLES = [ROLES.SUPER_ADMIN];

interface FormState extends Partial<AuthUser> {
  password?: string;
  role_id?: string;
}

export default function UsersScreen() {
  const { allowed, isAuthenticated } = usePermission(ADMIN_ROLES);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);

  const list = useListQuery<AuthUser>(['users'], listUsers);

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const data: Record<string, unknown> = { ...payload };
      delete data.role;
      delete data.id;
      delete data.is_superuser;
      delete data.date_joined;
      delete data.last_login;
      delete data.created_at;
      delete data.updated_at;
      if (!data.role_id) delete data.role_id;
      if (editing?.id) {
        delete data.password;
        return updateUser(editing.id as string | number, data);
      }
      return createUser(data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing?.id ? 'User updated' : 'User created' });
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Save failed') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteUser(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'User deleted' });
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Delete failed') }),
  });

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!allowed) return <Redirect href="/forbidden" />;

  return (
    <Screen>
      <Header title="Users & Roles" subtitle={`${list.total} total`} back />
      <View className="border-b border-ink-200 bg-white px-4 py-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search users" />
      </View>

      <FlatList
        data={list.rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} />}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          list.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : (
            <EmptyState
              title="No staff accounts"
              message="Add users so your team can log in — pick a role to control what they can do."
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const role = typeof item.role === 'string' ? item.role : item.role?.name || 'No role';
          return (
            <ListItem
              title={item.full_name || item.email}
              subtitle={item.email}
              meta={role}
              onPress={() => setEditing({ ...item, role_id: String((item.role as { id?: number })?.id ?? '') })}
            />
          );
        }}
      />

      <FAB onPress={() => setEditing({})} />

      {editing ? (
        <UserForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveMutation.mutate(payload)}
          onDelete={() => editing.id && deleteMutation.mutate(editing.id as string | number)}
          saving={saveMutation.isPending}
        />
      ) : null}
    </Screen>
  );
}

interface FormProps {
  initial: FormState;
  onClose: () => void;
  onSave: (payload: FormState) => void;
  onDelete: () => void;
  saving: boolean;
}

function UserForm({ initial, onClose, onSave, onDelete, saving }: FormProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const { data: roles } = useQuery({ queryKey: ['roles', 'lookup'], queryFn: () => listRoles() });

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New user' : form.full_name || form.email || 'User'}
      footer={
        <>
          <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
          <Button
            label={isNew ? 'Create' : 'Save'}
            onPress={() => onSave(form)}
            loading={saving}
            className="flex-1"
          />
        </>
      }
    >
      <Input label="Full name *" value={(form.full_name as string) || ''} onChangeText={(v) => set('full_name', v)} />
      <Input
        label="Email *"
        value={(form.email as string) || ''}
        onChangeText={(v) => set('email', v)}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {isNew ? (
        <Input
          label="Password *"
          value={form.password || ''}
          onChangeText={(v) => set('password', v)}
          secureTextEntry
        />
      ) : null}
      <Select
        label="Role"
        value={form.role_id || ''}
        onChange={(v) => set('role_id', v)}
        options={
          roles?.results.map((r) => ({
            value: String((r as { id?: number }).id ?? r.name),
            label: r.name,
          })) || []
        }
      />

      {!isNew ? (
        <Button label="Delete" variant="danger" onPress={onDelete} className="mt-4" />
      ) : null}
    </Modal>
  );
}
