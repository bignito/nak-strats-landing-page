import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
} | {
    __kind__: "belowMinimumOrder";
    belowMinimumOrder: bigint;
};
export type SweepError = {
    __kind__: "sweepFailed";
    sweepFailed: string;
} | {
    __kind__: "ledgerError";
    ledgerError: string;
} | {
    __kind__: "unauthorized";
    unauthorized: null;
} | {
    __kind__: "invalidConfig";
    invalidConfig: string;
};
export type Result_2 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: PaymentServiceError;
};
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface CreateOrderItem {
    product_id: ProductId;
    variant_id: string;
    quantity: bigint;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export type StreamingCallback = (arg0: StreamingCallbackToken) => Promise<StreamingCallbackResponse>;
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
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
export type Result_5 = {
    __kind__: "ok";
    ok: SweepSubaccountResult;
} | {
    __kind__: "err";
    err: SweepError;
};
export interface CategoryWithCount {
    productCount: bigint;
    category: Category;
}
export type Result_4 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: ConsentError;
};
export interface LedgerConfig {
    fee: bigint;
    decimals: number;
    canisterId: Principal;
}
export interface AdminOrderDetail {
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    encryptedShipping?: Uint8Array;
    cryptoStatus?: CryptoPaymentStatus;
    createdAt: bigint;
    reference: string;
    amountOwed: bigint;
    updatedAt: bigint;
    currency: string;
    hasShippingDetails: boolean;
    subaccountHex: string;
    items: Array<OrderItem>;
    sweepNote?: string;
    customerEmail: string;
    depositAccountText: string;
}
export interface SubaccountBalanceResult {
    balance: bigint;
    subaccountHex: string;
    subaccountIndex: bigint;
}
export interface SweepSubaccountResult {
    error?: string;
    blockIndex?: bigint;
    subaccountHex: string;
    subaccountIndex: bigint;
}
export interface LatePayment {
    token: Token;
    reference: string;
    receivedAmount: bigint;
    receivedAt: bigint;
    reviewed: boolean;
    expectedAmount: bigint;
}
export type Result_7 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
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
export interface CreateOrderInput {
    session_id?: string;
    payment_method: PaymentMethod;
    has_shipping_details: boolean;
    items: Array<CreateOrderItem>;
    customer_email: string;
    encrypted_shipping?: Uint8Array;
    marketing_consent: boolean;
}
export type RecoveryError = {
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
export interface Cell {
    value: Value;
    name: string;
}
export type ConsentError = {
    __kind__: "alreadyUnsubscribed";
    alreadyUnsubscribed: null;
} | {
    __kind__: "notConfigured";
    notConfigured: string;
} | {
    __kind__: "invalidToken";
    invalidToken: null;
} | {
    __kind__: "rateLimited";
    rateLimited: null;
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
export type Result_6 = {
    __kind__: "ok";
    ok: SweepResult;
} | {
    __kind__: "err";
    err: RecoveryError;
};
export interface CheckoutSession {
    url?: string;
    reference: string;
}
export type Result_12 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: CategoryError;
};
export type Result_9 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: UploadError;
};
export interface Order {
    id: bigint;
    tax: bigint;
    updated_at: bigint;
    total: bigint;
    sweep_note?: string;
    shipping: bigint;
    reference: string;
    created_at: bigint;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod;
    tracking_number?: string;
    currency: string;
    marketing_consent_at?: bigint;
    shipping_status: ShippingStatus;
    has_shipping_details: boolean;
    items: Array<OrderItem>;
    customer_email: string;
    encrypted_shipping?: Uint8Array;
    customer_principal?: Principal;
    shipped_at?: bigint;
    marketing_consent: boolean;
    payment_reference?: string;
    subtotal: bigint;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export interface CreateOrderResult {
    order: Order;
    cancellationToken?: string;
    sessionId?: string;
}
export type StreamingStrategy = {
    __kind__: "Callback";
    Callback: {
        token: StreamingCallbackToken;
        callback: [Principal, string];
    };
};
export type CategoryError = {
    __kind__: "emptyName";
    emptyName: null;
} | {
    __kind__: "targetCategoryNotFound";
    targetCategoryNotFound: string;
} | {
    __kind__: "notFound";
    notFound: CategoryId;
} | {
    __kind__: "productsReferenced";
    productsReferenced: {
        count: bigint;
        slug: string;
    };
} | {
    __kind__: "slugCollision";
    slugCollision: string;
};
export interface SubmissionRecord {
    id: string;
    discipline: Discipline;
    link: string;
    name: string;
    submittedAt: bigint;
    email: string;
    message?: string;
    marketingConsentAt?: bigint;
    marketingConsent: boolean;
}
export type Result_10 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: EmailError;
};
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: UploadError;
};
export type Result_8 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: SubmissionError;
};
export interface CryptoConfigView {
    icp: LedgerConfig;
    ckUSDC: LedgerConfig;
    treasurySubaccount?: Uint8Array;
    minimumOrder: bigint;
    ckUSDCEnabled: boolean;
    treasuryPrincipal: Principal;
}
export type Result_17 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: RecoveryError;
};
export type Result_13 = {
    __kind__: "ok";
    ok: Array<SubmissionRecord>;
} | {
    __kind__: "err";
    err: SubmissionError;
};
export type Result_25 = {
    __kind__: "ok";
    ok: PaymentStatus;
} | {
    __kind__: "err";
    err: PaymentServiceError;
};
export interface OrderItem {
    product_id: ProductId;
    unit_amount: bigint;
    name: string;
    variant_id: string;
    quantity: bigint;
}
export interface RecheckResult {
    status: CryptoPaymentStatus;
    balance: bigint;
    reference: string;
    error?: string;
}
export interface ResumeInfo {
    status: CryptoPaymentStatus;
    expiresAt: bigint;
    reference: string;
    deposit?: DepositInfo;
    remainingNs: bigint;
}
export type SubmissionError = {
    __kind__: "invalidInput";
    invalidInput: string;
} | {
    __kind__: "notConfigured";
    notConfigured: string;
} | {
    __kind__: "honeypot";
    honeypot: null;
} | {
    __kind__: "rateLimited";
    rateLimited: null;
} | {
    __kind__: "outcallFailed";
    outcallFailed: string;
} | {
    __kind__: "invalidResponse";
    invalidResponse: string;
};
export type Result_16 = {
    __kind__: "ok";
    ok: ResumeInfo;
} | {
    __kind__: "err";
    err: RecoveryError;
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
    __kind__: "rateLimited";
    rateLimited: null;
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
export interface UserRecord {
    grantedAt: bigint;
    role: Role;
}
export type Result_22 = {
    __kind__: "ok";
    ok: CreateOrderResult;
} | {
    __kind__: "err";
    err: OrderError;
};
export type Result_11 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: CategoryError;
};
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export interface SubmissionInput {
    discipline: Discipline;
    link: string;
    name: string;
    email: string;
    message?: string;
    honeypot: string;
    marketingConsentAt?: bigint;
    marketingConsent: boolean;
}
export interface StreamingCallbackToken {
    key: string;
    sha256?: Uint8Array;
    index: bigint;
    content_encoding: string;
}
export interface SweepResult {
    reference?: string;
    error?: string;
    blockIndex?: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export type Result_19 = {
    __kind__: "ok";
    ok: DepositInfo;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export interface PaymentServiceConfigView {
    url: string;
    tokenSet: boolean;
}
export type Result_24 = {
    __kind__: "ok";
    ok: CheckoutSession;
} | {
    __kind__: "err";
    err: PaymentServiceError;
};
export type Result_14 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: PaymentError;
};
export interface OrderRecoveryView {
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    expiresAt?: bigint;
    reference: string;
    depositAccount?: DepositAccount;
    amountOwed: bigint;
    liveBalance: bigint;
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
export type EmailError = {
    __kind__: "notConfigured";
    notConfigured: string;
} | {
    __kind__: "notShippable";
    notShippable: null;
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
export interface StorageStats {
    count: bigint;
    totalBytes: bigint;
}
export interface DepositAccount {
    owner: Principal;
    subaccount: Uint8Array;
    textAddress: string;
}
export interface ConsentListExport {
    csv: string;
}
export interface Category {
    id: CategoryId;
    updated_at: bigint;
    active: boolean;
    sortOrder: bigint;
    name: string;
    slug: string;
    description?: string;
    created_at: bigint;
    showWhenEmpty: boolean;
}
export interface AdminOrderView {
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    cryptoStatus?: CryptoPaymentStatus;
    createdAt: bigint;
    itemCount: bigint;
    reference: string;
    amountOwed: bigint;
    currency: string;
    subaccountHex: string;
    sweepNote?: string;
    customerEmail: string;
    depositAccountText: string;
}
export interface PublicOrderView {
    id: bigint;
    tax: number;
    updated_at: bigint;
    total: number;
    sweep_note?: string;
    shipping: number;
    reference: string;
    created_at: bigint;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod;
    tracking_number?: string;
    currency: string;
    marketing_consent_at?: bigint;
    shipping_status: ShippingStatus;
    has_shipping_details: boolean;
    items: Array<OrderItem>;
    encrypted_shipping?: Uint8Array;
    customer_principal?: Principal;
    shipped_at?: bigint;
    marketing_consent: boolean;
    payment_reference?: string;
    subtotal: number;
}
export type Result_21 = {
    __kind__: "ok";
    ok: RecheckResult;
} | {
    __kind__: "err";
    err: RecoveryError;
};
export interface ProductVariant {
    id: string;
    inventory: bigint;
    name: string;
    size: string;
    price: bigint;
}
export type Result_18 = {
    __kind__: "ok";
    ok: CryptoPaymentStatus;
} | {
    __kind__: "err";
    err: CryptoPaymentError;
};
export type PaymentError = {
    __kind__: "invalidOrder";
    invalidOrder: null;
} | {
    __kind__: "paymentFailed";
    paymentFailed: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: Category;
} | {
    __kind__: "err";
    err: CategoryError;
};
export interface StreamingCallbackResponse {
    token?: StreamingCallbackToken;
    body: Uint8Array;
}
export interface HttpResponse {
    body: Uint8Array;
    headers: Array<[string, string]>;
    streaming_strategy?: StreamingStrategy;
    status_code: number;
}
export type Result_23 = {
    __kind__: "ok";
    ok: CheckoutSession;
} | {
    __kind__: "err";
    err: PaymentError;
};
export type Result_15 = {
    __kind__: "ok";
    ok: SubaccountBalanceResult;
} | {
    __kind__: "err";
    err: SweepError;
};
export type CategoryId = bigint;
export type ProductId = bigint;
export type OrderError = {
    __kind__: "outOfStock";
    outOfStock: [ProductId, string];
} | {
    __kind__: "invalidPrice";
    invalidPrice: string;
} | {
    __kind__: "unknownVariant";
    unknownVariant: [ProductId, string];
} | {
    __kind__: "unknownProduct";
    unknownProduct: ProductId;
} | {
    __kind__: "ckUSDCDisabled";
    ckUSDCDisabled: null;
} | {
    __kind__: "emptyOrder";
    emptyOrder: null;
} | {
    __kind__: "rateLimited";
    rateLimited: null;
} | {
    __kind__: "belowMinimumOrder";
    belowMinimumOrder: bigint;
} | {
    __kind__: "productInactive";
    productInactive: ProductId;
} | {
    __kind__: "paymentFailed";
    paymentFailed: string;
} | {
    __kind__: "invalidQuantity";
    invalidQuantity: null;
} | {
    __kind__: "tooManyPendingOrders";
    tooManyPendingOrders: null;
};
export interface HttpRequest {
    url: string;
    method: string;
    body: Uint8Array;
    headers: Array<[string, string]>;
}
export type Result_20 = {
    __kind__: "ok";
    ok: ConsentListExport;
} | {
    __kind__: "err";
    err: ConsentError;
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
    admin_only: boolean;
    category: string;
    price: bigint;
    images: Array<string>;
}
export enum Discipline {
    music = "music",
    other = "other",
    video = "video",
    visualArt = "visualArt",
    writing = "writing"
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
export enum Role {
    admin = "admin",
    owner = "owner",
    staff = "staff"
}
export enum ShippingStatus {
    shipped = "shipped",
    pending = "pending"
}
export enum Token {
    ICP = "ICP",
    ckUSDC = "ckUSDC"
}
export enum UploadError {
    tooManyImages = "tooManyImages",
    tooLarge = "tooLarge",
    magicByteMismatch = "magicByteMismatch",
    sizeMismatch = "sizeMismatch",
    invalidContentType = "invalidContentType",
    notFound = "notFound",
    uploadExpired = "uploadExpired",
    svgNotAllowed = "svgNotAllowed",
    chunkOutOfOrder = "chunkOutOfOrder",
    unauthorized = "unauthorized"
}
export interface backendInterface {
    addAdmin(p: Principal): Promise<boolean>;
    adminCount(): Promise<bigint>;
    adminGetOrderDetail(reference: string): Promise<AdminOrderDetail | null>;
    adminListOrders(filter: string): Promise<Array<AdminOrderView>>;
    bootstrapOwner(p: Principal): Promise<boolean>;
    cancelCardOrder(reference: string): Promise<Result_2>;
    cancelGuestOrder(reference: string, cancellationToken: string): Promise<Result_2>;
    checkCryptoPayment(reference: string): Promise<Result_18>;
    claimInitialAdmin(): Promise<boolean>;
    confirmCardPayment(reference: string): Promise<Result_25>;
    consentServiceTransform(input: TransformationInput): Promise<TransformationOutput>;
    createCardCheckoutSession(reference: string, successUrl: string, cancelUrl: string): Promise<Result_24>;
    createCategory(name: string, description: string | null): Promise<Result_3>;
    createCheckoutSession(order: Order): Promise<Result_23>;
    createOrder(input: CreateOrderInput): Promise<Result_22>;
    createProduct(product: Product): Promise<boolean>;
    deleteCategory(id: CategoryId): Promise<Result_11>;
    deleteProductImage(assetId: string): Promise<Result>;
    emailTransform(input: TransformationInput): Promise<TransformationOutput>;
    execute(qJson: string): Promise<Result__1>;
    finishUpload(uploadId: string, productId: bigint): Promise<Result_9>;
    forceRecheckPayment(reference: string): Promise<Result_21>;
    forceSweepOrder(reference: string): Promise<Result_6>;
    getApiDoc(): Promise<string>;
    getCanisterId(): Promise<Principal>;
    getConsentListCsv(): Promise<Result_20>;
    getCryptoConfig(): Promise<CryptoConfigView>;
    getCryptoDepositInfo(reference: string): Promise<Result_19>;
    getCryptoPaymentStatus(reference: string): Promise<Result_18>;
    getCycleBalance(): Promise<bigint>;
    getDashboardData(): Promise<string>;
    getDefaultSubaccountBalance(): Promise<Result_17>;
    getEncryptionRecipients(): Promise<Array<Principal>>;
    getIbePublicKey(): Promise<Uint8Array>;
    getMinimumOrder(): Promise<bigint>;
    getMyEncryptedIbeKey(transportPublicKey: Uint8Array): Promise<Uint8Array>;
    getMyOrders(): Promise<Array<PublicOrderView>>;
    getMyRole(): Promise<Role | null>;
    getNAKPrice(): Promise<string>;
    getOrderStatus(reference: string): Promise<PublicOrderView | null>;
    getPaymentServiceConfig(): Promise<PaymentServiceConfigView>;
    getPaymentStatus(reference: string): Promise<PaymentStatus>;
    getPendingOrderConfig(): Promise<{
        globalCap: bigint;
        perSessionCap: bigint;
    }>;
    getProduct(slugOrId: string): Promise<Product | null>;
    getProductImageStorageStats(): Promise<StorageStats>;
    getResumeInfo(reference: string): Promise<Result_16>;
    getSubaccountBalance(subaccountIndex: bigint): Promise<Result_15>;
    getTokenImage(chainId: string, tokenAddress: string): Promise<string>;
    getTokenProfile(chainId: string, tokenAddress: string): Promise<string>;
    getTreasuryTokens(): Promise<string>;
    grantRole(p: Principal, role: Role): Promise<boolean>;
    handlePaymentConfirmation(payload: string): Promise<Result_14>;
    http_request(req: HttpRequest): Promise<HttpResponse>;
    http_request_streaming_callback(token: StreamingCallbackToken): Promise<StreamingCallbackResponse>;
    http_request_update(req: HttpRequest): Promise<HttpResponse>;
    isAdmin(): Promise<boolean>;
    listAdmins(): Promise<Array<Principal>>;
    listCategories(): Promise<Array<CategoryWithCount>>;
    listLatePayments(): Promise<Array<LatePayment>>;
    listOrdersForRecovery(): Promise<Array<OrderRecoveryView>>;
    listProducts(): Promise<Array<Product>>;
    listSubmissions(): Promise<Result_13>;
    listUsers(): Promise<Array<[Principal, UserRecord]>>;
    markLatePaymentReviewed(reference: string): Promise<boolean>;
    markOrderShipped(reference: string, trackingNumber: string | null): Promise<Result_10>;
    paymentServiceTransform(input: TransformationInput): Promise<TransformationOutput>;
    reassignProducts(fromSlug: string, toSlug: string): Promise<Result_12>;
    releaseExpiredOrders(): Promise<bigint>;
    releaseExpiredReservations(): Promise<bigint>;
    removeAdmin(p: Principal): Promise<boolean>;
    reorderCategories(orderedIds: Array<CategoryId>): Promise<Result_11>;
    resendConfirmationEmail(reference: string): Promise<Result_10>;
    resetAdminForMigration(): Promise<boolean>;
    revokeRole(p: Principal): Promise<boolean>;
    schema(): Promise<string>;
    startUpload(contentType: string, totalSize: bigint): Promise<Result_9>;
    startVerificationTimer(): Promise<boolean>;
    stopVerificationTimer(): Promise<boolean>;
    submissionServiceTransform(input: TransformationInput): Promise<TransformationOutput>;
    submitSubmission(input: SubmissionInput): Promise<Result_8>;
    sweepCryptoToTreasury(reference: string): Promise<Result_7>;
    sweepDefaultSubaccount(): Promise<Result_6>;
    sweepExpiredUploads(): Promise<void>;
    sweepSubaccount(subaccountIndex: bigint): Promise<Result_5>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unsubscribe(token: string): Promise<Result_4>;
    updateCategory(id: CategoryId, name: string, description: string | null, sortOrder: bigint, active: boolean, showWhenEmpty: boolean): Promise<Result_3>;
    updateLedgerConfig(token: Token, canisterId: Principal, decimals: number, fee: bigint): Promise<Result_1>;
    updateMinimumOrder(minimum: bigint): Promise<Result_1>;
    updatePaymentServiceToken(token: string): Promise<Result_2>;
    updatePaymentServiceUrl(url: string): Promise<Result_2>;
    updatePendingOrderGlobalCap(cap: bigint): Promise<bigint>;
    updateProduct(product: Product): Promise<boolean>;
    updateTreasury(principal: Principal, subaccount: Uint8Array | null): Promise<Result_1>;
    uploadChunk(uploadId: string, index: bigint, blob: Uint8Array): Promise<Result>;
}
