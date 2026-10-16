// File: WatchPage.tsx
// Purpose: User navigates here with a video ID in the route; polls until
// Ready, then plays it (FLOW.md, Video Streaming Flow, steps 1-4).
// Logic/Approach: The player (and with it all of Video.js, by far the
// heaviest dependency) is loaded with React.lazy, so it is downloaded only
// when a Ready video is actually about to play — not on the home page, not on
// the login page, and not while a video is still being processed. Every state
// the backend can be in gets its own explicit message, including the
// misconfiguration case "Ready but no playlist URL" (Storage:PublicBaseUrl
// not set on the Api), which would otherwise look like an endless spinner.
import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useVideoStatus } from "../hooks/useVideoStatus";
import { ProcessingStatusBadge } from "../components/video/ProcessingStatusBadge";
import { Button } from "../components/ui/Button";
import { ButtonLink } from "../components/ui/ButtonLink";
import { Spinner } from "../components/ui/Spinner";
import { formatDate } from "../utils/formatters";

const VideoPlayer = lazy(() =>
  import("../components/video/VideoPlayer").then((module) => ({ default: module.VideoPlayer })),
);

// Placeholder shown while the player chunk loads.
function PlayerPlaceholder() {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-surface">
      <Spinner size={28} className="text-ink-faint" />
    </div>
  );
}

// Shows a video: status while it is processing, the player once it is Ready.
export function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const { video, error, isLoading, canRetry, retry } = useVideoStatus(id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {isLoading && <PlayerPlaceholder />}

      {!isLoading && error && (
        <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-lg bg-surface px-6 text-center">
          <p role="alert" className="text-status-failed">
            {error}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canRetry && (
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            )}
            <ButtonLink to="/dashboard" variant="ghost">
              Back to your videos
            </ButtonLink>
          </div>
        </div>
      )}

      {!isLoading && !error && video && (
        <>
          {video.status === "Ready" && video.masterPlaylistUrl ? (
            <Suspense fallback={<PlayerPlaceholder />}>
              <VideoPlayer src={video.masterPlaylistUrl} title={video.title} />
            </Suspense>
          ) : video.status === "Ready" ? (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg bg-surface px-6 text-center">
              <p className="font-medium text-status-failed">Playback isn't available</p>
              <p className="max-w-md text-sm text-ink-faint">
                This video finished processing, but the server did not provide its playback address. If you run this
                site, check the Api's Storage:PublicBaseUrl setting.
              </p>
            </div>
          ) : video.status === "Failed" ? (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg bg-surface px-6 text-center">
              <p className="font-medium text-status-failed">Processing failed</p>
              {video.errorMessage && <p className="max-w-md text-sm text-ink-faint">{video.errorMessage}</p>}
            </div>
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg bg-surface px-6 text-center">
              <Spinner size={28} className="text-ink-faint" />
              <p className="text-sm text-ink-faint">
                {video.status === "Pending"
                  ? "Waiting for the upload to be confirmed…"
                  : video.status === "Queued"
                    ? "Queued for processing…"
                    : "Transcoding into 1080p / 720p / 480p — this can take a few minutes."}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <h1 className="font-display text-xl font-bold text-ink">{video.title}</h1>
            <div className="flex items-center gap-3">
              <ProcessingStatusBadge status={video.status} />
              <span className="text-xs text-ink-faint">Uploaded {formatDate(video.createdAt)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
