import {
  LEAD_TIME_BUCKETS,
  PROFILES,
  ROLES,
  ROLE_ASSUMPTIONS,
  SIM_DEFAULTS,
  type MarketplaceProfile,
  type ProfileId,
  type Role,
} from "./assumptions";

// ---------- deterministic RNG ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- synthetic shifts ----------
export interface Shift {
  id: number;
  officeId: number;
  role: Role;
  leadTimeH: number; // hours between posting and shift start
  // Common random numbers: every policy sees the same draws, so comparisons are paired.
  u: { internal: number; internalAvail: number; network: number; networkAvail: number; vendor: number; vendorAvail: number };
}

export function generateShifts(profile: MarketplaceProfile, seed = SIM_DEFAULTS.seed): Shift[] {
  const rng = mulberry32(seed);
  const n = profile.offices * SIM_DEFAULTS.weeks * SIM_DEFAULTS.shiftsPerOfficePerWeek;
  const shifts: Shift[] = [];
  for (let i = 0; i < n; i++) {
    const rRole = rng();
    let acc = 0;
    let role: Role = "hygienist";
    for (const r of ROLES) {
      acc += ROLE_ASSUMPTIONS[r].shareOfShifts;
      if (rRole <= acc) {
        role = r;
        break;
      }
    }
    const rBucket = rng();
    let bAcc = 0;
    let bucket = LEAD_TIME_BUCKETS[LEAD_TIME_BUCKETS.length - 1];
    for (const b of LEAD_TIME_BUCKETS) {
      bAcc += b.share;
      if (rBucket <= bAcc) {
        bucket = b;
        break;
      }
    }
    const leadTimeH = bucket.minH + rng() * (bucket.maxH - bucket.minH);
    shifts.push({
      id: i,
      officeId: i % profile.offices,
      role,
      leadTimeH,
      u: {
        internal: rng(),
        internalAvail: rng(),
        network: rng(),
        networkAvail: rng(),
        vendor: rng(),
        vendorAvail: rng(),
      },
    });
  }
  return shifts;
}

// ---------- policy ----------
export interface RolePolicy {
  internalWindowH: number; // internal-only exclusivity after posting
  networkWindowH: number; // marketplace exclusivity before approved vendors get it
}
export type Policy = Record<Role, RolePolicy>;

export const BASELINE_POLICY: Policy = {
  hygienist: { internalWindowH: 48, networkWindowH: 12 },
  assistant: { internalWindowH: 48, networkWindowH: 12 },
  front_office: { internalWindowH: 48, networkWindowH: 12 },
};

export const INTERNAL_WINDOW_GRID = [0, 2, 4, 8, 12, 24, 36, 48, 72, 96];
export const NETWORK_WINDOW_GRID = [2, 6, 12, 24];

// ---------- simulate ----------
export type Filler = "internal" | "network" | "vendor" | "unfilled";

export interface ShiftOutcome {
  filler: Filler;
  fillTimeH: number | null; // hours after posting
  hoursBeforeStart: number | null;
  internalCost: number;
  tempSpend: number;
  lostProduction: number;
}

function claimDelay(u: number, halfLifeH: number): number {
  // exponential with the given median
  const rate = Math.LN2 / halfLifeH;
  return -Math.log(1 - u) / rate;
}

export function releaseTimes(leadTimeH: number, p: RolePolicy, bufferH = SIM_DEFAULTS.networkBufferH) {
  const latestNetworkRelease = Math.max(0, leadTimeH - bufferH);
  const tNetwork = Math.min(p.internalWindowH, latestNetworkRelease);
  const latestVendorRelease = Math.max(tNetwork, leadTimeH - bufferH / 2);
  const tVendor = Math.min(tNetwork + p.networkWindowH, latestVendorRelease);
  return { tNetwork, tVendor };
}

export function simulateShift(s: Shift, p: RolePolicy, profile: MarketplaceProfile): ShiftOutcome {
  const a = ROLE_ASSUMPTIONS[s.role];
  const { tNetwork, tVendor } = releaseTimes(s.leadTimeH, p);
  const pInt = Math.min(1, a.pInternalAvailable * profile.internalAvailabilityMult);
  const tI = s.u.internalAvail < pInt ? claimDelay(s.u.internal, a.internalHalfLifeH / profile.internalSpeedMult) : Infinity;
  const tN = s.u.networkAvail < a.pNetworkAvailable ? tNetwork + claimDelay(s.u.network, a.networkHalfLifeH) : Infinity;
  const tV = s.u.vendorAvail < a.pVendorAvailable ? tVendor + claimDelay(s.u.vendor, a.vendorHalfLifeH) : Infinity;

  const first = Math.min(tI, tN, tV);
  const hours = a.shiftHours;
  if (!(first < s.leadTimeH)) {
    return { filler: "unfilled", fillTimeH: null, hoursBeforeStart: null, internalCost: 0, tempSpend: 0, lostProduction: hours * a.lostProductionPerHr };
  }
  const filler: Filler = first === tI ? "internal" : first === tN ? "network" : "vendor";
  return {
    filler,
    fillTimeH: first,
    hoursBeforeStart: s.leadTimeH - first,
    internalCost: filler === "internal" ? hours * a.internalCostPerHr : 0,
    tempSpend: filler === "network" ? hours * a.networkBillPerHr : filler === "vendor" ? hours * a.vendorBillPerHr : 0,
    lostProduction: 0,
  };
}

