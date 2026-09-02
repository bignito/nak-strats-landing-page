import type { Category, CategoryError, CategoryWithCount } from "@/backend";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReassignProducts,
  useReorderCategories,
  useUpdateCategory,
} from "@/hooks/useQueries";
import type { AdminTabBodyProps } from "@/types/routes";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

/**
 * Maps a backend CategoryError to a human-readable admin message. The backend
 * returns these as discriminated variants; the category hooks throw the raw
 * variant on failure so this helper renders the specific reason.
 */
function categoryErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    switch (record.__kind__) {
      case "emptyName":
        return "Category name cannot be empty.";
      case "slugCollision":
        return `A category with the slug "${String(
          record.slugCollision,
        )}" already exists.`;
      case "notFound":
        return "That category no longer exists — refresh the list.";
      case "targetCategoryNotFound":
        return `The reassignment target "${String(
          record.targetCategoryNotFound,
        )}" no longer exists.`;
      case "productsReferenced": {
        const ref = record.productsReferenced as {
          slug: string;
          count: bigint;
        };
        return `This category still has ${String(
          ref.count,
        )} product(s) referencing it.`;
      }
      default:
        break;
    }
  }
  if (error instanceof Error) return error.message;
  return "Operation failed";
}

/**
 * Generates the slug the backend will derive from a category name. Mirrors the
 * backend pipeline (src/backend/lib/categories.mo) byte-for-byte: trim ASCII
 * spaces, lowercase, keep alphanumerics, convert each space to a hyphen, and
 * drop every other character (including hyphens and whitespace runs). This
 * keeps the add form's live preview identical to the slug the backend creates.
 */
function slugify(name: string): string {
  const trimmed = name.replace(/^ +| +$/g, "");
  let out = "";
  for (const c of trimmed.toLowerCase()) {
    if (/\p{L}|\p{N}/u.test(c)) {
      out += c;
    } else if (c === " ") {
      out += "-";
    }
  }
  return out;
}

interface AddDraft {
  name: string;
  description: string;
}

interface EditDraft {
  name: string;
  description: string;
  active: boolean;
  showWhenEmpty: boolean;
}

/** A category pending deletion that still has referenced products. */
interface ReassignState {
  category: CategoryWithCount;
  count: bigint;
  slug: string;
}

/**
 * CATEGORIES tab — dense operations view of every shop category. Operators can
 * add, edit, toggle active, reorder (arrow up/down persisting sortOrder), and
 * delete. Deleting a category that still has products never orphans them: the
 * flow surfaces a blocking dialog with the referenced count and a dropdown to
 * reassign those products to another category before the delete is allowed.
 */
