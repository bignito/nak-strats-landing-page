import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // The artistic discipline a submission belongs to. Mirrors the select options
  // on the submission form (Music / Visual Art / Video / Writing / Other).
  public type Discipline = {
    #music;
    #visualArt;
    #video;
    #writing;
    #other;
  };

  // Input from the frontend submission form. The submission itself is stored
  // OFF-canister in the payment service Postgres; the canister only proxies it
  // through via HTTPS outcall. The email address and personal name are PII and
  // are never persisted in canister state.
  public type SubmissionInput = {
    name : Text;
    email : Text;
    discipline : Discipline;
    link : Text;
    // Optional message, max 1000 characters. `null` when the submitter left it
    // blank.
    message : ?Text;
    // Optional marketing consent flag. The checkbox is UNTICKED by default; the
    // frontend sends the submitter's explicit choice. When true, a timestamp is
    // recorded so the consent is defensible.
    marketingConsent : Bool;
    // Unix timestamp (nanoseconds, matching Time.now()) at which consent was
    // given. `null` when the submitter did not opt in.
    marketingConsentAt : ?Int;
    // Honeypot field hidden from real users. A filled value indicates a bot and
    // the submission is rejected before any outcall is made.
    honeypot : Text;
  };

  // A submission record as returned for admin listing. The canister proxies the
  // payment service's GET /submissions response; the record carries the fields
  // the admin view renders.
  public type SubmissionRecord = {
    id : Text;
    name : Text;
    email : Text;
    discipline : Discipline;
    link : Text;
    message : ?Text;
    marketingConsent : Bool;
    marketingConsentAt : ?Int;
    // Unix timestamp (nanoseconds since the Unix epoch) at which the submission
    // was received by the payment service.
    submittedAt : Int;
  };

  // Per-principal rate-limit state (stable, held in canister). Maps a caller
  // principal to the timestamps of its recent submissions so the canister can
  // reject a burst of submissions from the same principal, complementing the
  // payment service's per-IP limit (the canister cannot see client IPs).
  public type RateLimitState = {
    var submissions : Map.Map<Principal, [Int]>;
  };

  public type SubmissionError = {
    #notConfigured : Text;
    #outcallFailed : Text;
    #invalidResponse : Text;
    #honeypot;
    #rateLimited;
    #invalidInput : Text;
  };
};
