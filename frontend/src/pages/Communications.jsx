import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { sendSms, sendEmail, listCommsLogs } from '../api/communications';
import { listCustomers } from '../api/customers';
import { useListQuery } from '../hooks/useListQuery';
import { RECIPIENT_FILTERS } from '../lib/constants';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import ListToolbar from '../components/layout/ListToolbar';
import Table from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { formatDateTime } from '../lib/format';

export default function Communications() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState('sms');
  const [filter, setFilter] = useState('selected');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState([]);

  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => listCustomers({ page_size: 200, ordering: 'full_name' }),
  });
  const customerOptions = useMemo(
    () => (customers?.results || []).map((c) => ({
      value: c.id,
      label: `${c.full_name} (${c.customer_code})`,
    })),
    [customers],
  );

  const list = useListQuery(['comms-logs'], listCommsLogs);

  const sendMutation = useMutation({
    mutationFn: () => {
      const payload = { filter, customer_ids: filter === 'selected' ? selected : [], message };
      if (channel === 'email') payload.subject = subject;
      return channel === 'sms' ? sendSms(payload) : sendEmail(payload);
    },
    onSuccess: (data) => {
      toast.success(`Queued: ${data.sent} sent, ${data.failed} failed of ${data.total}`);
      qc.invalidateQueries({ queryKey: ['comms-logs'] });
      setMessage('');
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const columns = [
    { key: 'created_at', header: 'When', sortable: true, render: (r) => formatDateTime(r.created_at) },
    { key: 'channel', header: 'Channel', render: (r) => <Badge color="brand">{r.channel.toUpperCase()}</Badge> },
    { key: 'customer_name', header: 'Customer' },
    { key: 'subject', header: 'Subject', render: (r) => r.subject || '—' },
    {
      key: 'message', header: 'Message',
      render: (r) => <span className="block max-w-md truncate" title={r.message}>{r.message}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Communications"
        description="Send broadcast SMS or email to customers and review delivery logs."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Compose" className="lg:col-span-1">
          <div className="mb-3 flex rounded-md border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={clsx('flex-1 rounded px-3 py-1.5 text-sm font-medium transition',
                channel === 'sms' ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              <MessageSquare className="mr-1 inline h-3.5 w-3.5" /> SMS
            </button>
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={clsx('flex-1 rounded px-3 py-1.5 text-sm font-medium transition',
                channel === 'email' ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              <Mail className="mr-1 inline h-3.5 w-3.5" /> Email
            </button>
          </div>
          <div className="space-y-3">
            <FormField label="Recipients">
              <Select value={filter} options={RECIPIENT_FILTERS}
                      onChange={(e) => setFilter(e.target.value)} />
            </FormField>
            {filter === 'selected' && (
              <FormField label="Select customers" hint={`${selected.length} chosen`}>
                <select
                  multiple
                  className="input-base h-40"
                  value={selected}
                  onChange={(e) => setSelected(Array.from(e.target.selectedOptions, (o) => o.value))}
                >
                  {customerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            )}
            {channel === 'email' && (
              <FormField label="Subject">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </FormField>
            )}
            <FormField label="Message" required>
              <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
            </FormField>
            <Button
              className="w-full"
              leftIcon={<Send className="h-4 w-4" />}
              loading={sendMutation.isPending}
              disabled={!message || (filter === 'selected' && selected.length === 0)}
              onClick={() => sendMutation.mutate()}
            >
              Send {channel.toUpperCase()}
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            placeholder="Search logs…"
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
        </div>
      </div>
    </>
  );
}