export function CategoriesTab({ session }: AdminTabBodyProps) {
  const { data: categories, isLoading, error } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const reorderCategories = useReorderCategories();
  const deleteCategory = useDeleteCategory();
  const reassignProducts = useReassignProducts();

  const canEdit = session.canManage;

  // Add dialog state.
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDraft>({
    name: "",
    description: "",
  });
  const [addError, setAddError] = useState<string | null>(null);

  // Edit dialog state.
  const [editing, setEditing] = useState<Category | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete / reassign flow state.
  const [reassign, setReassign] = useState<ReassignState | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [reassignError, setReassignError] = useState<string | null>(null);

  const list = useMemo(() => categories ?? [], [categories]);

  const stats = useMemo(() => {
    const active = list.filter((c) => c.category.active).length;
    const totalProducts = list.reduce(
      (sum, c) => sum + Number(c.productCount),
      0,
    );
    return { total: list.length, active, totalProducts };
  }, [list]);

  // Reset the edit draft whenever a different category is opened.
  useEffect(() => {
    if (editing) {
      setEditDraft({
        name: editing.name,
        description: editing.description ?? "",
        active: editing.active,
        showWhenEmpty: editing.showWhenEmpty,
      });
    }
  }, [editing]);

  const openAdd = () => {
    setAddError(null);
    setAddDraft({ name: "", description: "" });
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setAddError(null);
  };

  const openEdit = (c: Category) => {
    setEditError(null);
    setEditing(c);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditDraft(null);
    setEditError(null);
  };

  const handleCreate = async () => {
    const name = addDraft.name.trim();
    if (!name) {
      setAddError("Category name cannot be empty.");
      return;
    }
    setAddError(null);
    try {
      await createCategory.mutateAsync(
        name,
        addDraft.description.trim() || null,
      );
      closeAdd();
    } catch (e) {
      setAddError(categoryErrorMessage(e));
    }
  };

  const handleUpdate = async () => {
    if (!editing || !editDraft) return;
    const name = editDraft.name.trim();
    if (!name) {
      setEditError("Category name cannot be empty.");
      return;
    }
    setEditError(null);
    try {
      await updateCategory.mutateAsync(
        editing.id,
        name,
        editDraft.description.trim() || null,
        editing.sortOrder,
        editDraft.active,
        editDraft.showWhenEmpty,
      );
      closeEdit();
    } catch (e) {
      setEditError(categoryErrorMessage(e));
    }
  };

  const handleToggleActive = async (c: Category) => {
    try {
      await updateCategory.mutateAsync(
        c.id,
        c.name,
        c.description ?? null,
        c.sortOrder,
        !c.active,
        c.showWhenEmpty,
      );
    } catch (e) {
      // Surface the failure without losing the row's current state.
      setEditError(categoryErrorMessage(e));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = list.map((c) => c.category.id);
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    try {
      await reorderCategories.mutateAsync(next);
    } catch (e) {
      setEditError(categoryErrorMessage(e));
    }
  };

  const handleDelete = async (c: CategoryWithCount) => {
    try {
      await deleteCategory.mutateAsync(c.category.id);
    } catch (e) {
      const err = e as CategoryError;
      if (err && err.__kind__ === "productsReferenced") {
        setReassign({
          category: c,
          count: err.productsReferenced.count,
          slug: err.productsReferenced.slug,
        });
        setReassignTo("");
        setReassignError(null);
      } else {
        setEditError(categoryErrorMessage(e));
      }
    }
  };

  const handleReassignAndDelete = async () => {
    if (!reassign) return;
    if (!reassignTo) {
      setReassignError("Choose a category to move the products to first.");
      return;
    }
    setReassignError(null);
    try {
      await reassignProducts.mutateAsync(reassign.slug, reassignTo);
      await deleteCategory.mutateAsync(reassign.category.category.id);
      setReassign(null);
    } catch (e) {
      setReassignError(categoryErrorMessage(e));
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-16"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.categories.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading categories…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="admin-panel"
        style={{ borderColor: "var(--nak-negative)" }}
        data-ocid="admin.categories.error_state"
      >
        <div className="admin-panel-body">
          <p style={{ color: "var(--nak-negative)" }}>
            {categoryErrorMessage(error)}
          </p>
        </div>
      </div>
    );
  }

  const reassignTargets = list.filter(
    (c) => c.category.id !== reassign?.category.category.id,
  );

  return (
    <div className="flex flex-col gap-4" data-ocid="admin.categories">
      <div className="admin-stat-grid" data-ocid="admin.categories.stats">
        <AdminStatCard label="Categories" value={String(stats.total)} />
        <AdminStatCard label="Active" value={String(stats.active)} />
        <AdminStatCard label="Products" value={String(stats.totalProducts)} />
      </div>

      <AdminPanel
        title="All categories"
        actions={
          canEdit ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openAdd}
              data-ocid="admin.categories.new_button"
            >
              <Plus className="w-4 h-4" />
              New category
            </button>
          ) : undefined
        }
      >
        <AdminTable<CategoryWithCount>
          columns={[
            {
              key: "name",
              header: "Name",
              render: (c) => (
                <span className="inline-flex items-center gap-2">
                  {c.category.name}
                  {!c.category.active && (
                    <span
                      className="text-[0.625rem] uppercase tracking-wider"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      inactive
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "slug",
              header: "Slug",
              render: (c) => (
                <span style={{ color: "var(--muted-foreground)" }}>
                  {c.category.slug}
                </span>
              ),
            },
            {
              key: "products",
              header: "Products",
              align: "right",
              render: (c) => String(c.productCount),
            },
            {
              key: "active",
              header: "Active",
              render: (c) =>
                canEdit ? (
                  <Switch
                    checked={c.category.active}
                    onCheckedChange={() => void handleToggleActive(c.category)}
                    aria-label={`Toggle ${c.category.name} active`}
                    data-ocid={`admin.categories.toggle.${c.category.id}`}
                  />
                ) : (
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {c.category.active ? "yes" : "no"}
                  </span>
                ),
            },
            {
              key: "reorder",
              header: "Order",
              render: (c) => {
                const index = list.findIndex(
                  (x) => x.category.id === c.category.id,
                );
                return canEdit ? (
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.5rem" }}
                      onClick={() => void move(index, -1)}
                      disabled={index <= 0}
                      aria-label={`Move ${c.category.name} up`}
                      data-ocid={`admin.categories.move_up.${c.category.id}`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.5rem" }}
                      onClick={() => void move(index, 1)}
                      disabled={index < 0 || index >= list.length - 1}
                      aria-label={`Move ${c.category.name} down`}
                      data-ocid={`admin.categories.move_down.${c.category.id}`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {String(c.category.sortOrder)}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (c) =>
                canEdit ? (
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openEdit(c.category)}
                      data-ocid={`admin.categories.edit_button.${c.category.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <AdminConfirmDialog
                      trigger={
                        <button
                          type="button"
                          className="btn btn-secondary"
                          data-ocid={`admin.categories.delete_button.${c.category.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      }
                      title="Delete category"
                      description={`Delete "${c.category.name}"? If products still reference it, you will be asked to reassign them first.`}
                      confirmLabel="Delete"
                      cancelLabel="Cancel"
                      tone="negative"
                      onConfirm={() => void handleDelete(c)}
                      pending={deleteCategory.isPending}
                    />
                  </span>
                ) : (
                  <span style={{ color: "var(--muted-foreground)" }}>—</span>
                ),
            },
          ]}
          rows={list}
          rowKey={(c) => String(c.category.id)}
          emptyMessage="No categories configured."
        />
      </AdminPanel>

      {/* Add category dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && closeAdd()}>
        <DialogContent data-ocid="admin.categories.add_dialog">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Create a category. The slug is generated from the name and cannot
              be changed later.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="categories-add-name">
                Name
              </label>
              <input
                id="categories-add-name"
                className="field-input"
                value={addDraft.name}
                onChange={(e) =>
                  setAddDraft({ ...addDraft, name: e.target.value })
                }
                data-ocid="admin.categories.add_name_input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="field-label"
                htmlFor="categories-add-description"
              >
                Description (optional)
              </label>
              <textarea
                id="categories-add-description"
                className="field-input"
                rows={3}
                value={addDraft.description}
                onChange={(e) =>
                  setAddDraft({ ...addDraft, description: e.target.value })
                }
                data-ocid="admin.categories.add_description_input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="field-label">Slug preview</span>
              <span
                className="inset-well"
                data-ocid="admin.categories.add_slug_preview"
              >
                {slugify(addDraft.name) || "—"}
              </span>
            </div>

            {addError && (
              <p
                className="text-sm"
                style={{ color: "var(--nak-negative)" }}
                data-ocid="admin.categories.add_error"
              >
                {addError}
              </p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeAdd}
              data-ocid="cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleCreate()}
              disabled={createCategory.isPending}
              data-ocid="admin.categories.add_submit_button"
            >
              {createCategory.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Create category
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit category dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent data-ocid="admin.categories.edit_dialog">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Update the category details. The slug is fixed to keep existing
              products and orders linked.
            </DialogDescription>
          </DialogHeader>

          {editDraft && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="categories-edit-name">
                  Name
                </label>
                <input
                  id="categories-edit-name"
                  className="field-input"
                  value={editDraft.name}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, name: e.target.value })
                  }
                  data-ocid="admin.categories.edit_name_input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="field-label"
                  htmlFor="categories-edit-description"
                >
                  Description (optional)
                </label>
                <textarea
                  id="categories-edit-description"
                  className="field-input"
                  rows={3}
                  value={editDraft.description}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, description: e.target.value })
                  }
                  data-ocid="admin.categories.edit_description_input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="field-label">Slug</span>
                <span
                  className="inset-well"
                  data-ocid="admin.categories.edit_slug"
                >
                  {editing?.slug}
                </span>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  The slug is fixed — it keeps existing products and orders
                  linked to this category.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label
                  className="flex items-center gap-2 text-sm"
                  htmlFor="categories-edit-active"
                >
                  <Checkbox
                    id="categories-edit-active"
                    checked={editDraft.active}
                    onCheckedChange={(v) =>
                      setEditDraft({ ...editDraft, active: v === true })
                    }
                    data-ocid="admin.categories.edit_active_checkbox"
                  />
                  Active (shown in the shop filter)
                </label>
                <label
                  className="flex items-center gap-2 text-sm"
                  htmlFor="categories-edit-showWhenEmpty"
                >
                  <Checkbox
                    id="categories-edit-showWhenEmpty"
                    checked={editDraft.showWhenEmpty}
                    onCheckedChange={(v) =>
                      setEditDraft({
                        ...editDraft,
                        showWhenEmpty: v === true,
                      })
                    }
                    data-ocid="admin.categories.edit_show_when_empty_checkbox"
                  />
                  Show when empty (no products)
                </label>
              </div>

              {editError && (
                <p
                  className="text-sm"
                  style={{ color: "var(--nak-negative)" }}
                  data-ocid="admin.categories.edit_error"
                >
                  {editError}
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleUpdate()}
              disabled={updateCategory.isPending}
              data-ocid="admin.categories.edit_submit_button"
            >
              {updateCategory.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocking reassign-before-delete dialog */}
      <Dialog
        open={reassign !== null}
        onOpenChange={(o) => !o && setReassign(null)}
      >
        <DialogContent data-ocid="admin.categories.reassign_dialog">
          <DialogHeader>
            <DialogTitle>Products reference this category</DialogTitle>
            <DialogDescription>
              {reassign
                ? `"${reassign.category.category.name}" still has ${String(
                    reassign.count,
                  )} product(s). Move them to another category before deleting it — this keeps every product and order linked.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="categories-reassign-to">
                Move products to
              </label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger
                  id="categories-reassign-to"
                  className="w-full"
                  data-ocid="admin.categories.reassign_select"
                >
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {reassignTargets.map((c) => (
                    <SelectItem
                      key={c.category.id}
                      value={c.category.slug}
                      data-ocid={`admin.categories.reassign_option.${c.category.id}`}
                    >
                      {c.category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reassignError && (
              <p
                className="text-sm"
                style={{ color: "var(--nak-negative)" }}
                data-ocid="admin.categories.reassign_error"
              >
                {reassignError}
              </p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReassign(null)}
              data-ocid="cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleReassignAndDelete()}
              disabled={reassignProducts.isPending || deleteCategory.isPending}
              data-ocid="admin.categories.reassign_confirm_button"
            >
              {reassignProducts.isPending || deleteCategory.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Move products &amp; delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
