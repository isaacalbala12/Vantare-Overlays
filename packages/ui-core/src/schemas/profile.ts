import { z } from 'zod';
import { OverlayConfigDiscriminatedSchema } from './overlay-config';

// ──────────────────────────────────────────────
// Profile schemas
// ──────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
  overlays: z.record(z.string(), OverlayConfigDiscriminatedSchema),
  themeId: z.string(),
});

export const ProfilesSchema = z.array(ProfileSchema);

// ──────────────────────────────────────────────
// Derived TypeScript types
// ──────────────────────────────────────────────

export type Profile = z.infer<typeof ProfileSchema>;
export type Profiles = z.infer<typeof ProfilesSchema>;
