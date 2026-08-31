import { createActor } from "@/backend";
import type {
  AdminOrderDetail,
  AdminOrderView,
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
  RecheckResult,
  ResumeInfo,
  SubaccountBalanceResult,
  SweepResult,
  SweepSubaccountResult,
  Token,
} from "@/backend";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Product): Promise<boolean> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createProduct(product);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Product): Promise<boolean> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateProduct(product);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCreateOrder() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!actor) throw new Error("Backend is not ready");
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
    queryFn: async (): Promise<Order | null> => {
      if (!actor || !reference) return null;
      return actor.getOrderStatus(reference);
    },
    enabled: !!actor && !isFetching && !!reference,
  });
}

export function useCreateCheckoutSession() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (order: Order) => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (payload: string) => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.checkCryptoPayment(reference);
    },
  });
}

export function useConfirmCryptoPayment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      principal: Principal;
      subaccount: Uint8Array | null;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateTreasury(args.principal, args.subaccount);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cryptoConfig"] });
    },
  });
}

export function useUpdateLedgerConfig() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      token: Token;
      canisterId: Principal;
      decimals: number;
      fee: bigint;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
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
    queryFn: async (): Promise<Order | null> => {
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
    queryFn: async (): Promise<Order[]> => {
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (): Promise<bigint> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.releaseExpiredOrders();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  useEffect(() => {
    if (!actor) return;
    // Fire once on mount, then on the interval.
    void mutation.mutate();
    const interval = setInterval(() => {
      void mutation.mutate();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [actor, intervalMs, mutation]);

  return mutation;
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (args: {
      reference: string;
      successUrl: string;
      cancelUrl: string;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createCardCheckoutSession(
        args.reference,
        args.successUrl,
        args.cancelUrl,
      );
    },
  });
}

export function useConfirmCardPayment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.cancelCardOrder(reference);
    },
    onSuccess: (_data, reference) => {
      void queryClient.invalidateQueries({
        queryKey: ["orderStatus", reference],
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

export function useClaimInitialAdmin() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.claimInitialAdmin();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
}

export function useAddAdmin() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal): Promise<boolean> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addAdmin(principal);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
}

export function useRemoveAdmin() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal): Promise<boolean> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.removeAdmin(principal);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
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
 * Reads the configured minimum crypto order total. The backend stores it in USD
 * units (25 = $0.25), so callers divide by 100 for display.
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
 * Updates the minimum crypto order total. The backend expects USD units
 * (dollars * 100), so callers multiply the entered dollars by 100.
 */
export function useUpdateMinimumOrder() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (minimum: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateMinimumOrder(minimum);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["minimumOrder"] });
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string): Promise<RecheckResult> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string): Promise<SweepResult> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SweepResult> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string): Promise<boolean> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      subaccountIndex: bigint,
    ): Promise<SweepSubaccountResult> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      reference: string;
      trackingNumber: string | null;
    }): Promise<void> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (reference: string): Promise<void> => {
      if (!actor) throw new Error("Backend is not ready");
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
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (token: string): Promise<void> => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.unsubscribe(token);
      if (result.__kind__ === "err") throw result.err;
    },
  });
}
