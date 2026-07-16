import { UpgradeButton } from "./widgets/UpgradeButton";

type Props = {
  placeId: string;
  tier: "free" | "basic" | "pro";
  subscriptionExpiresAt: string | null;
};

export function BillingCard({ placeId, tier, subscriptionExpiresAt }: Props) {
  const isActiveSubscription =
    tier !== "free" && subscriptionExpiresAt != null && new Date(subscriptionExpiresAt) > new Date();

  return (
    <div id="billing" className="scroll-mt-28 rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Billing</h2>

      <div className="mb-5 overflow-hidden rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60">
              <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">Feature</th>
              <th className="px-3 py-2 text-center font-semibold text-[color:var(--brand-primary)]">Basic</th>
              <th className="px-3 py-2 text-center font-semibold text-[color:var(--brand-primary)]">Pro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(
              [
                ["Claimed profile and flavour board", "Yes", "Yes"],
                ["Visit analytics", "Basic", "Full"],
                ["Loyalty stamp system", "No", "Yes"],
                ["Featured placement in discovery map", "No", "Yes"],
                ["Review responses", "No", "Yes"],
              ] as const
            ).map(([feature, basic, pro]) => (
              <tr key={feature} className="bg-white dark:bg-zinc-900">
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{feature}</td>
                <td className="px-3 py-2 text-center text-zinc-500 dark:text-zinc-400">{basic}</td>
                <td className="px-3 py-2 text-center text-zinc-500 dark:text-zinc-400">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tier !== "basic" && tier !== "pro" && (
        <UpgradeButton placeId={placeId} tier="basic" label="Upgrade to Salon Basic — €9/mo" className="w-full py-3" />
      )}
      {tier !== "pro" && (
        <UpgradeButton placeId={placeId} tier="pro" label="Upgrade to Salon Pro — €29/mo" className="mt-2 w-full py-3" />
      )}

      {isActiveSubscription && subscriptionExpiresAt && (
        <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Renews {new Date(subscriptionExpiresAt).toLocaleDateString("en-GB")}
        </p>
      )}
    </div>
  );
}
