import OutCall "mo:caffeineai-http-outcalls/outcall";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import CycleTypes "../types/cycle-monitor";
import CycleCountersLib "./cycle-counters";

module {
  // Local wrapper around the caffeineai-http-outcalls helpers that lets each
  // call site pass an explicit maxResponseBytes. The upstream httpGetRequest /
  // httpPostRequest hardcode the 1 MB default (defaultMaxResponseBytes), which
  // bills the canister on the DECLARED maximum regardless of the actual
  // response size. Passing a value sized to the real payload keeps each outcall
  // cheap. .mops is never edited — this wrapper lives in src/backend. The
  // shared CycleCounters record is threaded through so every HTTPS outcall is
  // counted in one place.
  public func httpGetRequest(counters : CycleTypes.CycleCounters, url : Text, extraHeaders : [OutCall.Header], transform : OutCall.Transform, maxResponseBytes : Nat64) : async Text {
    CycleCountersLib.incOutcalls(counters);
    let httpResponse = await OutCall.httpRequest({
      url;
      method = #get;
      headers = extraHeaders;
      body = null;
      maxResponseBytes;
      transform;
    });
    httpResponse.body.decodeUtf8() ?? Runtime.trap("empty HTTP response");
  };

  public func httpPostRequest(counters : CycleTypes.CycleCounters, url : Text, extraHeaders : [OutCall.Header], body : Text, transform : OutCall.Transform, maxResponseBytes : Nat64) : async Text {
    CycleCountersLib.incOutcalls(counters);
    let headers = extraHeaders.concat([
      { name = "Idempotency-Key"; value = "Time-" # Time.now().toText() },
    ]);
    let httpResponse = await OutCall.httpRequest({
      url;
      method = #post;
      headers;
      body = ?(body.encodeUtf8());
      maxResponseBytes;
      transform;
    });
    httpResponse.body.decodeUtf8() ?? Runtime.trap("empty HTTP response");
  };
};
