import { useEffect, useState } from 'react';
import { Events } from '@wailsio/runtime';

type UpdateNotify = {
  tag: string;
  name: string;
  prerelease: boolean;
  downloadURL: string;
};

export function UpdateBanner() {
  const [notify, setNotify] = useState<UpdateNotify | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = Events.On('updater:notify', (event: { data: UpdateNotify }) => {
      setNotify(event.data);
      setDismissed(false);
    });
    return () => unsub?.();
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (notify) {
      Events.Emit('updater:ignore', { version: notify.tag });
    }
  }

  if (!notify || dismissed) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-vantare-red-900/90 to-vantare-burgundy/90 border-b border-vantare-red-500/30 px-6 py-2">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        <div className="text-sm text-white">
          Nueva versión disponible: <span className="font-semibold">{notify.tag}</span>
          {notify.prerelease && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-white/10">
              Pre-release
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={notify.downloadURL}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            Descargar
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1 rounded-lg text-xs text-white/70 hover:text-white transition-colors"
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}
