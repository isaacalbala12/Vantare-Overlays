# Overlays Studio Miniplan 1 — Navigation and Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible `Overlays` + `Preview` navigation with a single `Overlays Studio` tab and build the first library screen: `Mis perfiles`, `Recomendados por Vantare`, and `Comunidad Próximamente`.

**Architecture:** This miniplan only changes the Hub navigation and the library landing page. It does not implement the widget editor or profile layout editor yet. Existing `ProfilesPage`, `PreviewPage`, canvas, inspector, Wails save flow, and overlay runtime remain untouched as fallback code.

**Tech Stack:** React 19, TypeScript, Wails v3 events, Tailwind CSS v4, Vitest, Testing Library.

---

## Scope

In scope:

- Rename topbar tab from `Overlays` to `Overlays Studio`.
- Remove visible `Preview` tab from topbar.
- Keep app startup on `Hub`.
- Add `OverlaysStudioPage`.
- Add a library screen with:
  - `Mis perfiles`.
  - `Widgets` entry.
  - `Perfiles específicos` list using existing `hub:list` / `hub:profiles`.
  - `Recomendados por Vantare` read-only preset cards.
  - `Comunidad` as `Próximamente`.
- Add local recommended preset data.
- Add tests for navigation/library rendering and recommended profile cloning.

Out of scope:

- Widget Studio editor implementation.
- Profile layout editor implementation.
- Drag/resize changes.
- Backend changes.
- Saving recommended presets as own profiles.
- Deleting legacy `ProfilesPage` or `PreviewPage`.
- OBS validation.

---

## File Structure After This Miniplan

| File | Responsibility |
|---|---|
| `frontend/src/hub/pages/OverlaysStudioPage.tsx` | New page routed from the `profiles` section. Shows library state only in this miniplan. |
| `frontend/src/hub/pages/OverlaysStudioPage.test.tsx` | Verifies the page renders the library shell. |
| `frontend/src/hub/overlays/StudioHome.tsx` | Library UI with own profiles, recommended presets, and community placeholder. |
| `frontend/src/hub/overlays/StudioHome.test.tsx` | Verifies library sections and callbacks. |
| `frontend/src/hub/overlays/ProfileLibraryCard.tsx` | Reusable card for own profile and recommended preset actions. |
| `frontend/src/hub/overlays/recommended-profiles.ts` | Local read-only Vantare recommended preset descriptors. |
| `frontend/src/hub/overlays/recommended-profiles.test.ts` | Verifies presets are read-only and cloneable. |
| `frontend/src/hub/components/Topbar.tsx` | Updates visible navigation labels. |
| `frontend/src/hub/HubApp.tsx` | Routes `profiles` section to `OverlaysStudioPage` and removes `preview` route. |

---

## Task 1: Topbar and Page Shell

**Files:**

- Modify: `frontend/src/hub/components/Topbar.tsx`
- Modify: `frontend/src/hub/HubApp.tsx`
- Create: `frontend/src/hub/pages/OverlaysStudioPage.tsx`
- Test: `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`

- [ ] **Step 1: Write the failing page test**

Create `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverlaysStudioPage } from "./OverlaysStudioPage";

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn(() => vi.fn()),
    Emit: vi.fn(),
  },
}));

describe("OverlaysStudioPage", () => {
  it("renders the Overlays Studio library shell", () => {
    render(<OverlaysStudioPage />);

    expect(screen.getByRole("heading", { name: "Overlays Studio" })).toBeTruthy();
    expect(screen.getByText("Mis perfiles")).toBeTruthy();
    expect(screen.getByText("Recomendados por Vantare")).toBeTruthy();
    expect(screen.getByText("Comunidad")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx
```

Expected: FAIL because `OverlaysStudioPage` does not exist.

- [ ] **Step 3: Create the page placeholder**

Create `frontend/src/hub/pages/OverlaysStudioPage.tsx`:

