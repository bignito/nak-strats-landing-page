import type { Product, UploadError } from "@/backend";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminErrorMessage,
  useCategories,
  useCreateProduct,
  useDeleteProductImage,
  useFinishUpload,
  useGetCanisterId,
  useProducts,
  useStartUpload,
  useUpdateProduct,
  useUploadChunk,
} from "@/hooks/useQueries";
import { formatPrice, parseDollars } from "@/lib/currency";
import {
  type UploadDriverMethods,
  type UploadProgress,
  buildAssetUrl,
  formatBytes,
  resizeAndCompressImage,
  uploadErrorMessage,
  uploadProductImage,
} from "@/lib/imageUpload";
import type { AdminTabBodyProps } from "@/types/routes";
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

/** Inventory at or below this count is flagged as low stock. */
const LOW_STOCK_THRESHOLD = 5;

/** Maximum number of images a product may hold (enforced client-side). */
const MAX_IMAGES = 5;

/** Extracts the asset id from a canister asset URL (`.../assets/products/<id>`). */
function assetIdFromUrl(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1] ?? url;
}

/** A fresh product skeleton for the "New product" flow. */
function blankProduct(): Product {
  return {
    id: 0n,
    updated_at: 0n,
    created_at: 0n,
    active: true,
    admin_only: false,
    inventory: 0n,
    name: "",
    slug: "",
    description: "",
    category: "",
    currency: "usd",
    price: 0n,
    images: [],
    variants: [],
  };
}

interface Draft {
  name: string;
  category: string;
  priceDollars: string;
  inventory: string;
  active: boolean;
  hidden: boolean;
}

function toDraft(p: Product): Draft {
  const dollars = p.price / 100n;
  const cents = p.price % 100n;
  return {
    name: p.name,
    category: p.category,
    priceDollars: `${dollars}.${cents.toString().padStart(2, "0")}`,
    inventory: String(p.inventory),
    active: p.active,
    hidden: p.admin_only,
  };
}

/**
 * Product image manager — dropzone + picker, browser-side resize/compress with
 * original/compressed size readout, chunked upload with real progress, and a
 * thumbnail grid with per-image delete and drag-to-reorder. The first image is
 * the one the shop grid shows, so reordering persists through `updateProduct`.
 * Only rendered for persisted products (images belong to a saved product).
 */
