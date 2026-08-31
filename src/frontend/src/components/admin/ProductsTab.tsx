import type { Product } from "@/backend";
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
  useCreateProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/useQueries";
import { dollarsToCents, formatPrice } from "@/lib/currency";
import type { AdminTabBodyProps } from "@/types/routes";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

/** Inventory at or below this count is flagged as low stock. */
const LOW_STOCK_THRESHOLD = 5;

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
  priceDollars: string;
  inventory: string;
  active: boolean;
  hidden: boolean;
}

function toDraft(p: Product): Draft {
  return {
    name: p.name,
    priceDollars: (Number(p.price) / 100).toFixed(2),
    inventory: String(p.inventory),
    active: p.active,
    hidden: p.admin_only,
  };
}

/**
 * PRODUCTS tab — dense operations view of every product, including hidden and
 * test products. Operators can edit name, price (dollar input converted to
 * integer cents), inventory, active and hidden flags. Price changes are
 * financial and therefore gated on ADMIN/OWNER and pass through an explicit
 * confirmation step. All reads use query calls; errors are surfaced verbatim.
 */
export function ProductsTab({ session }: AdminTabBodyProps) {
  const { data: products, isLoading, error } = useProducts();
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
    const cents = dollarsToCents(draft.priceDollars);
    if (cents === null) {
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
      price: BigInt(cents),
      inventory: BigInt(inventory),
      active: draft.active,
      admin_only: draft.hidden,
    };

    // Price changes are financial — require explicit confirmation.
    if (cents !== Number(editing.price)) {
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
    const cents = dollarsToCents(draft.priceDollars);
    if (cents === null) return;
    const inventory = Number(draft.inventory);
    const next: Product = {
      ...editing,
      name: draft.name.trim() || editing.name,
      price: BigInt(cents),
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
                      dollarsToCents(draft?.priceDollars ?? "") ?? 0,
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
