import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Matches `Input` — use on native `<select>` for consistent light admin forms. */
export const nativeSelectClassName =
  "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:light]";

/** Blue fill + white label on hover (navbar actions, outline buttons). */
export const outlineActionHoverClassName =
  "transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-white";
