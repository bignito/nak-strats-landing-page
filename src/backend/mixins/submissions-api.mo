import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Types "../types/submissions";
import PaymentServiceTypes "../types/payment-service";
import CycleTypes "../types/cycle-monitor";
import SubmissionsLib "../lib/submissions";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  cycleCounters : CycleTypes.CycleCounters,
  config : PaymentServiceTypes.PaymentServiceConfig,
  adminUsers : AdminTypes.AdminUsers,
  rateLimit : Types.RateLimitState,
) {
  // Public: submit an artist work for review. The submission is stored
  // OFF-canister in the payment service Postgres via HTTPS outcall, so the
  // shared bearer token is never exposed to the browser. Rejects a filled
  // honeypot field and rate-limits submissions per caller principal before the
  // outcall. On success the payment service sends the transactional
  // acknowledgement email to the submitter.
  public shared ({ caller }) func submitSubmission(input : Types.SubmissionInput) : async Result.Result<(), Types.SubmissionError> {
    await SubmissionsLib.submitSubmission(cycleCounters, config, rateLimit, input, caller, submissionServiceTransform);
  };

  // Admin-only: list submissions for the admin review view. Binds the caller at
  // the top, rejects the anonymous principal, and traps for a caller that is
  // not a non-anonymous member of the admin allowlist. The records are PII that
  // lives off-canister; the canister only proxies them through.
  public shared ({ caller }) func listSubmissions() : async Result.Result<[Types.SubmissionRecord], Types.SubmissionError> {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    await SubmissionsLib.listSubmissions(cycleCounters, config, submissionServiceTransform);
  };

  // HTTP outcall response transform for the payment service submission
  // endpoints: strips every response header so responses are identical across
  // replicas, returning only the stable JSON body.
  public query func submissionServiceTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
