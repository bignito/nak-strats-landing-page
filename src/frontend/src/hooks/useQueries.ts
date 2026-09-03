import { createActor as createActorImpl } from "@/backend";
import type {
  AdminOrderDetail,
  AdminOrderView,
  Backend,
  CategoryId,
  CategoryWithCount,
  ConsentListExport,
  CreateOrderInput,
  CryptoConfigView,
  CryptoPaymentStatus,
  DepositInfo,
  LatePayment,
  Order,
  OrderRecoveryView,
  PaymentServiceConfigView,
  PaymentStatus,
  Product,
  PublicOrderView,
  RecheckResult,
  ResumeInfo,
  Role,
  StorageStats,
  SubaccountBalanceResult,
  SubmissionInput,
  SubmissionRecord,
  SweepResult,
  SweepSubaccountResult,
  Token,
  UserRecord,
} from "@/backend";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * The generated `createActor` (backend.ts) and `@caffeineai/core-infrastructure`'s
 * `createActorFunction` both build their agent from `@icp-sdk/core/agent`, so
 * the generated factory already satisfies the `useActor(createActor)` contract
 * directly. No re-typing bridge is needed.
 */
const createActor = createActorImpl;

/**
 * True when the backend actor is fully ready for an authenticated call: the
 * actor exists, is not mid-rebuild, and an Internet Identity is attached.
 * Admin-gated mutations gate on this so they never fire against an
 * anonymous-identity actor while auth is still initialising.
 *
 * Also exposes the auth context so the admin shell can gate UI on readiness
 * and on the attached identity.
 */
export function useActorReady() {
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated, identity } = useInternetIdentity();
  const isActorReady = !!actor && !isFetching && isAuthenticated;
  return { isActorReady, isAuthenticated, identity };
}

/**
 * Maps a backend call failure to a human-readable admin message. When the
 * failure is an anonymous-caller rejection (the backend's `unauthorized`
 * variant, or an auth/session error), it returns the specific "session was not
 * attached" message instead of a generic failure, so the operator knows to
 * sign in again rather than retry a doomed call.
 */
export function adminErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (record.__kind__ === "unauthorized") {
      return "Your session was not attached — sign in again";
    }
    if (
      record.__kind__ === "ledgerError" ||
      record.__kind__ === "outcallFailed" ||
      record.__kind__ === "sweepFailed" ||
      record.__kind__ === "invalidConfig" ||
      record.__kind__ === "invalidResponse"
    ) {
      const detail = record[record.__kind__ as string];
      return typeof detail === "string" ? detail : String(record.__kind__);
    }
  }
  if (error instanceof Error) {
    const message = error.message;
    if (/anonymous|not attached|session/i.test(message)) {
      return "Your session was not attached — sign in again";
    }
    return message;
  }
  return "Operation failed";
}

export function useProducts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Lists every category with its product count. The admin Products tab uses this
 * to populate the category dropdown; the shop derives its filter chips and
 * section headings from the same stored category data (never hardcoded names).
 */
