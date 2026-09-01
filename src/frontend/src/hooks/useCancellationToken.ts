import { useCallback } from "react";

/**
 * Storage key for guest order cancellation tokens, keyed by order reference.
 * The backend issues a short-lived (30-minute), single-use token to anonymous
 * callers when they create an order; it is the only way an anonymous guest can
 * cancel their own order (cancelCardOrder now rejects guests with
 * #unauthorized). The token is persisted per reference in localStorage so it
 * survives the card checkout redirect back to the cancelled page, and is
 * cleared once consumed or once the order finishes.
 */
const CANCELLATION_TOKEN_KEY = "nak.cancellationToken";

/**
 * Session persistence for the guest cancellation token. Mirrors the
 * useActiveOrderRef pattern: localStorage only remembers *which* token belongs
 * to *which* order — the backend remains the authority on whether the token is
 * still valid (single-use, 30-minute expiry).
 */
export function useCancellationToken() {
  const getCancellationToken = useCallback(
    (reference: string): string | null => {
      try {
        const raw = window.localStorage.getItem(CANCELLATION_TOKEN_KEY);
        if (!raw) return null;
        const map = JSON.parse(raw) as Record<string, string>;
        return map[reference] ?? null;
      } catch (error) {
        console.error(
          "[checkout] Failed to read cancellation token (ERR-CHK-007)",
          error,
        );
        return null;
      }
    },
    [],
  );

  const setCancellationToken = useCallback(
    (reference: string, token: string) => {
      try {
        const raw = window.localStorage.getItem(CANCELLATION_TOKEN_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[reference] = token;
        window.localStorage.setItem(
          CANCELLATION_TOKEN_KEY,
          JSON.stringify(map),
        );
      } catch (error) {
        console.error(
          "[checkout] Failed to persist cancellation token (ERR-CHK-008)",
          error,
        );
      }
    },
    [],
  );

  const clearCancellationToken = useCallback((reference: string) => {
    try {
      const raw = window.localStorage.getItem(CANCELLATION_TOKEN_KEY);
      if (!raw) return;
      const map = JSON.parse(raw) as Record<string, string>;
      delete map[reference];
      window.localStorage.setItem(CANCELLATION_TOKEN_KEY, JSON.stringify(map));
    } catch (error) {
      console.error(
        "[checkout] Failed to clear cancellation token (ERR-CHK-009)",
        error,
      );
    }
  }, []);

  return { getCancellationToken, setCancellationToken, clearCancellationToken };
}
