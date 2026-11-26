"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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
  onCancel,
  ...rest
}: ConfirmDialogProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  return createPortal(
    <ConfirmDialogContent onCancel={onCancel} {...rest} />,
    document.body,
  );
}

function ConfirmDialogContent({
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
}: Omit<ConfirmDialogProps, "open">) {
  const [comment, setComment] = useState("");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        aria-hidden
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={cn(
          "relative z-[101] w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl",
          "animate-dialog-in dark:border-slate-700 dark:bg-slate-900",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-neutral-900 dark:text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-slate-400">{description}</p>

        {requireComment || optionalComment ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm-comment">{commentLabel}</Label>
            <textarea
              id="confirm-comment"
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
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

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading || (requireComment && !comment.trim())}
            onClick={() => onConfirm(comment.trim() || undefined)}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
