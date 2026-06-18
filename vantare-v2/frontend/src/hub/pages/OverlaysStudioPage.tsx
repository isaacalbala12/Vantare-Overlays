import { useState } from "react";
import { Events } from "@wailsio/runtime";
import { StudioHome } from "../overlays/StudioHome";
import { WidgetStudio } from "../overlays/WidgetStudio";
import { useOverlayStudioState } from "../overlays/useOverlayStudioState";
import type { RecommendedProfile } from "../overlays/recommended-profiles";
import type { ProfileEntry } from "../state/overlay-workbench";

type StudioMode = "home" | "widgets";

export function OverlaysStudioPage() {
  const studio = useOverlayStudioState();
  const [mode, setMode] = useState<StudioMode>("home");
  const [notice, setNotice] = useState<string | null>(null);

  function createProfile() {
    const name = window.prompt("Nombre del nuevo perfil");
    if (!name?.trim()) return;
    Events.Emit("hub:create", { name: name.trim() });
  }

  function openWidgetStudio() {
    setNotice(null);
    setMode("widgets");
  }

  function openProfile(_profile: ProfileEntry) {
    setNotice("El editor de perfiles específicos se implementará en el siguiente miniplan.");
  }

  function saveRecommended(_profile: RecommendedProfile) {
    setNotice("Guardar recomendados como perfil propio se implementará en un miniplan posterior.");
  }

  if (mode === "widgets") {
    if (!studio.profile) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1200px] flex-col px-6 py-8">
          <button
            type="button"
            className="mb-4 w-fit text-xs font-bold uppercase tracking-wider text-vantare-textMuted hover:text-white cursor-pointer"
            onClick={() => setMode("home")}
          >
            ← Volver a Overlays Studio
          </button>
          <div className="glass-panel rounded-xl p-8 text-sm text-vantare-textMuted">
            Selecciona o crea un perfil para editar widgets.
          </div>
        </div>
      );
    }

    return (
      <WidgetStudio
        profile={studio.profile}
        selectedWidgetId={studio.selectedWidgetId}
        dirty={studio.dirty}
        saveState={studio.saveState}
        onSelectWidget={studio.setSelectedWidgetId}
        onChangeProfile={studio.updateDraft}
        onSave={studio.saveProfile}
        onBack={() => setMode("home")}
      />
    );
  }

  return (
    <>
      {(notice || studio.lastError) && (
        <div className="mx-auto mt-4 max-w-[1800px] px-6">
          <div className="rounded-lg border border-vantare-red-500/30 bg-vantare-red-950/20 px-4 py-3 text-sm text-vantare-red-300">
            {notice || studio.lastError}
          </div>
        </div>
      )}

      <StudioHome
        profiles={studio.profiles}
        onOpenWidgetStudio={openWidgetStudio}
        onOpenProfile={openProfile}
        onCreateProfile={createProfile}
        onSaveRecommended={saveRecommended}
      />
    </>
  );
}