function ProductImageSection({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const startUpload = useStartUpload();
  const uploadChunk = useUploadChunk();
  const finishUpload = useFinishUpload();
  const deleteProductImage = useDeleteProductImage();
  const updateProduct = useUpdateProduct();
  const { data: canisterId } = useGetCanisterId();

  const [images, setImages] = useState<string[]>(product.images);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [sizeMeta, setSizeMeta] = useState<{
    originalBytes: number;
    compressedBytes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atLimit = images.length >= MAX_IMAGES;

  // Keep the grid in sync with the persisted product (e.g. after a save).
  useEffect(() => {
    setImages(product.images);
  }, [product.images]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || uploading || atLimit) return;
    const file = files[0];
    setError(null);
    setSizeMeta(null);
    setProgress(null);
    setUploading(true);
    try {
      const compressed = await resizeAndCompressImage(file);
      setSizeMeta({
        originalBytes: compressed.originalBytes,
        compressedBytes: compressed.compressedBytes,
      });
      if (!canisterId) {
        throw new Error("Canister id is not available yet — try again.");
      }
      const methods: UploadDriverMethods = {
        startUpload: async (contentType, totalSize) => {
          const ok = await startUpload.mutateAsync({ contentType, totalSize });
          return { __kind__: "ok", ok };
        },
        uploadChunk: async (uploadId, index, blob) => {
          await uploadChunk.mutateAsync({ uploadId, index, blob });
          return { __kind__: "ok", ok: null };
        },
        finishUpload: async (uploadId, productId) => {
          const ok = await finishUpload.mutateAsync({ uploadId, productId });
          return { __kind__: "ok", ok };
        },
      };
      const assetId = await uploadProductImage({
        blob: compressed.blob,
        contentType: compressed.mimeType,
        productId: product.id,
        methods,
        onProgress: setProgress,
      });
      const next = [...images, buildAssetUrl(canisterId, assetId)];
      setImages(next);
      await updateProduct.mutateAsync({ ...product, images: next });
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (uploading) return;
    setError(null);
    const url = images[index];
    if (!url) return;
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    try {
      await deleteProductImage.mutateAsync(assetIdFromUrl(url));
      await updateProduct.mutateAsync({ ...product, images: next });
    } catch (e) {
      setError(uploadErrorMessage(e));
      setImages(product.images);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setDragIndex(null);
    setOverIndex(null);
    void handleFiles(e.dataTransfer.files);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) setOverIndex(index);
  };

  const handleDropOnThumb = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    setImages(next);
    void updateProduct
      .mutateAsync({ ...product, images: next })
      .catch((err) => {
        setError(uploadErrorMessage(err));
        setImages(product.images);
      });
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="flex flex-col gap-3" data-ocid="admin.products.images">
      <div className="flex items-baseline justify-between gap-3">
        <span className="field-label">Images</span>
        <span className="img-size-meta">
          {images.length} / {MAX_IMAGES}
        </span>
      </div>

      <button
        type="button"
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading && !atLimit) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && !atLimit && fileInputRef.current?.click()}
        disabled={uploading || atLimit}
        data-ocid="admin.products.dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
          data-ocid="admin.products.file_input"
        />
        <Upload
          className="w-4 h-4"
          style={{ color: "var(--muted-foreground)" }}
        />
        <span className="dropzone-label">
          {uploading ? "Uploading…" : "Drop image or browse"}
        </span>
        <span className="dropzone-hint">
          {atLimit
            ? `Maximum of ${MAX_IMAGES} images reached — remove one first.`
            : "JPEG, PNG or WebP — resized to 1200px and compressed before upload"}
        </span>
      </button>

      {sizeMeta && (
        <p className="img-size-meta" data-ocid="admin.products.size_readout">
          Original {formatBytes(sizeMeta.originalBytes)} → compressed{" "}
          {formatBytes(sizeMeta.compressedBytes)}
        </p>
      )}

      {uploading && progress && (
        <div
          className="flex flex-col gap-1"
          data-ocid="admin.products.upload_progress"
        >
          <div className="upload-progress">
            <div
              className={`upload-progress-fill${
                progress.percent >= 100 ? " is-complete" : ""
              }`}
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
          <span className="img-size-meta">
            {formatBytes(progress.bytesUploaded)} /{" "}
            {formatBytes(progress.totalBytes)} · {Math.round(progress.percent)}%
          </span>
        </div>
      )}

      {error && (
        <p
          className="text-sm"
          style={{ color: "var(--nak-negative)" }}
          data-ocid="admin.products.images_error"
        >
          {error}
        </p>
      )}

      {images.length > 0 ? (
        <div
          className="img-thumb-grid"
          data-ocid="admin.products.thumbnail_grid"
        >
          {images.map((url, index) => (
            <div
              key={url}
              className="img-thumb"
              draggable={canEdit && !uploading}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDropOnThumb(e, index)}
              onDragEnd={handleDragEnd}
              data-ocid={`admin.products.thumbnail.${index + 1}`}
            >
              <img src={url} alt="" loading="lazy" />
              {canEdit && (
                <>
                  <button
                    type="button"
                    className="img-thumb-remove"
                    onClick={() => void handleRemove(index)}
                    disabled={uploading}
                    aria-label={`Remove image ${index + 1}`}
                    data-ocid={`admin.products.delete_image.${index + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className="img-thumb-meta"
                    draggable={false}
                    title="Drag to reorder — the first image is shown in the shop"
                  >
                    <GripVertical className="w-3 h-3 inline-block align-[-0.125rem]" />
                    {index === 0 ? "cover" : `image ${index + 1}`}
                  </span>
                </>
              )}
              {overIndex === index &&
                dragIndex !== null &&
                dragIndex !== index && (
                  <span
                    className="absolute inset-0"
                    style={{
                      border: "2px solid var(--primary)",
                      background: "rgba(139, 92, 246, 0.12)",
                      pointerEvents: "none",
                    }}
                  />
                )}
            </div>
          ))}
        </div>
      ) : (
        <p
          className="img-thumb-empty"
          style={{ border: "1px solid var(--border)", padding: "1rem" }}
          data-ocid="admin.products.images_empty"
        >
          No images yet
        </p>
      )}

      {canEdit && images.length > 0 && (
        <p className="img-size-meta">
          Drag thumbnails to reorder — the first image is the shop cover.
        </p>
      )}
    </div>
  );
}

/**
 * PRODUCTS tab — dense operations view of every product, including hidden and
 * test products. Operators can edit name, price (dollar decimal value stored
 * directly, e.g. 24.99), inventory, active and hidden flags. Price changes are
 * financial and therefore gated on ADMIN/OWNER and pass through an explicit
 * confirmation step. All reads use query calls; errors are surfaced verbatim.
 */
export function ProductsTab({ session }: AdminTabBodyProps) {
  const { data: products, isLoading, error } = useProducts();
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();

  const canEdit = session.canManage;

  // Edit modal state.
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the draft whenever a different product is opened for editing.
  useEffect(() => {
    if (editing) setDraft(toDraft(editing));
  }, [editing]);

  const stats = useMemo(() => {
    const list = products ?? [];
    const active = list.filter((p) => p.active && !p.admin_only).length;
    const hidden = list.filter((p) => p.admin_only).length;
    const lowStock = list.filter(
      (p) => p.active && p.inventory <= BigInt(LOW_STOCK_THRESHOLD),
    ).length;
    return { total: list.length, active, hidden, lowStock };
  }, [products]);

  // Dropdown options derived from stored category data (never hardcoded
  // names). The currently-selected product's slug is always included — even
  // when its category is inactive or missing from the list — so saving an
  // existing product never silently reassigns it to another category.
  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const entry of categories ?? []) {
      options.set(entry.category.slug, entry.category.name);
    }
    const current = editing?.category;
    if (current && !options.has(current)) {
      options.set(current, current);
    }
    return Array.from(options, ([slug, name]) => ({ slug, name }));
  }, [categories, editing?.category]);

  const openEdit = (p: Product) => {
    setFormError(null);
    setEditing(p);
  };

  const openNew = () => {
    setFormError(null);
    setEditing(blankProduct());
  };

  const closeEdit = () => {
    setEditing(null);
    setDraft(null);
    setConfirmOpen(false);
    setFormError(null);
  };

  const handleSave = () => {
    if (!editing || !draft) return;
    const price = parseDollars(draft.priceDollars);
    if (price === null) {
      setFormError("Price must be a dollar amount with at most two decimals.");
      return;
    }
    const inventory = Number(draft.inventory);
    if (!Number.isInteger(inventory) || inventory < 0) {
      setFormError("Inventory must be a non-negative whole number.");
      return;
    }

    const next: Product = {
      ...editing,
      name: draft.name.trim() || editing.name,
      category: draft.category,
      price,
      inventory: BigInt(inventory),
      active: draft.active,
      admin_only: draft.hidden,
    };

    // Price changes are financial — require explicit confirmation.
    if (price !== editing.price) {
      setConfirmOpen(true);
      return;
    }
    void commit(next);
  };

  const commit = async (next: Product) => {
    setFormError(null);
    const isNew = next.id === 0n;
    try {
      if (isNew) {
        await createProduct.mutateAsync(next);
      } else {
        await updateProduct.mutateAsync(next);
      }
      closeEdit();
    } catch (e) {
      setFormError(adminErrorMessage(e));
    }
  };

  const handleConfirmPrice = () => {
    if (!editing || !draft) return;
    const price = parseDollars(draft.priceDollars);
    if (price === null) return;
    const inventory = Number(draft.inventory);
    const next: Product = {
      ...editing,
      name: draft.name.trim() || editing.name,
      category: draft.category,
      price,
      inventory: BigInt(inventory),
      active: draft.active,
      admin_only: draft.hidden,
    };
    void commit(next);
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-16"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.products.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading products…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="admin-panel"
        style={{ borderColor: "var(--nak-negative)" }}
        data-ocid="admin.products.error_state"
      >
        <div className="admin-panel-body">
          <p style={{ color: "var(--nak-negative)" }}>
            {adminErrorMessage(error)}
          </p>
        </div>
      </div>
    );
  }

  const rows = products ?? [];

  return (
    <div className="flex flex-col gap-4" data-ocid="admin.products">
      <div className="admin-stat-grid" data-ocid="admin.products.stats">
        <AdminStatCard label="Products" value={String(stats.total)} />
        <AdminStatCard label="Active" value={String(stats.active)} />
        <AdminStatCard label="Hidden / test" value={String(stats.hidden)} />
        <AdminStatCard
          label="Low stock"
          value={String(stats.lowStock)}
          band={stats.lowStock > 0 ? "warning" : "positive"}
        />
      </div>

      <AdminPanel
        title="All products"
        actions={
          canEdit ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openNew}
              data-ocid="admin.products.new_button"
            >
              <Plus className="w-4 h-4" />
              New product
            </button>
          ) : undefined
        }
      >
        <AdminTable<Product>
          columns={[
            {
              key: "name",
              header: "Name",
              render: (p) => (
                <span className="inline-flex items-center gap-2">
                  {p.name}
                  {p.admin_only && (
                    <span
                      className="text-[0.625rem] uppercase tracking-wider"
                      style={{ color: "var(--nak-warning)" }}
                    >
                      hidden
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (p) => p.category || "—",
            },
            {
              key: "price",
              header: "Price",
              align: "right",
              render: (p) => formatPrice(p.price),
            },
            {
              key: "inventory",
              header: "Inventory",
              align: "right",
              render: (p) => {
                const low =
                  p.active && p.inventory <= BigInt(LOW_STOCK_THRESHOLD);
                return (
                  <span
                    style={low ? { color: "var(--nak-warning)" } : undefined}
                  >
                    {String(p.inventory)}
                    {low ? " low" : ""}
                  </span>
                );
              },
            },
            {
              key: "status",
              header: "Status",
              render: (p) => {
                if (!p.active)
                  return (
                    <span style={{ color: "var(--muted-foreground)" }}>
                      inactive
                    </span>
                  );
                return p.admin_only ? (
                  <span style={{ color: "var(--nak-warning)" }}>hidden</span>
                ) : (
                  <span style={{ color: "var(--nak-positive)" }}>active</span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (p) =>
                canEdit ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openEdit(p)}
                    data-ocid={`admin.products.edit_button.${p.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <span style={{ color: "var(--muted-foreground)" }}>—</span>
                ),
            },
          ]}
          rows={rows}
          rowKey={(p) => String(p.id)}
          emptyMessage="No products configured."
        />
      </AdminPanel>

      {/* Edit / create modal */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent data-ocid="admin.products.edit_dialog">
          <DialogHeader>
            <DialogTitle>
              {editing && editing.id === 0n ? "New product" : "Edit product"}
            </DialogTitle>
            <DialogDescription>
              {editing && editing.id === 0n
                ? "Create a new product, then set its details."
                : "Update product details. Price changes require confirmation."}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="products-name">
                  Name
                </label>
                <input
                  id="products-name"
                  className="field-input"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  data-ocid="admin.products.name_input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="products-category">
                  Category
                </label>
                <select
                  id="products-category"
                  className="field-input"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  data-ocid="admin.products.category_select"
                >
                  <option value="">No category</option>
                  {categoryOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="field-label" htmlFor="products-price">
                    Price (USD)
                  </label>
                  <input
                    id="products-price"
                    className="field-input mono-num"
                    inputMode="decimal"
                    value={draft.priceDollars}
                    onChange={(e) =>
                      setDraft({ ...draft, priceDollars: e.target.value })
                    }
                    data-ocid="admin.products.price_input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="field-label" htmlFor="products-inventory">
                    Inventory
                  </label>
                  <input
                    id="products-inventory"
                    className="field-input mono-num"
                    inputMode="numeric"
                    value={draft.inventory}
                    onChange={(e) =>
                      setDraft({ ...draft, inventory: e.target.value })
                    }
                    data-ocid="admin.products.inventory_input"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label
                  className="flex items-center gap-2 text-sm"
                  htmlFor="products-active"
                >
                  <Checkbox
                    id="products-active"
                    checked={draft.active}
                    onCheckedChange={(v) =>
                      setDraft({ ...draft, active: v === true })
                    }
                    data-ocid="admin.products.active_checkbox"
                  />
                  Active (visible to customers)
                </label>
                <label
                  className="flex items-center gap-2 text-sm"
                  htmlFor="products-hidden"
                >
                  <Checkbox
                    id="products-hidden"
                    checked={draft.hidden}
                    onCheckedChange={(v) =>
                      setDraft({ ...draft, hidden: v === true })
                    }
                    data-ocid="admin.products.hidden_checkbox"
                  />
                  Hidden / test (not shown to customers)
                </label>
              </div>

              {formError && (
                <p
                  className="text-sm"
                  style={{ color: "var(--nak-negative)" }}
                  data-ocid="admin.products.form_error"
                >
                  {formError}
                </p>
              )}

              {editing && editing.id !== 0n && (
                <div
                  className="border-t pt-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ProductImageSection product={editing} canEdit={canEdit} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeEdit}
              data-ocid="cancel_button"
            >
              Cancel
            </button>
            <AdminConfirmDialog
              trigger={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={
                    updateProduct.isPending || createProduct.isPending || !draft
                  }
                  data-ocid="admin.products.save_button"
                >
                  {updateProduct.isPending || createProduct.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Save changes
                </button>
              }
              title="Confirm price change"
              description={
                editing
                  ? `Changing the price of "${editing.name}" from ${formatPrice(
                      editing.price,
                    )} to ${formatPrice(
                      parseDollars(draft?.priceDollars ?? "") ?? 0,
                    )}. This is a financial change and will be applied immediately.`
                  : ""
              }
              confirmLabel="Confirm price change"
              cancelLabel="Cancel"
              tone="warning"
              onConfirm={handleConfirmPrice}
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              pending={updateProduct.isPending || createProduct.isPending}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
