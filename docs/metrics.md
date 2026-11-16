# Metrics

**North star:** total staffing cost per scheduled chair-hour = (internal labor + temp spend + estimated lost production) ÷ scheduled hours. It captures both sides of the trade-off in one number leadership already cares about.

| Type | Metric | Definition | Baseline (synthetic, large DSO) | Target |
|---|---|---|---|---|
| Input | Internal fill share | fills by group staff ÷ fills | 50.2% | hold within 7 pts |
| Input | Temp spend | marketplace + vendor billing | $329k / 8 wks | context, not the goal |
| Guardrail | Fill rate | filled before start ÷ posted | 90.2% | ≥ baseline − 0.5 pts |
| Guardrail | Late-fill share | fills with <24h notice ÷ fills | 38.0% | ≤ 35% |
| Guardrail | Internal opt-out | float staff turning off notifications | (measure) | no increase |
| Health | Projection error | projected vs actual fill rate | — | ≤ 5 pts |

Recommendation from the tool (synthetic): late fills 38.0% → 33.7%, fill rate +0.1 pts, temp spend +$44.7k over 8 weeks. The tool makes this an explicit, priced choice instead of a default nobody picked.

## Instrumentation
Events per shift: `shift_posted` (role, office, marketplace, start_at), `shift_released` (tier, at), `shift_claimed` (claimant_type, at), `shift_cancelled` (by, at), `shift_completed`. Window config changes are logged with author and reason.

```sql
-- late-fill share and internal share by role, trailing 8 weeks
select role,
  avg(case when claimed_at is not null then 1.0 else 0 end) as fill_rate,
  avg(case when start_at - claimed_at < interval '24 hours' then 1.0 else 0 end)
    filter (where claimed_at is not null) as late_fill_share,
  avg(case when claimant_type = 'internal' then 1.0 else 0 end)
    filter (where claimed_at is not null) as internal_share
from shifts
where marketplace_id = :mkt and posted_at >= now() - interval '8 weeks'
group by role;
```

## Decision rule for the A/B
At week 4: **scale** if the north star improves and every guardrail holds; **iterate** if guardrails hold but cost is flat; **stop** if any guardrail breaks for 2 consecutive weeks.
