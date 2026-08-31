import type React from "react";
import { useState } from "react";

interface ConfirmStepProps {
  trigger: React.ReactNode;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  tone?: "negative" | "warning" | "neutral";
}

export function ConfirmStep({
  trigger,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = "neutral",
}: ConfirmStepProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="confirm-step-trigger"
        onClick={() => setOpen(true)}
        data-ocid="confirm_step_trigger"
      >
        {trigger}
      </button>
    );
  }

  return (
    <div className="confirm-step" data-ocid="confirm_step">
      <p className="confirm-step-message">{message}</p>
      <div className="confirm-step-actions">
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
          className={`btn ${tone === "neutral" ? "" : `btn-${tone}`}`}
          onClick={handleConfirm}
          data-ocid="confirm_button"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
