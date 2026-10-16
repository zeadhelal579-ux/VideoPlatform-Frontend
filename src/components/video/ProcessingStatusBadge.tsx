// File: ProcessingStatusBadge.tsx
// Purpose: The small status pill shown on VideoCard and WatchPage — one
// definition of what each VideoStatus looks like, so the five states
// (Domain/Enums/VideoStatus.cs: Pending -> Queued -> Processing ->
// Ready | Failed) are always styled consistently.
import { Spinner } from "../ui/Spinner";
import { formatStatusLabel } from "../../utils/formatters";
import type { VideoStatus } from "../../types/video";

interface ProcessingStatusBadgeProps {
  status: VideoStatus;
}

const DOT_CLASSES: Record<VideoStatus, string> = {
  Pending: "bg-status-pending",
  Queued: "bg-status-queued",
  Processing: "bg-status-processing",
  Ready: "bg-status-ready",
  Failed: "bg-status-failed",
};

const TEXT_CLASSES: Record<VideoStatus, string> = {
  Pending: "text-status-pending",
  Queued: "text-status-queued",
  Processing: "text-status-processing",
  Ready: "text-status-ready",
  Failed: "text-status-failed",
};

// Coloured pill that shows a video status.
export function ProcessingStatusBadge({ status }: ProcessingStatusBadgeProps) {
  const isBusy = status === "Queued" || status === "Processing";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium ${TEXT_CLASSES[status]}`}
    >
      {isBusy ? <Spinner size={11} /> : <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[status]}`} />}
      {formatStatusLabel(status)}
    </span>
  );
}
