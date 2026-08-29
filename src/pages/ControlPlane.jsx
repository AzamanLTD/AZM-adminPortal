import { useMemo, useState } from 'react';
import { RefreshCw, Users, Activity, BriefcaseBusiness, Clock3, ShieldCheck } from 'lucide-react';
import { useControlPlaneActivity, useControlPlaneSummary } from '@/lib/useAdminData';

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="az-stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="az-section-label">{label}</p>
        {Icon && <Icon className="h-4 w-4" style={{ color: 'var(--f-text-3)' }} />}
      </div>
      <p className="az-kpi-value text-[28px]">{value ?? '—'}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function ControlPlane() {
  const [page, setPage] = useState(1);
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useControlPlaneSummary();
  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } = useControlPlaneActivity(page);

  const staff = summary?.staff || {};
  const activityStats = summary?.activity || {};
  const duties = summary?.duties || {};
  const departments = summary?.departments || [];
  const events = activity?.events || [];
  const hasMore = Boolean(activity?.pagination?.hasMore);

  const refresh = () => {
    refetchSummary();
    refetchActivity();
  };

  const departmentRows = useMemo(() => departments.slice(0, 8), [departments]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="az-section-label">Operations</p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--f-text)' }}>Control Plane</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>
            Live workforce posture, duty coverage, and protected staff activity.
          </p>
        </div>
        <button onClick={refresh} className="f-icon-btn" title="Refresh control plane">
          <RefreshCw className={`h-4 w-4 ${summaryLoading || activityLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active Staff" value={staff.activeStaff} icon={Users} />
        <Stat label="Online" value={staff.onlineStaff} icon={Activity} />
        <Stat label="Active Admins" value={staff.activeAdmins} icon={ShieldCheck} />
        <Stat label="Active Duties" value={duties.activeDuties} icon={Clock3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-xl p-4" style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="az-section-label">Staff Activity</p>
              <p className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>
                {activityStats.eventsLast24h ?? 0} events in the last 24h · {activityStats.eventsLast7d ?? 0} in 7d
              </p>
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--f-text-3)' }}>
              {activityStats.totalEvents ?? 0} total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: 'var(--f-text-3)', borderBottom: '1px solid var(--f-line)' }}>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Target</th>
                  <th className="py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {activityLoading && (
                  <tr><td colSpan="4" className="py-8 text-center" style={{ color: 'var(--f-text-3)' }}>Loading activity…</td></tr>
                )}
                {!activityLoading && !events.length && (
                  <tr><td colSpan="4" className="py-8 text-center" style={{ color: 'var(--f-text-3)' }}>No activity events found.</td></tr>
                )}
                {events.map((event) => (
                  <tr key={`${event.id}-${event.createdAt}`} style={{ borderBottom: '1px solid var(--f-line)' }}>
                    <td className="py-3 pr-3 font-medium" style={{ color: 'var(--f-text)' }}>{event.eventType || '—'}</td>
                    <td className="py-3 pr-3" style={{ color: 'var(--f-text-2)' }}>
                      {event.actorUsername || event.actorEmail || event.staffUsername || 'System'}
                    </td>
                    <td className="py-3 pr-3" style={{ color: 'var(--f-text-3)' }}>
                      {[event.targetType, event.targetId].filter(Boolean).join(':') || '—'}
                    </td>
                    <td className="py-3 whitespace-nowrap" style={{ color: 'var(--f-text-3)' }}>{formatDate(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="az-btn-secondary disabled:opacity-40">Previous</button>
            <span className="text-xs font-mono" style={{ color: 'var(--f-text-3)' }}>Page {page}</span>
            <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="az-btn-secondary disabled:opacity-40">Next</button>
          </div>
        </section>

        <section className="rounded-xl p-4 space-y-4" style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
          <div>
            <p className="az-section-label">Workforce posture</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg p-3" style={{ background: 'var(--f-surface-sunken)' }}><span className="text-xs" style={{ color: 'var(--f-text-3)' }}>Away</span><p className="text-lg font-bold mt-1">{staff.awayStaff ?? 0}</p></div>
              <div className="rounded-lg p-3" style={{ background: 'var(--f-surface-sunken)' }}><span className="text-xs" style={{ color: 'var(--f-text-3)' }}>Offline</span><p className="text-lg font-bold mt-1">{staff.offlineStaff ?? 0}</p></div>
              <div className="rounded-lg p-3" style={{ background: 'var(--f-surface-sunken)' }}><span className="text-xs" style={{ color: 'var(--f-text-3)' }}>Suspended</span><p className="text-lg font-bold mt-1">{staff.suspendedStaff ?? 0}</p></div>
              <div className="rounded-lg p-3" style={{ background: 'var(--f-surface-sunken)' }}><span className="text-xs" style={{ color: 'var(--f-text-3)' }}>Employees</span><p className="text-lg font-bold mt-1">{staff.activeEmployees ?? 0}</p></div>
            </div>
          </div>

          <div>
            <p className="az-section-label mb-2">Departments</p>
            <div className="space-y-2">
              {departmentRows.map((department) => (
                <div key={department.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0"><BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--f-text-3)' }} /><span className="truncate" style={{ color: 'var(--f-text-2)' }}>{department.name}</span></div>
                  <span className="font-mono text-xs" style={{ color: 'var(--f-text-3)' }}>{department.onlineStaff ?? 0}/{department.staffCount ?? 0}</span>
                </div>
              ))}
              {!departmentRows.length && <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>No departments reported.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
