"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  requireComment?: boolean;
  optionalComment?: boolean;
  commentLabel?: string;
  loading?: boolean;
  onConfirm: (comment?: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  requireComment = false,
  optionalComment = false,
  commentLabel = "Comment",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) setComment("");
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      onClose={onCancel}
    >
      <form
        method="dialog"
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (requireComment && !comment.trim()) return;
          onConfirm(comment.trim() || undefined);
        }}
      >
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="mt-2 text-sm text-neutral-500">{description}</p>

        {requireComment || optionalComment ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm-comment">{commentLabel}</Label>
            <textarea
              id="confirm-comment"
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-neutral-200 px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              )}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={requireComment}
              placeholder={
                requireComment
                  ? "Provide feedback for the employee..."
                  : "Optional review notes..."
              }
            />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading || (requireComment && !comment.trim())}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
