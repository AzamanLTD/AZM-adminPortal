// src/components/ui/AzSkeleton.jsx
import { cn } from '@/lib/utils';

function Bone({ className }) {
  return <div className={cn('az-skeleton rounded', className)} />;
}

export function StatCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="az-card p-5 rounded-xl space-y-3">
          <div className="flex justify-between">
            <Bone className="h-3 w-24" />
            <Bone className="w-8 h-8 rounded-lg" />
          </div>
          <Bone className="h-7 w-32" />
          <Bone className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="az-card rounded-xl overflow-hidden">
      <div className="border-b p-4" style={{ borderColor: 'var(--f-line)' }}>
        <Bone className="h-4 w-32" />
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--f-line)' }}>
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-3.5">
            {[...Array(cols)].map((_, c) => (
              <Bone key={c} className="h-3 flex-1" style={{ opacity: 1 - c * 0.1 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="space-y-2">
        <Bone className="h-6 w-40" />
        <Bone className="h-4 w-64" />
      </div>
      <Bone className="h-9 w-28 rounded-lg" />
    </div>
  );
}

export default Bone;
