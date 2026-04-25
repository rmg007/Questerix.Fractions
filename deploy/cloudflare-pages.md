# Cloudflare Pages — Deployment Notes

**Primary host for Questerix Fractions** (see `deploy/README.md` for the rationale).
Vercel and Netlify configs remain as alternates.

Header config is done via a `_headers` file in `public/` (Vite copies `public/`
verbatim into `dist/`, so the file lands at `dist/_headers` — exactly where
Cloudflare expects it). Same approach for `_redirects` (SPA fallback).

The `public/_headers` and `public/_redirects` files in this repo are already
configured. You do not need to recreate them.

---

## Build Settings (Cloudflare Dashboard)

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (leave blank) |
| Node.js version | 20 |

---

## Headers File

Create `public/_headers` with the content below. Vite copies `public/` into `dist/`
verbatim, so the file will be at `dist/_headers` after build — exactly where
Cloudflare Pages expects it.

```
/*
  Strict-Transport-Security: max-age=63072000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/manifest.json
  Cache-Control: no-cache
```

> CSP note: `connect-src 'self'` blocks all external fetch/XHR at the network level,
> enforcing the privacy-notice.md "no third parties" guarantee even if a library tries
> to phone home.

---

## Analytics

Cloudflare Web Analytics must be **disabled**. Per `docs/40-validation/privacy-notice.md`,
no data leaves the device. Do not enable it.

Dashboard: Workers & Pages → your project → Settings → Web Analytics → off.

---

## Custom Domain

Pages → your project → Custom domains → Add. Cloudflare handles the TLS certificate
automatically if the domain's DNS is managed by Cloudflare. If not, add a CNAME record
pointing to `<project>.pages.dev` and Cloudflare will provision a cert.

---

## SPA Fallback

Add `public/_redirects`:

```
/*  /index.html  200
```

This is the Cloudflare Pages convention for single-page apps.

---

## Verify Headers After Deploy

```bash
curl -I https://your-domain.com | grep -E 'Content-Security|X-Frame|Strict-Transport'
```
