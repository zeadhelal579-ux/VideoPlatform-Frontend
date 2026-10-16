// File: DashboardPage.tsx
// Purpose: DashboardPage -> api/videos.listVideos() (ARCHITECTURE.md
// section 6, "List my videos" row) — paginated, filtered to the
// signed-in user's own videos server-side (ListVideosHandler.cs).
// Logic/Approach: While any video on the current page is Queued or
// Processing, the page quietly re-fetches itself every few seconds so a
// status badge flips to Ready on its own (FLOW.md, Video Upload Flow,
// step 9: the dashboard "begins polling"). Pending is deliberately not
// counted: it only moves when the uploader confirms, and an abandoned upload
// would stay Pending forever — polling for it would never stop. A failed
// background refresh keeps the list on screen instead of replacing it with
// an error.
import { useEffect, useState } from "react";
import { listVideos } from "../api/videos";
import { ApiError, isTransientError } from "../api/client";
import { VideoCard } from "../components/video/VideoCard";
import { Button } from "../components/ui/Button";
import { ButtonLink } from "../components/ui/ButtonLink";
import { Spinner } from "../components/ui/Spinner";
import type { Video } from "../types/video";

const PAGE_SIZE = 20;
const REFRESH_WHILE_PROCESSING_MS = 5000;

// Statuses the Worker moves along by itself, so the list can go stale.
function isInProgress(video: Video): boolean {
  return video.status === "Queued" || video.status === "Processing";
}

// Lists the signed-in user's videos and refreshes while any is processing.
export function DashboardPage() {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    setError(null);

    // `isBackgroundRefresh` is false for the load a person asked for (first
    // visit, page change) and true for the automatic re-fetches.
    const load = async (isBackgroundRefresh: boolean) => {
      try {
        const result = await listVideos(page, PAGE_SIZE);
        if (cancelled) return;

        setVideos(result.items);
        setTotalCount(result.totalCount);
        setError(null);

        if (result.items.some(isInProgress)) {
          timeoutId = setTimeout(() => void load(true), REFRESH_WHILE_PROCESSING_MS);
        }
      } catch (err) {
        if (cancelled) return;

        if (isBackgroundRefresh && isTransientError(err)) {
          timeoutId = setTimeout(() => void load(true), REFRESH_WHILE_PROCESSING_MS);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load your videos.");
      }
    };

    void load(false);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ink">Your videos</h1>
        <ButtonLink to="/upload">Upload video</ButtonLink>
      </div>

      {error && (
        <p role="alert" className="mt-8 text-sm text-status-failed">
          {error}
        </p>
      )}

      {!error && videos === null && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner size={28} className="text-ink-faint" />
        </div>
      )}

      {!error && videos !== null && videos.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-ink-muted">You haven't uploaded anything yet.</p>
          <ButtonLink to="/upload" variant="secondary">
            Upload your first video
          </ButtonLink>
        </div>
      )}

      {!error && videos !== null && videos.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-ink-faint">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
