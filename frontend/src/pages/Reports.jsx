import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Sheet } from 'lucide-react';
import { exportReport } from '../api/reports';
import { extractError } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const REPORTS = [
  { key: 'customers', title: 'Customer Report', desc: 'All customers with status & registration.' },
  { key: 'services', title: 'Service Catalog', desc: 'Active and inactive service offerings.' },
  { key: 'revenue', title: 'Revenue Report', desc: 'All payments collected by period.' },
  { key: 'invoices', title: 'Invoice Report', desc: 'All issued invoices with status.' },
  { key: 'payments', title: 'Payments Report', desc: 'Detailed payment ledger.' },
  { key: 'notifications', title: 'Notifications Report', desc: 'SMS, email and in-app delivery log.' },
];

export default function Reports() {
  const [busyKey, setBusyKey] = useState(null);

  async function handle(key, format) {
    setBusyKey(`${key}-${format}`);
    try {
      await exportReport(key, format);
    } catch (err) {
      toast.error(extractError(err, 'Export failed'));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Download operational reports as PDF or Excel."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key} title={r.title} subtitle={r.desc}>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<FileText className="h-3.5 w-3.5" />}
                loading={busyKey === `${r.key}-pdf`}
                onClick={() => handle(r.key, 'pdf')}
              >
                PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Sheet className="h-3.5 w-3.5" />}
                loading={busyKey === `${r.key}-xlsx`}
                onClick={() => handle(r.key, 'xlsx')}
              >
                Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
