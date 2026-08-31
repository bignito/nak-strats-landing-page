import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUnsubscribe } from "../hooks/useQueries";

interface UnsubscribePageProps {
  onNavigateToMain: () => void;
}

export default function UnsubscribePage({
  onNavigateToMain,
}: UnsubscribePageProps) {
  const unsubscribe = useUnsubscribe();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
    [],
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    unsubscribe.mutate(token, {
      onSuccess: () => setStatus("success"),
      onError: () => setStatus("error"),
    });
  }, [token, unsubscribe]);

  return (
    <div className="relative z-10 min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-md p-8 text-center">
        <img
          src="/assets/images/nak-shell.png"
          alt="NAK STRATS shell mascot"
          className="pixel-art object-contain mx-auto mb-6"
          style={{ width: "3.5rem", height: "3.5rem" }}
        />

        {status === "idle" ? (
          <>
            <h2 className="text-2xl mb-3">Unsubscribing…</h2>
            <p className="muted">Please wait while we process your request.</p>
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "var(--nak-success)" }}
            />
            <h2 className="text-2xl mb-3">You&apos;re unsubscribed</h2>
            <p className="muted mb-6">
              Your email address has been removed from our marketing list. You
              will no longer receive promotional emails from NAK STRATS.
            </p>
            <p className="muted mb-8">
              Transactional emails — like order confirmations and shipping
              updates — are unaffected and will still be sent.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn"
              data-ocid="unsubscribe.back_to_home_button"
            >
              Back to Home
            </button>
          </>
        ) : (
          <>
            <XCircle
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "var(--nak-destructive)" }}
            />
            <h2 className="text-2xl mb-3">Unable to unsubscribe</h2>
            <p className="muted mb-6">
              The unsubscribe link is invalid or has expired. Please try again
              using the link from your most recent email.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn"
              data-ocid="unsubscribe.back_to_home_button"
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
