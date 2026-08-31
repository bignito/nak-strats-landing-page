import { useCallback, useState } from "react";

/**
 * Storage key for the customer's in-progress (unpaid, unexpired) crypto order
 * reference. Persisted in localStorage so a returning visitor is restored to
 * the deposit screen with the same address, amount, and remaining time.
 */
const ACTIVE_ORDER_REF_KEY = "nak.activeOrderRef";

/**
 * Session persistence for the active order reference. CheckoutPage stores the
 * reference here when a crypto deposit starts and clears it once the order is
 * paid or cancelled. The resume banner reads it on mount to offer a returning
 * customer a way back into their in-progress deposit.
 *
 * This is intentionally a thin localStorage wrapper — the authoritative order
 * state (expiry, status, deposit address) always comes from the backend via
 * getResumeInfo. localStorage only remembers *which* order to look up.
 */
export function useActiveOrderRef() {
  const [activeOrderRef, setActiveOrderRefState] = useState<string | null>(
    () => {
      try {
        return window.localStorage.getItem(ACTIVE_ORDER_REF_KEY);
      } catch {
        return null;
      }
    },
  );

  const setActiveOrderRef = useCallback((reference: string | null) => {
    setActiveOrderRefState(reference);
    try {
      if (reference) {
        window.localStorage.setItem(ACTIVE_ORDER_REF_KEY, reference);
      } else {
        window.localStorage.removeItem(ACTIVE_ORDER_REF_KEY);
      }
    } catch {
      // Storage unavailable — the in-memory value still drives this session.
    }
  }, []);

  const clearActiveOrderRef = useCallback(() => {
    setActiveOrderRef(null);
  }, [setActiveOrderRef]);

  return { activeOrderRef, setActiveOrderRef, clearActiveOrderRef };
}
