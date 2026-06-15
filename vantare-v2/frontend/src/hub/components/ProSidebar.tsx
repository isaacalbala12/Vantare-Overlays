export function ProSidebar() {
  return (
    <>
      {/* Vantare Pro Promo */}
      <div className="lite-motion relative rounded-xl overflow-hidden group cursor-pointer border border-vantare-red-900/50 hover:border-vantare-red-500/50 transition-all hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-vantare-red-900/60 via-vantare-burgundy/40 to-vantare-bg" />
        <div className="lite-expensive absolute right-0 top-0 w-32 h-32 bg-vantare-red-500/20 blur-3xl rounded-full group-hover:bg-vantare-red-400/30 transition-all" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="pro-badge">PRO</span>
            <span className="text-xs text-vantare-red-300 font-semibold bg-vantare-red-950/50 px-2 py-1 rounded-full border border-vantare-red-900/30">
              -50% Lanzamiento
            </span>
          </div>
          <h3 className="font-display font-bold text-2xl text-white mb-2">Vantare Pro</h3>
          <p className="text-sm text-vantare-textMuted mb-6">
            Desbloquea overlays avanzados, telemetría en tiempo real y análisis de stint con IA.
          </p>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-display font-bold text-white">4.99€</span>
            <span className="text-sm text-vantare-textMuted line-through">9.99€</span>
            <span className="text-xs text-vantare-textMuted">/mes</span>
          </div>
          <button
            type="button"
            className="w-full btn-primary py-3 rounded-lg font-semibold text-sm text-white shadow-lg shadow-vantare-red-900/20"
          >
            Actualizar a Pro
          </button>
        </div>
      </div>

      {/* Vantare Ecosystem */}
      <div className="glass-panel rounded-xl p-6 border border-white/5 relative overflow-hidden flex-1">
        <div className="lite-expensive absolute top-0 right-0 w-40 h-40 bg-vantare-wine/10 blur-3xl rounded-full pointer-events-none" />
        <h3 className="font-display font-semibold text-lg text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-vantare-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Ecosistema Vantare
        </h3>
        <div className="space-y-4">
          <div className="lite-motion group flex flex-col gap-3 p-4 rounded-xl bg-vantare-surface border border-white/5 hover:border-vantare-red-900/50 hover:bg-gradient-to-br hover:from-vantare-surface hover:to-vantare-red-950/20 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="lite-motion w-10 h-10 rounded-lg bg-gradient-to-br from-vantare-red-700 to-vantare-burgundy flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-vantare-red-100 transition-colors">
                  Vantare Ingeniero
                </h4>
                <p className="text-[10px] text-vantare-textMuted uppercase tracking-wider">Control de setup &amp; pitstops</p>
              </div>
            </div>
          </div>
          <div className="lite-motion group flex flex-col gap-3 p-4 rounded-xl bg-vantare-surface border border-white/5 hover:border-indigo-900/50 hover:bg-gradient-to-br hover:from-vantare-surface hover:to-indigo-950/20 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="lite-motion w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-vantare-bg flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
                  Vantare Telemetría
                </h4>
                <p className="text-[10px] text-vantare-textMuted uppercase tracking-wider">Análisis de stints avanzado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
