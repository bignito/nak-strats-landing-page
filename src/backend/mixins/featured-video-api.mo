import Result "mo:core/Result";
import Text "mo:core/Text";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";

mixin (
  featuredVideoState : { var rawUrl : Text; var embedUrl : Text },
  adminUsers : AdminTypes.AdminUsers,
) {
  // Public query: returns the current featured video config — the raw URL the
  // admin pasted plus the normalized embed URL. Both are empty strings when no
  // video has been set.
  public query func getFeaturedVideo() : async { rawUrl : Text; embedUrl : Text } {
    {
      rawUrl = featuredVideoState.rawUrl;
      embedUrl = featuredVideoState.embedUrl;
    };
  };

  // Admin-only: sets the featured video from a raw YouTube URL. Normalizes the
  // accepted forms to https://www.youtube.com/embed/VIDEO_ID. Rejects a URL
  // that cannot be parsed into a valid 11-character video ID, leaving the
  // previous value untouched.
  public shared ({ caller }) func updateFeaturedVideo(rawUrl : Text) : async Result.Result<(), Text> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    switch (normalize(rawUrl)) {
      case (#err msg) { #err(msg) };
      case (#ok embedUrl) {
        featuredVideoState.rawUrl := rawUrl;
        featuredVideoState.embedUrl := embedUrl;
        #ok();
      };
    };
  };

  // Normalizes a raw YouTube URL to https://www.youtube.com/embed/VIDEO_ID.
  // Accepts watch?v=, youtu.be, shorts, embed, and a bare video id. Returns
  // #err with a clear message when no valid 11-character video id can be
  // extracted.
  func normalize(raw : Text) : Result.Result<Text, Text> {
    switch (extractVideoId(raw)) {
      case null { #err("That doesn't look like a valid YouTube link.") };
      case (?id) { #ok("https://www.youtube.com/embed/" # id) };
    };
  };

  // Extracts the 11-character video id from any accepted YouTube URL form, or
  // null when the input is not a valid YouTube link.
  func extractVideoId(raw : Text) : ?Text {
    let t = raw.trim(#char ' ');
    if (isValidVideoId(t)) { return ?t };
    let lower = t.toLower();
    if (lower.contains(#text "youtu.be/")) {
      let id = takeUntilDelim(substringAfter(t, "youtu.be/"));
      if (isValidVideoId(id)) { return ?id };
    };
    if (lower.contains(#text "youtube.com")) {
      if (lower.contains(#text "watch?v=")) {
        let id = takeUntilDelim(substringAfter(t, "v="));
        if (isValidVideoId(id)) { return ?id };
      };
      if (lower.contains(#text "/shorts/")) {
        let id = takeUntilDelim(substringAfter(t, "/shorts/"));
        if (isValidVideoId(id)) { return ?id };
      };
      if (lower.contains(#text "/embed/")) {
        let id = takeUntilDelim(substringAfter(t, "/embed/"));
        if (isValidVideoId(id)) { return ?id };
      };
    };
    null;
  };

  // True when `s` is exactly 11 characters drawn from the YouTube video id
  // character set (A-Z, a-z, 0-9, -, _).
  func isValidVideoId(s : Text) : Bool {
    if (s.size() != 11) { return false };
    let chars = s.toArray();
    chars.all(func c = c.isAlphabetic() or c.isDigit() or c == '-' or c == '_');
  };

  // Returns the substring of `s` up to the first of '/', '?', '&', or '#', or
  // the whole string when none is present.
  func takeUntilDelim(s : Text) : Text {
    var result = "";
    for (c in s.toIter()) {
      switch c {
        case ('/') { return result };
        case ('?') { return result };
        case ('&') { return result };
        case ('#') { return result };
        case (_) { result := result # c.toText() };
      };
    };
    result;
  };

  // Returns the substring of `s` after the first occurrence of `marker`, or ""
  // when the marker is absent.
  func substringAfter(s : Text, marker : Text) : Text {
    let parts = s.split(#text marker);
    let _ = parts.next();
    switch (parts.next()) {
      case (?after) { after };
      case null { "" };
    };
  };
};
