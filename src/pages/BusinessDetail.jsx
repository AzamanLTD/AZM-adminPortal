/**
 * Admin › Business Detail — category-aware drill-down
 * Hotels: rooms + housekeeping | Restaurants: kitchen + tables | Transit: fleet + drivers + trips
 * All types: orders + employees + finance
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { businesses as bizApi } from '@/lib/api';
import { Button } from '@/components/forge';
import {
  ArrowLeft, Building2, ChevronRight, Hotel, UtensilsCrossed, Bus,
  Users, Wallet, ReceiptText, MapPin, Globe, Star, TrendingUp,
  Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, BedDouble,
  ChefHat, Route, UserCog, Truck, CalendarCheck, BarChart3, Ban,
  Package,
} from 'lucide-react';

const fmt = (n, opts = {}) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: 2, ...opts }) : '—';
const fmtMoney = (n) => Number.isFinite(Number(n)) ? `${fmt(n)} USDC` : '—';
function rel(date) {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}
function cn(...classes) { return classes.filter(Boolean).join(' '); }

const CATEGORY_META = {
  HOTEL:      { icon: Hotel,           label: 'Hotel',      tint: 'hotel',      color: 'text-[var(--f-info)]',  bg: 'bg-[var(--f-info-bg)]'  },
  RESTAURANT: { icon: UtensilsCrossed, label: 'Restaurant', tint: 'restaurant', color: 'text-[var(--f-warn)]',  bg: 'bg-[var(--f-warn-bg)]'  },
  TRANSIT:    { icon: Bus,             label: 'Transit',    tint: 'transit',    color: 'text-[var(--f-ok)]',    bg: 'bg-[var(--f-ok-bg)]'    },
};
const KYB_BADGE = {
  VERIFIED:   { label: 'Verified',   cls: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]' },
  PENDING:    { label: 'Pending',    cls: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]' },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-[var(--f-surface-sunken)] text-ink-3' },
};

function StatPill({ label, value, icon: Icon, color = '' }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--f-surface-sunken)] border border-[var(--f-line)]">
      <div className={`flex items-center gap-1.5 text-xs text-ink-3 ${color}`}>
        {Icon && <Icon className="h-3 w-3" />}{label}
      </div>
      <div className="text-lg font-bold text-[var(--f-text)] font-mono">{value}</div>
    </div>
  );
}

function StatusBadge({ label, variant = 'neutral' }) {
  const MAP = { ok:'bg-[var(--f-ok-bg)] text-[var(--f-ok)]', warn:'bg-[var(--f-warn-bg)] text-[var(--f-warn)]',
    bad:'bg-[var(--f-bad-bg)] text-[var(--f-bad)]', info:'bg-[var(--f-info-bg)] text-[var(--f-info)]',
    neutral:'bg-[var(--f-surface-sunken)] text-ink-3' };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${MAP[variant]}`}>{label}</span>;
}

function DataTable({ columns, rows, emptyLabel = 'No data' }) {
  if (!rows?.length) return <div className="py-8 text-center text-xs text-ink-3">{emptyLabel}</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--f-line)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--f-line)] bg-[var(--f-surface-sunken)]">
            {columns.map(c => <th key={c.key} className="px-3 py-2 text-left font-medium text-ink-3 uppercase tracking-wide text-[10px] whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--f-line)]/50 last:border-0 hover:bg-[var(--f-surface-sunken)]/50 transition-colors">
              {columns.map(c => <td key={c.key} className="px-3 py-2.5 text-ink-2 whitespace-nowrap">{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabSkeleton() {
  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <div key={i} className="h-16 rounded-lg bg-[var(--f-surface-sunken)] animate-pulse" />)}</div>
    <div className="h-40 rounded-lg bg-[var(--f-surface-sunken)] animate-pulse" />
  </div>;
}

// ── Tab Components ────────────────────────────────────────────────────────────

function OrdersTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-orders', bizId], queryFn: () => bizApi.orders(bizId), retry: false });
  const orders = data?.orders || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatPill label="Total" value={data?.total ?? orders.length} icon={ReceiptText} />
      <StatPill label="Completed" value={orders.filter(o => ['DELIVERED','COMPLETED'].includes(o.status)).length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
      <StatPill label="Pending" value={orders.filter(o => ['PENDING','CONFIRMED'].includes(o.status)).length} icon={Clock} color="text-[var(--f-warn)]" />
      <StatPill label="Cancelled" value={orders.filter(o => o.status === 'CANCELLED').length} icon={XCircle} color="text-[var(--f-bad)]" />
    </div>
    <DataTable emptyLabel="No orders found" rows={orders} columns={[
      { key:'id', label:'Order ID', render:r => <span className="font-mono text-[10px] text-ink-3">{(r.id||'').slice(0,8)}…</span> },
      { key:'customer', label:'Customer', render:r => r.user?.username || r.customerName || '—' },
      { key:'total', label:'Total', render:r => fmtMoney(r.totalAmount || r.total) },
      { key:'status', label:'Status', render:r => { const m={DELIVERED:'ok',COMPLETED:'ok',PENDING:'warn',CONFIRMED:'info',CANCELLED:'bad',DISPUTED:'bad'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
      { key:'created', label:'Placed', render:r => rel(r.createdAt||r.created_date) },
    ]} />
  </div>;
}

function EmployeesTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-employees', bizId], queryFn: () => bizApi.employees(bizId), retry: false });
  const employees = data?.employees || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Total Staff" value={employees.length} icon={Users} />
      <StatPill label="Active" value={employees.filter(e => e.status === 'ACTIVE').length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
      <StatPill label="On Leave" value={employees.filter(e => e.status === 'ON_LEAVE').length} icon={Clock} color="text-[var(--f-warn)]" />
    </div>
    <DataTable emptyLabel="No employees" rows={employees} columns={[
      { key:'name', label:'Employee', render:r => <div><p className="font-medium text-[var(--f-text)]">{r.user?.fullName||r.name||'—'}</p><p className="text-ink-3">{r.role}</p></div> },
      { key:'department', label:'Dept', render:r => r.department||'—' },
      { key:'status', label:'Status', render:r => { const m={ACTIVE:'ok',ON_LEAVE:'warn',TERMINATED:'bad',SUSPENDED:'bad'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
      { key:'hired', label:'Hired', render:r => r.hireDate ? new Date(r.hireDate).toLocaleDateString() : '—' },
    ]} />
  </div>;
}

function FinanceTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-finance', bizId], queryFn: () => bizApi.finance(bizId), retry: false });
  const fin = data?.finance || data || {};
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatPill label="Revenue" value={fmtMoney(fin.totalRevenue||fin.totalIncome)} icon={TrendingUp} color="text-[var(--f-ok)]" />
      <StatPill label="Expenses" value={fmtMoney(fin.totalExpenses||fin.totalExpense)} icon={Wallet} color="text-[var(--f-bad)]" />
      <StatPill label="Net P&L" value={fmtMoney(fin.netPnl||fin.netProfitLoss)} icon={BarChart3} />
      <StatPill label="Escrow" value={fmtMoney(fin.escrowHeld)} icon={CheckCircle2} color="text-[var(--f-warn)]" />
    </div>
    {(!fin.totalRevenue && !fin.totalIncome) && <p className="text-center text-xs text-ink-3 py-6">No financial data available</p>}
  </div>;
}

function HotelRoomsTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-hotel-rooms', bizId], queryFn: () => bizApi.hotelRooms(bizId), retry: false });
  const rooms = data?.rooms || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  const byStatus = rooms.reduce((a, r) => { a[r.status] = (a[r.status]||0)+1; return a; }, {});
  return <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatPill label="Total Rooms" value={rooms.length} icon={BedDouble} />
      <StatPill label="Available" value={byStatus.AVAILABLE||0} icon={CheckCircle2} color="text-[var(--f-ok)]" />
      <StatPill label="Occupied" value={byStatus.OCCUPIED||0} icon={Users} color="text-[var(--f-warn)]" />
      <StatPill label="Dirty/Cleaning" value={(byStatus.DIRTY||0)+(byStatus.CLEANING||0)} icon={AlertTriangle} color="text-[var(--f-bad)]" />
    </div>
    <DataTable emptyLabel="No rooms configured" rows={rooms} columns={[
      { key:'number', label:'Room', render:r => <span className="font-bold text-[var(--f-text)]">{r.roomNumber||r.number}</span> },
      { key:'type', label:'Type', render:r => r.roomType||r.type||'—' },
      { key:'floor', label:'Floor', render:r => r.floor??'—' },
      { key:'status', label:'Status', render:r => { const m={AVAILABLE:'ok',OCCUPIED:'warn',DIRTY:'bad',CLEANING:'info',MAINTENANCE:'bad',BLOCKED:'neutral'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
      { key:'price', label:'Rate/Night', render:r => r.pricePerNight ? fmtMoney(r.pricePerNight) : '—' },
    ]} />
  </div>;
}

function HousekeepingTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-housekeeping', bizId], queryFn: () => bizApi.housekeeping(bizId), retry: false });
  const tasks = data?.tasks || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Total Tasks" value={tasks.length} icon={CheckCircle2} />
      <StatPill label="Pending" value={tasks.filter(t => t.status==='PENDING').length} icon={Clock} color="text-[var(--f-warn)]" />
      <StatPill label="Completed" value={tasks.filter(t => t.status==='COMPLETED').length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
    </div>
    <DataTable emptyLabel="No housekeeping tasks" rows={tasks} columns={[
      { key:'room', label:'Room', render:r => r.hotelRoom?.roomNumber||r.roomNumber||'—' },
      { key:'type', label:'Task', render:r => r.taskType||r.type||'—' },
      { key:'assigned', label:'Assigned To', render:r => r.assignedTo?.user?.fullName||r.assignedName||'Unassigned' },
      { key:'status', label:'Status', render:r => { const m={PENDING:'warn',IN_PROGRESS:'info',COMPLETED:'ok',INSPECTING:'info'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
      { key:'due', label:'Due', render:r => rel(r.dueAt||r.scheduledAt) },
    ]} />
  </div>;
}

function KitchenTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-kitchen', bizId], queryFn: () => bizApi.kitchenOrders(bizId), retry: false });
  const orders = data?.orders || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Active" value={orders.filter(o=>o.status==='IN_PROGRESS').length} icon={ChefHat} color="text-[var(--f-warn)]" />
      <StatPill label="Queued" value={orders.filter(o=>o.status==='QUEUED').length} icon={Clock} />
      <StatPill label="Done Today" value={orders.filter(o=>o.status==='COMPLETED').length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
    </div>
    <DataTable emptyLabel="No kitchen orders" rows={orders} columns={[
      { key:'ticket', label:'Ticket #', render:r => <span className="font-mono font-bold text-[var(--f-text)]">#{r.ticketNumber||r.id?.slice(-4)}</span> },
      { key:'table', label:'Table', render:r => r.tableName||r.tableNumber||'—' },
      { key:'items', label:'Items', render:r => r.items?.length||r.itemCount||0 },
      { key:'status', label:'Status', render:r => { const m={QUEUED:'neutral',IN_PROGRESS:'warn',READY:'ok',COMPLETED:'ok',BUMPED:'info'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
      { key:'age', label:'Age', render:r => rel(r.createdAt) },
    ]} />
  </div>;
}

function TablesTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-tables', bizId], queryFn: () => bizApi.tables(bizId), retry: false });
  const tables = data?.tables || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Total Tables" value={tables.length} icon={UtensilsCrossed} />
      <StatPill label="Occupied" value={tables.filter(t=>t.status==='OCCUPIED').length} icon={Users} color="text-[var(--f-warn)]" />
      <StatPill label="Available" value={tables.filter(t=>t.status==='AVAILABLE').length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
    </div>
    <DataTable emptyLabel="No tables" rows={tables} columns={[
      { key:'name', label:'Table', render:r => <span className="font-bold text-[var(--f-text)]">{r.tableName||r.name}</span> },
      { key:'section', label:'Section', render:r => r.sectionName||r.section||'—' },
      { key:'capacity', label:'Cap.', render:r => r.capacity??'—' },
      { key:'status', label:'Status', render:r => { const m={AVAILABLE:'ok',OCCUPIED:'warn',RESERVED:'info',CLEANING:'neutral'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
    ]} />
  </div>;
}

function FleetTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-fleet', bizId], queryFn: () => bizApi.fleet(bizId), retry: false });
  const vehicles = data?.vehicles || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Total Vehicles" value={vehicles.length} icon={Truck} />
      <StatPill label="Active" value={vehicles.filter(v=>v.status==='ACTIVE').length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
      <StatPill label="Maintenance" value={vehicles.filter(v=>v.status==='MAINTENANCE').length} icon={AlertTriangle} color="text-[var(--f-bad)]" />
    </div>
    <DataTable emptyLabel="No vehicles" rows={vehicles} columns={[
      { key:'reg', label:'Reg. No.', render:r => <span className="font-mono font-bold text-[var(--f-text)]">{r.registrationNumber||r.plateNumber||'—'}</span> },
      { key:'make', label:'Vehicle', render:r => `${r.make||''} ${r.model||''}`.trim()||'—' },
      { key:'capacity', label:'Seats', render:r => r.capacity??'—' },
      { key:'status', label:'Status', render:r => { const m={ACTIVE:'ok',INACTIVE:'neutral',MAINTENANCE:'bad',RETIRED:'neutral'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
    ]} />
  </div>;
}

function DriversTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-drivers', bizId], queryFn: () => bizApi.drivers(bizId), retry: false });
  const drivers = data?.drivers || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Total Drivers" value={drivers.length} icon={UserCog} />
      <StatPill label="On Duty" value={drivers.filter(d=>d.status==='ON_DUTY').length} icon={CheckCircle2} color="text-[var(--f-ok)]" />
      <StatPill label="Off Duty" value={drivers.filter(d=>d.status==='OFF_DUTY').length} icon={Clock} color="text-[var(--f-warn)]" />
    </div>
    <DataTable emptyLabel="No drivers" rows={drivers} columns={[
      { key:'name', label:'Driver', render:r => <span className="font-medium text-[var(--f-text)]">{r.user?.fullName||r.name||'—'}</span> },
      { key:'license', label:'License', render:r => <span className="font-mono text-[10px]">{r.licenseNumber||'—'}</span> },
      { key:'vehicle', label:'Vehicle', render:r => r.vehicle?.registrationNumber||r.vehiclePlate||'—' },
      { key:'status', label:'Status', render:r => { const m={ON_DUTY:'ok',OFF_DUTY:'neutral',SUSPENDED:'bad',ON_LEAVE:'warn'}; return <StatusBadge label={r.status||'UNKNOWN'} variant={m[r.status]||'neutral'} />; }},
    ]} />
  </div>;
}

function TripsTab({ bizId }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-biz-trips', bizId], queryFn: () => bizApi.trips(bizId), retry: false });
  const trips = data?.trips || data?.data || [];
  if (isLoading) return <TabSkeleton />;
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <StatPill label="Total Trips" value={trips.length} icon={Route} />
      <StatPill label="Active" value={trips.filter(t=>t.status==='IN_PROGRESS').length} icon={Bus} color="text-[var(--f-ok)]" />
      <StatPill label="Scheduled" value={trips.filter(t=>t.status==='SCHEDULED').length} icon={CalendarCheck} color="text-[var(--f-info)]" />
    </div>
    <DataTable emptyLabel="No trips" rows={trips} columns={[
      { key:'route', label:'Route', render:r => <span className="font-medium text-[var(--f-text)]">{r.routeName||r.route?.name||'—'}</span> },
      { key:'driver', label:'Driver', render:r => r.driver?.user?.fullName||'—' },
      { key:'pax', label:'Pax', render:r => `${r.boardedCount||0}/${r.capacity||'?'}` },
      { key:'status', label:'Status', render:r => { const m={SCHEDULED:'info',IN_PROGRESS:'ok',COMPLETED:'neutral',CANCELLED:'bad'}; return <StatusBadge label={r.status} variant={m[r.status]||'neutral'} />; }},
      { key:'dep', label:'Departure', render:r => r.departureTime ? new Date(r.departureTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—' },
    ]} />
  </div>;
}

function buildTabs(category) {
  const specific = {
    HOTEL:      [{ id:'rooms', label:'Rooms', icon:BedDouble, component:HotelRoomsTab }, { id:'housekeeping', label:'Housekeeping', icon:CheckCircle2, component:HousekeepingTab }],
    RESTAURANT: [{ id:'kitchen', label:'Kitchen', icon:ChefHat, component:KitchenTab }, { id:'tables', label:'Tables', icon:UtensilsCrossed, component:TablesTab }],
    TRANSIT:    [{ id:'fleet', label:'Fleet', icon:Truck, component:FleetTab }, { id:'drivers', label:'Drivers', icon:UserCog, component:DriversTab }, { id:'trips', label:'Trips', icon:Route, component:TripsTab }],
  };
  return [...(specific[category]||[]),
    { id:'orders', label:'Orders', icon:ReceiptText, component:OrdersTab },
    { id:'employees', label:'Employees', icon:Users, component:EmployeesTab },
    { id:'finance', label:'Finance', icon:Wallet, component:FinanceTab },
  ];
}

export default function BusinessDetail() {
  const { bizId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-business-detail', bizId],
    queryFn: () => bizApi.detail(bizId),
    retry: 1,
  });

  const biz = data?.business || data?.data || data;
  const suspendMut = useMutation({
    mutationFn: ({ reason }) => bizApi.suspend(bizId, reason),
    onSuccess: () => { qc.invalidateQueries(['admin-business-detail', bizId]); toast.success('Business suspended'); },
    onError: (e) => toast.error(e.message || 'Failed'),
  });
  const unsuspendMut = useMutation({
    mutationFn: () => bizApi.unsuspend(bizId),
    onSuccess: () => { qc.invalidateQueries(['admin-business-detail', bizId]); toast.success('Business reinstated'); },
    onError: (e) => toast.error(e.message || 'Failed'),
  });

  const category = biz?.category || 'GENERAL';
  const meta = CATEGORY_META[category] || { icon: Building2, label: category, tint: 'general', color: 'text-ink-2', bg: 'bg-[var(--f-surface-sunken)]' };
  const CategoryIcon = meta.icon;
  const tabs = buildTabs(category);
  const currentTab = activeTab ?? tabs[0]?.id;
  const ActiveComponent = tabs.find(t => t.id === currentTab)?.component;
  const kyb = KYB_BADGE[biz?.kybStatus] || KYB_BADGE.UNVERIFIED;

  if (isLoading) return (
    <div className="space-y-4 p-4">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--f-surface-sunken)] animate-pulse" />)}
    </div>
  );

  if (isError || !biz || typeof biz !== 'object' || !biz.businessName) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <Building2 className="h-10 w-10 text-ink-3 opacity-40" />
      <p className="text-sm text-ink-3">Business not found.</p>
      <Button variant="secondary" onClick={() => navigate('/businesses')}>
        <ArrowLeft className="h-4 w-4" /> Back to Businesses
      </Button>
    </div>
  );

  return (
    <div className="space-y-5" data-vertical={meta.tint}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <button onClick={() => navigate('/businesses')}
          className="flex items-center gap-1 hover:text-[var(--f-text)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Businesses
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--f-text)] font-medium truncate">{biz.businessName}</span>
      </div>

      {/* Hero */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2 }}
        className="rounded-xl border border-[var(--f-line)] bg-[var(--f-surface-raised)] overflow-hidden">
        <div className="h-20 relative overflow-hidden"
          style={{ background:'linear-gradient(135deg, hsl(var(--f-tint) var(--f-tint-sat) 15%) 0%, hsl(var(--f-tint) var(--f-tint-sat) 28%) 100%)' }}>
          {biz.coverPhotoUrl && <img src={biz.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
            <CategoryIcon className="h-3 w-3" />{meta.label}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-7 mb-4">
            <div className="w-14 h-14 rounded-xl border-2 border-[var(--f-surface-raised)] bg-[var(--f-surface-sunken)] overflow-hidden shrink-0 shadow-md">
              {biz.logoUrl
                ? <img src={biz.logoUrl} alt={biz.businessName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><CategoryIcon className="h-5 w-5 text-ink-3" /></div>}
            </div>
            <div className="flex-1 min-w-0 pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[var(--f-text)] truncate">{biz.businessName}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${kyb.cls}`}>{kyb.label}</span>
                {biz.isSuspended && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--f-bad-bg)] text-[var(--f-bad)]">Suspended</span>}
              </div>
              <p className="text-xs text-ink-3 font-mono mt-0.5">{biz.bizId}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries(['admin-business-detail', bizId])}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {biz.isSuspended
                ? <Button variant="secondary" size="sm" loading={unsuspendMut.isPending} onClick={() => unsuspendMut.mutate()}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reinstate
                  </Button>
                : <Button variant="danger" size="sm" loading={suspendMut.isPending}
                    onClick={() => { const r = window.prompt('Reason for suspension:'); if (r?.trim()) suspendMut.mutate({ reason: r }); }}>
                    <Ban className="h-3.5 w-3.5" /> Suspend
                  </Button>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Owner',  value:biz.user?.username||biz.owner?.username||'—', icon:Users },
              { label:'Rating', value:biz.averageRating ? `${Number(biz.averageRating).toFixed(1)} ★` : '—', icon:Star },
              { label:'Country',value:biz.country||'—', icon:MapPin },
              { label:'Volume', value:fmtMoney(biz.totalVolume), icon:TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--f-surface-sunken)] border border-[var(--f-line)]">
                <Icon className="h-3.5 w-3.5 text-ink-3 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-3 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-medium text-[var(--f-text)] mt-0.5 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
          {biz.description && <p className="mt-3 text-xs text-ink-2 leading-relaxed">{biz.description}</p>}
        </div>
      </motion.div>

      {/* Tabs */}
      <div>
        <div className="flex gap-0.5 border-b border-[var(--f-line)] overflow-x-auto" style={{ scrollbarWidth:'none' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive ? 'border-[var(--f-tint-color)] text-[var(--f-tint-color)]'
                    : 'border-transparent text-ink-3 hover:text-[var(--f-text)]'
                }`}>
                <Icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={currentTab} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
            transition={{ duration:0.15 }} className="pt-4">
            {ActiveComponent && <ActiveComponent bizId={biz.id || bizId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
