/**
 * QR Forge — Admin QR Code Generator
 *
 * Features:
 *  • Live high-resolution QR preview (transparent + white variants)
 *  • Permanent redirect URL baked into every QR — reprogrammable without
 *    reprinting (admin changes destination, all existing QR codes follow)
 *  • Multi-size download: shirt (1200px), banner (3000px), sticker (600px),
 *    print-ready (5000px), all as PNG
 *  • Transparent-background export option (for printing on garments/merch)
 *  • Live site preview card showing what the destination looks like
 *  • Destination history log (last 5 changes stored in localStorage)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ActionDialog from '@/components/ActionDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

// ── Campaign API helpers ─────────────────────────────────────────────────────
async function fetchCampaigns() {
  const res = await fetch(`${API_BASE}/api/qr/campaigns`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('azaman_token')}` },
  });
  if (!res.ok) throw new Error('Failed to load campaigns');
  return res.json();
}

async function createCampaign(data) {
  const res = await fetch(`${API_BASE}/api/qr/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('azaman_token')}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}

async function updateCampaign(id, data) {
  const res = await fetch(`${API_BASE}/api/qr/campaigns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('azaman_token')}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update campaign');
  return res.json();
}

async function deleteCampaign(id) {
  const res = await fetch(`${API_BASE}/api/qr/campaigns/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('azaman_token')}` },
  });
  if (!res.ok) throw new Error('Failed to delete campaign');
  return res.json();
}
import QRCode from 'qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  QrCode, Download, Link2, RefreshCw, Check, Printer,
  Monitor, Shirt, ImageIcon, AlertCircle, Clock, ExternalLink,
  ChevronDown, Loader2, Sparkles, Globe, BarChart3, Activity, Users, Plus, Copy, Eye, EyeOff, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'https://azm-backend.onrender.com';
const PERMANENT_QR_URL = `${API_BASE}/api/qr/go`;

const SIZES = [
  { key: 'sticker', label: 'Sticker',       sub: '600 px',  px: 600,  Icon: ImageIcon },
  { key: 'shirt',   label: 'T-Shirt',        sub: '1200 px', px: 1200, Icon: Shirt     },
  { key: 'banner',  label: 'Banner / Print', sub: '3000 px', px: 3000, Icon: Printer   },
  { key: 'ultra',   label: 'Ultra HD',       sub: '5000 px', px: 5000, Icon: Monitor   },
];

const HISTORY_KEY = 'azm_qr_dest_history';

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchDestination() {
  const res = await fetch(`${API_BASE}/api/qr/destination`);
  if (!res.ok) throw new Error('Failed to load destination');
  return res.json();
}

async function patchDestination({ url, label }) {
  const token =
    localStorage.getItem('admin_token') || '';
  const res = await fetch(`${API_BASE}/api/qr/destination`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url, label }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Update failed');
  return data;
}

async function fetchAnalytics() {
  const token = localStorage.getItem('admin_token') || '';
  const res = await fetch(`${API_BASE}/api/qr/analytics`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Failed to load QR analytics');
  return res.json();
}

// ── QR canvas renderer ────────────────────────────────────────────────────────
// scheme: { dark, light } — light may be '#00000000' for transparent
async function renderQR(canvas, url, { size = 400, margin = 2, dark = '#000000', light = '#ffffff' } = {}) {
  await QRCode.toCanvas(canvas, url, {
    width: size,
    margin,
    color: { dark, light },
    errorCorrectionLevel: 'H',
  });
}

async function renderQRDataUrl(url, px, dark, light) {
  const offscreen = document.createElement('canvas');
  const margin = light === '#00000000' ? 1 : 2;
  await renderQR(offscreen, url, { size: px, dark, light, margin });
  return offscreen.toDataURL('image/png');
}

// The 4 colour schemes
const SCHEMES = [
  { key: 'black-white',       label: 'Black',   sub: 'on white',       dark: '#000000', light: '#ffffff', previewBg: '#ffffff', previewDot: '#000000' },
  { key: 'white-black',       label: 'White',   sub: 'on black',       dark: '#ffffff', light: '#000000', previewBg: '#000000', previewDot: '#ffffff' },
  { key: 'black-transparent', label: 'Black',   sub: 'transparent bg', dark: '#000000', light: '#00000000', previewBg: null,     previewDot: '#000000' },
  { key: 'white-transparent', label: 'White',   sub: 'transparent bg', dark: '#ffffff', light: '#00000000', previewBg: null,     previewDot: '#ffffff' },
];

// ── History helpers ───────────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(url, label) {
  const h = loadHistory().filter((e) => e.url !== url);
  h.unshift({ url, label, ts: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 5)));
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QrForge() {
  const qc = useQueryClient();

  const { data: dest, isLoading: destLoading } = useQuery({
    queryKey: ['qr-destination'],
    queryFn: fetchDestination,
    staleTime: 30_000,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['qr-analytics'],
    queryFn: fetchAnalytics,
    staleTime: 60_000,
  });

  // ── Campaign queries ────────────────────────────────────────────────────────
  const { data: campaignsData, isLoading: campaignsLoading, isError: campaignsError, refetch: refetchCampaigns } = useQuery({
    queryKey: ['qr-campaigns'],
    queryFn: fetchCampaigns,
  });

  const createCampaignMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qr-campaigns'] }); toast.success('Campaign created'); },
    onError: (e) => toast.error(e.message),
  });

  const updateCampaignMut = useMutation({
    mutationFn: ({ id, data }) => updateCampaign(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qr-campaigns'] }); toast.success('Campaign updated'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCampaignMut = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qr-campaigns'] }); toast.success('Campaign deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const [editUrl,   setEditUrl]   = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [schemeKey, setSchemeKey] = useState('black-white');
  const scheme = SCHEMES.find((s) => s.key === schemeKey) || SCHEMES[0];
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory]         = useState(loadHistory);
  const [saved, setSaved]             = useState(false);
  const [downloading, setDownloading] = useState(null);

  // ── Dialog state (replacing prompt()/confirm()) ──────────────────────────────
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignUrl, setNewCampaignUrl] = useState('');
  const [editUrlOpen, setEditUrlOpen] = useState(false);
  const [editUrlValue, setEditUrlValue] = useState('');
  const [editCampaignId, setEditCampaignId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState(null);

  useEffect(() => {
    if (dest && !editUrl) {
      setEditUrl(dest.url   || '');
      setEditLabel(dest.label || '');
    }
  }, [dest]);

  const canvasRef = useRef(null);

  const drawPreview = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      await renderQR(canvasRef.current, PERMANENT_QR_URL, {
        size: 360,
        dark: scheme.dark,
        light: scheme.light,
        margin: scheme.light === '#00000000' ? 1 : 2,
      });
    } catch (e) {
      console.error('QR render error', e);
    }
  }, [scheme]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  const update = useMutation({
    mutationFn: patchDestination,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['qr-destination'] });
      saveHistory(data.url, data.label);
      setHistory(loadHistory());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('QR destination updated — all printed codes now point here.');
    },
    onError: (e) => toast.error(e.message || 'Failed to update destination'),
  });

  const handleDownload = async (sizeKey) => {
    const sizeConfig = SIZES.find((s) => s.key === sizeKey);
    if (!sizeConfig) return;
    setDownloading(sizeKey);
    try {
      const dataUrl = await renderQRDataUrl(PERMANENT_QR_URL, sizeConfig.px, scheme.dark, scheme.light);
      const a = document.createElement('a');
      a.download = `azaman_qr_${sizeKey}_${sizeConfig.px}px_${scheme.key}.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloaded ${sizeConfig.label} (${sizeConfig.px}px)`);
    } catch (e) {
      toast.error('Download failed — ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const currentDest  = dest?.url   || 'https://startup.moolre.com/leaderboard/118';
  const currentLabel = dest?.label || 'Azaman Vote Page';

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-yellow-400" />
            QR Forge
          </h1>
          <p className="text-sm text-az-text-secondary mt-0.5">
            Generate high-resolution, print-ready QR codes. Reprogram the destination any time — no reprinting needed.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Live redirect active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* Left column */}
        <div className="space-y-5">

          {/* Permanent URL */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-az-text-primary">Permanent QR URL</span>
              <span className="text-xs text-az-text-muted bg-az-card px-2 py-0.5 rounded-full">baked into every printed code</span>
            </div>
            <div className="flex items-center gap-2 bg-az-black border border-az-border rounded-lg px-3 py-2.5">
              <code className="text-xs text-yellow-300 flex-1 truncate font-mono">{PERMANENT_QR_URL}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(PERMANENT_QR_URL); toast.success('Copied!'); }}
                className="text-az-text-muted hover:text-white transition-colors text-xs px-2 py-0.5 rounded"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-az-text-muted mt-2">
              This URL never changes. It instantly redirects visitors to the destination below.
            </p>
          </div>

          {/* Destination editor */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-az-text-primary">Current Destination</span>
              {destLoading && <Loader2 className="w-3.5 h-3.5 text-az-text-muted animate-spin" />}
            </div>

            <div className="flex items-center gap-2 p-3 bg-az-card/60 border border-az-border rounded-lg">
              <a
                href={currentDest}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex-1 truncate flex items-center gap-1.5 transition-colors"
              >
                {currentLabel}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <span className="text-xs text-az-text-muted truncate max-w-[200px] hidden sm:block">{currentDest}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-az-text-secondary mb-1.5 block">New Destination URL</label>
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="bg-az-card border-az-border text-white font-mono text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs text-az-text-secondary mb-1.5 block">Label (for your records)</label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="bg-az-card border-az-border text-white text-sm"
                  placeholder="e.g. Moolre Vote Page"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => update.mutate({ url: editUrl, label: editLabel })}
                  disabled={update.isPending || !editUrl || editUrl === currentDest}
                  className="bg-yellow-500 hover:bg-yellow-400 text-az-black font-semibold gap-1.5"
                >
                  {update.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : saved
                      ? <Check className="w-3.5 h-3.5" />
                      : <RefreshCw className="w-3.5 h-3.5" />}
                  {saved ? 'Saved!' : 'Reprogram Destination'}
                </Button>

                {history.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex items-center gap-1 text-xs text-az-text-secondary hover:text-white transition-colors px-3 py-2 rounded-lg border border-az-border hover:border-az-border-bright"
                    >
                      <Clock className="w-3 h-3" />
                      History
                      <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                    </button>
                    {showHistory && (
                      <div className="absolute top-full mt-1 left-0 w-80 bg-az-card border border-az-border rounded-xl shadow-2xl z-50 overflow-hidden">
                        {history.map((h, i) => (
                          <button
                            key={i}
                            onClick={() => { setEditUrl(h.url); setEditLabel(h.label || ''); setShowHistory(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-az-border transition-colors border-b border-az-border/50 last:border-0"
                          >
                            <p className="text-sm text-white font-medium truncate">{h.label || 'Unlabelled'}</p>
                            <p className="text-xs text-az-text-secondary truncate mt-0.5">{h.url}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Download panel */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-az-text-primary">Download Sizes</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {SCHEMES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSchemeKey(s.key)}
                    title={`${s.label} ${s.sub}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      schemeKey === s.key
                        ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300'
                        : 'border-az-border bg-az-card text-az-text-secondary hover:border-az-border-bright'
                    }`}
                  >
                    {/* Mini swatch */}
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-az-border-bright shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: s.previewBg || 'transparent', backgroundImage: s.previewBg ? 'none' : 'repeating-conic-gradient(#475569 0% 25%, #1e293b 0% 50%)', backgroundSize: '6px 6px' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: s.previewDot }} />
                    </span>
                    <span>{s.label}</span>
                    <span className="text-az-text-muted">{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-az-text-muted">
              {scheme.light === '#00000000'
                ? `${scheme.label} QR on transparent background — ideal for garments, merch, and dark/coloured surfaces.`
                : scheme.dark === '#ffffff'
                  ? 'White QR on black — great for dark print runs, stickers on dark packaging.'
                  : 'Black QR on white — best for paper, flyers, and light surfaces.'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {SIZES.map(({ key, label, sub, Icon }) => {
                const isDownloading = downloading === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleDownload(key)}
                    disabled={!!downloading}
                    className="flex items-center gap-3 p-3.5 bg-az-card hover:bg-az-border border border-az-border hover:border-az-border-bright rounded-xl transition-all group disabled:opacity-60 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-az-border group-hover:bg-az-border-bright flex items-center justify-center shrink-0 transition-colors">
                      {isDownloading
                        ? <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                        : <Icon className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-az-text-muted">{sub}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-az-text-muted group-hover:text-az-text-secondary ml-auto transition-colors" />
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-az-text-secondary">
                All exports use <strong className="text-az-text-primary">Error Correction Level H</strong> — the QR scans even if 30% is covered by a logo or worn. For large print jobs use <strong className="text-az-text-primary">Ultra HD (5000px)</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right column — preview */}
        <div className="space-y-4">

          {/* QR canvas */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5">
            <p className="text-xs font-medium text-az-text-secondary mb-3 text-center">
              Preview — scan to test the redirect
            </p>
            <div
              className="relative rounded-2xl flex items-center justify-center p-4"
              style={scheme.light === '#00000000' ? {
                backgroundImage: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%)',
                backgroundSize: '16px 16px',
              } : { backgroundColor: scheme.light }}
            >
              <canvas ref={canvasRef} className="rounded-lg max-w-full block" />
            </div>
            {scheme.light === '#00000000' && (
              <p className="text-center text-xs text-az-text-muted mt-2">Checkerboard = transparent pixels</p>
            )}
          </div>

          {/* Destination preview */}
          <div className="bg-az-surface border border-az-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-az-border flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-az-text-muted" />
              <span className="text-xs text-az-text-secondary font-medium">Destination Preview</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 bg-az-card rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/60" />
                  <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-xs text-az-text-secondary truncate flex-1 font-mono">{currentDest}</span>
              </div>

              <div className="bg-az-card rounded-xl overflow-hidden border border-az-border">
                <div className="h-2 bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500" />
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-black text-az-black">A</div>
                    <div>
                      <p className="text-sm font-bold text-white">Azaman</p>
                      <p className="text-xs text-az-text-secondary">Moolre Startup Leaderboard</p>
                    </div>
                  </div>
                  <p className="text-xs text-az-text-secondary leading-relaxed">
                    Scan this QR to vote for Azaman on the Moolre leaderboard. Every vote counts toward startup funding.
                  </p>
                  <a
                    href={currentDest}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open destination
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Info callout */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-az-text-secondary leading-relaxed">
              <strong className="text-blue-300">No reprinting ever needed.</strong> When you change the destination above, every already-printed QR code updates instantly via the permanent relay URL.
            </p>
          </div>
        </div>
      </div>

      {/* QR Analytics Section */}
      <div className="space-y-6 pt-4 border-t border-az-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              QR Scan Analytics
            </h2>
            <p className="text-xs text-az-text-secondary mt-0.5">
              Real-time tracking and metrics for visitors scanning your QR codes.
            </p>
          </div>
          {analyticsLoading && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat Card 1: Total Scans */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-az-text-secondary text-xs font-semibold">
              <span>Total Scans</span>
              <BarChart3 className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {analyticsLoading ? '...' : (analytics?.totalScans ?? 0)}
            </div>
            <p className="text-xs text-az-text-muted">All-time redirects</p>
          </div>

          {/* Stat Card 2: Recent Scans */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-az-text-secondary text-xs font-semibold">
              <span>Recent Scans (30d)</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {analyticsLoading ? '...' : (analytics?.recentScans ?? 0)}
            </div>
            <p className="text-xs text-az-text-muted">Last 30 days active</p>
          </div>

          {/* Stat Card 3: Unique Visitors */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-az-text-secondary text-xs font-semibold">
              <span>Unique Visitors</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {analyticsLoading ? '...' : (analytics?.uniqueVisitors ?? 0)}
            </div>
            <p className="text-xs text-az-text-muted">Unique IPs (30d)</p>
          </div>

          {/* Stat Card 4: Avg/Day */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-az-text-secondary text-xs font-semibold">
              <span>Avg/Day</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {analyticsLoading ? '...' : analytics ? (analytics.recentScans / 30).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-az-text-muted">Scans per day average</p>
          </div>
        </div>

        {/* Charts & Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily activity chart */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-yellow-400" />
                Daily Scan Activity (Last 30 Days)
              </h3>
              <span className="text-xs text-az-text-muted">
                {analytics?.daily?.length || 0} active days
              </span>
            </div>

            {analyticsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : !analytics?.daily || analytics.daily.length === 0 ? (
              <div className="h-48 border border-dashed border-az-border rounded-lg flex flex-col items-center justify-center text-az-text-muted">
                <Activity className="w-8 h-8 text-az-text-muted/40 mb-2 animate-pulse" />
                <span className="text-xs">No scan activity recorded yet.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Chart container */}
                <div className="h-48 flex items-end gap-1.5 pt-4 px-2">
                  {analytics.daily.map((d, index) => {
                    const maxCount = Math.max(...analytics.daily.map(x => x.count), 1);
                    const heightPercent = (d.count / maxCount) * 100;
                    const dateObj = new Date(d.date + 'T00:00:00');
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                    return (
                      <div
                        key={index}
                        className="flex-1 group relative flex flex-col items-center h-full justify-end"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30">
                          <div className="bg-az-black text-white text-[10px] font-semibold py-1 px-2 rounded border border-az-border shadow-xl whitespace-nowrap">
                            <span className="text-yellow-400">{d.count} scans</span> • {formattedDate}
                          </div>
                          <div className="w-1.5 h-1.5 bg-az-black border-r border-b border-az-border transform rotate-45 -mt-1" />
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-yellow-500/80 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 rounded-t-sm transition-all duration-200 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis labels: show first and last dates */}
                <div className="flex justify-between text-[10px] text-az-text-muted px-2 font-mono">
                  <span>{new Date(analytics.daily[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                  <span>Today</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans Table */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Recent QR Scans (Last 10)
              </h3>
            </div>

            {analyticsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : !analytics?.lastScans || analytics.lastScans.length === 0 ? (
              <div className="h-48 border border-dashed border-az-border rounded-lg flex flex-col items-center justify-center text-az-text-muted">
                <span className="text-xs">No scan history available.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-az-border text-az-text-secondary font-medium">
                      <th className="py-2.5 px-3">Date/Time</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3">User Agent</th>
                      <th className="py-2.5 px-3">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-az-border/40 text-az-text-secondary">
                    {analytics.lastScans.map((scan) => {
                      const dateStr = new Date(scan.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      return (
                        <tr key={scan.id} className="hover:bg-az-card/40 transition-colors">
                          <td className="py-2.5 px-3 text-white whitespace-nowrap font-mono">{dateStr}</td>
                          <td className="py-2.5 px-3 font-mono text-az-text-primary">{scan.ipAddress || 'Unknown'}</td>
                          <td className="py-2.5 px-3 truncate max-w-[200px]" title={scan.userAgent}>
                            {scan.userAgent ? (scan.userAgent.length > 40 ? scan.userAgent.slice(0, 40) + '...' : scan.userAgent) : 'Unknown'}
                          </td>
                          <td className="py-2.5 px-3 truncate max-w-[150px]" title={scan.referrer}>
                            <span className={scan.referrer ? 'text-blue-400 font-mono' : 'text-az-text-muted italic'}>
                              {scan.referrer || 'Direct'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* ── Campaign Management Section ────────────────────────────────────── */}
        <div className="bg-az-surface border border-az-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Multi-Campaign QR
              </h3>
              <p className="text-xs text-az-text-muted mt-0.5">Create separate QR campaigns with unique slugs and individual analytics.</p>
            </div>
            <Button size="sm" onClick={() => {
              setNewCampaignName('');
              setNewCampaignUrl('');
              setNewCampaignOpen(true);
            }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign
            </Button>
          </div>

          {campaignsLoading && <p className="text-az-text-muted text-sm py-4 text-center">Loading campaigns…</p>}
          {campaignsError && <p className="text-red-400 text-sm py-4 text-center">Failed to load campaigns</p>}
          {campaignsData?.campaigns && campaignsData.campaigns.length === 0 && (
            <p className="text-az-text-muted text-sm py-4 text-center italic">No campaigns yet. Create one to get a unique QR slug.</p>
          )}
          {campaignsData?.campaigns && campaignsData.campaigns.length > 0 && (
            <div className="space-y-2">
              {campaignsData.campaigns.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-az-card border border-az-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-az-text-muted/20 text-az-text-muted'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-az-text-muted">
                      <span className="font-mono">/{c.slug}</span>
                      <span className="truncate max-w-[200px]" title={c.destinationUrl}>{c.destinationUrl}</span>
                      <span>{c.totalScans} scans</span>
                    </div>
                    <div className="text-[10px] text-az-text-muted mt-0.5 font-mono">
                      QR URL: {PERMANENT_QR_URL}/{c.slug}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(`${PERMANENT_QR_URL}/${c.slug}`);
                      toast.success('Campaign QR URL copied');
                    }} className="text-az-text-muted hover:text-white">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditCampaignId(c.id);
                      setEditUrlValue(c.destinationUrl);
                      setEditUrlOpen(true);
                    }} className="text-az-text-muted hover:text-white">
                      <Link2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      updateCampaignMut.mutate({ id: c.id, data: { isActive: !c.isActive } });
                    }} className={c.isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}>
                      {c.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setDeleteCampaign(c);
                      setDeleteOpen(true);
                    }} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

    </div>
  );
}
