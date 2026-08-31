import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface AdminConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  tone?: "negative" | "warning" | "neutral";
  disabled?: boolean;
  pending?: boolean;
  /** Controlled open state — use when the dialog is nested inside another dialog. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Shared confirmation dialog for destructive or financial admin actions.
 * Destructive and financial actions must pass through an explicit confirm
 * step; this dialog is that step. The confirm button is disabled while
 * `pending` so a mutation cannot be double-fired.
 */
export function AdminConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = "neutral",
  disabled = false,
  pending = false,
  open: controlledOpen,
  onOpenChange,
}: AdminConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  const toneClass =
    tone === "negative"
      ? "btn-negative"
      : tone === "warning"
        ? "btn-warning"
        : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent data-ocid="admin.confirm_dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpen(false)}
            data-ocid="cancel_button"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${toneClass}`}
            onClick={handleConfirm}
            disabled={pending}
            data-ocid="confirm_button"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