export function useCategories() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryWithCount[]> => {
      if (!actor) return [];
      return actor.listCategories();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Creates a category. The backend derives the slug from the name. */
export function useCreateCategory() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (args: { name: string; description: string | null }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.createCategory(args.name, args.description);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  return {
    ...mutation,
    mutateAsync: (name: string, description: string | null) =>
      mutation.mutateAsync({ name, description }),
  };
}

/** Updates a category's name, description, sort order, and visibility flags. */
export function useUpdateCategory() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (args: {
      id: CategoryId;
      name: string;
      description: string | null;
      sortOrder: bigint;
      active: boolean;
      showWhenEmpty: boolean;
    }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.updateCategory(
        args.id,
        args.name,
        args.description,
        args.sortOrder,
        args.active,
        args.showWhenEmpty,
      );
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  return {
    ...mutation,
    mutateAsync: (
      id: CategoryId,
      name: string,
      description: string | null,
      sortOrder: bigint,
      active: boolean,
      showWhenEmpty: boolean,
    ) =>
      mutation.mutateAsync({
        id,
        name,
        description,
        sortOrder,
        active,
        showWhenEmpty,
      }),
  };
}

/** Persists a new category display order from a full id list. */
export function useReorderCategories() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (args: { orderedIds: CategoryId[] }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.reorderCategories(args.orderedIds);
      if (result.__kind__ === "err") throw result.err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  return {
    ...mutation,
    mutateAsync: (orderedIds: CategoryId[]) =>
      mutation.mutateAsync({ orderedIds }),
  };
}

/**
 * Deletes a category. Throws the raw `CategoryError` variant so the caller can
 * detect `productsReferenced` and route into the reassign-before-delete flow.
 */
export function useDeleteCategory() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (args: { id: CategoryId }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.deleteCategory(args.id);
      if (result.__kind__ === "err") throw result.err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
  return {
    ...mutation,
    mutateAsync: (id: CategoryId) => mutation.mutateAsync({ id }),
  };
}

/**
 * Moves every product from one category slug to another before a delete, so
 * products are never silently orphaned. Invalidates both lists on success.
 */
export function useReassignProducts() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (args: { fromSlug: string; toSlug: string }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.reassignProducts(args.fromSlug, args.toSlug);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
  return {
    ...mutation,
    mutateAsync: (fromSlug: string, toSlug: string) =>
      mutation.mutateAsync({ fromSlug, toSlug }),
  };
}

export function useProduct(slugOrId: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["product", slugOrId],
    queryFn: async (): Promise<Product | null> => {
      if (!actor || !slugOrId) return null;
      return actor.getProduct(slugOrId);
    },
    enabled: !!actor && !isFetching && !!slugOrId,
  });
}

export function useCreateProduct() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Product): Promise<boolean> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.createProduct(product);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Product): Promise<boolean> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.updateProduct(product);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCreateOrder() {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.createOrder(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useOrderStatus(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["orderStatus", reference],
    queryFn: async (): Promise<PublicOrderView | null> => {
      if (!actor || !reference) return null;
      return actor.getOrderStatus(reference);
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

export function useCreateCheckoutSession() {
  const { actor, isFetching } = useActor(createActor);
  return useMutation({
    mutationFn: async (order: Order) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.createCheckoutSession(order);
    },
  });
}

export function usePaymentStatus(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["paymentStatus", reference],
    queryFn: async (): Promise<PaymentStatus | null> => {
      if (!actor || !reference) return null;
      return actor.getPaymentStatus(reference);
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

export function useHandlePaymentConfirmation() {
  const { actor, isFetching } = useActor(createActor);
  return useMutation({
    mutationFn: async (payload: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.handlePaymentConfirmation(payload);
    },
  });
}

export function useCryptoConfig() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["cryptoConfig"],
    queryFn: async (): Promise<CryptoConfigView | null> => {
      if (!actor) return null;
      return actor.getCryptoConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads the ckUSDC checkout flag from the backend crypto config. The backend
 * constant CKUSDC_CHECKOUT_ENABLED is the single source of truth — the
 * frontend never defines its own copy. Returns false when the config is not
 * loaded yet so ckUSDC checkout stays hidden by default. Every gating
 * component uses this single hook; do not scatter the condition.
 */
export function useCkUSDCCheckoutEnabled(): boolean {
  const { data: cryptoConfig } = useCryptoConfig();
  return cryptoConfig?.ckUSDCEnabled ?? false;
}

export function useCryptoDepositInfo(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["cryptoDepositInfo", reference],
    queryFn: async (): Promise<DepositInfo | null> => {
      if (!actor || !reference) return null;
      const result = await actor.getCryptoDepositInfo(reference);
      return result.__kind__ === "ok" ? result.ok : null;
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

export function useCryptoPaymentStatus(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["cryptoPaymentStatus", reference],
    queryFn: async (): Promise<CryptoPaymentStatus | null> => {
      if (!actor || !reference) return null;
      const result = await actor.getCryptoPaymentStatus(reference);
      return result.__kind__ === "ok" ? result.ok : null;
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

export function useCheckCryptoPayment() {
  const { actor, isFetching } = useActor(createActor);
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.checkCryptoPayment(reference);
    },
  });
}

export function useConfirmCryptoPayment() {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.checkCryptoPayment(reference);
    },
    onSuccess: (_data, reference) => {
      void queryClient.invalidateQueries({
        queryKey: ["cryptoPaymentStatus", reference],
      });
      void queryClient.invalidateQueries({
        queryKey: ["orderStatus", reference],
      });
    },
  });
}

export function useUpdateTreasury() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      principal: Principal;
      subaccount: Uint8Array | null;
    }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.updateTreasury(args.principal, args.subaccount);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cryptoConfig"] });
    },
  });
}

