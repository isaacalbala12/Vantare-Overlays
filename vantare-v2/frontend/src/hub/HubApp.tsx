import { useState, useEffect, useCallback } from "react";
import { Topbar } from "./components/Topbar";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilesPage } from "./pages/ProfilesPage";

type Section = "dashboard" | "profiles" | "telemetry" | "setup";

export function HubApp() {
  const [section, setSection] = useState<Section>("dashboard");

  useEffect(() => {
    document.body.classList.add("hub");
    return () => document.body.classList.remove("hub");
  }, []);

  const handleNavigate = useCallback((id: string) => {
    setSection(id as Section);
  }, []);

  return (
    <div className="min-h-screen premium-bg relative">
      <Topbar activeSection={section} onNavigate={handleNavigate} />

      <main className="pt-14">
        {section === "dashboard" && <DashboardPage />}
        {section === "profiles" && <ProfilesPage />}
        {(section === "telemetry" || section === "setup") && (
          <div className="flex items-center justify-center h-[60vh] text-vantare-textMuted text-sm font-mono">
            {section === "telemetry" ? "Telemetría — próxima actualización" : "Setup — próxima actualización"}
          </div>
        )}
      </main>
    </div>
  );
}
