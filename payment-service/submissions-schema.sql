-- NAK STRATS — artist submissions table.
--
-- Run this once against your Railway Postgres (the service's DATABASE_URL).
-- The canister routes submissions through the payment service via HTTPS
-- outcall; the service stores them here and sends the acknowledgement email.
--
-- PII note: an email address plus a personal name is PII with the same
-- replication exposure as customer data, so submissions live in the external
-- payment service's Postgres, NOT in canister state.

CREATE TABLE IF NOT EXISTS submissions (
  id            BIGSERIAL   PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  discipline    TEXT        NOT NULL,
  link          TEXT        NOT NULL,
  message       TEXT,
  consent       BOOLEAN     NOT NULL DEFAULT FALSE,
  consented_at  TIMESTAMPTZ,
  honeypot      TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the admin review list (ordered by newest first).
CREATE INDEX IF NOT EXISTS submissions_created_at_idx
  ON submissions (created_at DESC);