export function useUpdateLedgerConfig() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      token: Token;
      canisterId: Principal;
      decimals: number;
      fee: bigint;
    }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.updateLedgerConfig(
        args.token,
        args.canisterId,
        args.decimals,
        args.fee,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cryptoConfig"] });
    },
  });
}

export function useOrderLookup(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["orderLookup", reference],
    queryFn: async (): Promise<PublicOrderView | null> => {
      if (!actor || !reference) return null;
      return actor.getOrderStatus(reference);
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

/**
 * Lists only the signed-in caller's own orders. The backend filters by the
 * caller's identity server-side, so this never trusts a principal passed as a
 * parameter and never exposes another customer's data.
 */
export function useMyOrders() {
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();
  return useQuery({
    queryKey: ["myOrders"],
    queryFn: async (): Promise<PublicOrderView[]> => {
      if (!actor) return [];
      return actor.getMyOrders();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });
}

/**
 * Periodically release reserved inventory for expired orders. The canister has
 * no native timer, so the frontend drives this on an interval so expired
 * orders confirm/release without a manual refresh.
 */
export function useReleaseExpiredOrders(intervalMs = 60_000) {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (): Promise<bigint> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.releaseExpiredOrders();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  useEffect(() => {
    if (!isActorReady) return;
    void mutation.mutate();
    const interval = setInterval(() => {
      void mutation.mutate();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isActorReady, intervalMs, mutation]);

  return mutation;
}

/**
 * Manually release reserved inventory for all expired pending orders. This is
 * the admin-facing trigger for the same backend `releaseExpiredReservations`
 * method the frontend also drives on an interval; unlike `useReleaseExpiredOrders` it
 * does not auto-fire, so an operator can run it on demand from the admin
 * orders surface and see how many reservations were released.
 */
export function useAdminReleaseExpiredOrders() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<bigint> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.releaseExpiredReservations();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * Reads the payment service config view (url + tokenSet boolean). The token
 * value itself is write-only on the backend and is never exposed here.
 */
export function usePaymentServiceConfig() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["paymentServiceConfig"],
    queryFn: async (): Promise<PaymentServiceConfigView | null> => {
      if (!actor) return null;
      return actor.getPaymentServiceConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdatePaymentServiceUrl() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.updatePaymentServiceUrl(url);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["paymentServiceConfig"],
      });
    },
  });
}

export function useUpdatePaymentServiceToken() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.updatePaymentServiceToken(token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["paymentServiceConfig"],
      });
    },
  });
}

export function useCreateCardCheckoutSession() {
  const { actor, isFetching } = useActor(createActor);
  return useMutation({
    mutationFn: async (args: {
      reference: string;
      successUrl: string;
      cancelUrl: string;
    }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.createCardCheckoutSession(
        args.reference,
        args.successUrl,
        args.cancelUrl,
      );
    },
  });
}

export function useConfirmCardPayment() {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.confirmCardPayment(reference);
    },
    onSuccess: (_data, reference) => {
      void queryClient.invalidateQueries({
        queryKey: ["orderStatus", reference],
      });
    },
  });
}

