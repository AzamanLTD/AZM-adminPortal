/**
 * Azaman Admin — Motion / Animation System
 * Calibrated for a "data-dense" tool: fast but not jarring.
 */

export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  gentle: { type: 'spring', stiffness: 280, damping: 26 },
  bouncy: { type: 'spring', stiffness: 360, damping: 22 },
  slow:   { type: 'spring', stiffness: 180, damping: 24 },
};

// Page transitions — quick fade + tiny Y shift
export const pageVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } },
};

export const sidebarVariants = {
  expanded:  { width: 'var(--sidebar-width)' },
  collapsed: { width: 'var(--sidebar-width-collapsed)' },
};

export const sidebarTransition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };

// Staggered card/list items
export const cardVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay: i * 0.055, ease: [0.4, 0, 0.2, 1] },
  }),
};

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
};

export const slideInLeft = {
  hidden:  { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
};

export const slideInUp = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
};

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } },
};

// Hover effects for interactive elements
export const hoverLift = {
  whileHover: { y: -2, boxShadow: 'var(--az-shadow-md)' },
  transition:  { duration: 0.15 },
};

// Tab / drawer overlay
export const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
};

export const drawerVariants = {
  hidden:  { x: '100%' },
  visible: { x: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { x: '100%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
};

// Aliases used by existing pages — do not remove
export const listVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const listItemVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
};
