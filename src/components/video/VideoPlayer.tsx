// File: VideoPlayer.tsx
// Purpose: The one component allowed to import Video.js
// (ARCHITECTURE.md section 3.1).
// Logic/Approach: Wraps the imperative Video.js instance in a useRef +
// useEffect pair — the standard, correct way to host a non-React library
// inside React without fighting its render cycle. HLS support is built
// into video.js itself since v7 (TOOLS.md), so "application/x-mpegURL" is
// the only source type needed — no separate HLS plugin. Every segment
// request from here on goes straight to Cloudflare/MinIO/S3, never through
// the Api or Worker (FLOW.md, Video Streaming Flow, step 6).
// Because the player fetches playlists and segments with XHR/fetch from the
// storage/CDN origin, that origin must answer CORS for this site's origin
// (deploy/s3-cors.json) — otherwise Video.js reports a network error.
// This file is only ever loaded through React.lazy (see WatchPage.tsx), so
// the Video.js bundle and its stylesheet stay out of every other page.
import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

// Derived from the library's own factory instead of a deep type import
// ("video.js/dist/types/player"), which depends on the package layout.
type VideoJsPlayer = ReturnType<typeof videojs>;

interface VideoPlayerProps {
  src: string;
  title: string;
}

// Video.js wrapper for an HLS source (the only place that imports Video.js).
export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    videoElement.setAttribute("aria-label", title);
    containerRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      responsive: true,
      fluid: true,
      preload: "auto",
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      sources: [{ src, type: "application/x-mpegURL" }],
    });
    playerRef.current = player;

    return () => {
      if (!player.isDisposed()) player.dispose();
      playerRef.current = null;
    };
    // Re-created only when the source itself changes (or on unmount) — the
    // player instance is otherwise stable across re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div data-vjs-player className="overflow-hidden rounded-lg bg-black">
      <div ref={containerRef} />
    </div>
  );
}
