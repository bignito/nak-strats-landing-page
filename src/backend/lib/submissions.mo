import Result "mo:core/Result";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Error "mo:core/Error";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Types "../types/submissions";
import PaymentServiceTypes "../types/payment-service";
import OutCall "mo:caffeineai-http-outcalls/outcall";

module {
  // Per-principal rate limit: at most `rateLimitMax` submissions per caller
  // principal within `rateLimitWindowNanos`. This complements the payment
  // service's per-IP limit — the canister cannot see client IPs, so it limits
  // by the caller's principal instead.
  let rateLimitWindowNanos : Int = 3_600_000_000_000; // 1 hour
  let rateLimitMax : Nat = 5;

  // Extract the unquoted value of a string field from a flat JSON object.
  // e.g. jsonStringField("{\"a\":\"x\",\"b\":\"y\"}", "a") == ?"x".
  func jsonStringField(json : Text, field : Text) : ?Text {
    let key = "\"" # field # "\":\"";
    let parts = json.split(#text key);
    switch (parts.next()) {
      case null { null };
      case (?_) {
        switch (parts.next()) {
          case null { null };
          case (?rest) {
            switch (rest.split(#text "\"").next()) {
              case null { null };
              case (?value) { ?value };
            };
          };
        };
      };
    };
  };

  // Extract a boolean field value ("true"/"false") from a flat JSON object.
  func jsonBoolField(json : Text, field : Text) : ?Bool {
    let key = "\"" # field # "\":";
    let parts = json.split(#text key);
    switch (parts.next()) {
      case null { null };
      case (?_) {
        switch (parts.next()) {
          case null { null };
          case (?rest) {
            let trimmed = rest.trimStart(#char ' ');
            if (trimmed.startsWith(#text "true")) { ?true }
            else if (trimmed.startsWith(#text "false")) { ?false }
            else { null };
          };
        };
      };
    };
  };

  // Map a Discipline variant to the display string the payment service stores
  // and the acknowledgement email echoes back.
  func disciplineToText(d : Types.Discipline) : Text {
    switch (d) {
      case (#music) { "Music" };
      case (#visualArt) { "Visual Art" };
      case (#video) { "Video" };
      case (#writing) { "Writing" };
      case (#other) { "Other" };
    };
  };

  // Map the payment service's display string back to a Discipline variant.
  func parseDiscipline(s : Text) : ?Types.Discipline {
    switch (s) {
      case "Music" { ?#music };
      case "Visual Art" { ?#visualArt };
      case "Video" { ?#video };
      case "Writing" { ?#writing };
      case "Other" { ?#other };
      case _ { null };
    };
  };

  func isValidEmail(email : Text) : Bool {
    let at = email.split(#text "@");
    switch (at.next()) {
      case null { false };
      case (?local) {
        if (local == "") { false }
        else {
          switch (at.next()) {
            case null { false };
            case (?domain) {
              domain.contains(#text ".") and not email.contains(#char ' ')
            };
          };
        };
      };
    };
  };

  func isValidUrl(url : Text) : Bool {
    url.startsWith(#text "http://") or url.startsWith(#text "https://")
  };

  // Days since the Unix epoch for a civil date (Howard Hinnant's algorithm).
  // Computed in Int to avoid Nat underflow; only called with real dates
  // (year >= 2026).
  func daysFromCivil(y : Nat, m : Nat, d : Nat) : Int {
    let yi = y.toInt();
    let mi = m.toInt();
    let di = d.toInt();
    let yy = if (mi <= 2) { yi - 1 } else { yi };
    let era = yy / 400;
    let yoe = yy - era * 400;
    let mp = (mi + 9) % 12;
    let doy = (153 * mp + 2) / 5 + di - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468;
  };

  // Parse an ISO-8601 UTC timestamp ("YYYY-MM-DDTHH:MM:SS[.fff]Z") into
  // nanoseconds since the Unix epoch, matching Time.now().
  func parseIsoNanos(s : Text) : ?Int {
    let parts = s.split(#text "T");
    switch (parts.next()) {
      case null { null };
      case (?datePart) {
        switch (parts.next()) {
          case null { null };
          case (?timePart) {
            let d = datePart.split(#text "-");
            let y = d.next();
            let mo = d.next();
            let da = d.next();
            switch (y, mo, da) {
              case (?y, ?mo, ?da) {
                let t = timePart.split(#text "Z").next();
                switch (t) {
                  case null { null };
                  case (?t0) {
                    let hms = t0.split(#text ":");
                    let h = hms.next();
                    let mi = hms.next();
                    let secPart = hms.next();
                    switch (h, mi, secPart) {
                      case (?h, ?mi, ?secPart) {
                        let sp = secPart.split(#text ".");
                        let sec = sp.next();
                        let frac = sp.next();
                        switch (sec) {
                          case null { null };
                          case (?secStr) {
                            let year = Nat.fromText(y) ?? 0;
                            let month = Nat.fromText(mo) ?? 0;
                            let day = Nat.fromText(da) ?? 0;
                            let hour = Nat.fromText(h) ?? 0;
                            let minute = Nat.fromText(mi) ?? 0;
                            let second = Nat.fromText(secStr) ?? 0;
                            let millis = switch (frac) {
                              case (?f) { Nat.fromText(f) ?? 0 };
                              case null { 0 };
                            };
                            let days = daysFromCivil(year, month, day);
                            ?(days * 86_400_000_000_000
                              + hour.toInt() * 3_600_000_000_000
                              + minute.toInt() * 60_000_000_000
                              + second.toInt() * 1_000_000_000
                              + millis.toInt() * 1_000_000);
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };

  // Parse a single submission object from the payment service's GET
  // /submissions response into a SubmissionRecord.
  func parseSubmissionRecord(json : Text) : ?Types.SubmissionRecord {
    let id = jsonStringField(json, "id");
    let name = jsonStringField(json, "name");
    let email = jsonStringField(json, "email");
    let disciplineStr = jsonStringField(json, "discipline");
    let link = jsonStringField(json, "link");
    let message = jsonStringField(json, "message");
    let consent = jsonBoolField(json, "consent");
    let consentedAt = jsonStringField(json, "consented_at");
    let createdAt = jsonStringField(json, "created_at");
    switch (id, name, email, disciplineStr, link, consent, createdAt) {
      case (?id, ?name, ?email, ?disciplineStr, ?link, ?consent, ?createdAt) {
        switch (parseDiscipline(disciplineStr)) {
          case (?discipline) {
            let submittedAt = parseIsoNanos(createdAt) ?? 0;
            let marketingConsentAt = switch (consentedAt) {
              case (?c) { parseIsoNanos(c) };
              case null { null };
            };
            ?{
              id;
              name;
              email;
              discipline;
              link;
              message;
              marketingConsent = consent;
              marketingConsentAt;
              submittedAt;
            };
          };
          case null { null };
        };
      };
      case _ { null };
    };
  };

  // Parse the payment service's GET /submissions response body
  // ("{\"submissions\":[{...},{...}]}") into an array of SubmissionRecords.
  func parseSubmissions(json : Text) : Result.Result<[Types.SubmissionRecord], Types.SubmissionError> {
    let key = "\"submissions\":[";
    let parts = json.split(#text key);
    switch (parts.next()) {
      case null { #err(#invalidResponse("missing submissions array")) };
      case (?_) {
        switch (parts.next()) {
          case null { #err(#invalidResponse("missing submissions array")) };
          case (?rest) {
            switch (rest.split(#text "]").next()) {
              case null { #err(#invalidResponse("missing submissions array")) };
              case (?arr) {
                if (arr == "") { #ok([]) }
                else {
                  var objList : [Text] = [];
                  for (obj in arr.split(#text "},{")) {
                    objList := objList.concat([obj]);
                  };
                  let n = objList.size();
                  var records : [Types.SubmissionRecord] = [];
                  var i = 0;
                  for (obj in objList.values()) {
                    let full = if (n == 1) {
                      obj;
                    } else if (i == 0) {
                      obj # "}";
                    } else if (i + 1 == n) {
                      "{" # obj;
                    } else {
                      "{" # obj # "}";
                    };
                    switch (parseSubmissionRecord(full)) {
                      case (?r) { records := records.concat([r]) };
                      case null {};
                    };
                    i += 1;
                  };
                  #ok(records);
                };
              };
            };
          };
        };
      };
    };
  };

  // Check and record the per-principal rate limit. Returns true when the
  // submission is allowed (and records the timestamp), false when the caller
  // has exceeded the limit within the window.
  func checkRateLimit(rateLimit : Types.RateLimitState, caller : Principal) : Bool {
    let now = Time.now();
    let recent = switch (rateLimit.submissions.get(caller)) {
      case (?ts) { ts };
      case null { [] };
    };
    let filtered = recent.filter(func t = now - t < rateLimitWindowNanos);
    if (filtered.size() >= rateLimitMax) {
      false;
    } else {
      rateLimit.submissions.add(caller, filtered.concat([now]));
      true;
    };
  };

  // Forward a submission to the external payment service POST /submissions via
  // HTTPS outcall, authenticated with the shared bearer token held in canister
  // config (never shipped to the browser). Rejects a submission whose honeypot
  // field is filled before making the outcall, and rate-limits submissions per
  // caller principal (the canister cannot see client IPs, so this complements
  // the payment service's per-IP limit). The submission is stored off-canister
  // in the payment service Postgres; the canister never persists the PII.
  public func submitSubmission(
    config : PaymentServiceTypes.PaymentServiceConfig,
    rateLimit : Types.RateLimitState,
    input : Types.SubmissionInput,
    caller : Principal,
    transform : OutCall.Transform,
  ) : async Result.Result<(), Types.SubmissionError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    // Honeypot: a filled value indicates a bot — reject before any outcall.
    if (input.honeypot != "") { return #err(#honeypot) };
    // Rate limit per caller principal before the outcall.
    if (not checkRateLimit(rateLimit, caller)) { return #err(#rateLimited) };
    // Validate the required fields the frontend guarantees.
    if (input.name == "") { return #err(#invalidInput("name is required")) };
    if (not isValidEmail(input.email)) { return #err(#invalidInput("invalid email")) };
    if (not isValidUrl(input.link)) { return #err(#invalidInput("invalid link")) };
    switch (input.message) {
      case (?m) { if (m.size() > 1000) { return #err(#invalidInput("message exceeds 1000 characters")) } };
      case null {};
    };
    let messageJson = switch (input.message) {
      case (?m) { "\"" # m # "\"" };
      case null { "null" };
    };
    let consentJson = if (input.marketingConsent) { "true" } else { "false" };
    let body = "{"
      # "\"name\":\"" # input.name # "\","
      # "\"email\":\"" # input.email # "\","
      # "\"discipline\":\"" # disciplineToText(input.discipline) # "\","
      # "\"link\":\"" # input.link # "\","
      # "\"message\":" # messageJson # ","
      # "\"consent\":" # consentJson # ","
      # "\"company\":\"" # input.honeypot # "\""
      # "}";
    let headers = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # config.token },
    ];
    let url = config.url # "/submissions";
    try {
      let responseText = await OutCall.httpPostRequest(url, headers, body, transform);
      if (responseText.contains(#text "\"ok\":true")) {
        #ok();
      } else {
        #err(#invalidResponse("submission not accepted"));
      };
    } catch e {
      #err(#outcallFailed("payment service unreachable: " # e.message()));
    };
  };

  // Fetch the list of submissions from the external payment service GET
  // /submissions via HTTPS outcall, authenticated with the shared bearer token.
  // Admin-only (the caller is checked by the mixin before this is reached). The
  // records are PII that lives off-canister; the canister only proxies them
  // through for the admin view and never persists them.
  public func listSubmissions(
    config : PaymentServiceTypes.PaymentServiceConfig,
    transform : OutCall.Transform,
  ) : async Result.Result<[Types.SubmissionRecord], Types.SubmissionError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    let url = config.url # "/submissions";
    let headers = [{ name = "Authorization"; value = "Bearer " # config.token }];
    try {
      let responseText = await OutCall.httpGetRequest(url, headers, transform);
      parseSubmissions(responseText);
    } catch e {
      #err(#outcallFailed("payment service unreachable: " # e.message()));
    };
  };
};
