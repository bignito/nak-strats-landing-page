import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveOrderRef } from "../hooks/useActiveOrderRef";
import { useResumeInfo } from "../hooks/useQueries";

interface ResumeBannerProps {
  /** Navigate the customer back into the checkout deposit screen. */
  onResume: () => void;
}

/** Format a millisecond duration as MM:SS or HH:MM:SS. */
function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Resume banner rendered in the shared shell. On mount it reads the stored
 * active order reference and asks the backend for its resume info. If the order
 * is unexpired and unpaid it shows the remaining time (derived from the
 * server-side expiry timestamp, never a client timer that resets on reload)
 * with a "Resume deposit" action. When there is no valid resume the stored
 * reference is cleared.
 */
export function ResumeBanner({ onResume }: ResumeBannerProps) {
  const { activeOrderRef, clearActiveOrderRef } = useActiveOrderRef();
  const { data: resumeInfo, isError } = useResumeInfo(activeOrderRef);

  // Local tick only drives the display of the server-derived expiry; it never
  // resets the countdown because the source of truth is resumeInfo.expiresAt.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Clear the stored reference when there is no valid resume.
  useEffect(() => {
    if (!activeOrderRef) return;
    if (isError) {
      clearActiveOrderRef();
      return;
    }
    if (!resumeInfo) return;
    const status = resumeInfo.status.__kind__;
    if (status === "paid") {
      clearActiveOrderRef();
      return;
    }
    if (status === "expired") {
      clearActiveOrderRef();
    }
  }, [activeOrderRef, resumeInfo, isError, clearActiveOrderRef]);

  if (!activeOrderRef || !resumeInfo) return null;

  const status = resumeInfo.status.__kind__;

  // Unexpired, unpaid — offer to resume the deposit with the remaining time.
  if (status === "awaiting_payment") {
    const remainingMs = Number(resumeInfo.expiresAt / 1_000_000n) - now;
    if (remainingMs <= 0) return null;
    return (
      <div className="resume-banner relative" data-ocid="resume.banner">
        <Clock className="w-4 h-4 text-teal-bright flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            Resume your order —{" "}
            <span className="font-mono-nak text-teal-bright">
              {formatRemaining(remainingMs)}
            </span>{" "}
            remaining
          </p>
          <p className="text-xs text-muted truncate">
            Order {resumeInfo.reference} is waiting for your deposit.
          </p>
        </div>
        <button
          type="button"
          onClick={onResume}
          className="btn px-4 py-2 text-xs font-semibold flex-shrink-0"
          data-ocid="resume.resume_button"
        >
          Resume deposit
        </button>
      </div>
    );
  }

  return null;
}

export default ResumeBanner;
