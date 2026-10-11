# EV_Analytics_Quality

Connected-vehicle quality analytics for an EV maker, built around the quality department's objectives. Demo build: every vehicle, supplier, plant, claim and bulletin is generated.

## Modules
1. **Quality command centre**: one alert centre with a filter for every field, the issue register, and AI agent findings with actions awaiting approval.
2. **Early warning**: emerging issues from warranty claims, with fault codes, signal drift and predictions as earlier triggers; fault-code analytics; launch monitor.
3. **AI root cause**: VIN failure report, compare workbench (VIN or population on either side, vehicle or trip level, 371 KPIs), issue analysis, no-fault-found and repeat repair, pattern search. Vehicle 360 for general vehicle information.
4. **Predictive failure**: failure probability at 30, 60 and 90 days per vehicle and component, whole-vehicle breakdown risk, fault-code forecast, parts demand, model report.
5. **Warranty intelligence**: cost and drivers, build-month triangle, dealer benchmark, claim search, supplier recovery, cost outlook.
6. **Supplier and plant quality**: supplier scorecard, suspect lots and traceability, plant line and shift, station measurement against field failure, containment.
7. **Recall risk list**: candidates, scope funnel, risk-ranked VIN list with time to failure, blanket order against risk order, handover to the recall office.

Segments: two-wheelers, three-wheelers, passenger cars, light commercial vehicles, buses and trucks.

## Run locally
```
npm install
npm run dev
```
Open http://localhost:3000. Accounts are in `CREDENTIALS.md`.

## Deploy (Netlify or Vercel)
Build command `npm run build`. Set `AUTH_SECRET`. Optionally set `ANTHROPIC_API_KEY` for AI-written analysis, Sage, the written VIN summary and live web research. Live research can take 20 to 40 seconds; raise the function timeout if your plan cuts it off.

## How it is built
- `src/server/workspace/parts/*.js` are joined into `engine.js` by `scripts/build-engine.mjs` before dev and build. Edit the parts.
- Data is served by named queries: `GET /api/rest-proxy/ev_q_<name>`. The role check is on the server.
- `04-catalog.js` holds segments, models, components, suppliers and the twelve planted issues. Claims, fault codes, health indicators and predictions are all generated from those, so every screen tells the same story.
- `08-detect.js` computes alerts, contributing factors and agent findings from the generated data; nothing is typed in.

## What is not real
- Predictions show what a model would output. Accuracy figures are a simulated back-test.
- Technical bulletins and past cases are samples.
- The AI key paths (analysis, Sage, summary, web research) have not been run against the live service in this build.
- Approvals and alert status changes are saved in the browser only.
