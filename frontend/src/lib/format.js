import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

const CURRENCY = 'KES';

export function formatCurrency(value, currency = CURRENCY) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-KE').format(n);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const d = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value) {
  return formatDate(value, 'dd MMM yyyy HH:mm');
}

export function formatRelative(value) {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}

export function toE164(phone, defaultCountry = '254') {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+${defaultCountry}${digits.slice(1)}`;
  if (digits.startsWith(defaultCountry)) return `+${digits}`;
  if (digits.startsWith('+')) return digits;
  return `+${digits}`;
}

export function truncate(text, n = 60) {
  if (!text) return '';
  return text.length > n ? `${text.slice(0, n)}…` : text;
}
