# Deployment Guide — Questerix Fractions

## Why Static Hosting

Per **C1** (no backend until 2029), the app is a fully static PWA. There is no server-side logic, no database, no API. The build output (`dist/`) is a folder of HTML, JS, CSS, and JSON files that can be served by any CDN.

This also means:
- Zero server maintenance.
- Near-zero hosting cost at this traffic level.
- Atomic deploys (old version stays live until the new one passes the health check).
- No credentials or secrets in the deployed artifact — the Anthropic / Workers AI key used in `pipeline/` is a build-time-only tool and is never bundled.

---

## Recommended Host: Cloudflare Pages

**Why Cloudflare Pages over Vercel/Netlify:**

| Reason | Detail |
|--------|--------|
| **Privacy alignment** | No analytics enabled by default. Vercel and Netlify both ship analytics on by default and require opt-out per project. Per `docs/40-validation/privacy-notice.md` "no third parties," this is the cleanest fit. |
| **Bandwidth** | Unlimited on free and paid plans. Vercel free is capped at 100 GB/month. If a partner classroom shares the URL and it spikes, Cloudflare won't throttle or surprise-bill. |
| **Edge network** | 300+ POPs (largest of the three). Latency wins on mobile/cellular tested in classrooms. |
| **Workers AI integration** | The Anthropic-API content pipeline can route through Cloudflare Workers AI as an alternate provider — same billing account, AI Gateway gives caching/rate-limit/observability. See `pipeline/README.md`. |
| **Future runtime backend (post-2029)** | If/when C1 lifts in 2029, Workers + D1 + KV is a path that doesn't require host migration. Vercel-Functions is heavier and Vercel's pricing flips against you at scale. |

The user is already on a Cloudflare paid plan with Workers AI provisioned, so this is the chosen primary.

### Build settings (Cloudflare Dashboard)

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (blank) |
| Node.js version | 20 |
| Environment variables | none (none required at runtime) |

### Headers and redirects

Use the file-based config in `public/_headers` and `public/_redirects` (Vite copies `public/` into `dist/` verbatim, so the files land where Cloudflare expects them). See `deploy/cloudflare-pages.md` for the exact contents.

### Analytics — must remain off

Cloudflare Web Analytics must be **disabled**. Dashboard: Workers & Pages → project → Settings → Web Analytics → off.

This is non-negotiable per `docs/40-validation/privacy-notice.md`. If a future maintainer enables it without removing the privacy claim, they have created a lie.

### Workers AI for content pipeline (build-time only)

The `pipeline/` Python tool can call Cloudflare Workers AI instead of (or alongside) the Anthropic API:

- Endpoint: `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct` (Llama) or via the `@cf/anthropic/*` model slugs when those become GA.
- Billing rolls into the existing Cloudflare account.
- AI Gateway (Workers & Pages → AI Gateway) gives free request caching, rate limiting, cost dashboards, and a request log — useful when authoring 300+ templates.
- This is **build-time only**. It does not violate C1 because nothing in `dist/` calls it.

To switch, set `LLM_PROVIDER=cloudflare` and `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in `pipeline/.env`. See `pipeline/README.md` for the exact wiring.

### Deploy steps

1. Push the repo to GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Connect to Git → pick the repo.
3. Set the build settings from the table above.
4. Wait for the first build to succeed; verify it deploys to `<project>.pages.dev`.
5. Add a custom domain (Pages → project → Custom domains → Add). Cert is auto-provisioned.
6. Verify analytics is off (see above).
7. `curl -I https://your-domain.com | grep -E 'Content-Security|X-Frame|Strict-Transport'` — confirm headers.
8. Run Lighthouse on the live URL (target Performance ≥ 90, Accessibility = 100).
9. Run through `deploy/post-launch-checklist.md`.

---

## Alternate Hosts

These remain wired up in case Cloudflare ever has an outage or pricing change. The configs are kept current.

### Vercel
See `deploy/vercel.json`. Atomic deploys via Git push; headers via JSON. Free tier capped at 100 GB/month bandwidth.

**Disable on Vercel:**
- Vercel Analytics — Dashboard → Project → Settings → Analytics → off.
- Vercel Speed Insights — same.
- Vercel Web Vitals — same.

### Netlify
See `deploy/netlify.toml`. Equivalent security headers. Free tier.

**Disable on Netlify:** Site Settings → Analytics → disable.

---

## Domain Plan

Target: `questerix.com/fractions` (subdirectory) or `fractions.questerix.com` (subdomain).

- HTTPS is enforced automatically on all three hosts.
- The `_headers` / `vercel.json` / `netlify.toml` configs all set `Strict-Transport-Security` for 2 years.
- Never serve over plain HTTP.

---

## Security Headers

All three host configs send:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000` | Force HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `no-referrer` | No referrer leakage |
| `Content-Security-Policy` | see below | No third-party calls |

**CSP rationale** — per `docs/40-validation/privacy-notice.md` "no third parties":

```
default-src 'self';
img-src 'self' data:;
style-src 'self' 'unsafe-inline';
script-src 'self';
font-src 'self' data:;
connect-src 'self';
manifest-src 'self';
worker-src 'self'
```

`connect-src 'self'` blocks all external fetch/XHR. This enforces the privacy guarantee at the network layer — even if a dependency tried to phone home, the browser would block it.

---

## Environment Variables

None required at runtime. The app has no API keys in the client bundle. The LLM key used in `pipeline/` is:
1. A developer tool only.
2. Never bundled into `dist/`.
3. Should never be added to Cloudflare/Vercel/Netlify env vars for production.

---

## Lighthouse Targets

Per `docs/30-architecture/performance-budget.md`:
- Performance ≥ 85 (CI gate); target ≥ 90 for production.
- Accessibility = 100 (non-negotiable; per `docs/30-architecture/accessibility.md`).
- LCP ≤ 2.5 s on 4G throttle.
- Total transfer ≤ 1.0 MB gzipped.

Run a manual Lighthouse audit against the production URL after each deploy. See `deploy/post-launch-checklist.md`.
