# License Service Contract

> Scope: Go package `internal/license` for Release 02.
> Status: design-only; implementation in Mini-Plan B.

## Package location

`internal/license/` — new Go package. The service will be instantiated in `cmd/vantare/main.go` and registered with Wails.

## Types

```go
package license

import (
    "context"
    "time"
)

type Entitlement string

const (
    EntitlementOverlays         Entitlement = "overlays"
    EntitlementEngineer         Entitlement = "engineer"
    EntitlementBundle           Entitlement = "bundle"
    EntitlementBetaAccess       Entitlement = "beta_access"
    EntitlementSupporter        Entitlement = "supporter"
    EntitlementFounder          Entitlement = "founder"
    EntitlementProFounder       Entitlement = "pro_founder"
    EntitlementVisionaryBacker  Entitlement = "visionary_backer"
    EntitlementACLuaPack        Entitlement = "ac_lua_pack"
)

type State string

const (
    StateAnonymous                 State = "anonymous"
    StateAuthenticatedNoEntitlement State = "authenticated-no-entitlement"
    StateActive                    State = "active"
    StateGrace                     State = "grace"
    StateExpired                   State = "expired"
    StateDeviceLimit               State = "device-limit"
)

type Result struct {
    State         State
    Entitlements  []Entitlement
    UserID        string
    Email         string
    DeviceOK      bool
    GraceEndsAt   *time.Time
    LastValidated time.Time
    Error         error
}
```

## Service Interface

```go
type Service struct {
    cfg         Config
    cache       *cache
    supabase    SupabaseClient // interface
    fingerprint func() (string, error)
}

type Config struct {
    SupabaseURL     string
    SupabaseAnonKey string
    GracePeriod     time.Duration // 24h
    CachePath       string
}

func NewService(cfg Config, fingerprint func() (string, error)) *Service
func (s *Service) Validate(ctx context.Context, sessionToken string) (*Result, error)
func (s *Service) HasEntitlement(ctx context.Context, sessionToken string, e Entitlement) (bool, error)
func (s *Service) ResetDevice(ctx context.Context, sessionToken string) error
func (s *Service) LoadCache() error
func (s *Service) SaveCache(state State, entitlements []Entitlement, expiresAt time.Time) error
```

## Rules

- `Validate` reads cache first, then calls Supabase if online.
- If Supabase is reachable and device matches → `active`, rewrite cache.
- If Supabase unreachable but cache is valid or within grace → `grace`.
- If cache expired and Supabase unreachable → `expired`.
- `ResetDevice` requires service-role backend endpoint; the service only calls it.
- All network calls use `context.WithTimeout` (5s default).
- No secrets in error messages surfaced to UI.

## SupabaseClient Interface (defined in package, implemented in Mini-Plan B)

```go
type SupabaseClient interface {
    GetEntitlements(ctx context.Context, userID string) ([]Entitlement, error)
    GetDevice(ctx context.Context, userID string) (*DeviceInfo, error)
    RegisterDevice(ctx context.Context, userID, fingerprint string) error
    UpsertDevice(ctx context.Context, userID, fingerprint string) error
}
```

## Cache Internal Structure

```go
type cacheData struct {
    UserID            string        `json:"userId"`
    Email             string        `json:"email"`
    Entitlements      []Entitlement `json:"entitlements"`
    ActiveFingerprint string        `json:"activeFingerprint"`
    LastValidatedAt   time.Time     `json:"lastValidatedAt"`
    ExpiresAt         time.Time     `json:"expiresAt"`
    GraceStartedAt    time.Time     `json:"graceStartedAt"`
}
```

## Wails Integration

- Service exposed to frontend via `application.NewService(licenseSvc)`.
- State changes emitted as Wails events: `license:changed` with `*Result` payload.
- Frontend gates routes based on `State`.

## Registration in main.go (planned)

```go
// Add import: "github.com/vantare/overlays/v2/internal/license"
// After settings service initialization, before wailsApp.Run():

licenseCfg := license.Config{
    SupabaseURL:     os.Getenv("SUPABASE_URL"),
    SupabaseAnonKey: os.Getenv("SUPABASE_ANON_KEY"),
    GracePeriod:     24 * time.Hour,
    CachePath:       filepath.Join(cfgDir, "license-cache.json"),
}
licenseSvc := license.NewService(licenseCfg, computeFingerprint)
if err := licenseSvc.LoadCache(); err != nil {
    log.Printf("warning: no valid license cache: %v", err)
}
wailsApp.RegisterService(application.NewService(licenseSvc))
```

## Error Handling

- `Validate`: network errors return grace/expired based on cache; never panic.
- `HasEntitlement`: false on network error (secure default).
- `ResetDevice`: returns typed error for "rate limited", "device not found", "network error".
- All errors logged server-side; UI gets `Result.Error` with user-safe message.
