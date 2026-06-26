import { useCallback } from "react";
import { PAYWALL_PLANS } from "./paywall-plans";

type PaywallScreenProps = {
  email: string;
};

export function PaywallScreen({ email }: PaywallScreenProps) {
  const handleSubscribe = useCallback(
    (planKey: string) => {
      // Mini-Plan C v1 opens Stripe Checkout in external browser. The actual
      // URL will be provided by backend/settings in the follow-up that wires
      // the Stripe customer/portal flow. We log here so QA can verify the
      // plan selection before the checkout integration lands.
      console.log("subscribe", planKey, email);
    },
    [email],
  );

  return (
    <div
      data-testid="paywall-screen"
      className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 text-white"
    >
      <h1 className="mb-2 font-mono text-sm uppercase tracking-widest">
        Elige tu plan
      </h1>
      <p className="mb-6 font-mono text-[10px] text-vantare-textDim">
        Sesión iniciada como <span className="text-white">{email}</span>
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {PAYWALL_PLANS.map((plan) => (
          <div
            key={plan.key}
            className="w-64 rounded-lg border border-white/10 bg-[#111] p-4"
          >
            <h2 className="font-mono text-xs uppercase">{plan.name}</h2>
            <p className="font-mono text-[10px] text-vantare-textDim">
              {plan.price}
            </p>
            <ul className="my-3 space-y-1">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="font-mono text-[10px] text-vantare-textMuted"
                >
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleSubscribe(plan.key)}
              className="w-full rounded border border-white/20 py-1.5 font-mono text-[10px] uppercase hover:bg-white/5"
            >
              Suscribirse
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}