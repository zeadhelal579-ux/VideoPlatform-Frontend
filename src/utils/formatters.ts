// File: formatters.ts
// Purpose: Pure functions only — date formatting, file size formatting
// (ARCHITECTURE.md section 3.1). Nothing here calls the API or touches state.
import type { VideoStatus } from "../types/video";

// Formats an ISO timestamp for display; returns the raw text when it is not a valid date
// (a malformed value from the Api must never crash the page).
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// Describes how long ago (or from now) a timestamp is; invalid input is returned unchanged.
export function formatRelativeToNow(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const absMinutes = Math.abs(diffMinutes);
  if (absMinutes < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

// Formats a byte count as B / KB / MB / GB; anything that is not a finite size of at least 1 byte is "0 B".
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${exponent === 0 ? Math.floor(value) : value.toFixed(1)} ${units[exponent]}`;
}

const STATUS_LABELS: Record<VideoStatus, string> = {
  Pending: "Awaiting upload",
  Queued: "Queued",
  Processing: "Processing",
  Ready: "Ready",
  Failed: "Failed",
};

// Human-readable label for a video status.
export function formatStatusLabel(status: VideoStatus): string {
  return STATUS_LABELS[status];
}
