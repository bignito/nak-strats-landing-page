// NAK STRATS — artist submission endpoints for the external payment service.
//
// Deploy this router alongside your existing Stripe + email endpoints on
// Railway. The canister triggers these endpoints via HTTPS outcall with the
// shared bearer token (the same PAYMENT_SERVICE_TOKEN used for Stripe). The
// Resend API key and DATABASE_URL live ONLY in this service's environment —
// never in the canister or repo.
//
// Environment variables:
//   RESEND_API_KEY            (required) Resend API key (api.resend.com)
//   FROM_EMAIL                (required) Sender, e.g. "NAK STRATS <orders@naktoken.lol>"
//   PAYMENT_SERVICE_TOKEN     (required) Shared bearer token the canister sends
//   DATABASE_URL              (required) Postgres connection string (Railway)
//   SUBMISSIONS_ADMIN_EMAIL   (optional) Internal notification recipient
//   SUBMISSIONS_REPLY_TO      (optional) Reply-to on the ack email (default culture@naktoken.lol)
//   SHELL_LOGO_URL            (optional) Hosted URL for the shell logo
//   SUBMISSIONS_RATE_LIMIT    (optional) Max submissions per IP per window (default 5)
//   SUBMISSIONS_RATE_WINDOW_MS (optional) Window length in ms (default 3600000 = 1h)
//
// Endpoints (both require `Authorization: Bearer <PAYMENT_SERVICE_TOKEN>`):
//   POST /submissions  — store a submission, send the acknowledgement email to
//                        the submitter + an internal admin notification
//   GET  /submissions  — list submissions for admin review
//
// The acknowledgement email is TRANSACTIONAL (a direct response to the
// submitter's action) so it does not require marketing consent. Submission
// addresses are NEVER added to any marketing list. The optional consent
// checkbox is stored separately (consent + consented_at) only when ticked.

import express from "express";
import { Resend } from "resend";
import pg from "pg";

const { Pool } = pg;
const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || "NAK STRATS <orders@naktoken.lol>";
const REPLY_TO = process.env.SUBMISSIONS_REPLY_TO || "culture@naktoken.lol";
const ADMIN_EMAIL = process.env.SUBMISSIONS_ADMIN_EMAIL || "";
const LOGO =
  process.env.SHELL_LOGO_URL ||
  "https://nakstrats.com/assets/images/nak-shell.png";

const DISCIPLINES = ["Music", "Visual Art", "Video", "Writing", "Other"];

