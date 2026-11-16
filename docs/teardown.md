# Teardown: Kwikly Dental Staffing (public information only)

_Prepared 2026-11-16. Sources: REA (reverse-engineering tool) passive captures of 5 public marketing pages, Kwikly's public site/blog, press coverage, competitor pages. No logins, no forms, no app traffic observed. Vendor/competitor claims are marked as such._

## Business model
- W-2 dental staffing marketplace: offices post temp shifts; vetted hygienists, assistants, front office and dentists claim them in the Kwikly app. Kwikly employs the professional (payroll, taxes, workers' comp, malpractice) and bills the office per shift ("pricing is per shift", per competitor Princess; no public price list on the pages REA captured).
- Second product line: **Kwikly Workforce Management** — a custom-branded, internal-first staffing app for DSOs. Runs at Heartland Dental as **HDflex**. Shifts go to the group's own employees/float pool first, then to Kwikly's W-2 network and approved vendors. Bronze honoree, 2026 Dental Innovator Awards (Kwikly press release, 2026-08-03).
- Education line: Hygiene CE membership and course library (REA: footer nav "Hygiene CE Membership", "Course Library"); Spear Education partnership on hygienist training (2026-07-21).
- Cancellation economics (REA, FAQ page, verbatim): "A shift with a scheduled professional that is shortened or cancelled within 24 hours of the start of the shift will be billed the original hours requested." Professionals are paid in full for those shifts (REA, hygienists page).

## Customers / ICP
1. Independent practices (open marketplace) — office managers filling hygiene gaps.
2. DSOs / group practices — logos shown (REA, homepage + DSO page): Heartland, Aspen, Smile Brands, MB2, Guardian, Imagen. Heartland is also an investor (Series A, July 2024).
3. Professionals — "Loved by 80,000+ dental professionals"; "top 30% of over 1500 applicants every single month" (REA, offices page; vendor claims).

## Scale signals (vendor claims unless noted)
25,000+ offices (JD) · 1,800+ offices live on Workforce Management in under 5 weeks · 15,000+ employees onboarded · "cut temp spend by over 30%" · offices "lose over $120,000 per location each year to unfilled shifts" · Inc. 5000 badge · headcount est. 107–223 (third-party estimates disagree).

## Product surface (REA)
- Office: post shifts, professionals "claim or request" shifts, favorites + request-back, in-platform reviews, direct messaging, in-app billing (card/bank), multi-location dashboard, "Clinical Capacity Calculator".
- Professional: set availability, travel distance, shift hours; browse/book; same-day pay (reviews mention Daily Pay); see office details and who you'll work with.
- DSO: centralized multi-location management, "advance reporting and insights", "universal pricing for all of your locations", "Seamlessly integrate third-party vendors", internal-vs-external coverage reporting.
- Support: LiveChat widget on every page, phone line, dedicated account manager.
- Stack hints: marketing site is a static CMS site on www.joinkwikly.com (REA saw only same-origin resources plus YouTube embeds in the captured scope); native iOS/Android apps. **Limit:** REA captured marketing pages only; the office portal and apps are behind login and were not observed, so nothing here describes Kwikly's internal systems.

## Competitors
GoTu (ex-TempMee), Cloud Dentistry (subscription, $20/completed booking fee per its own page), Stynt, Toothio, onDiem, TempStars; DentalPost (job board); Princess, Dental Power (traditional agencies). Most are 1099 marketplaces — Kwikly's W-2 model and the DSO internal-first product are its differentiators.

## What the JD reveals
- "One platform powers several marketplaces … Product decisions have to work for all of them." → configuration/policy problems across open vs branded marketplaces are central.
- PMs lean professionals / offices / DSOs; DSO B2B rollouts with training + change management are a nice-to-have → enterprise rollout is active.
- Heavy emphasis on success metric + baseline + target, fastest test, brief PRDs, AI prototypes, launch readiness, iterate/scale/stop.

## Ranked problems / opportunities
1. **Tuning the internal-first cascade for each DSO (high impact, medium effort).** Every branded marketplace must decide how long a shift stays internal before it is released to Kwikly's network and then vendors. Too long → late fills and lost production ($120k/location/yr claim); too short → temp spend rises and the "cut temp spend 30%" promise erodes. Evidence: Workforce Management page ("Internal Staff Notified First" → "Shift Unfilled? Seamlessly distribute to approved vendors"); press release dashboard metrics (internal vs external coverage, fill rate, cancellations, spend); JD "work for all of them".
2. **Late cancellations and backfill (high impact, medium effort).** 24-hour cancellation rule exists on both sides; a competitor-quoted Indeed review: "Some shifts get canceled last-minute, and it can be frustrating not having anyone to talk to when that happens." Backfill speed after a pro cancels drives office trust.
3. **DSO rollout at scale (medium impact, low effort).** 1,800 offices in under 5 weeks implies heavy launch coordination (training, comms, per-office readiness) — exactly the JD's non-engineering launch work.
4. **Office cost transparency at posting time (medium, low).** Competitor claims per-shift pricing "is not transparent"; DSO page sells "universal pricing". A cost preview could reduce billing questions to support.
5. **Professional reliability signals (medium, medium).** FAQ says frequent cancellations affect future shift access; no public view of how pros see their own reliability.