export function useCancelCardOrder() {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.cancelCardOrder(reference);
    },
    onSuccess: (_data, reference) => {
      void queryClient.invalidateQueries({
        queryKey: ["orderStatus", reference],
      });
    },
  });
}

/**
 * Guest self-cancellation for anonymous callers. The backend rejects
 * cancelCardOrder for anonymous guests, so a guest must present the
 * short-lived cancellation token that was issued to their browser session when
 * the order was created (single-use, 30-minute expiry). Signed-in customers
 * keep using useCancelCardOrder as the order owner.
 */
export function useCancelGuestOrder() {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      reference: string;
      cancellationToken: string;
    }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.cancelGuestOrder(args.reference, args.cancellationToken);
    },
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({
        queryKey: ["orderStatus", args.reference],
      });
    },
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async (): Promise<boolean> => {
      if (!actor) return false;
      return actor.isAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Reads the number of configured admin principals (public query). */
export function useAdminCount() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["adminCount"],
    queryFn: async (): Promise<bigint> => {
      if (!actor) return 0n;
      return actor.adminCount();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads the signed-in caller's own role (public query — reports only
 * `msg.caller`). Returns null when the caller has no role. Gated on an
 * authenticated actor so a stale anonymous `role:null` is never reused after
 * an identity change.
 */
export function useGetMyRole() {
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();
  return useQuery({
    queryKey: ["myRole"],
    queryFn: async (): Promise<Role | null> => {
      if (!actor) return null;
      return actor.getMyRole();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });
}

/**
 * Normalizes a principal pasted into an admin input: trims surrounding
 * whitespace and strips one layer of surrounding single or double quotes
 * (chat apps and email often wrap pasted principals in quotes). Returns the
 * cleaned text, or "" when nothing usable remains.
 */
export function normalizePrincipalInput(input: string): string {
  const trimmed = input.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

/** Lists every user and their role (OWNER/ADMIN only). */
export function useListUsers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<Array<[Principal, UserRecord]>> => {
      if (!actor) return [];
      return actor.listUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Grants a role to a principal (OWNER for owner-level, ADMIN for STAFF). */
export function useGrantRole() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { principal: Principal; role: Role }) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.grantRole(args.principal, args.role);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
      void queryClient.invalidateQueries({ queryKey: ["myRole"] });
    },
  });
}

/** Revokes a principal's role (OWNER for owner-level, ADMIN for STAFF). */
export function useRevokeRole() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.revokeRole(principal);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
      void queryClient.invalidateQueries({ queryKey: ["myRole"] });
    },
  });
}

/** Controller-only live bootstrap of the first owner. */
export function useBootstrapOwner() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.bootstrapOwner(principal);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
      void queryClient.invalidateQueries({ queryKey: ["myRole"] });
    },
  });
}

/** Controller-only draft reset of the admin/role state. */
export function useResetAdminForMigration() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.resetAdminForMigration();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
      void queryClient.invalidateQueries({ queryKey: ["myRole"] });
    },
  });
}

export function useClaimInitialAdmin() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.claimInitialAdmin();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
    },
  });
}

export function useAddAdmin() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal): Promise<boolean> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.addAdmin(principal);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
    },
  });
}

export function useRemoveAdmin() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal): Promise<boolean> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.removeAdmin(principal);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      void queryClient.invalidateQueries({ queryKey: ["adminCount"] });
    },
  });
}

export function useListAdmins() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["admins"],
    queryFn: async (): Promise<Principal[]> => {
      if (!actor) return [];
      return actor.listAdmins();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads the configured encryption recipients (public query — returns only
 * OWNER/ADMIN principals and is callable by anyone, including anonymous
 * guests). The admin shell uses it to warn when no recipients are configured,
 * which means the store cannot take orders. Unlike `useListAdmins` this works
 * for every admin role including STAFF.
 */
export function useGetEncryptionRecipients() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["encryptionRecipients"],
    queryFn: async (): Promise<Principal[]> => {
      if (!actor) return [];
      return actor.getEncryptionRecipients();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Reads the configured minimum crypto order total. The backend stores it as
 * integer cents (bigint), rendered via formatPrice.
 */
export function useGetMinimumOrder() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["minimumOrder"],
    queryFn: async (): Promise<bigint> => {
      if (!actor) return 25n;
      return actor.getMinimumOrder();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Updates the minimum crypto order total. The backend expects integer cents
 * (bigint) — no float dollars.
 */
export function useUpdateMinimumOrder() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (minimum: bigint) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.updateMinimumOrder(minimum);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["minimumOrder"] });
    },
  });
}