export interface Metrics {
  shifts: number;
  filled: number;
  fillRate: number;
  internalShare: number; // of filled
  networkShare: number;
  vendorShare: number;
  medianTimeToFillH: number;
  lateFillShare: number; // filled with <24h to spare, of filled
  internalCost: number;
  tempSpend: number;
  lostProduction: number;
  totalCost: number;
  tempSpendPerFilled: number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function summarize(outcomes: ShiftOutcome[]): Metrics {
  const filled = outcomes.filter((o) => o.filler !== "unfilled");
  const count = (f: Filler) => filled.filter((o) => o.filler === f).length;
  const sum = (k: "internalCost" | "tempSpend" | "lostProduction") => outcomes.reduce((t, o) => t + o[k], 0);
  const internalCost = sum("internalCost");
  const tempSpend = sum("tempSpend");
  const lostProduction = sum("lostProduction");
  const nf = filled.length || 1;
  return {
    shifts: outcomes.length,
    filled: filled.length,
    fillRate: outcomes.length ? filled.length / outcomes.length : 0,
    internalShare: count("internal") / nf,
    networkShare: count("network") / nf,
    vendorShare: count("vendor") / nf,
    medianTimeToFillH: median(filled.map((o) => o.fillTimeH as number)),
    lateFillShare: filled.filter((o) => (o.hoursBeforeStart as number) < 24).length / nf,
    internalCost,
    tempSpend,
    lostProduction,
    totalCost: internalCost + tempSpend + lostProduction,
    tempSpendPerFilled: tempSpend / nf,
  };
}

export function simulate(shifts: Shift[], policy: Policy, profile: MarketplaceProfile, role?: Role): Metrics {
  const subset = role ? shifts.filter((s) => s.role === role) : shifts;
  return summarize(subset.map((s) => simulateShift(s, policy[s.role], profile)));
}

// ---------- recommend ----------
export interface Guardrails {
  fillRateTolerancePts: number; // fill rate may drop at most this many points vs the baseline policy
  maxLateFillShare: number; // share of fills with <24h notice must stay at or below this
}
export const DEFAULT_GUARDRAILS: Guardrails = { fillRateTolerancePts: 0.5, maxLateFillShare: 0.35 };

export interface Recommendation {
  policy: Policy;
  perRole: Record<Role, { policy: RolePolicy; metrics: Metrics; baseline: Metrics; metGuardrail: boolean }>;
}

/**
 * Per role, pick the windows that minimise total cost (internal labor + temp spend + lost production)
 * subject to: fill rate within tolerance of baseline AND late-fill share under the cap.
 * If nothing passes, keep the option with the highest fill rate (and flag it).
 */
export function recommend(
  shifts: Shift[],
  profile: MarketplaceProfile,
  guardrails: Guardrails = DEFAULT_GUARDRAILS,
  baselinePolicy: Policy = BASELINE_POLICY,
): Recommendation {
  const perRole = {} as Recommendation["perRole"];
  const policy = {} as Policy;
  for (const role of ROLES) {
    const baseline = simulate(shifts, baselinePolicy, profile, role);
    const minFill = baseline.fillRate - guardrails.fillRateTolerancePts / 100;
    let best: { policy: RolePolicy; metrics: Metrics; ok: boolean } | null = null;
    for (const internalWindowH of INTERNAL_WINDOW_GRID) {
      for (const networkWindowH of NETWORK_WINDOW_GRID) {
        const rp = { internalWindowH, networkWindowH };
        const m = simulate(shifts, { ...baselinePolicy, [role]: rp }, profile, role);
        const ok = m.fillRate >= minFill - 1e-12 && m.lateFillShare <= guardrails.maxLateFillShare + 1e-12;
        const better =
          !best ||
          (ok && !best.ok) ||
          (ok === best.ok && (ok ? m.totalCost < best.metrics.totalCost - 1e-9 : m.fillRate > best.metrics.fillRate + 1e-12));
        if (better) best = { policy: rp, metrics: m, ok };
      }
    }
    perRole[role] = { policy: best!.policy, metrics: best!.metrics, baseline, metGuardrail: best!.ok };
    policy[role] = best!.policy;
  }
  return { policy, perRole };
}

/** Fill rate and temp spend as the internal window changes, for one role (network window held fixed). */
export function tradeoffCurve(shifts: Shift[], profile: MarketplaceProfile, role: Role, networkWindowH: number) {
  return INTERNAL_WINDOW_GRID.map((internalWindowH) => {
    const m = simulate(shifts, { ...BASELINE_POLICY, [role]: { internalWindowH, networkWindowH } }, profile, role);
    return { internalWindowH, fillRate: m.fillRate, tempSpend: m.tempSpend, totalCost: m.totalCost, internalShare: m.internalShare };
  });
}

export function getProfile(id: ProfileId) {
  return PROFILES[id];
}
