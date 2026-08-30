import type { CartItem, Product } from "@/types/storefront";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product, variantId: string, quantity?: number) => void;
  updateQuantity: (
    productId: bigint,
    variantId: string,
    quantity: number,
  ) => void;
  removeItem: (productId: bigint, variantId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (product: Product, variantId: string, quantity = 1) => {
      setItems((current) => {
        const existing = current.find(
          (item) =>
            item.product.id === product.id && item.variantId === variantId,
        );
        if (existing) {
          return current.map((item) =>
            item.product.id === product.id && item.variantId === variantId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }
        return [...current, { product, variantId, quantity }];
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: bigint, variantId: string, quantity: number) => {
      setItems((current) =>
        quantity <= 0
          ? current.filter(
              (item) =>
                !(
                  item.product.id === productId && item.variantId === variantId
                ),
            )
          : current.map((item) =>
              item.product.id === productId && item.variantId === variantId
                ? { ...item, quantity }
                : item,
            ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: bigint, variantId: string) => {
    setItems((current) =>
      current.filter(
        (item) =>
          !(item.product.id === productId && item.variantId === variantId),
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const variant = item.product.variants.find(
          (v) => v.id === item.variantId,
        );
        const unitPrice = variant ? variant.price : item.product.price;
        return sum + Number(unitPrice) * item.quantity;
      }, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotal,
    }),
    [
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotal,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
