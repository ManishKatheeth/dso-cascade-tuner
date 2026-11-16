# PRD: Cascade release windows per role and per marketplace

_Independent PM exercise built on public information. Numbers are synthetic until replaced with real shift history._

## Problem
Internal-first staffing posts an open shift to a dental group's own team first. If no one claims it, the shift goes to the staffing marketplace, then to approved vendors. Today (assumed) one release window applies to every role and every group.
- If the window is too long, offices get confirmations late or not at all. Office managers feel this most.
- If it's too short, the marketplace and vendors fill shifts the group's own staff would have taken, temp spend rises, and the "cut temp spend" promise weakens.
- The right window differs by role (hygienists vs assistants) and by group (deep float pool vs none). One default can't work for all marketplaces.

## Users
- **DSO staffing / ops lead**: owns coverage and temp budget across offices.
- **Account manager**: sets up and tunes each branded marketplace.
- **Office manager** (indirect): wants a confirmed person early.
- **Internal float staff** (indirect): want first pick of shifts.

## Goal
Each branded marketplace runs release windows per role that minimize total staffing cost and stay inside its guardrails.

**Non-goals (v1):** per-office windows, real-time dynamic pricing, changing marketplace matching, auto-applying changes without a human.

## What users should be able to do
1. The account manager picks a group and sees today's fill rate, late-fill share, internal share and temp spend for each role over the last 8 weeks.
2. They set guardrails: max fill-rate drop and max late-fill share.
3. They see a recommended internal window and marketplace window for each role, plus the trade-off curve behind it.
4. They change any window and see the projected impact before saving.
5. They export a short memo with options A/B/C for the group's ops lead.
6. They schedule the change as a 4-week A/B by office cluster, not a full switch.

## Acceptance criteria
- Recommendations are reproducible: the same history and guardrails give the same answer.
- The recommendation never pushes a role below the fill-rate guardrail if any option passes. If none pass, it shows "no option passes" and the best-fill option.
- Call-out rule: every shift reaches the marketplace at least 24h before start (configurable), whatever the window.
- A group with no internal pool gets a recommended internal window of 0.
- Projected vs actual is tracked for every saved change (see metrics.md).

## Edge cases (decisions)
- **Shift posted inside the buffer:** skip internal and release immediately.
- **Internal person claims after release:** first claim wins, and internal staff can still claim.
- **Roles with low volume (<50 shifts/8 weeks):** fall back to the group default and label it "low data".
- **Holidays / seasonality:** v1 uses a trailing 8 weeks. Flag if the window spans a holiday week.

## Dependencies and launch
- **Data:** shift post time, start time, claim time, claimant type (internal/marketplace/vendor), cancellations. **Eng:** the windows need to be stored per role per marketplace.
- **Ops/AMs:** training on reading the curve and memo, plus a help article.
- **Partners (DSOs):** notice before any A/B touches their offices, and an opt-out.
- **Support:** a macro for "why did my shift go to the marketplace?"
- **Rollout:** 1 friendly DSO for 4 weeks, then the groups with the largest late-fill gap, then default-on.

## Risks
- Model calibration is wrong → compare projected vs actual weekly and stop if the error is >5 pts on fill rate.
- Internal staff feel squeezed by a shorter window → track the internal opt-out rate as a guardrail.
- Offices game it by posting earlier → watch lead-time mix before and after.