```tsx
export function OverlaysStudioPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1800px] flex-col px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Overlays Studio</h1>
        <p className="mt-2 text-sm text-vantare-textMuted">
          Crea, organiza y edita tus overlays desde un único lugar.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-sleek rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold text-white">Mis perfiles</h2>
        </section>

        <section className="card-sleek rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold text-white">Recomendados por Vantare</h2>
        </section>

        <section className="card-sleek rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold text-white">Comunidad</h2>
          <p className="mt-2 text-sm text-vantare-textMuted">Próximamente</p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update topbar navigation**

In `frontend/src/hub/components/Topbar.tsx`, replace `NAV_ITEMS` with:

```tsx
const NAV_ITEMS: NavItem[] = [
  { label: 'Hub', id: 'dashboard', active: true },
  { label: 'Overlays Studio', id: 'profiles' },
  { label: 'Telemetría', id: 'telemetry' },
  { label: 'Setup', id: 'setup' },
];
```

- [ ] **Step 5: Route `profiles` to `OverlaysStudioPage`**

In `frontend/src/hub/HubApp.tsx`, add:

```tsx
import { OverlaysStudioPage } from './pages/OverlaysStudioPage';
```

Remove:

```tsx
import { ProfilesPage } from './pages/ProfilesPage';
import { PreviewPage } from './pages/PreviewPage';
```

Replace:

```tsx
type Section = 'dashboard' | 'profiles' | 'preview' | 'telemetry' | 'setup';
```

With:

```tsx
type Section = 'dashboard' | 'profiles' | 'telemetry' | 'setup';
```

Replace the `profiles` and `preview` render branches:

```tsx
{section === "profiles" && <ProfilesPage onOpenPreview={() => setSection("preview")} />}
{section === "preview" && <PreviewPage />}
```

With:

```tsx
{section === "profiles" && <OverlaysStudioPage />}
```

- [ ] **Step 6: Run focused test**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run frontend build**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/hub/components/Topbar.tsx frontend/src/hub/HubApp.tsx frontend/src/hub/pages/OverlaysStudioPage.tsx frontend/src/hub/pages/OverlaysStudioPage.test.tsx
git commit -m "feat(hub): introduce Overlays Studio shell"
```

---

## Task 2: Recommended Profiles Data

**Files:**

- Create: `frontend/src/hub/overlays/recommended-profiles.ts`
- Test: `frontend/src/hub/overlays/recommended-profiles.test.ts`

- [ ] **Step 1: Write the failing preset test**

Create `frontend/src/hub/overlays/recommended-profiles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RECOMMENDED_PROFILES, cloneRecommendedProfile } from "./recommended-profiles";

describe("recommended-profiles", () => {
  it("contains fixed read-only Vantare presets", () => {
    expect(RECOMMENDED_PROFILES.length).toBeGreaterThanOrEqual(3);
    expect(RECOMMENDED_PROFILES.every((profile) => profile.readOnly)).toBe(true);
  });

  it("only uses currently implemented widget types", () => {
    const allowed = new Set(["delta", "relative", "standings", "telemetry", "telemetry-vertical", "pedals"]);
    for (const recommended of RECOMMENDED_PROFILES) {
      for (const widget of recommended.profile.widgets) {
        expect(allowed.has(widget.type)).toBe(true);
      }
    }
  });

  it("clones a preset as an editable custom profile", () => {
    const clone = cloneRecommendedProfile(RECOMMENDED_PROFILES[0], "My Copy");

    expect(clone.name).toBe("My Copy");
    expect(clone.id?.startsWith("custom-")).toBe(true);
    expect(clone.widgets.length).toBe(RECOMMENDED_PROFILES[0].profile.widgets.length);
    expect(clone).not.toBe(RECOMMENDED_PROFILES[0].profile);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- recommended-profiles.test.ts
```

Expected: FAIL because `recommended-profiles.ts` does not exist.

- [ ] **Step 3: Implement local read-only recommended presets**

Create `frontend/src/hub/overlays/recommended-profiles.ts`:

```ts
import type { ProfileConfig } from "../../lib/profile";

export type RecommendedProfile = {
  id: string;
  name: string;
  description: string;
  tag: "racing" | "streaming" | "minimal";
  readOnly: true;
  profile: ProfileConfig;
};

export const RECOMMENDED_PROFILES: RecommendedProfile[] = [
  {
    id: "vantare-racing-basic",
    name: "Racing Básico",
    description: "Delta, relative y standings para conducir con información esencial.",
    tag: "racing",
    readOnly: true,
    profile: {
      id: "vantare-racing-basic",
      name: "Racing Básico",
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [
        { id: "delta", type: "delta", enabled: true, updateHz: 30, position: { x: 760, y: 40, w: 400, h: 48 } },
        { id: "relative", type: "relative", enabled: true, updateHz: 15, position: { x: 40, y: 600, w: 320, h: 280 } },
        { id: "standings", type: "standings", enabled: true, updateHz: 15, position: { x: 1560, y: 40, w: 340, h: 420 } },
      ],
    },
  },
  {
    id: "vantare-stream-clean",
    name: "Streamer Clean",
    description: "Layout OBS limpio con datos legibles y poco ruido visual.",
    tag: "streaming",
    readOnly: true,
    profile: {
      id: "vantare-stream-clean",
      name: "Streamer Clean",
      displayMode: "streaming",
      monitorIndex: 0,
      widgets: [
        { id: "standings", type: "standings", enabled: true, updateHz: 15, position: { x: 1450, y: 70, w: 380, h: 500 } },
        { id: "relative", type: "relative", enabled: true, updateHz: 15, position: { x: 70, y: 650, w: 360, h: 300 } },
        { id: "telemetry", type: "telemetry", enabled: true, updateHz: 30, position: { x: 760, y: 900, w: 420, h: 120 } },
      ],
    },
  },
  {
    id: "vantare-minimal-telemetry",
    name: "Minimal Telemetry",
    description: "Solo telemetría esencial para pantallas pequeñas o PCs modestos.",
    tag: "minimal",
    readOnly: true,
    profile: {
      id: "vantare-minimal-telemetry",
      name: "Minimal Telemetry",
      displayMode: "racing",
      monitorIndex: 0,
      widgets: [
        { id: "telemetry-vertical", type: "telemetry-vertical", enabled: true, updateHz: 30, position: { x: 40, y: 380, w: 140, h: 360 } },
        { id: "pedals", type: "pedals", enabled: true, updateHz: 30, position: { x: 40, y: 760, w: 180, h: 220 } },
      ],
    },
  },
];

export function cloneRecommendedProfile(profile: RecommendedProfile, name: string): ProfileConfig {
  const safeName = name.trim() || `${profile.name} Copy`;
  const slug = safeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    ...structuredClone(profile.profile),
    id: `custom-${slug || profile.id}`,
    name: safeName,
  };
}
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
pnpm --dir frontend test -- recommended-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/overlays/recommended-profiles.ts frontend/src/hub/overlays/recommended-profiles.test.ts
git commit -m "feat(hub): add Vantare recommended overlay presets"
```

---

## Task 3: Library Components

**Files:**

- Create: `frontend/src/hub/overlays/ProfileLibraryCard.tsx`
- Create: `frontend/src/hub/overlays/StudioHome.tsx`
- Test: `frontend/src/hub/overlays/StudioHome.test.tsx`

- [ ] **Step 1: Write the failing StudioHome test**

Create `frontend/src/hub/overlays/StudioHome.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudioHome } from "./StudioHome";

const profiles = [
  { id: "default-racing", file: "example-racing.json", name: "Default Racing", displayMode: "racing", widgets: 3 },
];

describe("StudioHome", () => {
  it("shows own profiles, widget studio entry, recommended profiles, and community placeholder", () => {
    render(
      <StudioHome
        profiles={profiles}
        onOpenWidgetStudio={vi.fn()}
        onOpenProfile={vi.fn()}
        onCreateProfile={vi.fn()}
        onSaveRecommended={vi.fn()}
      />,
    );

    expect(screen.getByText("Widgets")).toBeTruthy();
    expect(screen.getByText("Perfiles específicos")).toBeTruthy();
    expect(screen.getByText("Default Racing")).toBeTruthy();
    expect(screen.getByText("Recomendados por Vantare")).toBeTruthy();
    expect(screen.getByText("Comunidad")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
  });

  it("opens widget studio when Widgets is clicked", () => {
    const onOpenWidgetStudio = vi.fn();

    render(
      <StudioHome
        profiles={profiles}
        onOpenWidgetStudio={onOpenWidgetStudio}
        onOpenProfile={vi.fn()}
        onCreateProfile={vi.fn()}
        onSaveRecommended={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Abrir widgets/i }));
    expect(onOpenWidgetStudio).toHaveBeenCalled();
  });

  it("opens a specific profile when clicking its edit action", () => {
    const onOpenProfile = vi.fn();

    render(
      <StudioHome
        profiles={profiles}
        onOpenWidgetStudio={vi.fn()}
        onOpenProfile={onOpenProfile}
        onCreateProfile={vi.fn()}
        onSaveRecommended={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Default Racing/i }));
    expect(onOpenProfile).toHaveBeenCalledWith(profiles[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --dir frontend test -- StudioHome.test.tsx
```

