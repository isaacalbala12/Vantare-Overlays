import { useAccountStatus } from '../../hooks/useAccountStatus';

const TIER_STYLES: Record<string, string> = {
  free: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  pro: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30',
  ultimate: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
};

export default function AccountPanel() {
  const { user, tier, isValid, loadSession } = useAccountStatus();

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-text-muted)]">Sign in to sync your setup</p>
        <button
          onClick={(e) => { e.preventDefault(); loadSession(); }}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/30 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-text)] font-medium truncate">{user.email}</p>

      <div className="flex items-center gap-2">
        {/* Plan badge */}
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${TIER_STYLES[tier] || TIER_STYLES.free}`}>
          {tier}
        </span>

        {/* License status */}
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
          isValid
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {isValid ? 'Active' : 'Expired'}
        </span>
      </div>

      <p className="text-[10px] text-[var(--color-text-muted)]">Manage account →</p>
    </div>
  );
}
