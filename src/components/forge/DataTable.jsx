import { useState, useMemo, useDeferredValue, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { rowsV, rowV } from '@/lib/motion';
import { useKey, KeyScope } from '@/lib/keys';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';
import { cn } from '@/lib/utils';

/**
 * columns: [{ key, header, width, align:'left'|'right', numeric, sortable,
 *             render:(row)=>node, cell:(row)=>string }]
 */
export function DataTable({
  columns, rows, loading, isPlaceholder, empty, density = 'default',
  getRowId = r => r.id, onRowClick, rowActions, selectable, selected, onSelect,
}) {
  const [sort, setSort] = useState(null);
  const [focus, setFocus] = useState(0);
  const bodyRef = useRef(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    const val = r => (col.cell ? col.cell(r) : r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b);
      const n = typeof x === 'number' && typeof y === 'number'
        ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric:true });
      return sort.dir === 'asc' ? n : -n;
    });
  }, [rows, sort, columns]);

  const deferred = useDeferredValue(sorted);

  useKey('list','j',()=>setFocus(f=>Math.min(f+1,deferred.length-1)),[deferred.length]);
  useKey('list','k',()=>setFocus(f=>Math.max(f-1,0)),[]);
  useKey('list','Enter',()=>{ const r = deferred[focus]; r && onRowClick?.(r); },[deferred,focus]);
  useKey('list','x',()=>{ const r = deferred[focus]; r && onSelect?.(getRowId(r)); },[deferred,focus]);

  if (loading && !rows.length) return <TableSkeleton cols={columns.length} />;
  if (!deferred.length) return <EmptyState {...empty} />;

  const toggle = key => setSort(s =>
    s?.key !== key ? { key, dir:'asc' } : s.dir === 'asc' ? { key, dir:'desc' } : null);

  return (
    <KeyScope id="list">
      <div className={cn('overflow-x-auto', isPlaceholder && 'pointer-events-none opacity-60',
                         'transition-opacity duration-150')}>
        <table className="f-tab" data-density={density}>
          <thead>
            <tr>
              {selectable && <th style={{width:34}} />}
              {columns.map(c => (
                <th key={c.key} style={{ width:c.width }}
                    className={c.numeric ? 'text-right' : undefined}
                    aria-sort={c.sortable
                      ? (sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending':'descending') : 'none')
                      : undefined}
                    onClick={c.sortable ? () => toggle(c.key) : undefined}>
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {sort?.key === c.key && (sort.dir === 'asc'
                      ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
              {rowActions && <th style={{width:80}} />}
            </tr>
          </thead>
          <motion.tbody ref={bodyRef} variants={rowsV} initial="hidden" animate="visible">
            {deferred.map((r, i) => (
              <motion.tr key={getRowId(r)}
                variants={i < 12 ? rowV : undefined}
                data-selected={selected?.has?.(getRowId(r)) || undefined}
                data-focused={i === focus || undefined}
                onClick={() => { setFocus(i); onRowClick?.(r); }}
                className={onRowClick ? 'cursor-pointer' : undefined}>
                {selectable && (
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected?.has(getRowId(r)) ?? false}
                           onChange={() => onSelect?.(getRowId(r))}
                           aria-label={`Select row ${i+1}`} />
                  </td>
                )}
                {columns.map(c => (
                  <td key={c.key} className={cn(c.numeric && 'f-num')}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
                {rowActions && (
                  <td onClick={e => e.stopPropagation()}>
                    <div className="f-rowacts">{rowActions(r)}</div>
                  </td>
                )}
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </KeyScope>
  );
}
