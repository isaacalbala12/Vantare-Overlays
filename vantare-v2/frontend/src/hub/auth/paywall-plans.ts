export type Plan = {
  key: string;
  name: string;
  price: string;
  features: string[];
};

export const PAYWALL_PLANS: Plan[] = [
  {
    key: "beta_access",
    name: "Beta Access",
    price: "5 EUR/mes",
    features: ["Overlays", "Engineer"],
  },
  {
    key: "founder",
    name: "Founder",
    price: "20 EUR/mes",
    features: ["Todo Beta Access", "AC Lua Pack"],
  },
];