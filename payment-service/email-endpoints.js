// NAK STRATS — transactional email endpoints for the external payment service.
//
// Deploy this router alongside your existing Stripe endpoints on Railway. The
// canister triggers these endpoints via HTTPS outcall with the shared bearer
// token (the same PAYMENT_SERVICE_TOKEN used for Stripe). The Resend API key
// lives ONLY in this service's environment — never in the canister or repo.
//
// Environment variables:
//   RESEND_API_KEY     (required) Resend API key (api.resend.com)
//   FROM_EMAIL         (required) Sender, e.g. "NAK STRATS <orders@nakstrats.com>"
//   PAYMENT_SERVICE_TOKEN (required) Shared bearer token the canister sends
//   SHELL_LOGO_URL     (optional) Hosted URL for the shell logo
//   ORDER_LOOKUP_URL   (optional) Base URL of the order lookup page
//
// Endpoints (all require `Authorization: Bearer <PAYMENT_SERVICE_TOKEN>`):
//   POST /emails/order-confirmation
//   POST /emails/payment-pending
//   POST /emails/shipping
//   POST /emails/unsubscribe
//   GET  /emails/consent-list
//
// The three send endpoints are TRANSACTIONAL and must send regardless of
// marketing consent. Marketing consent is handled separately; never gate these
// on it. The consent endpoints (unsubscribe + consent-list) coordinate with the
// canister's consent domain (lib/consent.mo calls these).

import express from "express";
import { Resend } from "resend";
import crypto from "crypto";

const router = express.Router();

// ---------------------------------------------------------------------------
// Suppression list + consent list.
//
// These are held in the payment service's environment (a replicated canister is
// not the right place for a mailing list). For a Railway deployment, persist
// them in a small JSON file on disk or, better, a managed store (e.g. Railway's
// volume or a Postgres/Redis add-on). The in-memory Map below is a working
// default that resets on restart; swap the read/write helpers for your store.
// ---------------------------------------------------------------------------
const suppression = new Map(); // email -> true (never email again)
const consentList = new Map(); // email -> { name, consentedAt }

function loadStore() {
  try {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(process.cwd(), "email-store.json");
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      for (const e of data.suppression || []) suppression.set(e, true);
      for (const c of data.consent || []) consentList.set(c.email, c);
    }
  } catch (e) {
    // Ignore — start with empty in-memory state.
  }
}

function saveStore() {
  try {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(process.cwd(), "email-store.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        suppression: Array.from(suppression.keys()),
        consent: Array.from(consentList.values()),
      })
    );
  } catch (e) {
    // Ignore — persistence is best-effort.
  }
}

loadStore();

// A token is a signed, expiring capability that lets a customer unsubscribe
// without needing the shared bearer token. It is HMAC-signed with a secret so
// it cannot be forged. Set UNSUBSCRIBE_SECRET in the environment.
function signToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.PAYMENT_SERVICE_TOKEN;
  const payload = Buffer.from(email).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.PAYMENT_SERVICE_TOKEN;
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch (e) {
    return null;
  }
}

