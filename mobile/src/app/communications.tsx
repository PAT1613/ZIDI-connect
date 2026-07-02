import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { extractError } from '../api/client';
import {
  CommsLog,
  deleteCommsLog,
  listCommsLogs,
  sendBulk,
  sendEmail,
  sendSms,
} from '../api/communications';
import { listCustomers } from '../api/customers';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FAB } from '../components/ui/FAB';
import { Header } from '../components/ui/Header';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Screen } from '../components/ui/Screen';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useListQuery } from '../hooks/useListQuery';
import { usePermission } from '../hooks/usePermission';
import { ROLES } from '../lib/constants';
import { formatDateTime } from '../lib/format';

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER];

export default function CommunicationsScreen() {
  const qc = useQueryClient();
  const { allowed: canWrite } = usePermission(WRITE_ROLES);
  const { allowed: canDelete } = usePermission([ROLES.SUPER_ADMIN]);
  const [composing, setComposing] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewing, setViewing] = useState<CommsLog | null>(null);

  const list = useListQuery<CommsLog>(['comms-logs'], listCommsLogs);

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteCommsLog(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Log removed' });
      qc.invalidateQueries({ queryKey: ['comms-logs'] });
      setViewing(null);
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Delete failed') }),
  });

  return (
    <Screen>
      <Header
        title="Communications"
        subtitle={`${list.total} sent`}
        back
        rightSlot={
          canWrite ? (
            <Button label="Bulk" variant="secondary" onPress={() => setBulkOpen(true)} />
          ) : null
        }
      />
      <View className="border-b border-ink-200 bg-white px-4 py-3">
        <SearchBar value={list.search} onChangeText={list.setSearch} placeholder="Search customer or message" />
      </View>

      <FlatList
        data={list.rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} />}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={
          list.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#0e7490" />
            </View>
          ) : (
            <EmptyState
              title="No messages sent yet"
              message="Send an SMS or email to a customer with +, or fan out via Bulk in the header."
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
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold uppercase text-brand-700">{item.channel}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text className="text-xs text-ink-400">{formatDateTime(item.created_at)}</Text>
            </View>
            <Text className="mt-2 text-sm font-semibold text-ink-900">
              {item.customer_name || `Customer ${item.customer || '—'}`}
            </Text>
            {item.subject ? (
              <Text className="text-sm text-ink-700">{item.subject}</Text>
            ) : null}
            <Text className="mt-1 text-sm text-ink-700" numberOfLines={2} onPress={() => setViewing(item)}>
              {item.message}
            </Text>
          </Card>
        )}
      />

      {canWrite ? <FAB onPress={() => setComposing(true)} /> : null}

      {composing ? (
        <ComposeModal
          onClose={() => setComposing(false)}
          onSent={() => {
            qc.invalidateQueries({ queryKey: ['comms-logs'] });
            setComposing(false);
          }}
        />
      ) : null}

      {bulkOpen ? (
        <BulkModal
          onClose={() => setBulkOpen(false)}
          onSent={() => {
            qc.invalidateQueries({ queryKey: ['comms-logs'] });
            setBulkOpen(false);
          }}
        />
      ) : null}

      {viewing ? (
        <Modal
          open
          onClose={() => setViewing(null)}
          title={`${viewing.channel.toUpperCase()} · ${viewing.customer_name || 'Customer'}`}
          footer={
            canDelete ? (
              <>
                <Button label="Close" variant="secondary" onPress={() => setViewing(null)} className="flex-1" />
                <Button
                  label="Delete"
                  variant="danger"
                  onPress={() => deleteMutation.mutate(viewing.id)}
                  className="flex-1"
                  loading={deleteMutation.isPending}
                />
              </>
            ) : (
              <Button label="Close" variant="secondary" onPress={() => setViewing(null)} className="flex-1" />
            )
          }
        >
          {viewing.subject ? (
            <Text className="text-base font-semibold text-ink-900">{viewing.subject}</Text>
          ) : null}
          <Text className="text-sm text-ink-700">{viewing.message}</Text>
          <Text className="text-xs text-ink-400">{formatDateTime(viewing.created_at)}</Text>
        </Modal>
      ) : null}
    </Screen>
  );
}

interface ComposeProps {
  onClose: () => void;
  onSent: () => void;
}

function ComposeModal({ onClose, onSent }: ComposeProps) {
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [customer, setCustomer] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => listCustomers({ page_size: 200, ordering: 'full_name' }),
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      const payload = { customer, message, ...(channel === 'email' ? { subject } : {}) };
      return channel === 'sms' ? sendSms(payload) : sendEmail(payload as { customer: string; subject: string; message: string });
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Sent' });
      onSent();
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Send failed') }),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="New message"
      footer={
        <>
          <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
          <Button
            label="Send"
            onPress={() => sendMutation.mutate()}
            loading={sendMutation.isPending}
            className="flex-1"
          />
        </>
      }
    >
      <Select label="Channel" value={channel} onChange={(v) => setChannel(v as 'sms' | 'email')} options={CHANNELS} />
      <Select
        label="Customer"
        value={customer}
        onChange={setCustomer}
        options={
          customers?.results.map((c) => ({
            value: String(c.id),
            label: c.full_name || c.customer_code || String(c.id),
          })) || []
        }
      />
      {channel === 'email' ? (
        <Input label="Subject" value={subject} onChangeText={setSubject} />
      ) : null}
      <Input label="Message" value={message} onChangeText={setMessage} multiline numberOfLines={5} />
    </Modal>
  );
}

const BULK_FILTERS = [
  { value: 'all_active', label: 'All active customers' },
  { value: 'overdue', label: 'Customers with overdue invoices' },
];

interface BulkProps {
  onClose: () => void;
  onSent: () => void;
}

function BulkModal({ onClose, onSent }: BulkProps) {
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [filter, setFilter] = useState<'all_active' | 'overdue'>('all_active');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const bulkMutation = useMutation({
    mutationFn: () =>
      sendBulk({
        channel,
        filter,
        message,
        ...(channel === 'email' ? { subject } : {}),
      }),
    onSuccess: (r) => {
      Toast.show({
        type: 'success',
        text1: `Queued ${r.queued} · skipped ${r.skipped}`,
      });
      onSent();
    },
    onError: (e) => Toast.show({ type: 'error', text1: extractError(e, 'Bulk send failed') }),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Bulk send"
      footer={
        <>
          <Button label="Cancel" variant="secondary" onPress={onClose} className="flex-1" />
          <Button
            label="Send"
            onPress={() => bulkMutation.mutate()}
            loading={bulkMutation.isPending}
            className="flex-1"
          />
        </>
      }
    >
      <Select label="Channel" value={channel} onChange={(v) => setChannel(v as 'sms' | 'email')} options={CHANNELS} />
      <Select
        label="Recipients"
        value={filter}
        onChange={(v) => setFilter(v as 'all_active' | 'overdue')}
        options={BULK_FILTERS}
      />
      {channel === 'email' ? (
        <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="Hi {name}" />
      ) : null}
      <Input
        label="Message"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        placeholder={'Hi {name}, ...\n\nTokens: {name}, {email}, {phone}'}
      />
    </Modal>
  );
}
