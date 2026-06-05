import { z } from 'zod';

// ──────────────────────────────────────────────
// StreamAlerts configuration schema
// ──────────────────────────────────────────────

export const StreamAlertsConfigSchema = z.object({
  overlayId: z.literal('stream-alerts'),
  enabled: z.boolean(),
  duration: z.number().min(3).max(15),
  position: z.enum([
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ]),
  queueCap: z.number().min(1).max(10),
});

// ──────────────────────────────────────────────
// Derived TypeScript type
// ──────────────────────────────────────────────

export type StreamAlertsConfig = z.infer<typeof StreamAlertsConfigSchema>;
