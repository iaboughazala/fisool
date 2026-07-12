# فصول — Project Documentation

**Live:** https://fisool.finalizat.com
**Repo:** https://github.com/iaboughazala/fisool
**Brand:** فصول (Fusool) — دليل مدارس المملكة العربية السعودية

## Contents

- **[workflow.svg](./workflow.svg)** — end-to-end pipeline diagram (open in a browser to view)
- **[deployment.md](./deployment.md)** — where the app runs and how deploys happen
- **[data-pipeline.md](./data-pipeline.md)** — how school data flows from scrapers to production JSON
- **[build-notes.md](./build-notes.md)** — required build flags, memory limits, Turbopack notes

## Quick start

```bash
# Local dev
npm install
npm run dev          # → http://localhost:3000

# Production build
npm run build        # uses webpack (baked into the build script)
npm start
```

**Every commit to `main` auto-deploys to Hostinger** — you don't push to a server, you push to GitHub.

## Repo layout

```
fisool/
├── docs/                        ← you are here
├── scripts/
│   ├── export-from-unified.py   ← SQLite → JSON
│   ├── clean-json-junk.py       ← facet normalisation (idempotent)
│   └── export-from-sqlite.py    ← legacy (single-source, superseded)
├── src/
│   ├── app/                     ← Next.js App Router pages
│   ├── components/              ← Header, Footer, SchoolCard, MapView, ...
│   └── lib/
│       ├── data/schools-real.json  ← 3,375 schools, ~34 MB (committed)
│       ├── schools.ts              ← facets, filters, formatters
│       └── types.ts                ← School, GradeFee, etc.
├── data/                        ← unified.db goes here, gitignored
├── next.config.ts
└── package.json
```

## Data source of truth

`unified.db` lives on the user's laptop (**not** in git — see [.gitignore](../.gitignore)).
It's built from 4 upstream scrapers under `D:\Projects\web-reading\`.
The JSON file committed to the repo is derived from it — see [data-pipeline.md](./data-pipeline.md).
