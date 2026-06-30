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
    if (!active) return <ChevronsUpDown className="h-3 w-3 text-ink-400" />;
    return ordering.startsWith('-') ? (
      <ChevronDown className="h-3 w-3 text-brand-700" />
    ) : (
      <ChevronUp className="h-3 w-3 text-brand-700" />
    );
  }

  return (
    <div className="card-base overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-200">
          <thead className="bg-ink-50/70">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500',
                    col.sortable && 'cursor-pointer select-none hover:text-ink-700',
                    col.align === 'right' && 'text-right',
                    col.className,
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className={clsx('inline-flex items-center gap-1', col.align === 'right' && 'justify-end')}>
                    {col.header}
                    {sortIcon(col)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton h-3.5 w-24" />
                    </td>
                  ))}
                </tr>
              ))
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
                    'transition-colors hover:bg-brand-50/40',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3 text-sm text-ink-700',
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
        <div className="flex flex-col items-center justify-between gap-2 border-t border-ink-200 bg-ink-50/40 px-4 py-3 text-xs text-ink-600 sm:flex-row">
          <div>
            Showing <span className="font-semibold text-ink-800">{(page - 1) * pageSize + 1}</span>–
            <span className="font-semibold text-ink-800">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-ink-800">{total}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="inline-flex items-center rounded-md border border-ink-200 bg-white px-2 py-1 text-ink-600 transition hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2">
              Page <span className="font-semibold text-ink-800">{page}</span> / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="inline-flex items-center rounded-md border border-ink-200 bg-white px-2 py-1 text-ink-600 transition hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
