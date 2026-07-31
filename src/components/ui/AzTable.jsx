// src/components/ui/AzTable.jsx
// Universal sortable, paginated data table.

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listVariants, listItemVariants } from '@/lib/motion';

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3" />
    : <ChevronDown className="w-3 h-3" />;
}

export default function AzTable({
  columns,
  data = [],
  keyField = 'id',
  onRowClick,
  loading = false,
  pageSize = 25,
  emptyMessage = 'No data found',
  emptyIcon: EmptyIcon,
  className = '',
  stickyHeader = true,
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir]     = useState('asc');
  const [page, setPage]           = useState(0);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const sorted = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (loading) {
    return (
      <div className={cn('az-card rounded-xl overflow-hidden', className)}>
        <div className="p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4">
              {columns.map(c => (
                <div key={c.key} className="az-skeleton h-4 flex-1 rounded" style={{ width: c.width }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('az-card rounded-xl overflow-hidden flex flex-col', className)}>
      <div className="overflow-x-auto flex-1">
        <table className="az-table min-w-full">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn('az-th', col.sortable && 'cursor-pointer select-none transition-colors')}
                  style={{ width: col.width, textAlign: col.align ?? 'left' }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className={cn('flex items-center gap-1.5', col.align === 'right' && 'justify-end', col.align === 'center' && 'justify-center')}>
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody variants={listVariants} initial="hidden" animate="visible">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="az-td py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    {EmptyIcon && <EmptyIcon className="w-10 h-10 opacity-30" />}
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : paginated.map((row, i) => (
              <motion.tr
                key={row[keyField] ?? i}
                variants={listItemVariants}
                className={cn('az-tr', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="az-td" style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--az-border)]">
          <p className="text-xs">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="az-btn az-btn-ghost p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="az-btn az-btn-ghost p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
