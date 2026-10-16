// File: VideoCard.tsx
// Purpose: Split by what it's for, not by page, so it's reusable on both
// DashboardPage and HomePage without duplication (ARCHITECTURE.md
// section 3.1).
// Logic/Approach: thumbnailUrl is close to always null right now — nothing
// in VideoProcessingConsumer.cs ever calls Video.SetThumbnail(), even
// though the entity and DTO both support it — so every card needs a
// deliberate placeholder rather than a broken <img>. The left accent bar
// carries the same status color as ProcessingStatusBadge, so a whole grid
// scans by color before anyone reads a single label.
import { Link } from "react-router-dom";
import { ProcessingStatusBadge } from "./ProcessingStatusBadge";
import { formatRelativeToNow } from "../../utils/formatters";
import type { Video } from "../../types/video";

interface VideoCardProps {
  video: Video;
}

const ACCENT_BAR_CLASSES: Record<Video["status"], string> = {
  Pending: "bg-status-pending",
  Queued: "bg-status-queued",
  Processing: "bg-status-processing",
  Ready: "bg-status-ready",
  Failed: "bg-status-failed",
};

// Dashboard card for one video.
export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link
      to={`/watch/${video.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-ink-faint"
    >
      <div className={`h-1 w-full ${ACCENT_BAR_CLASSES[video.status]}`} />

      <div className="relative aspect-video w-full overflow-hidden bg-surface-raised">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlayGlyph className="h-10 w-10 text-ink-faint transition-colors group-hover:text-accent" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-sm font-semibold text-ink">{video.title}</h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <ProcessingStatusBadge status={video.status} />
          <span className="text-xs text-ink-faint">{formatRelativeToNow(video.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// Decorative play icon.
function PlayGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" />
    </svg>
  );
}