Expected: FAIL because `StudioHome` does not exist.

- [ ] **Step 3: Create reusable card**

Create `frontend/src/hub/overlays/ProfileLibraryCard.tsx`:

```tsx
import type { ReactNode } from "react";

type ProfileLibraryCardProps = {
  title: string;
  description: string;
  meta?: string;
  actionLabel: string;
  actionAriaLabel?: string;
  onAction: () => void;
  secondaryAction?: ReactNode;
};

export function ProfileLibraryCard({
  title,
  description,
  meta,
  actionLabel,
  actionAriaLabel,
  onAction,
  secondaryAction,
}: ProfileLibraryCardProps) {
  return (
    <article className="card-sleek rounded-xl p-5">
      <div className="flex min-h-28 flex-col justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-vantare-textMuted">{description}</p>
          {meta && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-vantare-textDim">
              {meta}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={actionAriaLabel}
            onClick={onAction}
            className="btn-primary rounded-lg px-4 py-2 text-xs font-bold text-white"
          >
            {actionLabel}
          </button>
          {secondaryAction}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Create StudioHome**

Create `frontend/src/hub/overlays/StudioHome.tsx`:

```tsx
import { RECOMMENDED_PROFILES, type RecommendedProfile } from "./recommended-profiles";
import { ProfileLibraryCard } from "./ProfileLibraryCard";
import { profileLabel, type ProfileEntry } from "../state/overlay-workbench";

type StudioHomeProps = {
  profiles: ProfileEntry[];
  onOpenWidgetStudio: () => void;
  onOpenProfile: (profile: ProfileEntry) => void;
  onCreateProfile: () => void;
  onSaveRecommended: (profile: RecommendedProfile) => void;
};