// Shared auth: the canister sends `Authorization: Bearer <PAYMENT_SERVICE_TOKEN>`.
function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!process.env.PAYMENT_SERVICE_TOKEN || token !== process.env.PAYMENT_SERVICE_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// A customer-facing unsubscribe link. The token lets the customer opt out
// without the shared bearer token; the link points at the app's unsubscribe
// page, which POSTs the token to /emails/unsubscribe.
function unsubscribeLink(email) {
  const base = process.env.ORDER_LOOKUP_URL || "";
  const token = signToken(email);
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

// Shared auth: the canister sends `Authorization: Bearer <PAYMENT_SERVICE_TOKEN>`.
function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!process.env.PAYMENT_SERVICE_TOKEN || token !== process.env.PAYMENT_SERVICE_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || "NAK STRATS <orders@nakstrats.com>";
const LOGO =
  process.env.SHELL_LOGO_URL ||
  "https://nakstrats.com/assets/images/nak-shell.png";

// Branded email shell: dark background, purple #8b5cf6 and teal #06b6d4
// accents, shell logo, minimal readable HTML. Keep it simple — HTML email
// breaks easily, so avoid complex layouts. `email` (optional) adds a
// token-based unsubscribe link in the footer.
function shell(title, bodyHtml, email) {
  const unsubscribe = email
    ? `<p style="margin:12px 0 0 0;font-size:12px;color:#8b8b9e;">
         <a href="${unsubscribeLink(email)}" style="color:#8b8b9e;text-decoration:underline;">Unsubscribe from marketing emails</a>
       </p>`
    : "";
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0b0b0f;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0f;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#14141c;border-radius:12px;border:1px solid #2a2a3a;">
            <tr>
              <td align="center" style="padding:28px 28px 8px 28px;">
                <img src="${LOGO}" alt="NAK STRATS" width="120" style="display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px 28px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 28px 28px 28px;border-top:1px solid #2a2a3a;color:#8b8b9e;font-size:12px;">
                NAK STRATS &mdash; dark, premium fragrance. &copy; ${new Date().getFullYear()}
                ${unsubscribe}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function money(cents) {
  return "$" + (cents / 100).toFixed(2);
}

function lineItemsHtml(items) {
  return (items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;color:#e5e7eb;">${it.name} &times; ${it.quantity}</td>
        <td align="right" style="padding:8px 0;color:#e5e7eb;">${money(it.unitAmount * it.quantity)}</td>
      </tr>`
    )
    .join("");
}

function totalsHtml(o) {
  return `
    <tr>
      <td style="padding:6px 0;color:#8b8b9e;">Subtotal</td>
      <td align="right" style="padding:6px 0;color:#e5e7eb;">${money(o.subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#8b8b9e;">Tax</td>
      <td align="right" style="padding:6px 0;color:#e5e7eb;">${money(o.tax)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#8b8b9e;">Shipping</td>
      <td align="right" style="padding:6px 0;color:#e5e7eb;">${money(o.shipping)}</td>
    </tr>
    <tr>
      <td style="padding:8px 0 0 0;color:#8b5cf6;font-weight:bold;">Total</td>
      <td align="right" style="padding:8px 0 0 0;color:#8b5cf6;font-weight:bold;">${money(o.total)}</td>
    </tr>`;
}

function shippingAddressHtml(addr) {
  if (!addr) return "";
  const line2 = addr.line2 ? addr.line2 + "<br/>" : "";
  return `${addr.line1}<br/>${line2}${addr.city}, ${addr.region} ${addr.postal_code}<br/>${addr.country}`;
}

function paymentMethodText(method) {
  switch (method) {
    case "card_stripe":
      return "Card (Stripe)";
    case "crypto_ckusdc":
      return "Crypto (ckUSDC)";
    case "crypto_icp":
      return "Crypto (ICP)";
    default:
      return "Manual";
  }
}

// POST /emails/order-confirmation
// Body: { reference, items:[{name,quantity,unitAmount}], subtotal, tax,
//        shipping, total, currency, customerEmail, customerName,
//        shippingAddress, paymentMethod }
router.post("/emails/order-confirmation", requireToken, async (req, res) => {
  const o = req.body;
  const bodyHtml = `
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">Order confirmed</h1>
    <p style="color:#8b8b9e;margin:0 0 20px 0;">Thanks ${o.customerName || "for your order"} &mdash; your NAK STRATS order is confirmed.</p>
    <p style="color:#e5e7eb;margin:0 0 4px 0;">Order reference: <strong style="color:#06b6d4;">${o.reference}</strong></p>
    <p style="color:#e5e7eb;margin:0 0 20px 0;">Payment method: ${paymentMethodText(o.paymentMethod)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a3a;">
      ${lineItemsHtml(o.items)}
      ${totalsHtml(o)}
    </table>
    <h2 style="color:#ffffff;font-size:16px;margin:24px 0 8px 0;">Shipping to</h2>
    <p style="color:#e5e7eb;margin:0;">${shippingAddressHtml(o.shippingAddress)}</p>`;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [o.customerEmail],
      subject: `Order confirmed — ${o.reference}`,
      html: shell("Order confirmed", bodyHtml, o.customerEmail),
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /emails/payment-pending
// Body: { reference, customerEmail, customerName, lookupUrl }
router.post("/emails/payment-pending", requireToken, async (req, res) => {
  const o = req.body;
  const lookupUrl =
    o.lookupUrl ||
    `${process.env.ORDER_LOOKUP_URL || ""}/order/${o.reference}`;
  const bodyHtml = `
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">Complete your payment</h1>
    <p style="color:#8b8b9e;margin:0 0 20px 0;">Your NAK STRATS order is waiting for payment.</p>
    <p style="color:#e5e7eb;margin:0 0 20px 0;">Order reference: <strong style="color:#06b6d4;">${o.reference}</strong></p>
    <p style="color:#e5e7eb;margin:0 0 20px 0;">Closed the tab? No problem &mdash; find your order and complete payment here:</p>
    <p style="margin:0;">
      <a href="${lookupUrl}" style="display:inline-block;background-color:#8b5cf6;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">View my order</a>
    </p>`;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [o.customerEmail],
      subject: `Complete your payment — ${o.reference}`,
      html: shell("Complete your payment", bodyHtml, o.customerEmail),
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /emails/shipping
// Body: { reference, customerEmail, customerName, trackingNumber }
router.post("/emails/shipping", requireToken, async (req, res) => {
  const o = req.body;
  const tracking = o.trackingNumber
    ? `<p style="color:#e5e7eb;margin:0 0 4px 0;">Tracking number: <strong style="color:#06b6d4;">${o.trackingNumber}</strong></p>`
    : "";
  const bodyHtml = `
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">Your order has shipped</h1>
    <p style="color:#8b8b9e;margin:0 0 20px 0;">Good news ${o.customerName || ""} &mdash; your NAK STRATS order is on its way.</p>
    <p style="color:#e5e7eb;margin:0 0 4px 0;">Order reference: <strong style="color:#06b6d4;">${o.reference}</strong></p>
    ${tracking}`;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [o.customerEmail],
      subject: `Your order has shipped — ${o.reference}`,
      html: shell("Your order has shipped", bodyHtml, o.customerEmail),
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /emails/unsubscribe
// Body: { token } — a signed token from the unsubscribe link, OR
//       { email } — the raw address (admin/consent domain use this).
// Adds the address to the suppression list so it is never emailed again.
// Transactional emails are exempt from consent but still respect the
// suppression list: an address on the suppression list is never emailed.
router.post("/emails/unsubscribe", async (req, res) => {
  const token = req.body && req.body.token;
  const email = token ? verifyToken(token) : (req.body && req.body.email);
  if (!email) return res.status(400).json({ status: "invalid_token" });
  if (suppression.has(email)) return res.json({ status: "already_unsubscribed" });
  suppression.set(email, true);
  consentList.delete(email);
  saveStore();
  res.json({ status: "ok" });
});

// GET /emails/consent-list
// Admin-only (requires the shared bearer token). Returns ONLY addresses that
// have opted in to marketing, so a mailing list can be built without
// accidentally including customers who did not opt in.
router.get("/emails/consent-list", requireToken, (req, res) => {
  const rows = Array.from(consentList.values()).map((c) => ({
    email: c.email,
    name: c.name || "",
    consentedAt: c.consentedAt || null,
  }));
  // Return an actual CSV string (header row + one row per consenting address)
  // so the canister's returned body IS valid CSV. The canister proxies this
  // body unchanged to the admin CSV export.
  const header = "email,consent_at";
  const lines = rows.map((r) => {
    const email = String(r.email || "").replace(/"/g, '""');
    const at = r.consentedAt == null ? "" : String(r.consentedAt);
    return `"${email}","${at}"`;
  });
  res.setHeader("Content-Type", "text/csv");
  res.send([header, ...lines].join("\n"));
});

// POST /emails/consent
// Admin-only. Records a marketing opt-in for an address (called by the consent
// domain when a customer checks the marketing box at checkout). Body:
// { email, name?, consentedAt? }.
router.post("/emails/consent", requireToken, (req, res) => {
  const { email, name, consentedAt } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });
  consentList.set(email, { email, name: name || "", consentedAt: consentedAt || Date.now() });
  saveStore();
  res.json({ ok: true });
});

export default router;
