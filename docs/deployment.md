# Deployment

**Live:** https://fisool.finalizat.com
**Host:** Hostinger (moved off VPS on 2026-04-28)

## Infrastructure

| Item | Value |
|---|---|
| Provider | Hostinger — "Deploy Web App" (Node.js hosting) |
| Server | `server1470` in France |
| RAM | 4 GB |
| CPU | 4 cores |
| Disk | 200 GB |
| Node.js | **22.x** |
| Runtime | Next.js 16 (App Router) |
| Domain | `fisool.finalizat.com` |
| DNS | Hostinger nameservers → `147.79.116.121`, `147.79.119.85` |
| SSL | Hostinger-managed, auto-renewed |

## Auto-deploy pipeline

Hostinger's Web App is wired to `iaboughazala/fisool` on GitHub, branch `main`.

**On every push:**
1. `git pull` from main
2. `npm ci` (fresh install, ~30 seconds)
3. `npm run build` (webpack, ~2-3 minutes)
4. Restart the Node process

Total ~3-5 minutes. Watch progress in Hostinger hPanel → **Websites → Manage → Deployments**.

## Build config that must not change

**`package.json`**
```json
"build": "next build --webpack"
```

Turbopack (Next.js 16's default builder) runs out of memory building the
3,377-school detail pages plus the 34 MB JSON at import — measured on
laptop, VPS, and Hostinger. Webpack is the working path.

**Hostinger environment variable (set in the Web App UI):**
```
NODE_OPTIONS=--max-old-space-size=2048
```

Gives Node 2 GB of heap during build — the default (~1.5 GB) OOMs.

**`next.config.ts`:**
```ts
experimental: { workerThreads: false, cpus: 1 }
```

Bounds build memory by forcing single-worker generation. Also whitelists
`storage.googleapis.com/yaschools/**` for `<Image>` (school logos).

**Static + ISR strategy**
- Only the top 150 schools by rating × log(reviews) are statically
  generated at build time (`generateStaticParams` in
  `src/app/schools/[slug]/page.tsx`).
- All other schools render on-demand via `dynamicParams = true`.
- This keeps the build under memory limits while giving fast first-load
  for the popular schools.

## How to deploy

Just push to main:
```bash
git add -A
git commit -m "..."
git push origin main
```

## How to roll back

```bash
git revert <bad-sha>
git push origin main
```
Hostinger auto-deploys the reverted state within minutes.

## How to check logs

hPanel → **Websites → Manage → Deployments** → click the deployment → view build log.
Runtime logs are under the same section under "App logs".

## History note — VPS teardown (2026-04-28)

The project used to run on a shared VPS (`77.37.51.18`) at
`/home/fisool/htdocs/fisool.finalizat.com`, PM2-managed on port 3004,
with an nginx reverse-proxy and Let's Encrypt SSL. On 2026-04-28
we migrated to Hostinger and tore down the VPS instance:

```bash
pm2 delete fisool && pm2 save
rm /etc/nginx/sites-enabled/fisool.finalizat.com.conf
systemctl reload nginx
certbot delete --cert-name fisool.finalizat.com --non-interactive
rm -rf /home/fisool     # freed 2.8 GB
```

Other apps on that VPS (social-post, stocks, wzyfa, wr, wasil, etc.)
are untouched. `ssh vps` still works — just not for فصول.
