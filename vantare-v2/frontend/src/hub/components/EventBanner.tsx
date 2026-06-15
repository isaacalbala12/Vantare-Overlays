export function EventBanner() {
  return (
    <div className="w-full mb-6">
      <div className="glass-panel rounded-xl overflow-hidden relative group border border-vantare-red-900/30 hover:border-vantare-red-500/50 transition-colors shadow-2xl shadow-black/50">
        <div className="absolute inset-0 bg-gradient-to-r from-vantare-red-950/40 via-vantare-bg/80 to-vantare-bg/80 pointer-events-none" />
        <div className="lite-expensive absolute -right-20 top-0 w-64 h-64 bg-vantare-red-500/10 blur-3xl rounded-full group-hover:bg-vantare-red-400/20 transition-all pointer-events-none" />

        <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="w-16 h-16 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
              <svg className="w-8 h-8 text-vantare-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] bg-vantare-red-950 text-vantare-red-400 border border-vantare-red-900/50 font-bold uppercase px-2 py-0.5 rounded tracking-widest mb-2 inline-block shadow-lg">
                Próximo Evento Especial
              </span>
              <h2 className="font-display font-bold text-3xl text-white">24h de Le Mans Virtual</h2>
              <p className="text-sm text-vantare-textMuted mt-1">Circuit de la Sarthe · Resistencia · Configuración Seca</p>
            </div>
          </div>

          <div className="lite-glass-lite bg-black/40 rounded-xl px-6 py-3 border border-white/5 flex gap-4 md:gap-8 justify-center shrink-0 backdrop-blur-md">
            <div className="text-center">
              <p className="font-display font-bold text-3xl text-white">03</p>
              <p className="text-[9px] text-vantare-textMuted uppercase font-semibold">Días</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-3xl text-white">14</p>
              <p className="text-[9px] text-vantare-textMuted uppercase font-semibold">Horas</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-3xl text-vantare-red-400">22</p>
              <p className="text-[9px] text-vantare-red-400/70 uppercase font-semibold">Min</p>
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0 flex gap-4">
            <button
              type="button"
              className="w-full md:w-auto btn-primary px-8 py-3 rounded-lg font-bold text-sm text-white shadow-lg shadow-vantare-red-900/20 whitespace-nowrap"
            >
              Gestionar Inscripción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
