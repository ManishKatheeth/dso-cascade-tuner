import { describe, expect, it } from "vitest";
import { PROFILES, ROLES } from "@/lib/assumptions";
import {
  BASELINE_POLICY,
  INTERNAL_WINDOW_GRID,
  generateShifts,
  recommend,
  releaseTimes,
  simulate,
  type Policy,
} from "@/lib/sim";

const dso = PROFILES.large_dso;
const shifts = generateShifts(dso);

const uniform = (internalWindowH: number, networkWindowH = 12): Policy => ({
  hygienist: { internalWindowH, networkWindowH },
  assistant: { internalWindowH, networkWindowH },
  front_office: { internalWindowH, networkWindowH },
});

describe("data generation", () => {
  it("is deterministic for a seed", () => {
    expect(generateShifts(dso, 7)).toEqual(generateShifts(dso, 7));
  });
  it("produces offices x weeks x 3 shifts", () => {
    expect(shifts.length).toBe(dso.offices * 8 * 3);
  });
});

describe("release timing", () => {
  it("never holds a shift internal past the network buffer", () => {
    const { tNetwork } = releaseTimes(30, { internalWindowH: 96, networkWindowH: 12 });
    expect(tNetwork).toBe(6); // 30h lead - 24h buffer
  });
  it("releases call-outs straight to the network", () => {
    expect(releaseTimes(10, { internalWindowH: 48, networkWindowH: 12 }).tNetwork).toBe(0);
  });
  it("vendor release is never before network release", () => {
    for (const lead of [3, 20, 50, 200]) {
      const r = releaseTimes(lead, { internalWindowH: 24, networkWindowH: 6 });
      expect(r.tVendor).toBeGreaterThanOrEqual(r.tNetwork);
    }
  });
});

describe("trade-off is monotonic (paired random numbers)", () => {
  const runs = INTERNAL_WINDOW_GRID.map((w) => simulate(shifts, uniform(w), dso));
  it("longer internal window -> internal share does not drop", () => {
    for (let i = 1; i < runs.length; i++) expect(runs[i].internalShare).toBeGreaterThanOrEqual(runs[i - 1].internalShare - 1e-12);
  });
  it("longer internal window -> fill rate does not rise", () => {
    for (let i = 1; i < runs.length; i++) expect(runs[i].fillRate).toBeLessThanOrEqual(runs[i - 1].fillRate + 1e-12);
  });
  it("zero internal window still lets internal staff claim, but network competes from hour 0", () => {
    expect(runs[0].networkShare).toBeGreaterThan(runs[runs.length - 1].networkShare);
  });
});

describe("profiles", () => {
  it("independent practice has no internal fills", () => {
    const ind = PROFILES.independent;
    const m = simulate(generateShifts(ind), BASELINE_POLICY, ind);
    expect(m.internalShare).toBe(0);
  });
  it("independent practice is best served with no internal hold", () => {
    const ind = PROFILES.independent;
    const rec = recommend(generateShifts(ind), ind);
    for (const r of ROLES) expect(rec.policy[r].internalWindowH).toBe(0);
  });
  it("one default policy does not fit every marketplace", () => {
    const a = recommend(generateShifts(PROFILES.large_dso), PROFILES.large_dso).policy.hygienist.internalWindowH;
    const b = recommend(generateShifts(PROFILES.independent), PROFILES.independent).policy.hygienist.internalWindowH;
    expect(a).toBeGreaterThan(b);
  });
});

describe("recommendation", () => {
  const g = { fillRateTolerancePts: 0.5, maxLateFillShare: 0.35 };
  const rec = recommend(shifts, dso, g);
  it("respects both guardrails for every role that passes", () => {
    for (const r of ROLES) {
      const pr = rec.perRole[r];
      if (!pr.metGuardrail) continue;
      expect(pr.metrics.fillRate).toBeGreaterThanOrEqual(pr.baseline.fillRate - 0.005 - 1e-12);
      expect(pr.metrics.lateFillShare).toBeLessThanOrEqual(0.35 + 1e-12);
    }
  });
  it("loosening the late-fill cap never raises total cost", () => {
    const loose = recommend(shifts, dso, { ...g, maxLateFillShare: 1 });
    expect(simulate(shifts, loose.policy, dso).totalCost).toBeLessThanOrEqual(simulate(shifts, rec.policy, dso).totalCost + 1e-6);
  });
});