/**
 * Reads the featured video. The backend returns the raw URL the admin entered
 * plus a normalized embed URL (both empty strings when unset). The embed URL
 * is the single source of truth for rendering the preview iframe.
 */
export function useGetFeaturedVideo() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["featuredVideo"],
    queryFn: async (): Promise<{ rawUrl: string; embedUrl: string }> => {
      if (!actor) return { rawUrl: "", embedUrl: "" };
      return actor.getFeaturedVideo();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Updates the featured video URL. The backend normalizes accepted YouTube
 * forms to an embed URL and rejects invalid 11-char video IDs, leaving the
 * previous value untouched on failure.
 */
export function useUpdateFeaturedVideo() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rawUrl: string) => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.updateFeaturedVideo(rawUrl);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["featuredVideo"] });
    },
  });
}

/* ============================================================
   Order Resume & Admin Recovery hooks
   ============================================================ */

/**
 * Reads the resume info for a stored active order reference. Returns null when
 * there is no resumable order (not found / expired / paid) so the resume banner
 * can clear the stored reference; ledger errors surface through the query's
 * `error` field and are never swallowed.
 */
export function useResumeInfo(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["resumeInfo", reference],
    queryFn: async (): Promise<ResumeInfo | null> => {
      if (!actor || !reference) return null;
      const result = await actor.getResumeInfo(reference);
      if (result.__kind__ === "err") {
        if (result.err.__kind__ === "ledgerError") throw result.err;
        return null;
      }
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

/** Lists every order needing recovery attention (admin-only). */
export function useListOrdersForRecovery() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["ordersForRecovery"],
    queryFn: async (): Promise<OrderRecoveryView[]> => {
      if (!actor) return [];
      return actor.listOrdersForRecovery();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Re-checks a crypto order's payment against the ledger (admin-only). */
export function useForceRecheckPayment() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string): Promise<RecheckResult> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.forceRecheckPayment(reference);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ordersForRecovery"] });
    },
  });
}

/** Force-sweeps a crypto order's deposit subaccount to treasury (admin-only). */
export function useForceSweepOrder() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string): Promise<SweepResult> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.forceSweepOrder(reference);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ordersForRecovery"] });
      void queryClient.invalidateQueries({
        queryKey: ["defaultSubaccountBalance"],
      });
    },
  });
}

/** Reads the default subaccount balance (admin-only). */
export function useGetDefaultSubaccountBalance() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["defaultSubaccountBalance"],
    queryFn: async (): Promise<bigint | null> => {
      if (!actor) return null;
      const result = await actor.getDefaultSubaccountBalance();
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    enabled: !!actor && !isFetching,
  });
}

/** Sweeps the default subaccount to treasury (admin-only). */
export function useSweepDefaultSubaccount() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SweepResult> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.sweepDefaultSubaccount();
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["defaultSubaccountBalance"],
      });
      void queryClient.invalidateQueries({ queryKey: ["ordersForRecovery"] });
    },
  });
}

/** Reads the canister's cycle balance (admin-only). */
export function useGetCycleBalance() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["cycleBalance"],
    queryFn: async (): Promise<bigint> => {
      if (!actor) return 0n;
      return actor.getCycleBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Lists late payments that arrived after their deposit window closed. */
export function useListLatePayments() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["latePayments"],
    queryFn: async (): Promise<LatePayment[]> => {
      if (!actor) return [];
      return actor.listLatePayments();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Marks a late payment as reviewed (admin-only). */
export function useMarkLatePaymentReviewed() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string): Promise<boolean> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      return actor.markLatePaymentReviewed(reference);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["latePayments"] });
    },
  });
}

