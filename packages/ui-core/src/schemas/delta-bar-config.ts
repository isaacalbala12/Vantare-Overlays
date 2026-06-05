import { z } from 'zod';

// ──────────────────────────────────────────────
// DeltaBar configuration schema
// ──────────────────────────────────────────────

export const DeltaBarConfigSchema = z.object({
  overlayId: z.literal('delta-bar'),
  showDelta: z.boolean(),
  showPrediction: z.boolean(),
  barPosition: z.enum(['top', 'bottom']),
  opacity: z.number().min(0).max(1),
});

// ──────────────────────────────────────────────
// Derived TypeScript type
// ──────────────────────────────────────────────

export type DeltaBarConfig = z.infer<typeof DeltaBarConfigSchema>;
