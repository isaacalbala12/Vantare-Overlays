export function RatingsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Driver Rating */}
      <section className="glass-panel rounded-xl overflow-hidden relative group border border-amber-900/30 hover:border-amber-700/50 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-transparent to-transparent opacity-80 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-semibold text-sm tracking-[0.15em] text-vantare-textMuted uppercase">
              Nivel de Piloto
            </h2>
            <span className="rating-badge-gold text-[10px] font-bold px-2 py-0.5 rounded tracking-wider shadow-[0_0_10px_rgba(255,215,0,0.3)]">
              ORO
            </span>
          </div>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-6xl font-display font-bold text-white drop-shadow-md">B1</span>
            <div className="flex flex-col pb-2">
              <span className="text-sm font-semibold text-amber-500">Top 12%</span>
              <span className="text-xs text-vantare-textMuted">Rango Global</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-vantare-textMuted font-medium">
              <span>Progreso a A3</span>
              <span className="text-white">85%</span>
            </div>
            <div className="h-2 bg-vantare-bg rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-amber-700 to-amber-400 rounded-full" style={{ width: "85%", boxShadow: "0 0 10px rgba(255,191,0,0.5)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Safety Rating */}
      <section className="glass-panel rounded-xl overflow-hidden relative group border border-emerald-900/30 hover:border-emerald-700/50 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-transparent to-transparent opacity-80 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-semibold text-sm tracking-[0.15em] text-vantare-textMuted uppercase">
              Nivel de Seguridad
            </h2>
            <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              SEGURO
            </span>
          </div>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-6xl font-display font-bold text-white drop-shadow-md">S</span>
            <div className="flex flex-col pb-2">
              <span className="text-sm font-semibold text-emerald-500">4.99</span>
              <span className="text-xs text-vantare-textMuted">Puntos SR</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-vantare-textMuted font-medium">
              <span>Carreras limpias (Racha)</span>
              <span className="text-white">12 Carreras</span>
            </div>
            <div className="h-2 bg-vantare-bg rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full" style={{ width: "98%", boxShadow: "0 0 10px rgba(52,211,153,0.5)" }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
