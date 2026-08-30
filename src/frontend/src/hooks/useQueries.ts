import { createActor } from "@/backend";
import type {
  CreateOrderInput,
  CryptoConfigView,
  CryptoPaymentStatus,
  DepositInfo,
  Order,
  PaymentStatus,
  Product,
  Token,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
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
      return actor.confirmCryptoPayment(reference);
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
