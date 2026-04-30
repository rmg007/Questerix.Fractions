# Cloudflare Pages — Deployment Guide

**Live URL:** https://fractions.questerix.com  
**Pages project:** `questerix-fractions` → `questerix-fractions.pages.dev`  
**CNAME:** `fractions.questerix.com` → `questerix-fractions.pages.dev` (Cloudflare proxy)

---

## How to Deploy

**Canonical: push to `main`.** GitHub Actions runs the full pipeline
(`.github/workflows/deploy.yml`). Required repo secrets:

| Secret                  | Where to get it                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | dash.cloudflare.com → My Profile → API Tokens → Create Token → permissions: `Account.Cloudflare Pages:Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | `1ad655f025b0db1974614aac7ebec10a` (also visible in dash sidebar)                                           |

**Manual fallback (from your machine):**

```bash
npm run deploy
```

**What it does automatically:**

| Stage        | Steps                                                                                                     | Blocks on failure? |
| ------------ | --------------------------------------------------------------------------------------------------------- | ------------------ |
| `predeploy`  | typecheck → lint → unit tests (173) → curriculum schema validation → build → bundle size guard (≤1 MB gz) | Yes                |
| `deploy`     | `wrangler pages deploy dist` → Cloudflare Pages                                                           | Yes                |
| `postdeploy` | 18 live checks (see below)                                                                                | Reports only       |

To target a preview deployment instead of production:

```bash
DEPLOY_URL=https://<hash>.questerix-fractions.pages.dev node scripts/postdeploy-check.mjs
```

---

## Post-Deploy Checks (18 total)

`scripts/postdeploy-check.mjs` verifies the live site after every deploy:

| Check                               | What it catches                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Root HTTP 200                       | Site is up                                                                             |
| 5 security headers                  | HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy                    |
| `/sw.js` — JS MIME                  | Service worker reachable as JavaScript (not SPA fallback HTML)                         |
| `/registerSW.js` — JS MIME          | SW registration script reachable (not SPA fallback HTML)                               |
| `/manifest.json` — JSON MIME        | Web app manifest reachable                                                             |
| `/manifest.webmanifest` — JSON MIME | Alias rewrite working (`_redirects` rule)                                              |
| `/curriculum/v1.json` — JSON MIME   | Curriculum data reachable                                                              |
| SPA fallback                        | Unknown paths return `200 text/html` (not 404)                                         |
| No CF Analytics beacon              | `cloudflareinsights.com` absent from HTML (privacy constraint C4)                      |
| LCP splash present                  | `#splash` + `<h1>` in HTML for instant first paint                                     |
| Build SHA + time                    | Verify which commit is actually live                                                   |
| A11yLayer shipped                   | Walks code-split chunks for DOM-parallel a11y button markers                           |
| No restrictive COEP                 | `cross-origin-embedder-policy: require-corp` would break IndexedDB in embedded testers |

---

## First-Time Setup (already done — for reference)

```bash
# 1. Create the Pages project
npx wrangler pages project create questerix-fractions --production-branch main

# 2. Deploy
npm run deploy

# 3. Add custom domain via API (CNAME must already exist)
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/pages/projects/questerix-fractions/domains" \
  -H "Authorization: Bearer <CF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"fractions.questerix.com"}'

# 4. Wait for domain to go active (~30–60 seconds), then run:
node scripts/postdeploy-check.mjs
```

---

## Static Files in `public/`

Vite copies `public/` verbatim into `dist/`. These files must stay in sync with any CSP or routing changes:

| File                   | Purpose                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `public/_headers`      | Security headers + MIME types per path                                              |
| `public/_redirects`    | SPA fallback + `/manifest.webmanifest` rewrite                                      |
| `public/registerSW.js` | Service worker registration (vite-plugin-pwa v0.21 doesn't emit this automatically) |
| `public/manifest.json` | PWA manifest                                                                        |

---

## Current `_headers`

```
/*
  Strict-Transport-Security: max-age=63072000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin-allow-popups

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/registerSW.js
  Cache-Control: no-cache, no-store, must-revalidate

/manifest.json
  Cache-Control: no-cache
  Content-Type: application/json; charset=utf-8
```

> CSP `script-src 'self'` intentionally blocks Cloudflare Analytics and any other
> external scripts. Do **not** add `cloudflareinsights.com` to `script-src` — this
> would violate the COPPA/privacy constraint (no data leaves the device).

---

## Current `_redirects`

```
/manifest.webmanifest  /manifest.json  200
/*  /index.html  200
```

The first rule rewrites `/manifest.webmanifest` → `/manifest.json` (vite-plugin-pwa
injects a `<link rel="manifest" href="/manifest.webmanifest">` tag but only generates
`manifest.json`). Order matters — more specific rules must come before `/*`.

---

## Analytics — Must Stay Disabled

Cloudflare Web Analytics is **disabled** on this project (done via API on 2026-04-28).
Per `docs/40-validation/privacy-notice.md`, no data leaves the device.

**Do not re-enable it.** The postdeploy check will fail if the beacon appears in the HTML.

To verify it stays off:

```bash
curl -s https://fractions.questerix.com | grep -c cloudflareinsights
# must print 0
```

---

## Known Browser Warnings (not errors)

| Warning                                 | Why                                        | Action needed                           |
| --------------------------------------- | ------------------------------------------ | --------------------------------------- |
| `AudioContext was not allowed to start` | Browser requires user gesture before audio | None — Phaser handles this on first tap |
