import { z } from 'zod';

const idSchema = z.union([z.string().min(1), z.number().int().positive()]);

export const feeProfileSchema = z.object({
  id: idSchema,
  name: z.string(),
  targetScope: z.enum(['ALL', 'HOLIDAY', 'CUSTOM']),
  targetValue: z.string().nullable().optional(),
  platformFeePct: z.number().finite().nonnegative(),
  adminSplitPct: z.number().finite().nonnegative(),
  vendorSplitPct: z.number().finite().nonnegative(),
  exitFeePct: z.number().finite().nonnegative(),
  priority: z.number().int(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough().refine((value) => Math.abs(value.adminSplitPct + value.vendorSplitPct - 1) < 0.000001, {
  message: 'Admin and vendor fee splits must sum to 1.',
});

export const feeProfileListResponseSchema = z.object({
  success: z.literal(true),
  profiles: z.array(feeProfileSchema),
}).passthrough();

export const feeProfileWriteSchema = z.object({
  name: z.string().trim().min(1),
  targetScope: z.enum(['ALL', 'HOLIDAY', 'CUSTOM']),
  targetValue: z.string().nullable().optional(),
  platformFeePct: z.number().finite().min(0).max(1),
  adminSplitPct: z.number().finite().min(0).max(1),
  vendorSplitPct: z.number().finite().min(0).max(1),
  exitFeePct: z.number().finite().min(0).max(1),
  priority: z.number().int(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
}).passthrough().refine((value) => Math.abs(value.adminSplitPct + value.vendorSplitPct - 1) < 0.000001, {
  message: 'Admin and vendor fee splits must sum to 1.',
});
