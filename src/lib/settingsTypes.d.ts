import { z } from 'zod';
import { adminSettingsSchema, adminSettingsResponseSchema, adminSettingsUpdateSchema } from './settingsContracts';

export type AdminSettings = z.infer<typeof adminSettingsSchema>;
export type AdminSettingsResponse = z.infer<typeof adminSettingsResponseSchema>;
export type AdminSettingsUpdate = z.infer<typeof adminSettingsUpdateSchema>;
