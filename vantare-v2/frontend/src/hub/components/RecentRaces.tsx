export function RecentRaces() {
  const races = [
    {
      flag: "🇫🇷",
      name: "Le Mans 24h",
      car: "Porsche 963",
      time: "Hace 2 días",
      sof: "2847",
      position: "P4",
      sr: "+0.28",
      srColor: "text-emerald-400",
      borderColor: "bg-vantare-red-500",
      borderGlow: "#C1121F",
    },
    {
      flag: "🇧🇪",
      name: "Spa 6h Endurance",
      car: "Cadillac V-Series",
      time: "Hace 5 días",
      sof: "3124",
      position: "P2",
      sr: "+0.45",
      srColor: "text-emerald-400",
      borderColor: "bg-emerald-500",
      borderGlow: "#10B981",
    },
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-4 mt-2">
        <h2 className="font-display font-semibold text-lg tracking-wide text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-vantare-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          CARRERAS RECIENTES
        </h2>
        <a href="#" className="text-xs text-vantare-red-400 hover:text-vantare-red-300 font-medium transition-colors">
          Ver historial completo →
        </a>
      </div>

      <div className="flex flex-col gap-3">
        {races.map((race, idx) => (
          <div
            key={idx}
            className="card-sleek rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group cursor-pointer"
          >
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${race.borderColor}`}
              style={{ boxShadow: `0 0 10px ${race.borderGlow}` }}
            />
            <div className="flex items-center gap-4 z-10 w-full md:w-1/3">
              <div className="w-12 h-12 rounded-lg bg-black/60 border border-white/5 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg">{race.flag}</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg group-hover:text-vantare-red-200 transition-colors">
                  {race.name}
                </h3>
                <p className="text-xs text-vantare-textMuted font-mono mt-1">
                  {race.car} · {race.time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 z-10 w-full md:w-2/3 justify-between md:justify-end">
              <div className="text-center md:text-right hidden sm:block">
                <p className="text-[10px] text-vantare-textMuted uppercase mb-1">SOF</p>
                <p className="font-display font-semibold text-white">{race.sof}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[10px] text-vantare-textMuted uppercase mb-1">Posición</p>
                <p className="font-display font-bold text-lg text-white">{race.position}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[10px] text-vantare-textMuted uppercase mb-1">SR</p>
                <p className={`font-mono font-bold ${race.srColor}`}>{race.sr}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
