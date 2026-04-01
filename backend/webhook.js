// ─── FREEMIUS WEBHOOK HANDLER ─────────────────────────────────────────────────
// This file handles all Freemius payment events.
// It is required by server.js and mounted at POST /webhook/freemius
//
// HOW IT WORKS:
//   1. Freemius sends a POST request to your webhook URL after any billing event
//   2. We verify the request signature using your FREEMIUS_SECRET_KEY
//   3. Depending on the event type we grant or revoke PRO access in the SQLite DB
//
// SETUP IN FREEMIUS DASHBOARD:
//   Go to: dashboard.freemius.com → Your Product → Settings → Webhooks
//   Add URL: https://YOUR_DOMAIN.com/webhook/freemius
//   Enable these events:
//     - license.created        → user bought a plan → grant PRO
//     - license.extended       → user renewed       → keep PRO
//     - license.cancelled      → user cancelled     → revoke PRO
//     - license.expired        → license expired    → revoke PRO
//     - payment.refund         → user got refunded  → revoke PRO
//     - subscription.renewal.failed → failed charge → log warning
//
// FREEMIUS CHECKOUT LINK (already wired in index.html):
//   https://checkout.freemius.com/product/26756/plan/44313/

import crypto from 'crypto'
import bodyParser from 'body-parser'

export function mountWebhook(app, db, FREEMIUS_SECRET_KEY) {
  // Must use raw body for signature verification
  app.post('/webhook/freemius', bodyParser.raw({ type: '*/*' }), (req, res) => {
    try {
      const rawBody = req.body.toString('utf8')

      // ── Signature verification ──────────────────────────────────────────────
      const signature = req.headers['x-signature'] || ''
      const expected = crypto
        .createHmac('sha256', FREEMIUS_SECRET_KEY)
        .update(rawBody)
        .digest('hex')

      // timing-safe compare — prevents timing attacks
      const sigBuf = Buffer.from(signature.padEnd(expected.length, '0').slice(0, expected.length))
      const expBuf = Buffer.from(expected)
      const valid = sigBuf.length === expBuf.length &&
        crypto.timingSafeEqual(sigBuf, expBuf)

      if (!valid) {
        console.warn('[Webhook] ❌ Invalid signature — request rejected')
        return res.status(200).send() // 200 so Freemius doesn't retry
      }

      const event = JSON.parse(rawBody)
      const userEmail = event.objects?.user?.email
      const license   = event.objects?.license
      const eventType = event.type

      console.log(`[Webhook] 📨 Event: ${eventType} | User: ${userEmail || 'unknown'}`)

      switch (eventType) {

        // ── GRANT PRO ─────────────────────────────────────────────────────────
        case 'license.created':
        case 'license.extended':
        case 'license.plan.changed': {
          if (!userEmail) break
          const expires = license?.expiration || null
          db.prepare(`
            INSERT INTO users (id, email, plan, license_id, license_expires)
            VALUES (?, ?, 'pro', ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              plan            = 'pro',
              license_id      = excluded.license_id,
              license_expires = excluded.license_expires
          `).run(userEmail, userEmail, license?.id || null, expires)
          console.log(`[Webhook] ✅ PRO granted → ${userEmail}`)
          break
        }

        // ── REVOKE PRO ────────────────────────────────────────────────────────
        case 'license.cancelled':
        case 'license.expired':
        case 'payment.refund':
        case 'subscription.cancelled': {
          if (!userEmail) break
          db.prepare(`
            UPDATE users
            SET plan = 'free', license_id = NULL, license_expires = NULL
            WHERE email = ?
          `).run(userEmail)
          console.log(`[Webhook] ❌ PRO revoked → ${userEmail}`)
          break
        }

        // ── WARNINGS ──────────────────────────────────────────────────────────
        case 'subscription.renewal.failed': {
          console.warn(`[Webhook] ⚠️  Renewal failed for ${userEmail} — grace period active`)
          break
        }

        default:
          console.log(`[Webhook] ℹ️  Unhandled event: ${eventType}`)
      }

      res.status(200).json({ received: true })

    } catch (err) {
      console.error('[Webhook] Error:', err.message)
      res.status(200).send() // Always 200 — Freemius retries on non-200
    }
  })
}