/* ============================================================
   Admin Orders, Canister Health & Funds hooks
   ============================================================ */

/**
 * Lists orders for the admin Orders table, filtered by status. Filter values
 * are: all, awaiting_payment, paid, expired, cancelled, needs_review.
 */
export function useAdminListOrders(filter: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["adminOrders", filter],
    queryFn: async (): Promise<AdminOrderView[]> => {
      if (!actor) return [];
      return actor.adminListOrders(filter);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Fetches the full admin detail (including line items) for one order. */
export function useAdminGetOrderDetail(reference: string | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["adminOrderDetail", reference],
    queryFn: async (): Promise<AdminOrderDetail | null> => {
      if (!actor || !reference) return null;
      return actor.adminGetOrderDetail(reference);
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

/** Reads the canister's own principal (public query). */
export function useGetCanisterId() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["canisterId"],
    queryFn: async (): Promise<string | null> => {
      if (!actor) return null;
      return actor.getCanisterId().then((p) => p.toText());
    },
    enabled: !!actor && !isFetching,
  });
}

/** Reads the treasury token data returned by the backend (raw JSON text). */
export function useGetTreasuryTokens() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["treasuryTokens"],
    queryFn: async (): Promise<string | null> => {
      if (!actor) return null;
      return actor.getTreasuryTokens();
    },
    enabled: !!actor && !isFetching,
  });
}

/* ============================================================
   Consent, Shipping & Subaccount hooks
   ============================================================ */

/**
 * Reads the balance of a specific deposit subaccount by index (admin-only).
 * The backend returns the balance plus the subaccount hex and index.
 */
export function useGetSubaccountBalance(subaccountIndex: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["subaccountBalance", subaccountIndex],
    queryFn: async (): Promise<SubaccountBalanceResult | null> => {
      if (!actor || subaccountIndex === null) return null;
      const result = await actor.getSubaccountBalance(subaccountIndex);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    enabled: !!actor && !isFetching && subaccountIndex !== null,
  });
}

/** Sweeps a specific deposit subaccount to treasury (admin-only). */
export function useSweepSubaccount() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      subaccountIndex: bigint,
    ): Promise<SweepSubaccountResult> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.sweepSubaccount(subaccountIndex);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: (_data, subaccountIndex) => {
      void queryClient.invalidateQueries({
        queryKey: ["subaccountBalance", subaccountIndex],
      });
      void queryClient.invalidateQueries({ queryKey: ["ordersForRecovery"] });
    },
  });
}

/** Marks an order as shipped with an optional tracking number (admin-only). */
export function useMarkOrderShipped() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      reference: string;
      trackingNumber: string | null;
    }): Promise<void> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.markOrderShipped(
        args.reference,
        args.trackingNumber,
      );
      if (result.__kind__ === "err") throw result.err;
    },
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      void queryClient.invalidateQueries({
        queryKey: ["adminOrderDetail", args.reference],
      });
      void queryClient.invalidateQueries({
        queryKey: ["orderStatus", args.reference],
      });
    },
  });
}

/** Resends the order confirmation email (admin-only). */
export function useResendConfirmationEmail() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  return useMutation({
    mutationFn: async (reference: string): Promise<void> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.resendConfirmationEmail(reference);
      if (result.__kind__ === "err") throw result.err;
    },
  });
}

/**
 * Fetches the CSV of addresses that have opted into marketing (admin-only).
 * Only consenting addresses are included; suppressed addresses are excluded.
 */
export function useGetConsentListCsv() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["consentListCsv"],
    queryFn: async (): Promise<ConsentListExport | null> => {
      if (!actor) return null;
      const result = await actor.getConsentListCsv();
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Unsubscribes an address from marketing via a token from the unsubscribe
 * link. Adds the address to the suppression list so it is never sent marketing
 * email (transactional emails remain exempt).
 */
export function useUnsubscribe() {
  const { actor, isFetching } = useActor(createActor);
  return useMutation({
    mutationFn: async (token: string): Promise<void> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.unsubscribe(token);
      if (result.__kind__ === "err") throw result.err;
    },
  });
}

