# ISPwatcher

Self-hosted tooling to document ISP underperformance and, where an official
BNetzA measurement has been completed, help generate a formal complaint
around it under German telecom law (§ 57 TKG).

## Why two layers?

Automated speed measurements aren't recognized as legal proof under § 57 TKG
— only BNetzA's official Desktop-App measurement campaign counts, and
automated/browser-based measurements are actively detected and rejected. So
this project is split into two independent halves:

- **Layer 1 — continuous monitoring (fully automated).** Runs unattended
  against a self-hosted speed-test server and produces supporting
  documentation. This is evidence of a pattern over time, not official proof,
  and is always labeled as such.
- **Layer 2 — official measurement tracking (manual measurement, automated
  bookkeeping).** Tracks BNetzA's campaign timing rules so you know when
  you're allowed to run the next official measurement, and accepts your
  uploaded official protocol once you've completed the campaign yourself in
  BNetzA's Desktop-App. That upload is the actual legal proof — this tool
  never generates or fakes it.

A complaint letter can then be generated in either an informal mode (backed
by Layer 1 data) or a formal § 57 TKG demand (backed by your uploaded Layer 2
protocol).

## Stack

- **Backend:** Node.js + TypeScript, Fastify, Prisma + MariaDB
- **Frontend:** React + Vite + TypeScript
- **PDF generation:** Puppeteer (HTML → PDF)
- **Deployment:** Docker → GitHub Container Registry → ArgoCD → Kubernetes

## Project layout

```
apps/
├── backend/   # API, monitoring engine, campaign tracker, PDF generation
└── frontend/  # dashboard UI
```

## Status

Under active development. Layer 1 (continuous monitoring) is implemented;
Layer 2 (campaign tracking, protocol upload, complaint generation) and the
frontend are in progress.

## License

MIT — see [LICENSE](./LICENSE).
