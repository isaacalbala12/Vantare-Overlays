import { useCallback, useMemo } from "react";
import { signOut, getSession } from "../../lib/supabase-auth";
import { useLicense } from "../../lib/license";
import { Events } from "@wailsio/runtime";
import {
  buildSummary,
  PLAN_LABELS,
  PLAN_STATUS_LABELS,
  sortedEntitlements,
} from "../../lib/plan";

const STATUS_TONE: Record<string, string> = {
  active: "text-vantare-success",
  grace: "text-vantare-warning",
  blocked: "text-vantare-red-400",
  free: "text-vantare-textDim",
  anonymous: "text-vantare-textDim",
};

export function AccountSettings() {
  const { result, refresh } = useLicense();

  const handleLogout = useCallback(async () => {
    await signOut();
    refresh();
  }, [refresh]);

  const handleResetDevice = useCallback(async () => {
    try {
      const session = await getSession();
      const token = session?.access_token ?? "";
      Events.Emit("license:reset-device", { sessionToken: token });
    } catch (err) {
      console.error("Error retrieving session for reset-device:", err);
    }
  }, []);

  const summary = useMemo(
    () =>
      buildSummary(result?.state ?? null, result?.entitlements ?? []),
    [result?.state, result?.entitlements],
  );

  const entitlements = useMemo(
    () => sortedEntitlements(result?.entitlements ?? []),
    [result?.entitlements],
  );

  const statusLabel = PLAN_STATUS_LABELS[summary.status];
  const statusTone = STATUS_TONE[summary.status] ?? "text-vantare-textDim";

  return (
    <section className="space-y-4 text-white" aria-label="account-settings">
      <h2 className="font-mono text-xs uppercase tracking-widest">Cuenta</h2>
      <div className="rounded border border-white/10 bg-[#111] p-3">
        <p className="font-mono text-[10px] text-vantare-textDim">Email</p>
        <p className="font-mono text-xs">{result?.email ?? "—"}</p>
      </div>
      <div className="rounded border border-white/10 bg-[#111] p-3">
        <p className="font-mono text-[10px] text-vantare-textDim">Plan</p>
        <p
          data-testid="account-plan"
          className="font-mono text-xs uppercase"
        >
          {PLAN_LABELS[summary.label]}
        </p>
      </div>
      <div className="rounded border border-white/10 bg-[#111] p-3">
        <p className="font-mono text-[10px] text-vantare-textDim">Estado</p>
        <p
          data-testid="account-status"
          className={`font-mono text-xs uppercase ${statusTone}`}
        >
          {statusLabel}
        </p>
        {summary.status === "grace" && result?.graceEndsAt ? (
          <p className="mt-1 font-mono text-[10px] text-vantare-warning">
            Gracia hasta {new Date(result.graceEndsAt).toLocaleString()}
          </p>
        ) : null}
        {summary.status === "blocked" ? (
          <p className="mt-1 font-mono text-[10px] text-vantare-red-400">
            Suscripción bloqueada. Usa Restablecer PC si es límite de
            dispositivo o renueva desde el portal externo.
          </p>
        ) : null}
        {result?.error ? (
          <p className="mt-1 font-mono text-[10px] text-vantare-textDim">
            Último error: {result.error}
          </p>
        ) : null}
      </div>
      <div className="rounded border border-white/10 bg-[#111] p-3">
        <p className="font-mono text-[10px] text-vantare-textDim">
          Entitlements
        </p>
        {entitlements.length > 0 ? (
          <ul className="space-y-1">
            {entitlements.map((e) => (
              <li
                key={e}
                className="font-mono text-xs uppercase"
                data-testid={`account-entitlement-${e}`}
              >
                {e}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-xs text-vantare-textDim">—</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleResetDevice}
          className="rounded border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 font-mono text-[10px] uppercase text-red-400"
        >
          Restablecer PC
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase hover:bg-white/5"
        >
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}