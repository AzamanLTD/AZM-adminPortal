// src/lib/disputes.js
// Extracted from WarRoom.jsx — shared dispute logic

export function getSLA(createdAt) {
  if (!createdAt) return { hours: 0, level: 'normal', label: '—' };
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = diff / 36e5;
  let level, label;
  if (hours < 1) {
    level = 'normal'; label = `${Math.floor(diff / 60000)}m`;
  } else if (hours < 4) {
    level = 'warning'; label = `${hours.toFixed(1)}h`;
  } else {
    level = 'critical'; label = `${Math.floor(hours)}h`;
  }
  return { hours, level, label };
}

export function detectPatterns(allDisputes, currentDispute) {
  const patterns = [];
  const buyerId = currentDispute.user?.id || currentDispute.buyer?.id;
  const vendorId = currentDispute.vendor?.id;
  const buyerName = currentDispute.user?.username || currentDispute.buyer?.name || 'Buyer';
  const vendorName = currentDispute.vendor?.username || currentDispute.vendor?.name || 'Vendor';

  const sameBuyer = allDisputes.filter(d => d.id !== currentDispute.id && (d.user?.id || d.buyer?.id) === buyerId);
  const sameVendor = allDisputes.filter(d => d.id !== currentDispute.id && d.vendor?.id === vendorId);

  if (sameBuyer.length >= 2) {
    patterns.push({ type: 'buyer_repeat', level: 'high', label: `${buyerName} has ${sameBuyer.length} other active disputes` });
  } else if (sameBuyer.length === 1) {
    patterns.push({ type: 'buyer_repeat', level: 'medium', label: `${buyerName} has 1 other active dispute` });
  }

  if (sameVendor.length >= 2) {
    patterns.push({ type: 'vendor_repeat', level: 'high', label: `${vendorName} has ${sameVendor.length} other active disputes` });
  } else if (sameVendor.length === 1) {
    patterns.push({ type: 'vendor_repeat', level: 'medium', label: `${vendorName} has 1 other active dispute` });
  }

  const amount = Number(currentDispute.amount) || 0;
  if (amount >= 5000) {
    patterns.push({ type: 'high_value', level: 'warning', label: 'High-value dispute ($5K+)' });
  }

  return patterns;
}