export function StudioHome({
  profiles,
  onOpenWidgetStudio,
  onOpenProfile,
  onCreateProfile,
  onSaveRecommended,
}: StudioHomeProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1800px] flex-col px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Overlays Studio</h1>
          <p className="mt-2 text-sm text-vantare-textMuted">
            Gestiona widgets, perfiles propios y presets recomendados desde un único lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateProfile}
          className="btn-primary rounded-lg px-5 py-2 text-xs font-bold text-white"
        >
          Nuevo perfil
        </button>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-2xl font-semibold text-white">Mis perfiles</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <ProfileLibraryCard
            title="Widgets"
            description="Edita aspecto, comportamiento y visibilidad de los widgets disponibles."
            meta="Delta · Relative · Standings · Telemetry · Pedals"
            actionLabel="Abrir widgets"
            onAction={onOpenWidgetStudio}
          />

          <div className="card-sleek rounded-xl p-5">
            <div className="mb-4">
              <h3 className="font-display text-lg font-semibold text-white">Perfiles específicos</h3>
              <p className="mt-1 text-sm text-vantare-textMuted">
                Edita la colocación y tamaño de widgets por perfil.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {profiles.length === 0 && (
                <p className="rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-sm text-vantare-textMuted">
                  No hay perfiles propios todavía.
                </p>
              )}

              {profiles.map((profile) => {
                const label = profileLabel(profile);
                return (
                  <button
                    key={profile.file}
                    type="button"
                    aria-label={`Editar ${label}`}
                    onClick={() => onOpenProfile(profile)}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/25 px-3 py-3 text-left transition-colors hover:border-vantare-red-500/40 hover:bg-white/5"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-white">{label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-vantare-textDim">
                        {profile.displayMode} · {profile.widgets} widgets
                      </span>
                    </span>
                    <span className="text-xs font-bold text-vantare-red-400">Editar</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-2xl font-semibold text-white">Recomendados por Vantare</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {RECOMMENDED_PROFILES.map((profile) => (
            <ProfileLibraryCard
              key={profile.id}
              title={profile.name}
              description={profile.description}
              meta={`${profile.tag} · preset fijo`}
              actionLabel="Guardar como propio"
              actionAriaLabel={`Guardar ${profile.name} como perfil propio`}
              onAction={() => onSaveRecommended(profile)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold text-white">Comunidad</h2>
        <div className="card-sleek rounded-xl p-6">
          <p className="font-display text-xl font-semibold text-white">Próximamente</p>
          <p className="mt-2 text-sm text-vantare-textMuted">
            Más adelante podrás descubrir overlays compartidos por la comunidad.
          </p>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
pnpm --dir frontend test -- StudioHome.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/hub/overlays/ProfileLibraryCard.tsx frontend/src/hub/overlays/StudioHome.tsx frontend/src/hub/overlays/StudioHome.test.tsx
git commit -m "feat(hub): build Overlays Studio library sections"
```

---

## Task 4: Wire Library to Wails Profile List

**Files:**

- Modify: `frontend/src/hub/pages/OverlaysStudioPage.tsx`
- Test: `frontend/src/hub/pages/OverlaysStudioPage.test.tsx`

- [ ] **Step 1: Replace placeholder with Wails-backed library**

Replace `frontend/src/hub/pages/OverlaysStudioPage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { Events } from "@wailsio/runtime";
import { StudioHome } from "../overlays/StudioHome";
import type { RecommendedProfile } from "../overlays/recommended-profiles";
import type { ProfileEntry } from "../state/overlay-workbench";

export function OverlaysStudioPage() {
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubProfiles = Events.On("hub:profiles", (event: { data: unknown }) => {
      const data = event.data as { profiles?: ProfileEntry[] };
      setProfiles(data.profiles ?? []);
      setLoading(false);
    });

    const unsubCreated = Events.On("hub:profile-created", () => {
      setError(null);
      Events.Emit("hub:list");
    });

    const unsubError = Events.On("hub:error", (event: { data: unknown }) => {
      const data = event.data as { message?: string };
      setError(data?.message ?? "Error del hub");
      setLoading(false);
    });

    Events.Emit("hub:list");

    return () => {
      unsubProfiles();
      unsubCreated();
      unsubError();
    };
  }, []);

  function createProfile() {
    const name = window.prompt("Nombre del nuevo perfil");
    if (!name?.trim()) return;
    Events.Emit("hub:create", { name: name.trim() });
  }

  function openWidgetStudio() {
    setError("El editor de widgets se implementará en el siguiente miniplan.");
  }

  function openProfile(_profile: ProfileEntry) {
    setError("El editor de perfiles específicos se implementará en el siguiente miniplan.");
  }

  function saveRecommended(_profile: RecommendedProfile) {
    setError("Guardar recomendados como perfil propio se implementará en un miniplan posterior.");
  }

  return (
    <>
      {error && (
        <div className="mx-auto mt-4 max-w-[1800px] px-6">
          <div className="rounded-lg border border-vantare-red-500/30 bg-vantare-red-950/20 px-4 py-3 text-sm text-vantare-red-300">
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-vantare-textMuted">
          Cargando Overlays Studio...
        </div>
      ) : (
        <StudioHome
          profiles={profiles}
          onOpenWidgetStudio={openWidgetStudio}
          onOpenProfile={openProfile}
          onCreateProfile={createProfile}
          onSaveRecommended={saveRecommended}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update OverlaysStudioPage test for async Wails data**

Replace `frontend/src/hub/pages/OverlaysStudioPage.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Events } from "@wailsio/runtime";
import { OverlaysStudioPage } from "./OverlaysStudioPage";

const listeners = new Map<string, (event: { data: unknown }) => void>();

vi.mock("@wailsio/runtime", () => ({
  Events: {
    On: vi.fn((name: string, cb: (event: { data: unknown }) => void) => {
      listeners.set(name, cb);
      return vi.fn();
    }),
    Emit: vi.fn(),
  },
}));

describe("OverlaysStudioPage", () => {
  beforeEach(() => {
    listeners.clear();
    vi.clearAllMocks();
  });

  it("requests profiles on mount", () => {
    render(<OverlaysStudioPage />);
    expect(Events.Emit).toHaveBeenCalledWith("hub:list");
  });

  it("renders the Overlays Studio library shell after profiles load", async () => {
    render(<OverlaysStudioPage />);

    listeners.get("hub:profiles")?.({
      data: {
        profiles: [
          { id: "default-racing", file: "example-racing.json", name: "Default Racing", displayMode: "racing", widgets: 3 },
        ],
      },
    });

    expect(await screen.findByRole("heading", { name: "Overlays Studio" })).toBeTruthy();
    expect(screen.getByText("Mis perfiles")).toBeTruthy();
    expect(screen.getByText("Recomendados por Vantare")).toBeTruthy();
    expect(screen.getByText("Comunidad")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
    expect(screen.getByText("Default Racing")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run focused tests**

Run:

```powershell
pnpm --dir frontend test -- OverlaysStudioPage.test.tsx StudioHome.test.tsx recommended-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run frontend build**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/hub/pages/OverlaysStudioPage.tsx frontend/src/hub/pages/OverlaysStudioPage.test.tsx
git commit -m "feat(hub): wire Overlays Studio library to profile list"
```

---

## Task 5: Verification

**Files:**

- No code changes unless verification fails.

- [ ] **Step 1: Run full frontend tests**

Run:

```powershell
pnpm --dir frontend test
```

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
pnpm --dir frontend build
```

Expected: PASS.

- [ ] **Step 3: Run Go tests**

Run:

```powershell
go test ./...
```

Expected: PASS.

- [ ] **Step 4: Manual smoke in mock mode**

Run:

```powershell
go run ./cmd/vantare -profile configs/example-racing.json
```

Expected:

- Hub opens first.
- Topbar shows `Hub`, `Overlays Studio`, `Telemetría`, `Setup`.
- Topbar does not show `Preview`.
- Clicking `Overlays Studio` opens the library screen.
- `Mis perfiles` appears.
- Existing profiles appear under `Perfiles específicos`.
- `Widgets` entry appears.
- `Recomendados por Vantare` shows fixed cards.
- `Comunidad` shows `Próximamente`.
- Clicking `Widgets`, `Editar perfil`, or `Guardar como propio` shows a controlled message, not a broken route.

- [ ] **Step 5: Record evidence**

Create evidence file:

`../.omo/evidence/2026-06-18-overlays-studio-miniplan-1.md`

Content:

```md
# Overlays Studio Miniplan 1 Verification

- pnpm --dir frontend test: PASS
- pnpm --dir frontend build: PASS
- go test ./...: PASS
- Manual mock smoke: PASS

Validated:
- Topbar shows Overlays Studio.
- Preview tab is no longer visible.
- Library renders Mis perfiles, Recomendados por Vantare, and Comunidad Próximamente.
- Existing profiles are listed.
- Recomendados are visible as read-only presets.
```

- [ ] **Step 6: Commit evidence**

```powershell
git add ../.omo/evidence/2026-06-18-overlays-studio-miniplan-1.md
git commit -m "test: verify Overlays Studio library miniplan"
```

---

## Acceptance Criteria

- `Overlays Studio` replaces the visible `Overlays` + `Preview` navigation.
- App still opens on `Hub`.
- `Preview` is no longer visible in the topbar.
- `Overlays Studio` displays a library with:
  - `Mis perfiles`.
  - `Widgets`.
  - `Perfiles específicos`.
  - `Recomendados por Vantare`.
  - `Comunidad` with `Próximamente`.
- Existing local profiles are listed using current `hub:list` / `hub:profiles`.
- Recommended profiles are local read-only presets and only use existing widget types.
- No backend changes are required in this miniplan.
- Full frontend tests, frontend build, and Go tests pass.

---

## Self-Review

**Spec coverage:**

- Navigation change: Task 1.
- Library state: Tasks 3 and 4.
- Recommended fixed overlays: Task 2.
- Community as `Próximamente`: Task 3.
- No editor implementation yet: explicitly out of scope and guarded by controlled messages.
- Tests and verification: Tasks 1-5.

**Placeholder scan:** No `TBD`, `TODO`, or vague implementation steps remain. Deferred editor flows are explicit out-of-scope items for later miniplans.

**Type consistency:** Uses existing `ProfileEntry`, `ProfileConfig`, Wails `Events`, and current `hub:list` / `hub:profiles` event names.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-overlays-studio-miniplan-1-navigation-library.md`.

Execute this miniplan before starting Widget Studio or Profile Layout Studio. After this passes, create Miniplan 2 for `Mis perfiles > Widgets`.
