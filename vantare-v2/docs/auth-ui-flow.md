# Auth And License UI Flow

> Scope: Release 02 frontend screens and banners.
> Status: design-only; implementation in Mini-Plan C.

## Screens

### 1. Login screen

- Shown on first run after onboarding, or when session is missing/invalid.
- Email/password form.
- Google and Discord OAuth buttons (only if Supabase config supports them).
- Link to "Crear cuenta" that opens browser to Supabase/auth page or Stripe checkout.
- No premium content accessible from this screen.
- States handled: loading, error (network/auth failure), success → redirect.

### 2. Paywall / select plan

- Shown when `state = authenticated-no-entitlement`.
- Lists beta tiers and release tiers from Stripe prices.
- "Subscribe" button opens Stripe Checkout in browser (embedded not needed for v1).
- Shows current entitlements if any (partial upgrade scenario).
- Plan cards with: name, price, feature list, CTA button.
- Footer: "Already have a license? Revalidate" button.

### 3. License banner

- Sticky top banner when `state = grace` or `state = expired`.
- Grace: countdown to expiration + "Revalidar" button.
- Expired: blocker + "Renovar" button.
- Device-limit: dialog modal explaining the conflict + "Reset Device" button.

### 4. Settings / Account

- Shows logged-in email, active plan(s), renewal date(s), active device fingerprint hash (truncated).
- Button to reset device (with confirmation dialog).
- Button to logout (with confirmation dialog).
- Button to open Stripe Customer Portal for billing/invoices/invoices.

## State Propagation

- Go `LicenseService` exposes state via Wails events (`license:changed`).
- Frontend root component subscribes to `license:changed` and holds current state in `useLicense()` hook.
- Overlays Studio, Engineer and Setup remain unaware of auth details; they consume `useLicense()` hook for gating only.

### `useLicense()` hook contract

```typescript
interface LicenseInfo {
  state: 'anonymous' | 'authenticated-no-entitlement' | 'active' | 'grace' | 'expired' | 'device-limit';
  entitlements: string[];
  email: string;
  graceEndsAt?: string;
  lastValidated: string;
  loading: boolean;
  error?: string;
}

function useLicense(): LicenseInfo;
```

### Route gating

- `anonymous` and `authenticated-no-entitlement`: only login and paywall routes accessible.
- `expired` and `device-limit`: all premium routes blocked, Settings accessible.
- `grace`: all routes accessible, banner shown.
- `active`: full access.

## Onboarding Integration

- After onboarding step "choose simulator", insert step "login" if no session.
- After login, insert step "choose plan" if no entitlement.
- Only then proceed to recommended profile selection.

### Onboarding flow (updated)

```
Start onboarding
  → Select language
  → Login (inserted, skip if already authenticated)
  → Select plan (inserted, skip if already entitled)
  → Select primary simulator
  → Choose usage (racing/streaming/both)
  → Select recommended profile
  → Guided checklist
  → Done
```

## Component Tree (planned)

```
<App>
  <LicenseGate>              // subscribes to license:changed, gates routes
    <LoginScreen />          // anonymous
    <PaywallScreen />        // authenticated-no-entitlement
    <LicenseBanner />        // grace, expired, device-limit
    <MainHub>                // active or grace
      <OverlaysStudio />
      <EngineerPage />
      <SettingsPage />       // includes Account section
    </MainHub>
  </LicenseGate>
</App>
```

## Error States

| Scenario | UI |
|---|---|
| Network error during login | Toast "Error de conexión. Intenta de nuevo." |
| Invalid credentials | Inline error on form "Email o contraseña incorrectos." |
| Stripe Checkout fails | Toast "Error al procesar el pago. Contacta con soporte." |
| License validation fails offline | Banner "No se pudo validar la licencia. Modo offline." |
| Device reset fails | Toast "No se pudo restablecer el dispositivo. Intenta más tarde." |
