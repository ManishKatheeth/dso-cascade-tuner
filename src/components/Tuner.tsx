"use client";

import { useMemo, useState } from "react";
import { LEAD_TIME_BUCKETS, PROFILES, ROLES, ROLE_ASSUMPTIONS, SIM_DEFAULTS, type ProfileId, type Role } from "@/lib/assumptions";
import {
  BASELINE_POLICY,
  DEFAULT_GUARDRAILS,
  INTERNAL_WINDOW_GRID,
  NETWORK_WINDOW_GRID,
  generateShifts,
  recommend,
  simulate,
  type Guardrails,
  type Metrics,
  type Policy,
} from "@/lib/sim";
import { leadershipMemo } from "@/lib/memo";
import TradeoffChart from "./TradeoffChart";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const usd = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;

type Dir = "up" | "down";

function Kpi({ label, value, base, fmt, good, hint }: { label: string; value: number; base: number; fmt: (x: number) => string; good: Dir; hint: string }) {
  const d = value - base;
  const isPct = fmt === pct;
  const flat = Math.abs(d) < (isPct ? 0.0005 : 1);
  const better = good === "up" ? d > 0 : d < 0;
  const color = flat ? "var(--muted)" : better ? "var(--good)" : "var(--bad)";
  const deltaText = flat ? "no change" : `${d > 0 ? "+" : "−"}${isPct ? `${(Math.abs(d) * 100).toFixed(1)} pts` : usd(Math.abs(d))} vs today`;
  return (
    <div className="card p-4" title={hint}>
      <div className="text-xs muted">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{fmt(value)}</div>
      <div className="text-xs mt-1 tabular-nums" style={{ color }}>
        {deltaText}
      </div>
    </div>
  );
}

function Slider({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (v: number) => void }) {
  const idx = Math.max(0, options.indexOf(value));
  return (
    <label className="block">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}h</span>
      </div>
      <input type="range" min={0} max={options.length - 1} step={1} value={idx} onChange={(e) => onChange(options[Number(e.target.value)])} aria-label={label} />
    </label>
  );
}

