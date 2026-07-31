// src/lib/motion.js
// Centralized Framer Motion variants and spring configs.
// Import from here everywhere — never hardcode durations inline.

// ── Spring presets (Sentry-inspired: stiff, physical, no bounce) ──
export const spring = {
  snappy:  { type: 'spring', stiffness: 700,  damping: 50, mass: 1 },
  smooth:  { type: 'spring', stiffness: 400,  damping: 40, mass: 1 },
  gentle:  { type: 'spring', stiffness: 200,  damping: 30, mass: 1 },
  bouncy:  { type: 'spring', stiffness: 500,  damping: 20, mass: 0.8 },
};

// ── Easing curves ──
export const ease = {
  out:  [0.16, 1, 0.3, 1],       // Exponential out — feels snappy
  in:   [0.4, 0, 1, 1],           // Ease in for exits
  io:   [0.4, 0, 0.2, 1],         // Material standard
};

// ── Page transition variants ──
export const pageVariants = {
  initial:  { opacity: 0, y: 8,  filter: 'blur(4px)' },
  animate:  { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.35, ease: ease.out } },
  exit:     { opacity: 0, y: -4, filter: 'blur(2px)', transition: { duration: 0.2,  ease: ease.in  } },
};

// ── Stagger children list ──
export const listVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};
export const listItemVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: spring.snappy },
};

// ── Card entrance ──
export const cardVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: ease.out } },
};

// ── Sidebar collapse ──
export const sidebarVariants = {
  expanded:  { width: 240 },
  collapsed: { width: 64 },
};
export const sidebarTransition = spring.snappy;

// ── Tooltip / popover ──
export const tooltipVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 4 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: spring.snappy },
};

// ── Badge counter ──
export const badgeVariants = {
  initial:  { scale: 0.5, opacity: 0 },
  animate:  { scale: 1,   opacity: 1, transition: spring.bouncy },
  exit:     { scale: 0,   opacity: 0, transition: { duration: 0.15 } },
};

// ── Drawer slide-in ──
export const drawerVariants = {
  closed: { x: '100%', opacity: 0 },
  open:   { x: 0, opacity: 1, transition: spring.smooth },
};

// ── Number counter animation (for KPI cards) ──
export const counterTransition = { duration: 1.2, ease: [0.25, 1, 0.5, 1] };
