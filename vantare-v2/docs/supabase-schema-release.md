# Supabase Schema Plan — Release 02

> Date: 2026-06-26.
> Scope: users, entitlements, devices, Stripe customers/subscriptions, license events.
> Status: schema is locked to the Release 02 mini-plan. The plan matrix visible
> in the app is documented in `docs/stripe-integration-plan.md` and derived by
> `internal/license.ClassifyPlan` + `frontend/src/lib/plan.ts`. Do not introduce
> new entitlement keys without updating both the Go and TS classifiers.

## Tables

### `public.profiles`

One row per Supabase Auth user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `auth.users.id` reference, RLS user can read own. |
| `email` | text | Synced from Auth, read-only to user. |
| `created_at` | timestamptz | Default now(). |
| `updated_at` | timestamptz | Default now(). |
| `language` | text | `es` or `en`; app can update own. |
| `primary_simulator` | text | Optional, app-owned. |
| `onboarding_completed` | boolean | Default false. |

### `public.user_entitlements`

Single source of truth for what a user can access.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default gen_random_uuid(). |
| `user_id` | uuid FK profiles | RLS user can read own. |
| `product_key` | text | `overlays`, `engineer`, `bundle`, `beta_access`, etc. |
| `status` | text | `active`, `cancelled`, `past_due`, `grace`, `expired`. |
| `expires_at` | timestamptz | NULL means no expiration. |
| `created_at` | timestamptz | Default now(). |
| `updated_at` | timestamptz | Default now(). |
| `metadata` | jsonb | Stripe subscription id, price id, etc. |

### `public.devices`

Tracks active device per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default gen_random_uuid(). |
| `user_id` | uuid FK profiles | Unique per user (one active PC). |
| `fingerprint_hash` | text | Hash of device fingerprint. |
| `first_seen_at` | timestamptz | Default now(). |
| `last_seen_at` | timestamptz | Default now(). |
| `reset_count_24h` | int | Default 0; used for rate limit. |

### `public.license_events`

Audit trail of validation events for support/debug.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default gen_random_uuid(). |
| `user_id` | uuid FK profiles | Indexed. |
| `event_type` | text | `validate`, `device_reset`, `checkout_complete`, `grace_enter`, `grace_expire`. |
| `payload` | jsonb | Result, fingerprint, error. |
| `created_at` | timestamptz | Default now(). |

### `public.stripe_customers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default gen_random_uuid(). |
| `user_id` | uuid FK profiles | Unique. |
| `stripe_customer_id` | text | Unique, indexed. |
| `created_at` | timestamptz | Default now(). |

### `public.stripe_subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default gen_random_uuid(). |
| `user_id` | uuid FK profiles | Indexed. |
| `stripe_subscription_id` | text | Unique. |
| `stripe_price_id` | text | Indexed. |
| `status` | text | Stripe status (`active`, `canceled`, `past_due`, etc.). |
| `current_period_start` | timestamptz | |
| `current_period_end` | timestamptz | |
| `cancel_at_period_end` | boolean | |
| `created_at` | timestamptz | Default now(). |
| `updated_at` | timestamptz | Default now(). |

## Row Level Security

- All tables have RLS enabled.
- `profiles`: user can SELECT/UPDATE own row only (`auth.uid() = id`).
- `user_entitlements`: user can SELECT own rows.
- `devices`: user can SELECT own row only; update via service role.
- `license_events`: user can SELECT own rows (limited to last 30 days).
- `stripe_customers` / `stripe_subscriptions`: user can SELECT own rows only.

## Service-Role Paths

- Stripe webhook backend uses Supabase service-role key to write:
  - `user_entitlements`
  - `stripe_subscriptions`
  - `stripe_customers`
- App Go `LicenseService` uses user's JWT to read own entitlements and devices.
- Device reset uses a Supabase Edge Function or backend endpoint with service-role key.

## Indexes (planned)

- `user_entitlements`: index on `user_id`, composite index on `(user_id, product_key)` for fast entitlement lookup.
- `devices`: unique index on `user_id`, index on `fingerprint_hash`.
- `license_events`: index on `user_id`, index on `created_at` for TTL cleanup.
- `stripe_customers`: index on `stripe_customer_id`.
- `stripe_subscriptions`: index on `stripe_subscription_id`, index on `user_id`.

## Migration Order (Mini-Plan B)

1. Create `profiles` table.
2. Create `stripe_customers` table.
3. Create `stripe_subscriptions` table.
4. Create `user_entitlements` table.
5. Create `devices` table.
6. Create `license_events` table.
7. Enable RLS on all tables.
8. Create RLS policies.
9. Create indexes.
10. Create profile trigger (auto-create row on `auth.users` insert via Supabase trigger).