export default function Tuner() {
  const [profileId, setProfileId] = useState<ProfileId>("large_dso");
  const [policy, setPolicy] = useState<Policy>(BASELINE_POLICY);
  const [guardrails, setGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS);
  const [chartRole, setChartRole] = useState<Role>("hygienist");
  const [copied, setCopied] = useState(false);

  const profile = PROFILES[profileId];
  const shifts = useMemo(() => generateShifts(profile), [profile]);
  const baseline = useMemo(() => simulate(shifts, BASELINE_POLICY, profile), [shifts, profile]);
  const current = useMemo(() => simulate(shifts, policy, profile), [shifts, policy, profile]);
  const rec = useMemo(() => recommend(shifts, profile, guardrails), [shifts, profile, guardrails]);
  const recMetrics = useMemo(() => simulate(shifts, rec.policy, profile), [shifts, rec, profile]);
  const memo = leadershipMemo({
    profile,
    guardrails,
    baselinePolicy: BASELINE_POLICY,
    baseline,
    recommendedPolicy: rec.policy,
    recommended: recMetrics,
    currentPolicy: policy,
    current,
  });

  const setRole = (r: Role, k: "internalWindowH" | "networkWindowH", v: number) => setPolicy((p) => ({ ...p, [r]: { ...p[r], [k]: v } }));

  const roleRows = ROLES.map((r) => ({
    role: r,
    base: simulate(shifts, BASELINE_POLICY, profile, r),
    cur: simulate(shifts, policy, profile, r),
    rec: rec.perRole[r],
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-wider muted">Independent PM prototype · synthetic data</div>
        <h1 className="text-3xl font-semibold">Cascade Tuner</h1>
        <p className="max-w-3xl muted">
          Internal-first staffing holds an open shift for a dental group&apos;s own team before releasing it to the staffing marketplace, then to approved
          vendors. Hold too long and offices get late fills. Release too early and temp spend climbs. This tool shows the trade-off for each role and
          recommends release windows that respect the guardrails you set.
        </p>
      </header>

      <section className="card p-4 space-y-3">
        <div className="text-sm font-medium">1 · Which marketplace?</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.values(PROFILES).map((p) => (
            <button
              key={p.id}
              onClick={() => setProfileId(p.id)}
              className="text-left rounded-lg border p-3 transition"
              style={{ borderColor: p.id === profileId ? "var(--accent)" : "var(--line)", background: p.id === profileId ? "var(--accent-soft)" : "transparent" }}
              aria-pressed={p.id === profileId}
            >
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs muted mt-1">{p.description}</div>
            </button>
          ))}
        </div>
        <div className="text-xs muted">
          {shifts.length.toLocaleString()} synthetic shifts · {profile.offices} offices · {SIM_DEFAULTS.weeks} weeks · the same random draws are reused for every policy, so
          differences come from the policy alone.
        </div>
      </section>

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <Kpi label="Fill rate" value={current.fillRate} base={baseline.fillRate} fmt={pct} good="up" hint="Share of posted shifts filled before start" />
        <Kpi label="Late fills (<24h notice)" value={current.lateFillShare} base={baseline.lateFillShare} fmt={pct} good="down" hint="Share of fills confirmed less than 24h before start" />
        <Kpi label="Filled internally" value={current.internalShare} base={baseline.internalShare} fmt={pct} good="up" hint="Share of fills by the group's own staff" />
        <Kpi label="Temp spend" value={current.tempSpend} base={baseline.tempSpend} fmt={usd} good="down" hint="Marketplace + vendor bill, 8 weeks" />
        <Kpi label="Lost production" value={current.lostProduction} base={baseline.lostProduction} fmt={usd} good="down" hint="Estimated production lost on unfilled shifts" />
        <Kpi label="Total cost" value={current.totalCost} base={baseline.totalCost} fmt={usd} good="down" hint="Internal labor + temp spend + lost production" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="card p-4 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">2 · Release windows by role</div>
            <div className="flex gap-2">
              <button className="text-xs rounded-md border px-2 py-1" style={{ borderColor: "var(--line)" }} onClick={() => setPolicy(BASELINE_POLICY)}>
                Reset to today
              </button>
              <button className="text-xs rounded-md px-2 py-1 text-white" style={{ background: "var(--accent)", color: "var(--card)" }} onClick={() => setPolicy(rec.policy)}>
                Apply recommendation
              </button>
            </div>
          </div>
          {ROLES.map((r) => (
            <div key={r} className="space-y-2">
              <div className="text-sm font-medium">{ROLE_ASSUMPTIONS[r].label}</div>
              <Slider label="Internal-only window" value={policy[r].internalWindowH} options={INTERNAL_WINDOW_GRID} onChange={(v) => setRole(r, "internalWindowH", v)} />
              <Slider label="Marketplace-only window (before vendors)" value={policy[r].networkWindowH} options={NETWORK_WINDOW_GRID} onChange={(v) => setRole(r, "networkWindowH", v)} />
            </div>
          ))}
          <p className="text-xs muted">
            Safety rule in every policy: a shift always reaches the marketplace at least {SIM_DEFAULTS.networkBufferH}h before start, so call-outs skip the internal hold.
          </p>

          <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--line)" }}>
            <div className="text-sm font-medium">3 · Guardrails for the recommendation</div>
            <label className="block text-sm">
              <div className="flex justify-between">
                <span>Max fill-rate drop vs today</span>
                <span className="tabular-nums font-medium">{guardrails.fillRateTolerancePts.toFixed(1)} pts</span>
              </div>
              <input type="range" min={0} max={3} step={0.5} value={guardrails.fillRateTolerancePts} onChange={(e) => setGuardrails((g) => ({ ...g, fillRateTolerancePts: Number(e.target.value) }))} aria-label="Max fill-rate drop" />
            </label>
            <label className="block text-sm">
              <div className="flex justify-between">
                <span>Max late fills (&lt;24h notice)</span>
                <span className="tabular-nums font-medium">{pct(guardrails.maxLateFillShare)}</span>
              </div>
              <input type="range" min={0.25} max={0.6} step={0.01} value={guardrails.maxLateFillShare} onChange={(e) => setGuardrails((g) => ({ ...g, maxLateFillShare: Number(e.target.value) }))} aria-label="Max late fills" />
            </label>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-medium">The trade-off: internal-only window vs outcomes</div>
            <div className="flex gap-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRole(r)}
                  className="text-xs rounded-md border px-2 py-1"
                  style={{ borderColor: r === chartRole ? "var(--accent)" : "var(--line)", background: r === chartRole ? "var(--accent-soft)" : "transparent" }}
                  aria-pressed={r === chartRole}
                >
                  {ROLE_ASSUMPTIONS[r].label}
                </button>
              ))}
            </div>
          </div>
          <TradeoffChart
            shifts={shifts}
            profile={profile}
            role={chartRole}
            networkWindowH={policy[chartRole].networkWindowH}
            currentWindow={policy[chartRole].internalWindowH}
            recommendedWindow={rec.policy[chartRole].internalWindowH}
            maxLateFill={guardrails.maxLateFillShare}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left muted text-xs">
                  <th className="py-2 pr-2">Role</th>
                  <th className="pr-2">Recommended</th>
                  <th className="pr-2">Fill (today → rec)</th>
                  <th className="pr-2">Late fills</th>
                  <th className="pr-2">Temp spend Δ</th>
                  <th>Guardrails</th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map(({ role, base, rec: rr }) => (
                  <tr key={role} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="py-2 pr-2">{ROLE_ASSUMPTIONS[role].label}</td>
                    <td className="pr-2">
                      {rr.policy.internalWindowH}h / {rr.policy.networkWindowH}h
                    </td>
                    <td className="pr-2">
                      {pct(base.fillRate)} → {pct(rr.metrics.fillRate)}
                    </td>
                    <td className="pr-2">
                      {pct(base.lateFillShare)} → {pct(rr.metrics.lateFillShare)}
                    </td>
                    <td className="pr-2">{(rr.metrics.tempSpend - base.tempSpend >= 0 ? "+" : "−") + usd(Math.abs(rr.metrics.tempSpend - base.tempSpend))}</td>
                    <td style={{ color: rr.metGuardrail ? "var(--good)" : "var(--warn)" }}>{rr.metGuardrail ? "pass" : "none pass: best fill shown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">4 · Leadership memo (auto-drafted, review before sharing)</div>
          <button
            className="text-xs rounded-md border px-2 py-1"
            style={{ borderColor: "var(--line)" }}
            onClick={() => {
              navigator.clipboard?.writeText(memo).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="text-xs whitespace-pre-wrap leading-relaxed">{memo}</pre>
      </section>

      <details className="card p-4">
        <summary className="text-sm font-medium cursor-pointer">Assumptions (all synthetic, edit in src/lib/assumptions.ts)</summary>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left muted">
                <th className="py-1 pr-2">Role</th>
                <th className="pr-2">Share</th>
                <th className="pr-2">Internal $/h</th>
                <th className="pr-2">Marketplace $/h</th>
                <th className="pr-2">Vendor $/h</th>
                <th className="pr-2">Lost prod. $/h</th>
                <th className="pr-2">Median claim (int / mkt / vendor)</th>
                <th>P(available) int / mkt / vendor</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const a = ROLE_ASSUMPTIONS[r];
                return (
                  <tr key={r} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="py-1 pr-2">{a.label}</td>
                    <td className="pr-2">{pct(a.shareOfShifts)}</td>
                    <td className="pr-2">${a.internalCostPerHr}</td>
                    <td className="pr-2">${a.networkBillPerHr}</td>
                    <td className="pr-2">${a.vendorBillPerHr}</td>
                    <td className="pr-2">${a.lostProductionPerHr}</td>
                    <td className="pr-2">
                      {a.internalHalfLifeH}h / {a.networkHalfLifeH}h / {a.vendorHalfLifeH}h
                    </td>
                    <td>
                      {pct(a.pInternalAvailable)} / {pct(a.pNetworkAvailable)} / {pct(a.pVendorAvailable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs muted mt-2">
          Lead-time mix: {LEAD_TIME_BUCKETS.map((b) => `${b.label} ${pct(b.share)}`).join(" · ")}. Marketplace profiles scale internal availability (×
          {PROFILES.large_dso.internalAvailabilityMult} / ×{PROFILES.mid_group.internalAvailabilityMult} / ×{PROFILES.independent.internalAvailabilityMult}). &quot;Today&quot;
          is an illustrative 48h internal / 12h marketplace default, not a known Kwikly setting.
        </p>
      </details>

      <footer className="text-xs muted pb-8">
        Independent portfolio project. Not affiliated with or endorsed by Kwikly or any dental group. Built only from public information; all data is synthetic.
      </footer>
    </main>
  );
}

export type { Metrics };
