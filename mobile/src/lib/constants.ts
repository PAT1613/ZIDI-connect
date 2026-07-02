export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  CS_OFFICER: 'Customer Service Officer',
  FINANCE: 'Finance Officer',
  OPERATIONS: 'Operations Officer',
  MANAGER: 'Manager',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  paid: 'green',
  delivered: 'green',
  sent: 'green',
  resolved: 'green',
  closed: 'slate',
  pending: 'amber',
  queued: 'amber',
  in_progress: 'amber',
  open: 'amber',
  suspended: 'amber',
  overdue: 'red',
  expired: 'red',
  failed: 'red',
  terminated: 'red',
  cancelled: 'slate',
  inactive: 'slate',
};

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one-off', label: 'One-off' },
];

export const PAGE_SIZE = 25;

export const STORAGE_KEYS = {
  access: 'zidi.access',
  refresh: 'zidi.refresh',
  user: 'zidi.user',
} as const;
