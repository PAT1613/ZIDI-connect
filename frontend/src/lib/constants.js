export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  CS_OFFICER: 'Customer Service Officer',
  FINANCE: 'Finance Officer',
  OPERATIONS: 'Operations Officer',
  MANAGER: 'Manager',
};

export const ALL_ROLES = Object.values(ROLES);

export const STATUS_COLORS = {
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

export const CHANNEL_LABELS = {
  sms: 'SMS',
  email: 'Email',
  in_app: 'In-App',
};

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one-off', label: 'One-off' },
];

export const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
];

export const INVOICE_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const SUBSCRIPTION_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'expired', label: 'Expired' },
];

export const ESCALATION_STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const RECIPIENT_FILTERS = [
  { value: 'all_active', label: 'All Active Customers' },
  { value: 'selected', label: 'Selected Customers' },
  { value: 'overdue', label: 'Customers with Overdue Invoices' },
];

export const PAGE_SIZE = 25;