/* ============================================================
   Artist Submission hooks (Culture section)
   ============================================================ */

/**
 * Submits an artist work for review through the backend. The shared bearer
 * token stays in canister config and is never exposed to the browser. Throws
 * the SubmissionError on failure so the form can surface a readable message.
 */
export function useSubmitSubmission() {
  const { actor, isFetching } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: SubmissionInput): Promise<void> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.submitSubmission(input);
      if (result.__kind__ === "err") throw result.err;
    },
  });
}

/**
 * Reads the featured video for the Culture section (public query). Returns the
 * raw URL plus the normalized embed URL; both are empty strings when no video
 * is set. The caller falls back to a hardcoded default when embedUrl is empty
 * so the video box is never blank.
 */
export function useFeaturedVideo() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["featuredVideo"],
    queryFn: async (): Promise<{ rawUrl: string; embedUrl: string }> => {
      if (!actor) return { rawUrl: "", embedUrl: "" };
      return actor.getFeaturedVideo();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Lists submitted artist works (admin-only). */
export function useListSubmissions() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["submissions"],
    queryFn: async (): Promise<SubmissionRecord[]> => {
      if (!actor) return [];
      const result = await actor.listSubmissions();
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    enabled: !!actor && !isFetching,
  });
}

/* ============================================================
   Product image upload hooks (chunked canister storage)
   ============================================================ */

/**
 * Begins a chunked product-image upload. Returns the upload id on success, or
 * throws the mapped `UploadError` message on failure so the caller surfaces the
 * real error. The upload id is consumed by `useUploadChunk` / `useFinishUpload`.
 */
export function useStartUpload() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  return useMutation({
    mutationFn: async (args: {
      contentType: string;
      totalSize: bigint;
    }): Promise<string> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.startUpload(args.contentType, args.totalSize);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
  });
}

/**
 * Uploads a single chunk of an in-progress upload. Throws the mapped
 * `UploadError` message on failure. The chunk index is zero-based and must be
 * sent in order.
 */
export function useUploadChunk() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  return useMutation({
    mutationFn: async (args: {
      uploadId: string;
      index: bigint;
      blob: Uint8Array;
    }): Promise<void> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.uploadChunk(
        args.uploadId,
        args.index,
        args.blob,
      );
      if (result.__kind__ === "err") throw result.err;
    },
  });
}

/**
 * Finalises an upload and attaches the resulting image to a product. Returns
 * the new asset id on success, or throws the mapped `UploadError` message.
 */
export function useFinishUpload() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      uploadId: string;
      productId: bigint;
    }): Promise<string> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.finishUpload(args.uploadId, args.productId);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({
        queryKey: ["productImageStorageStats"],
      });
    },
  });
}

/**
 * Deletes a product image by asset id. Throws the mapped `UploadError` message
 * on failure. Invalidates the product list and storage stats on success.
 */
export function useDeleteProductImage() {
  const { actor, isFetching } = useActor(createActor);
  const { isActorReady } = useActorReady();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string): Promise<void> => {
      if (!actor || isFetching)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      if (!isActorReady)
        throw new Error(
          "Session not ready — please wait a moment and try again",
        );
      const result = await actor.deleteProductImage(assetId);
      if (result.__kind__ === "err") throw result.err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({
        queryKey: ["productImageStorageStats"],
      });
    },
  });
}

/**
 * Reads the total bytes used by product images and the image count. The admin
 * Canister tab uses this to show storage usage and the ongoing cycle burn rate.
 */
export function useGetProductImageStorageStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["productImageStorageStats"],
    queryFn: async (): Promise<StorageStats | null> => {
      if (!actor) return null;
      return actor.getProductImageStorageStats();
    },
    enabled: !!actor && !isFetching,
  });
}