// Shared auth: the canister sends `Authorization: Bearer <PAYMENT_SERVICE_TOKEN>`.
function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!process.env.PAYMENT_SERVICE_TOKEN || token !== process.env.PAYMENT_SERVICE_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Per-IP rate limiting (in-memory; resets on restart). No CAPTCHA — a public
// form should not add friction for the artists we are trying to attract.
const rateLimit = new Map(); // ip -> [timestamps]
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = Number(process.env.SUBMISSIONS_RATE_WINDOW_MS) || 3600000;
  const max = Number(process.env.SUBMISSIONS_RATE_LIMIT) || 5;
  const recent = (rateLimit.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  rateLimit.set(ip, recent);
  return true;
}

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function isValidUrl(url) {
  try {
    const u = new URL(String(url || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Dark institutional email shell with a small shell mark. Keep the HTML simple
// — complex email HTML breaks across clients.
function shell(title, bodyHtml) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0b0b0f;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0f;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#14141c;border-radius:12px;border:1px solid #2a2a3a;">
            <tr>
              <td align="center" style="padding:28px 28px 8px 28px;">
                <img src="${esc(LOGO)}" alt="N.A.K." width="96" style="display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px 28px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 28px 28px 28px;border-top:1px solid #2a2a3a;color:#8b8b9e;font-size:12px;">
                N.A.K. &mdash; &copy; ${new Date().getFullYear()}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// POST /submissions
// Body: { name, email, discipline, link, message?, consent?, company? }
//   company is the HONEYPOT field — hidden from users, bots fill it in.
router.post("/submissions", requireToken, async (req, res) => {
  const b = req.body || {};

  // Honeypot: if the hidden field has a value it is a bot. Silently accept
  // (return success) but do NOT store or email — don't tip off the bot.
  if (b.company || b.website || b.homepage) {
    return res.json({ ok: true, honeypot: true });
  }

  // Per-IP rate limiting.
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "rate_limited" });
  }

  // Validate payload.
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const discipline = String(b.discipline || "").trim();
  const link = String(b.link || "").trim();
  const message = b.message == null ? "" : String(b.message).trim();
  const consent = b.consent === true;

  if (!name) return res.status(400).json({ error: "name required" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "invalid email" });
  if (!DISCIPLINES.includes(discipline)) return res.status(400).json({ error: "invalid discipline" });
  if (!isValidUrl(link)) return res.status(400).json({ error: "invalid link" });
  if (message.length > 1000) return res.status(400).json({ error: "message too long" });

  const consentedAt = consent ? new Date().toISOString() : null;

  try {
    const result = await getPool().query(
      `INSERT INTO submissions (name, email, discipline, link, message, consent, consented_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [name, email, discipline, link, message || null, consent, consentedAt]
    );
    const row = result.rows[0];

    // Transactional acknowledgement to the submitter (no marketing consent
    // needed — it is a direct response to their action).
    const bodyHtml = `
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">We received your submission</h1>
      <p style="color:#8b8b9e;margin:0 0 20px 0;">Thanks ${esc(name)} &mdash; your work is with us.</p>
      <p style="color:#e5e7eb;margin:0 0 4px 0;">Name: <strong style="color:#06b6d4;">${esc(name)}</strong></p>
      <p style="color:#e5e7eb;margin:0 0 4px 0;">Discipline: <strong style="color:#06b6d4;">${esc(discipline)}</strong></p>
      <p style="color:#e5e7eb;margin:0 0 20px 0;">Link: <a href="${esc(link)}" style="color:#8b5cf6;">${esc(link)}</a></p>
      <p style="color:#8b8b9e;margin:0;">We review submissions as we grow the roster. We will reach out if there is a fit.</p>`;

    const ack = await resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: REPLY_TO,
      subject: "We received your submission — N.A.K.",
      html: shell("We received your submission", bodyHtml),
    });
    if (ack.error) {
      // The submission is stored; a failed ack email should not lose it.
      console.error("ack email failed:", ack.error.message);
    }

    // Internal notification to a configurable admin address.
    if (ADMIN_EMAIL) {
      const adminHtml = `
        <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">New submission</h1>
        <p style="color:#e5e7eb;margin:0 0 4px 0;">Name: <strong style="color:#06b6d4;">${esc(name)}</strong></p>
        <p style="color:#e5e7eb;margin:0 0 4px 0;">Email: <strong style="color:#06b6d4;">${esc(email)}</strong></p>
        <p style="color:#e5e7eb;margin:0 0 4px 0;">Discipline: <strong style="color:#06b6d4;">${esc(discipline)}</strong></p>
        <p style="color:#e5e7eb;margin:0 0 4px 0;">Link: <a href="${esc(link)}" style="color:#8b5cf6;">${esc(link)}</a></p>
        ${message ? `<p style="color:#e5e7eb;margin:0 0 4px 0;">Message: ${esc(message)}</p>` : ""}
        <p style="color:#8b8b9e;margin:12px 0 0 0;">Submitted ${new Date(row.created_at).toISOString()}</p>`;
      const notif = await resend.emails.send({
        from: FROM,
        to: [ADMIN_EMAIL],
        replyTo: REPLY_TO,
        subject: `New submission — ${name}`,
        html: shell("New submission", adminHtml),
      });
      if (notif.error) {
        console.error("admin notification failed:", notif.error.message);
      }
    }

    res.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("submission insert failed:", e.message);
    res.status(500).json({ error: "storage_failed" });
  }
});

// GET /submissions
// Admin-only (requires the shared bearer token). Returns submissions for review.
router.get("/submissions", requireToken, async (req, res) => {
  try {
    const result = await getPool().query(
      `SELECT id, name, email, discipline, link, message, consent, consented_at, created_at
       FROM submissions
       ORDER BY created_at DESC`
    );
    res.json({ submissions: result.rows });
  } catch (e) {
    console.error("submission list failed:", e.message);
    res.status(500).json({ error: "storage_failed" });
  }
});

export default router;
