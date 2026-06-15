export function HeroSection() {
  return (
    <section className="relative h-[300px] flex flex-col items-center justify-center">
      <div className="lite-expensive absolute top-1/2 left-1/4 w-[400px] h-[200px] bg-vantare-red-600/20 blur-[100px] rounded-full transform -translate-y-1/2 pointer-events-none z-0" />
      <div className="lite-expensive absolute top-1/2 right-1/4 w-[500px] h-[250px] bg-vantare-red-900/30 blur-[120px] rounded-full transform -translate-y-1/2 pointer-events-none z-0" />
      <div className="lite-expensive absolute bottom-[-100px] left-1/2 w-3/4 h-[300px] bg-gradient-to-t from-vantare-red-500/10 to-transparent blur-[80px] transform -translate-x-1/2 pointer-events-none z-0" />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)",
          WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
        }}
      />

      <h1 className="font-display font-bold hero-text-huge pl-6 relative z-10 mb-5 mt-4">VANTARE</h1>

      <div className="lite-glass-lite relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-6 md:px-10 py-4 flex flex-col md:flex-row items-center gap-4 md:gap-10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vantare-red-900 to-black border border-vantare-red-500/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-white tracking-wide">
              PORSCHE 963 <span className="text-vantare-red-500">LMDh</span>
            </h2>
            <p className="text-xs font-medium text-vantare-textMuted mt-0.5">Simulador Conectado: LMU</p>
          </div>
        </div>

        <div className="hidden md:block w-px h-8 bg-white/10" />

        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <span className="text-[10px] text-vantare-textMuted uppercase tracking-wider mb-0.5 font-medium">Circuito Actual</span>
            <span className="text-sm font-medium text-white flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-vantare-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Circuit de la Sarthe
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-vantare-textMuted uppercase tracking-wider mb-0.5 font-medium">Sesión</span>
            <span className="text-sm font-medium text-white border border-white/20 px-2 py-0.5 rounded bg-white/5">
              Práctica Libre
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
