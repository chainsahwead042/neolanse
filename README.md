# ⚡ LanceIt — YouTube Creator Lead Engine

Black-and-neon-yellow tool for finding YouTube creator leads and extracting contact info.

---

## Files

```
lanceit/
├── index.html     ← entire frontend (one file)
├── server.js      ← Express backend (API + static serving)
├── webhook.js     ← Freemius payment webhook logic
├── .env           ← your API keys (never commit)
├── .gitignore
└── package.json
```

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Check your `.env`**
```
YOUTUBE_API_KEY=AIzaSyDYzxlOy2nt0OHToP0_pOXs-mjK6_V1QHI
FREEMIUS_SECRET_KEY=merafreemius   ← replace with your real key
PORT=3001
```
Get your Freemius secret key from:  
`dashboard.freemius.com → Your Product → Settings → Secret Key`

**3. Run**
```bash
npm start
```
Then open → **http://localhost:3001**

---

## Freemius Webhook Setup

After deploying to a live domain, go to:  
`dashboard.freemius.com → Your Product → Settings → Webhooks`

Add this URL:
```
https://YOUR_DOMAIN.com/webhook/freemius
```

Enable these events:
| Event | Effect |
|-------|--------|
| `license.created` | Grants PRO access |
| `license.extended` | Keeps PRO active |
| `license.cancelled` | Revokes PRO access |
| `license.expired` | Revokes PRO access |
| `payment.refund` | Revokes PRO access |
| `subscription.renewal.failed` | Logs warning (grace period) |

See `webhook.js` for the full implementation and comments.

---

## Checkout Links

Already wired into the "Get Pro" buttons in `index.html`:
```
Monthly:  https://checkout.freemius.com/product/26756/plan/44313/?billing_cycle=monthly
Yearly:   https://checkout.freemius.com/product/26756/plan/44313/?billing_cycle=annual
Lifetime: https://checkout.freemius.com/product/26756/plan/44313/?billing_cycle=lifetime
```

---

## Free vs Pro

| | Free | Pro |
|--|------|-----|
| Total searches | 10 | Unlimited |
| Results per search | 5 | All |
| CSV export | 5 rows | All rows |

---

## Deploying

Deploy to Railway, Render, or Fly.io:
- Set env vars: `YOUTUBE_API_KEY`, `FREEMIUS_SECRET_KEY`, `PORT`
- Run command: `npm start`
- No build step needed — `index.html` is served statically by Express
# Trigger redeploy
