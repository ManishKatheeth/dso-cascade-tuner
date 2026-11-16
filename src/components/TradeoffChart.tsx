"use client";

import { useMemo } from "react";
import type { MarketplaceProfile, Role } from "@/lib/assumptions";
import { tradeoffCurve, simulate, BASELINE_POLICY, INTERNAL_WINDOW_GRID, type Shift } from "@/lib/sim";

interface Props {
  shifts: Shift[];
  profile: MarketplaceProfile;
  role: Role;
  networkWindowH: number;
  currentWindow: number;
  recommendedWindow: number;
  maxLateFill: number;
}

const W = 220;
const H = 150;
const PAD = { l: 40, r: 8, t: 14, b: 26 };

function Panel({
  title,
  points,
  fmt,
  currentWindow,
  recommendedWindow,
  threshold,
}: {
  title: string;
  points: { x: number; y: number }[];
  fmt: (v: number) => string;
  currentWindow: number;
  recommendedWindow: number;
  threshold?: number;
}) {
  // categorical x (grid positions) so short windows are readable
  const xs = INTERNAL_WINDOW_GRID;
  const xPos = (w: number) => PAD.l + (xs.indexOf(w) / (xs.length - 1)) * (W - PAD.l - PAD.r);
  const ysAll = points.map((p) => p.y).concat(threshold !== undefined ? [threshold] : []);
  let lo = Math.min(...ysAll);
  let hi = Math.max(...ysAll);
  if (hi - lo < 1e-9) {
    hi = hi + Math.abs(hi) * 0.05 + 0.01;
    lo = lo - Math.abs(lo) * 0.05 - 0.01;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const yPos = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${xPos(p.x).toFixed(1)},${yPos(p.y).toFixed(1)}`).join(" ");
  const cur = points.find((p) => p.x === currentWindow);
  const rec = points.find((p) => p.x === recommendedWindow);

  return (
    <figure className="space-y-1">
      <figcaption className="text-xs muted">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
        {[lo + pad, (lo + hi) / 2, hi - pad].map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yPos(v)} y2={yPos(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.l - 6} y={yPos(v) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">
              {fmt(v)}
            </text>
          </g>
        ))}
        {threshold !== undefined && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={yPos(threshold)} y2={yPos(threshold)} stroke="var(--warn)" strokeDasharray="4 3" strokeWidth={1.2} />
            <text x={W - PAD.r} y={yPos(threshold) - 4} textAnchor="end" fontSize={10} fill="var(--warn)">
              cap {fmt(threshold)}
            </text>
          </g>
        )}
        {xs.map((w) => (
          <text key={w} x={xPos(w)} y={H - 10} textAnchor="middle" fontSize={10} fill="var(--muted)">
            {w}
          </text>
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {points.map((p) => (
          <circle key={p.x} cx={xPos(p.x)} cy={yPos(p.y)} r={2.2} fill="var(--accent)">
            <title>{`${p.x}h internal: ${fmt(p.y)}`}</title>
          </circle>
        ))}
        {rec && (
          <circle cx={xPos(rec.x)} cy={yPos(rec.y)} r={6} fill="none" stroke="var(--good)" strokeWidth={2}>
            <title>{`Recommended ${rec.x}h: ${fmt(rec.y)}`}</title>
          </circle>
        )}
        {cur && (
          <circle cx={xPos(cur.x)} cy={yPos(cur.y)} r={4} fill="var(--ink)">
            <title>{`Current ${cur.x}h: ${fmt(cur.y)}`}</title>
          </circle>
        )}
      </svg>
    </figure>
  );
}

export default function TradeoffChart(props: Props) {
  const { shifts, profile, role, networkWindowH } = props;
  const data = useMemo(() => {
    const curve = tradeoffCurve(shifts, profile, role, networkWindowH);
    const late = INTERNAL_WINDOW_GRID.map((w) => ({
      x: w,
      y: simulate(shifts, { ...BASELINE_POLICY, [role]: { internalWindowH: w, networkWindowH } }, profile, role).lateFillShare,
    }));
    return {
      spend: curve.map((c) => ({ x: c.internalWindowH, y: c.tempSpend })),
      total: curve.map((c) => ({ x: c.internalWindowH, y: c.totalCost })),
      late,
    };
  }, [shifts, profile, role, networkWindowH]);

  const k = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`);
  const p = (v: number) => `${(v * 100).toFixed(0)}%`;

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel title="Temp spend (8 wks)" points={data.spend} fmt={k} currentWindow={props.currentWindow} recommendedWindow={props.recommendedWindow} />
        <Panel title="Late fills (<24h notice)" points={data.late} fmt={p} currentWindow={props.currentWindow} recommendedWindow={props.recommendedWindow} threshold={props.maxLateFill} />
        <Panel title="Total cost (8 wks)" points={data.total} fmt={k} currentWindow={props.currentWindow} recommendedWindow={props.recommendedWindow} />
      </div>
      <div className="text-xs muted flex flex-wrap gap-x-4 gap-y-1">
        <span>x-axis: internal-only window (hours), marketplace window held at {networkWindowH}h</span>
        <span>
          <span style={{ color: "var(--ink)" }}>●</span> current
        </span>
        <span>
          <span style={{ color: "var(--good)" }}>○</span> recommended
        </span>
      </div>
    </div>
  );
}
