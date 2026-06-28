import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Save, Send, Mail, MessageSquare, Building2, ShieldCheck, KeyRound, Eye, EyeOff,
  CheckCircle2, AlertCircle, Database, Server,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import { extractError } from '../api/client';
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  sendTestSMS,
  sendTestEmail,
} from '../api/integrations';

const GROUPS = [
  {
    id: 'sms',
    title: 'SMS — Africa\'s Talking',
    description: 'Plug in your Africa\'s Talking credentials. Live SMS sends start the moment you save a valid API key.',
    icon: MessageSquare,
    accent: 'from-brand-50 to-white',
    keys: ['AT_USERNAME', 'AT_API_KEY', 'AT_SENDER_ID'],
  },
  {
    id: 'email',
    title: 'Email — SMTP',
    description: 'Connect any SMTP provider (Gmail, SendGrid, Mailgun, Postmark, AWS SES…). All outbound email uses these credentials.',
    icon: Mail,
    accent: 'from-amber-50 to-white',
    keys: ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD', 'EMAIL_USE_TLS', 'DEFAULT_FROM_EMAIL'],
  },
  {
    id: 'company',
    title: 'Company branding',
    description: 'Appears on invoices and the default email footer.',
    icon: Building2,
    accent: 'from-violet-50 to-white',
    keys: ['COMPANY_NAME', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_ADDRESS'],
  },
];

const PLACEHOLDERS = {
  AT_USERNAME: 'sandbox',
  AT_API_KEY: 'atsk_••••••••••••••••',
  AT_SENDER_ID: 'ZIDI',
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: '587',
  EMAIL_HOST_USER: 'you@company.com',
  EMAIL_HOST_PASSWORD: '••••••••',
  EMAIL_USE_TLS: 'True',
  DEFAULT_FROM_EMAIL: 'ZIDI Connect <noreply@yourcompany.com>',
  COMPANY_NAME: 'Acme Holdings Ltd',
  COMPANY_PHONE: '+254 700 000 000',
  COMPANY_EMAIL: 'hello@acme.co.ke',
  COMPANY_ADDRESS: '4th Floor, ABC Place, Nairobi',
};

function SourcePill({ source }) {
  if (source === 'db') {
    return <span className="pill bg-brand-50 text-brand-700 ring-brand-200"><Database className="h-3 w-3" /> DB</span>;
  }
  if (source === 'env') {
    return <span className="pill bg-ink-100 text-ink-700 ring-ink-200"><Server className="h-3 w-3" /> .env</span>;
  }
  return <span className="pill bg-amber-50 text-amber-700 ring-amber-200"><AlertCircle className="h-3 w-3" /> Unset</span>;
}

function SettingRow({ setting, value, onChange, reveal, onToggleReveal }) {
  const isSecret = setting.is_secret;
  const inputType = isSecret && !reveal ? 'password' : 'text';
  const placeholder = isSecret && setting.is_set && setting.masked
    ? setting.masked
    : (PLACEHOLDERS[setting.key] ?? '');

  return (
    <div className="grid gap-3 py-3 md:grid-cols-[1fr_2fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium text-ink-800">{setting.label}</div>
          {isSecret ? <KeyRound className="h-3.5 w-3.5 text-ink-400" /> : null}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-500">{setting.key}</div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(setting.key, e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {isSecret ? (
          <button
            type="button"
            className="rounded-md border border-ink-200 p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-700"
            onClick={() => onToggleReveal(setting.key)}
            aria-label={reveal ? 'Hide' : 'Show'}
            title={reveal ? 'Hide' : 'Show'}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      <div className="justify-self-start md:justify-self-end">
        <SourcePill source={setting.source} />
      </div>
    </div>
  );
}

function TestSmsCard({ disabled }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('ZIDI Connect test message ✓');
  const mut = useMutation({
    mutationFn: sendTestSMS,
    onSuccess: (data) => toast.success(`SMS ${data.status}`),
    onError: (e) => toast.error(extractError(e, 'SMS failed')),
  });
  return (
    <Card title="Send test SMS" subtitle="Verify your Africa's Talking credentials by sending to one number.">
      <div className="space-y-3">
        <FormField label="Phone (E.164)" htmlFor="test-phone">
          <Input id="test-phone" placeholder="+254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
        <FormField label="Message" htmlFor="test-msg">
          <Input id="test-msg" value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
        <Button
          variant="primary"
          leftIcon={<Send className="h-4 w-4" />}
          onClick={() => mut.mutate({ phone, message })}
          loading={mut.isPending}
          disabled={disabled || !phone}
        >
          Send test SMS
        </Button>
      </div>
    </Card>
  );
}

function TestEmailCard({ disabled }) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('ZIDI Connect test email');
  const [message, setMessage] = useState('This is a test email from ZIDI Connect. If you received this, your SMTP settings are working.');
  const mut = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: (data) => toast.success(`Email ${data.status}`),
    onError: (e) => toast.error(extractError(e, 'Email failed')),
  });
  return (
    <Card title="Send test email" subtitle="Verify your SMTP credentials by sending to one address.">
      <div className="space-y-3">
        <FormField label="To" htmlFor="test-email">
          <Input id="test-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Subject" htmlFor="test-subject">
          <Input id="test-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </FormField>
        <FormField label="Message" htmlFor="test-body">
          <Input id="test-body" value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
        <Button
          variant="primary"
          leftIcon={<Send className="h-4 w-4" />}
          onClick={() => mut.mutate({ email, subject, message })}
          loading={mut.isPending}
          disabled={disabled || !email}
        >
          Send test email
        </Button>
      </div>
    </Card>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['integrations', 'settings'],
    queryFn: getIntegrationSettings,
  });

  const [draft, setDraft] = useState({});
  const [reveal, setReveal] = useState({});

  useEffect(() => {
    if (!data?.settings) return;
    const initial = {};
    for (const row of data.settings) {
      initial[row.key] = row.is_secret ? '' : row.value;
    }
    setDraft(initial);
  }, [data]);

  const byKey = useMemo(() => {
    const map = {};
    for (const row of data?.settings || []) map[row.key] = row;
    return map;
  }, [data]);

  const isDirty = useMemo(() => {
    if (!data?.settings) return false;
    return data.settings.some((row) => {
      const drafted = draft[row.key] ?? '';
      if (row.is_secret) return drafted !== '';
      return drafted !== (row.value || '');
    });
  }, [data, draft]);

  const save = useMutation({
    mutationFn: (payload) => updateIntegrationSettings(payload),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['integrations', 'settings'] });
    },
    onError: (e) => toast.error(extractError(e, 'Failed to save')),
  });

  const onSave = () => {
    const payload = {};
    for (const [key, value] of Object.entries(draft)) {
      const row = byKey[key];
      if (!row) continue;
      if (row.is_secret) {
        if ((value ?? '') === '') continue;
      }
      payload[key] = value ?? '';
    }
    save.mutate(payload);
  };

  const smsReady = byKey.AT_API_KEY?.is_set;
  const emailReady = byKey.EMAIL_HOST_USER?.is_set && byKey.EMAIL_HOST_PASSWORD?.is_set;

  return (
    <>
      <PageHeader
        title="Settings & integrations"
        description="Configure SMS, email and branding. Values you save here take precedence over .env."
        actions={
          <Button
            onClick={onSave}
            loading={save.isPending}
            disabled={!isDirty || isLoading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save changes
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatusTile
          icon={MessageSquare}
          label="SMS"
          ok={smsReady}
          okText="Ready — Africa's Talking key configured"
          notOkText="Add an Africa's Talking API key to enable live SMS"
        />
        <StatusTile
          icon={Mail}
          label="Email"
          ok={emailReady}
          okText="Ready — SMTP credentials configured"
          notOkText="Add an SMTP username and password to enable email"
        />
        <StatusTile
          icon={ShieldCheck}
          label="Storage"
          ok
          okText="DB overrides .env automatically · keys are encrypted at rest by Postgres"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {extractError(error, 'Failed to load settings')}
        </div>
      ) : (
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            const rows = group.keys.map((k) => byKey[k]).filter(Boolean);
            return (
              <Card key={group.id} padded={false} className="overflow-hidden">
                <div className={`border-b border-ink-200/70 bg-gradient-to-r ${group.accent} px-5 py-4`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-ink-200 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink-900">{group.title}</h3>
                      <p className="text-xs text-ink-500">{group.description}</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-ink-100 px-5">
                  {rows.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      value={draft[setting.key] ?? ''}
                      onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                      reveal={reveal[setting.key]}
                      onToggleReveal={(k) => setReveal((r) => ({ ...r, [k]: !r[k] }))}
                    />
                  ))}
                </div>
              </Card>
            );
          })}

          <div className="grid gap-5 lg:grid-cols-2">
            <TestSmsCard disabled={!smsReady} />
            <TestEmailCard disabled={!emailReady} />
          </div>
        </div>
      )}
    </>
  );
}

function StatusTile({ icon: Icon, label, ok, okText, notOkText }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          {label}
          {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
        </div>
        <div className="text-xs text-ink-600">{ok ? okText : notOkText}</div>
      </div>
    </div>
  );
}
