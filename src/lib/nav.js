/**
 * FORGE NAV — Admin portal navigation
 */
import {
  LayoutDashboard, Swords, Lock, FileCheck, Users, Home, Bell,
  TrendingUp, Wallet, Database, Sliders, Zap, PiggyBank, Siren,
  Building2, Store, Bot, QrCode, FileText, Settings, ShieldCheck,
} from 'lucide-react';

export const DOMAINS = [
  {
    id:'ops', label:'Operations', icon:LayoutDashboard, verticals:null,
    groups:[{ label:'Operations', items:[
      { to:'/',              label:'Command Center',  icon:LayoutDashboard },
      { to:'/war-room',      label:'War Room',        icon:Swords, count:'disputes' },
      { to:'/escrow-disputes',label:'Escrow Disputes',icon:Lock, count:'escrow_disputes' },
    ]}],
  },
  {
    id:'compliance', label:'Compliance', icon:FileCheck, verticals:null,
    groups:[{ label:'Compliance', items:[
      { to:'/business-kyb',    label:'Business KYB',    icon:FileCheck, count:'biz_kyb' },
      { to:'/users',           label:'Users & KYC',     icon:Users, count:'kyc' },
      { to:'/residency-queue', label:'Residency Queue', icon:Home },
      { to:'/notifications',   label:'Notifications',   icon:Bell },
    ]}],
  },
  {
    id:'finance', label:'Finance', icon:Wallet, verticals:null,
    groups:[{ label:'Finance', items:[
      { to:'/profits',          label:'Revenue',        icon:TrendingUp },
      { to:'/withdrawals',      label:'Withdrawals',    icon:Wallet, count:'withdrawals' },
      { to:'/pools',            label:'Pool Monitor',   icon:Database },
      { to:'/fee-engine',       label:'Fee Engine',     icon:Sliders },
      { to:'/fee-profiles',     label:'Fee Profiles',   icon:Zap },
      { to:'/smart-escrow',     label:'Smart Escrow',   icon:ShieldCheck },
    ]}],
  },
  {
    id:'susu', label:'Susu', icon:PiggyBank, verticals:null,
    groups:[{ label:'Susu', items:[
      { to:'/susu',           label:'Susu Groups',    icon:PiggyBank },
      { to:'/susu-incidents', label:'Susu Incidents', icon:Siren },
    ]}],
  },
  {
    id:'merchants', label:'Merchants', icon:Building2, verticals:null,
    groups:[{ label:'Merchants', items:[
      { to:'/businesses',  label:'Businesses',  icon:Building2 },
      { to:'/storefronts', label:'Storefronts', icon:Store },
    ]}],
  },
  {
    id:'system', label:'System', icon:Settings, verticals:null,
    groups:[{ label:'System', items:[
      { to:'/ai-ops',   label:'AI Operations', icon:Bot },
      { to:'/qr-forge', label:'QR Forge',      icon:QrCode },
      { to:'/audit-log',label:'Audit Log',     icon:FileText },
      { to:'/config',   label:'System Config', icon:Settings },
    ]}],
  },
];

export function resolveNav({ counts = {}, ..._rest } = {}) {
  return DOMAINS.map(d => ({
    ...d,
    groups: d.groups.map(g => ({
      ...g,
      items: g.items.map(i => ({ ...i, badge: i.count ? counts[i.count] : undefined })),
    })),
  }));
}
