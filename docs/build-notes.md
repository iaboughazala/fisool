# Build Notes

Things that will bite you when you touch the build config.

## Use webpack, not Turbopack

**`package.json`:**
```json
"build": "next build --webpack"
```

Turbopack (Next.js 16's default) OOMs on this project. Symptoms:

```
FATAL ERROR: Zone Allocation failed - process out of memory
Next.js build worker exited with code: 134 and signal: null
```

Reproduces on laptop (16 GB RAM), the old VPS (4 GB), and Hostinger.
Webpack works everywhere with 2 GB heap.

Do NOT try to "fix" the build script by removing `--webpack`. Do NOT
try `next build --turbopack` "just to see" — it will fail and cost
you a wasted deploy cycle.

## Give Node enough heap

Locally:
```bash
NODE_OPTIONS='--max-old-space-size=6144' npm run build
```

Hostinger (env var in the Web App UI):
```
NODE_OPTIONS=--max-old-space-size=2048
```

The VPS also used 2048 fine. Default (~1.5 GB) OOMs during static
page generation.

## Static generation is bounded to 150 pages

`src/app/schools/[slug]/page.tsx`:

```ts
export const dynamicParams = true;

export function generateStaticParams() {
  return [...schools]
    .filter((s) => (s.rating ?? 0) >= 4 && (s.reviewCount ?? 0) >= 5)
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .slice(0, 150)
    .map((s) => ({ slug: s.slug }));
}
```

Trying to pre-render all 3,375 school pages at build time OOMs even
with 6 GB heap — each rendered page keeps its own tree in memory,
and 3,375 × the JSON overhead × the React tree overhead > 6 GB.

The top 150 (by rating × log(reviews)) covers the schools most likely
to be linked to and searched. Everything else renders on-demand
(ISR) on first request, then gets cached.

## Image config

`next.config.ts` whitelists `storage.googleapis.com/yaschools/**` for
the school logo images.

Photos are served `unoptimized` — the Next.js image optimiser
processing 1,400 logos on every deploy adds ~5 minutes to the build
for no visible benefit (they're already tiny, already served over
Google Cloud CDN).

## Experimental flags

```ts
experimental: { workerThreads: false, cpus: 1 }
```

Forces single-worker generation. Without this, Next.js spawns
multiple workers each holding a full copy of the JSON in memory,
which OOMs on the low-memory build environments.

## Common build failures

| Error | Cause | Fix |
|---|---|---|
| `Zone Allocation failed` | Turbopack | Use `--webpack` |
| `JavaScript heap out of memory` | Not enough heap | Raise `NODE_OPTIONS=--max-old-space-size=...` |
| `Failed to type check` | Type error | Read the error, fix the type — never disable typecheck |
| `Cannot find module 'X'` | Missing dep | `npm ci` (don't use `npm install` in prod) |
| `Module not found: 'leaflet/dist/leaflet.css'` | SSR-eval'd browser code | Ensure `MapView` is dynamic-imported with `ssr: false` |

## What to do when a deploy fails

1. Open Hostinger hPanel → **Websites → Manage → Deployments**.
2. Click the failed deployment, expand the build log.
3. Search the log for `error` or `FATAL` — the actual failure is
   usually not at the tail.
4. If it's an OOM: check that `--webpack` is still in `package.json`
   and that `NODE_OPTIONS` is still set in Hostinger's env vars.
5. If it's a code error: reproduce locally with `npm run build`, fix,
   push. Don't debug in Hostinger.
6. To roll back the site while you fix: `git revert <bad-sha> && git push`.
