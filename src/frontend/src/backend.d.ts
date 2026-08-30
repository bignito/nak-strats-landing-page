import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Result_2 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface CryptoConfigView {
    icp: LedgerConfig;
    ckUSDC: LedgerConfig;
    treasurySubaccount?: Uint8Array;
    treasuryPrincipal: Principal;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface OrderItem {
    product_id: ProductId;
    unit_amount: bigint;
    name: string;
    variant_id: string;
    quantity: bigint;
}
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface CreateOrderItem {
    product_id: ProductId;
    variant_id: string;
    quantity: bigint;
}
export interface PaymentServiceConfigView {
    url: string;
    tokenSet: boolean;
}
export type Result_5 = {
    __kind__: "ok";
    ok: DepositInfo;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export type PaymentServiceError = {
    __kind__: "alreadyPaid";
    alreadyPaid: null;
} | {
    __kind__: "notConfigured";
    notConfigured: string;
} | {
    __kind__: "notFound";
    notFound: null;
} | {
    __kind__: "outcallFailed";
    outcallFailed: string;
} | {
    __kind__: "unauthorized";
    unauthorized: null;
} | {
    __kind__: "invalidResponse";
    invalidResponse: string;
};
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: PaymentServiceError;
};
export type CryptoPaymentStatus = {
    __kind__: "overpayment";
    overpayment: {
        expected: bigint;
        received: bigint;
    };
} | {
    __kind__: "expired";
    expired: null;
} | {
    __kind__: "underpayment";
    underpayment: {
        expected: bigint;
        received: bigint;
    };
} | {
    __kind__: "paid";
    paid: {
        blockIndex: bigint;
    };
} | {
    __kind__: "awaiting_payment";
    awaiting_payment: null;
};
export type Result_4 = {
    __kind__: "ok";
    ok: CryptoPaymentStatus;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export interface LedgerConfig {
    fee: bigint;
    decimals: number;
    canisterId: Principal;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface CreateOrderInput {
    shipping_address: ShippingAddress;
    payment_method: PaymentMethod;
    items: Array<CreateOrderItem>;
    customer_email: string;
    customer_name: string;
}
export type Result_7 = {
    __kind__: "ok";
    ok: CheckoutSession;
} | {
    __kind__: "err";
    err: PaymentError;
};
export interface DepositInfo {
    decimals: number;
    token: Token;
    expiresAt: bigint;
    qrPayload: string;
    subaccount: Uint8Array;
    reference: string;
    address: Principal;
    amountDue: bigint;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export type Result_6 = {
    __kind__: "ok";
    ok: Order;
} | {
    __kind__: "err";
    err: OrderError;
};
export interface ShippingAddress {
    region: string;
    country: string;
    city: string;
    postal_code: string;
    line1: string;
    line2?: string;
}
export interface CheckoutSession {
    url?: string;
    reference: string;
}
export type Result_9 = {
    __kind__: "ok";
    ok: PaymentStatus;
} | {
    __kind__: "err";
    err: PaymentServiceError;
};
export interface ProductVariant {
    id: string;
    inventory: bigint;
    name: string;
    size: string;
    price: bigint;
}
export interface Order {
    id: bigint;
    tax: bigint;
    updated_at: bigint;
    total: bigint;
    shipping_address: ShippingAddress;
    shipping: bigint;
    reference: string;
    created_at: bigint;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod;
    currency: string;
    items: Array<OrderItem>;
    customer_email: string;
    customer_name: string;
    payment_reference?: string;
    subtotal: bigint;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: PaymentError;
};
export type PaymentError = {
    __kind__: "invalidOrder";
    invalidOrder: null;
} | {
    __kind__: "paymentFailed";
    paymentFailed: string;
};
export type Result_8 = {
    __kind__: "ok";
    ok: CheckoutSession;
} | {
    __kind__: "err";
    err: PaymentServiceError;
};
export type ProductId = bigint;
export type OrderError = {
    __kind__: "outOfStock";
    outOfStock: [ProductId, string];
} | {
    __kind__: "unknownVariant";
    unknownVariant: [ProductId, string];
} | {
    __kind__: "unknownProduct";
    unknownProduct: ProductId;
} | {
    __kind__: "emptyOrder";
    emptyOrder: null;
} | {
    __kind__: "productInactive";
    productInactive: ProductId;
} | {
    __kind__: "paymentFailed";
    paymentFailed: string;
} | {
    __kind__: "invalidQuantity";
    invalidQuantity: null;
};
export type CryptoPaymentError = {
    __kind__: "alreadyPaid";
    alreadyPaid: null;
} | {
    __kind__: "overpayment";
    overpayment: {
        expected: bigint;
        received: bigint;
    };
} | {
    __kind__: "expired";
    expired: null;
} | {
    __kind__: "underpayment";
    underpayment: {
        expected: bigint;
        received: bigint;
    };
} | {
    __kind__: "sweepFailed";
    sweepFailed: string;
} | {
    __kind__: "notFound";
    notFound: null;
} | {
    __kind__: "ledgerError";
    ledgerError: string;
} | {
    __kind__: "notCryptoOrder";
    notCryptoOrder: null;
} | {
    __kind__: "unauthorized";
    unauthorized: null;
} | {
    __kind__: "invalidConfig";
    invalidConfig: string;
};
export interface Product {
    id: ProductId;
    updated_at: bigint;
    active: boolean;
    inventory: bigint;
    name: string;
    slug: string;
    description: string;
    variants: Array<ProductVariant>;
    created_at: bigint;
    currency: string;
    category: string;
    price: bigint;
    images: Array<string>;
}
export enum PaymentMethod {
    crypto_icp = "crypto_icp",
    card_stripe = "card_stripe",
    crypto_ckusdc = "crypto_ckusdc",
    manual = "manual"
}
export enum PaymentStatus {
    cancelled = "cancelled",
    expired = "expired",
    pending = "pending",
    paid = "paid"
}
export enum Token {
    ICP = "ICP",
    ckUSDC = "ckUSDC"
}
export interface backendInterface {
    addAdmin(p: Principal): Promise<boolean>;
    cancelCardOrder(reference: string): Promise<Result_1>;
    checkCryptoPayment(reference: string): Promise<Result_4>;
    claimInitialAdmin(): Promise<boolean>;
    confirmCardPayment(reference: string): Promise<Result_9>;
    confirmCryptoPayment(reference: string): Promise<Result_4>;
    createCardCheckoutSession(reference: string, successUrl: string, cancelUrl: string): Promise<Result_8>;
    createCheckoutSession(order: Order): Promise<Result_7>;
    createOrder(input: CreateOrderInput): Promise<Result_6>;
    execute(qJson: string): Promise<Result__1>;
    getApiDoc(): Promise<string>;
    getCryptoConfig(): Promise<CryptoConfigView>;
    getCryptoDepositInfo(reference: string): Promise<Result_5>;
    getCryptoPaymentStatus(reference: string): Promise<Result_4>;
    getDashboardData(): Promise<string>;
    getNAKPrice(): Promise<string>;
    getOrderStatus(reference: string): Promise<Order | null>;
    getPaymentServiceConfig(): Promise<PaymentServiceConfigView>;
    getPaymentStatus(reference: string): Promise<PaymentStatus>;
    getProduct(slugOrId: string): Promise<Product | null>;
    getTokenImage(chainId: string, tokenAddress: string): Promise<string>;
    getTokenProfile(chainId: string, tokenAddress: string): Promise<string>;
    getTreasuryTokens(): Promise<string>;
    handlePaymentConfirmation(payload: string): Promise<Result_3>;
    isAdmin(): Promise<boolean>;
    listAdmins(): Promise<Array<Principal>>;
    listProducts(): Promise<Array<Product>>;
    paymentServiceTransform(input: TransformationInput): Promise<TransformationOutput>;
    releaseExpiredOrders(): Promise<bigint>;
    removeAdmin(p: Principal): Promise<boolean>;
    schema(): Promise<string>;
    sweepCryptoToTreasury(reference: string): Promise<Result_2>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateLedgerConfig(token: Token, canisterId: Principal, decimals: number, fee: bigint): Promise<Result>;
    updatePaymentServiceToken(token: string): Promise<Result_1>;
    updatePaymentServiceUrl(url: string): Promise<Result_1>;
    updateTreasury(principal: Principal, subaccount: Uint8Array | null): Promise<Result>;
}
