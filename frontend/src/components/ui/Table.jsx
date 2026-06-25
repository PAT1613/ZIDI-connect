import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export default function Table({
  columns,
  rows = [],
  loading = false,
  error = null,
  emptyTitle = 'No records found',
  emptyDescription,
  ordering,
  onSort,
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
  onRowClick,
  rowKey = 'id',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSort(col) {
    if (!col.sortable || !onSort) return;
    const key = col.sortKey || col.key;
    if (!ordering || ordering.replace(/^-/, '') !== key) onSort(key);
    else if (ordering.startsWith('-')) onSort('');
    else onSort(`-${key}`);
  }

  function sortIcon(col) {
    if (!col.sortable) return null;
    const key = col.sortKey || col.key;
    const active = ordering && ordering.replace(/^-/, '') === key;
    if (!active) return <ChevronsUpDown className="h-3 w-3 text-slate-400" />;
    return ordering.startsWith('-') ? (
      <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronUp className="h-3 w-3" />
    );
  }

  return (
    <div className="card-base overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600',
                    col.sortable && 'cursor-pointer select-none',
                    col.align === 'right' && 'text-right',
                    col.className,
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortIcon(col)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <div className="flex justify-center"><Spinner /></div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-0">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row[rowKey]}
                  className={clsx(
                    'hover:bg-slate-50 transition',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-2.5 text-sm text-slate-700',
                        col.align === 'right' && 'text-right',
                        col.cellClassName,
                      )}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && total > 0 ? (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600">
          <div>
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span>–
            <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="inline-flex items-center rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2">
              Page <span className="font-medium">{page}</span> / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="inline-flex items-center rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
