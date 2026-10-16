// File: useVideoStatus.ts
// Purpose: Polls getVideo() on an interval until status is Ready or
// Failed, so WatchPage and DashboardPage don't each implement their own
// polling loop (ARCHITECTURE.md section 3.1).
// Logic/Approach: A self-rescheduling setTimeout chain rather than
// setInterval — if one poll takes longer than the interval (a slow
// network), setInterval would fire overlapping requests, while this waits
// for each response before scheduling the next. Stops entirely once the
// video reaches a terminal state (types/video.ts's isTerminalStatus) or
// the id changes.
// Resilience: a transcode takes minutes, so one dropped request must not
// freeze the page. Transient failures (network drop, 429, 5xx — see
// isTransientError) are retried with exponential backoff and only surface
// as an error after MAX_CONSECUTIVE_FAILURES in a row; permanent ones (404,
// 400, a 401 that survived the refresh) stop at once. `retry` restarts the
// whole loop so the page can offer a "Try again" button after giving up.
import { useCallback, useEffect, useState } from "react";
import { getVideo } from "../api/videos";
import { ApiError, isTransientError } from "../api/client";
import { isTerminalStatus, type Video } from "../types/video";

const POLL_INTERVAL_MS = 4000;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 6;

interface UseVideoStatusResult {
  video: Video | null;
  error: string | null;
  isLoading: boolean;
  // True when polling gave up on transient failures, so trying again may work.
  canRetry: boolean;
  retry: () => void;
}

// 2s, 4s, 8s, 16s, 30s, 30s... for the 1st, 2nd, 3rd... failure in a row.
function retryDelayMs(consecutiveFailures: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** (consecutiveFailures - 1), RETRY_MAX_MS);
}

// Polls a video until it is Ready or Failed, backing off on transient errors.
export function useVideoStatus(videoId: string | undefined): UseVideoStatusResult {
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canRetry, setCanRetry] = useState(false);
  // Bumping this number re-runs the effect below from scratch.
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let consecutiveFailures = 0;

    setVideo(null);
    setError(null);
    setCanRetry(false);
    setIsLoading(true);

    const poll = async () => {
      try {
        const data = await getVideo(videoId);
        if (cancelled) return;

        consecutiveFailures = 0;
        setVideo(data);
        setIsLoading(false);

        if (!isTerminalStatus(data.status)) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;

        consecutiveFailures += 1;
        const transient = isTransientError(err);

        // Keep whatever is on screen and quietly try again a little later.
        if (transient && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
          timeoutId = setTimeout(poll, retryDelayMs(consecutiveFailures));
          return;
        }

        setError(err instanceof ApiError ? err.message : "Something went wrong.");
        setCanRetry(transient);
        setIsLoading(false);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [videoId, attempt]);

  return { video, error, isLoading, canRetry, retry };
}
