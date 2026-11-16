import { ROLES, ROLE_ASSUMPTIONS, SIM_DEFAULTS, type MarketplaceProfile } from "./assumptions";
import type { Guardrails, Metrics, Policy } from "./sim";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const usd = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const signedUsd = (x: number) => `${x >= 0 ? "+" : "-"}${usd(Math.abs(x))}`;
const pts = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)} pts`;

function policyLine(p: Policy) {
  return ROLES.map((r) => `${ROLE_ASSUMPTIONS[r].label} ${p[r].internalWindowH}h internal / ${p[r].networkWindowH}h network`).join("; ");
}

export function leadershipMemo(args: {
  profile: MarketplaceProfile;
  guardrails: Guardrails;
  baselinePolicy: Policy;
  baseline: Metrics;
  recommendedPolicy: Policy;
  recommended: Metrics;
  currentPolicy: Policy;
  current: Metrics;
}) {
  const { profile, guardrails, baseline: b, recommended: r, current: c } = args;
  const weeks = SIM_DEFAULTS.weeks;
  const option = (name: string, p: Policy, m: Metrics) =>
    `- ${name}: ${policyLine(p)}\n  Fill ${pct(m.fillRate)} (${pts(m.fillRate - b.fillRate)}), late fills ${pct(m.lateFillShare)} (${pts(m.lateFillShare - b.lateFillShare)}), internal share ${pct(m.internalShare)}, temp spend ${signedUsd(m.tempSpend - b.tempSpend)}, total cost ${signedUsd(m.totalCost - b.totalCost)} over ${weeks} weeks.`;

  return `Cascade release windows: ${profile.label}
(Synthetic data. Directional only until re-run on real shift history.)

Decision needed: how long open shifts stay internal-only before release to the marketplace, and then to vendors.

Options
- A. Keep today's default: ${policyLine(args.baselinePolicy)}
  Fill ${pct(b.fillRate)}, late fills ${pct(b.lateFillShare)}, internal share ${pct(b.internalShare)}, temp spend ${usd(b.tempSpend)}.
${option("B. Recommended (per role)", args.recommendedPolicy, r)}
${JSON.stringify(args.currentPolicy) === JSON.stringify(args.baselinePolicy) || JSON.stringify(args.currentPolicy) === JSON.stringify(args.recommendedPolicy) ? "" : option("C. Current slider setting", args.currentPolicy, c) + "\n"}
Guardrails used: fill rate no more than ${guardrails.fillRateTolerancePts} pts below today; at most ${pct(guardrails.maxLateFillShare)} of fills with <24h notice.

Recommendation: B. ${r.totalCost <= b.totalCost ? "It lowers total cost (labor + temp spend + lost production)," : "It costs more in temp spend but"} keeps fill rate inside the guardrail and ${r.lateFillShare < b.lateFillShare ? "cuts late fills, the thing office managers feel most" : "holds late fills under the cap"}.

Fastest test: 4-week A/B by office cluster (half on A, half on B). Primary metric: total staffing cost per scheduled chair-hour. Guardrails: fill rate, late-fill share, internal-staff opt-out rate. Decide at week 4: scale, iterate on windows, or stop.`;
}
