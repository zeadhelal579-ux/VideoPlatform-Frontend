// File: Button.tsx
// Purpose: Shared button styles — one accent color spent consistently
// across the whole app (index.css's design note) instead of every page
// re-deciding what a primary action looks like.
// Logic/Approach: The class recipe lives in buttonClasses() so a real
// <button> (this file) and a router <Link> that must LOOK like a button
// (ButtonLink.tsx) share one source of truth. A <Link> must not wrap a
// <Button>: that nests one interactive element inside another, which is
// invalid HTML and makes keyboard and screen-reader users hit two tab stops.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-4 py-2.5",
  sm: "px-3.5 py-2",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "bg-surface-raised text-ink border border-border hover:border-ink-faint",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface",
  danger: "bg-transparent text-status-failed border border-status-failed/40 hover:bg-status-failed/10",
};

// Builds the full class string for a button-looking element.
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${extra}`.trim();
}

// Styled button with variants and sizes.
export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button disabled={disabled || isLoading} className={buttonClasses(variant, size, className)} {...rest}>
      {isLoading && <Spinner size={16} />}
      {children}
    </button>
  );
}
