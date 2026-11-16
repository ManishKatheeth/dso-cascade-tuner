# Roadmap

**Now (this prototype)**
- Simulator with paired random draws, per-role windows, 3 marketplace profiles, guardrails, recommendation, memo.

**Next (with real data, ~2-4 weeks)**
- Calibrate claim-time and availability curves from 8 weeks of shift history per group (one SQL pull).
- Backtest: replay last quarter under the recommended windows and compare to actuals.
- Account-manager view inside the admin tool: choose a group, export the memo, schedule an A/B.

**Later**
- Windows by lead-time band (call-outs vs planned gaps) and by region.
- Learn from outcomes: re-recommend monthly and alert when a group drifts past a guardrail.
- Offer it to offices: "post earlier, fill internally" nudges when the forecast says internal will likely fill.
- Cancellation-aware backfill: when a booked person cancels, restart the cascade with a shorter internal window.
