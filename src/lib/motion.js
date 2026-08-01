/**
 * FORGE MOTION
 * The only place transitions are defined. Inline transition objects are a
 * lint error (see eslint rule `forge/no-inline-transition`).
 */

export const ease = {
  out: [0.16, 1, 0.3, 1],
  io:  [0.4, 0, 0.2, 1],
  in:  [0.4, 0, 1, 1],
};

export const spring = {
  press:    { type:'spring', stiffness:700, damping:30, mass:0.4 },
  hover:    { type:'spring', stiffness:400, damping:25, mass:0.5 },
  popover:  { type:'spring', stiffness:500, damping:32, mass:0.8 },
  modal:    { type:'spring', stiffness:300, damping:30, mass:1   },
  drawer:   { type:'spring', stiffness:380, damping:34, mass:0.9 },
  indicator:{ type:'spring', stiffness:500, damping:40, mass:1   },
  reorder:  { type:'spring', stiffness:350, damping:25, mass:0.8 },
  toast:    { type:'spring', stiffness:500, damping:35, mass:0.6 },
};

export const tween = {
  fast:   { duration:0.10, ease: ease.out },
  hover:  { duration:0.12, ease: ease.io  },
  page:   { duration:0.20, ease: ease.io  },
  number: { duration:0.60, ease: 'easeOut' },
};

/* ---------- variants ---------- */

// Page: opacity + 2px. No blur filter — filter animation forces repaint of
// the entire subtree and is the #1 cause of route-change jank in the current app.
export const pageV = {
  initial:{ opacity:0, y:2 },
  animate:{ opacity:1, y:0, transition: tween.page },
  exit:   { opacity:0, y:0, transition: tween.fast },
};

export const popoverV = {
  initial:{ opacity:0, scale:0.97, y:-4 },
  animate:{ opacity:1, scale:1, y:0,
            transition:{ ...spring.popover, opacity: tween.fast } },
  exit:   { opacity:0, scale:0.98, y:-2, transition: tween.fast },
};

export const modalV = {
  initial:{ opacity:0, scale:0.985, y:6 },
  animate:{ opacity:1, scale:1, y:0,
            transition:{ ...spring.modal, opacity: tween.fast } },
  exit:   { opacity:0, scale:0.99, y:4, transition: tween.fast },
};

export const scrimV = {
  initial:{ opacity:0 }, animate:{ opacity:1, transition: tween.hover },
  exit:{ opacity:0, transition: tween.fast },
};

export const toastV = {
  initial:{ opacity:0, y:12, scale:0.97 },
  animate:{ opacity:1, y:0, scale:1,
            transition:{ ...spring.toast, opacity: tween.fast } },
  exit:   { opacity:0, scale:0.97, transition: tween.fast },
};

/**
 * Row stagger. Deliberately tiny (18ms) and capped at 12 rows: a 50-row table
 * that cascades for 900ms feels slower than one that appears at once.
 */
export const rowsV = {
  hidden:{},
  visible:{ transition:{ staggerChildren:0.018, delayChildren:0.02 } },
};
export const rowV = {
  hidden:{ opacity:0, y:3 },
  visible:{ opacity:1, y:0, transition:{ duration:0.16, ease: ease.out } },
};

/* ---------- reduced motion ---------- */
import { useReducedMotion } from 'framer-motion';

/** Degrade spatial motion to opacity — never remove feedback entirely. */
export function useForgeMotion() {
  const reduce = useReducedMotion();
  if (!reduce) return { pageV, popoverV, modalV, toastV, rowsV, rowV, spring, tween };
  const fade = {
    initial:{ opacity:0 }, animate:{ opacity:1, transition: tween.fast },
    exit:{ opacity:0, transition: tween.fast },
  };
  return {
    pageV: fade, popoverV: fade, modalV: fade, toastV: fade,
    rowsV: { hidden:{}, visible:{} },
    rowV:  { hidden:{opacity:0}, visible:{opacity:1} },
    spring: Object.fromEntries(Object.keys(spring).map(k => [k, tween.fast])),
    tween,
  };
}


/* ---------- backward-compatible aliases (removed in Phase 8) ---------- */
export const pageVariants = pageV;
export const listVariants = rowsV;
export const listItemVariants = rowV;
export const sidebarVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: tween.page },
};
export const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring.hover },
};
