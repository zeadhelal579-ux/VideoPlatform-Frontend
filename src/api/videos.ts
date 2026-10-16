// File: videos.ts
// Purpose: requestUploadUrl(), confirmUpload(), getVideo(), listVideos()
// (ARCHITECTURE.md section 3.1) — one typed function per
// VideoEndpoints.cs route.
import { apiFetch, throwIfNotOk, parseJson, ApiError } from "./client";
import type { Video, RequestUploadUrlResult, ListVideosResult } from "../types/video";

// POST /api/videos/upload-url — FLOW.md, Video Upload Flow, step 3.
export async function requestUploadUrl(title: string, fileName: string): Promise<RequestUploadUrlResult> {
  const response = await apiFetch("/api/videos/upload-url", {
    method: "POST",
    body: JSON.stringify({ title, fileName }),
  });
  await throwIfNotOk(response, "Could not start the upload.");
  return parseJson<RequestUploadUrlResult>(response);
}

// POST /api/videos/{id}/confirm — FLOW.md, Video Upload Flow, step 8.
// 204 No Content on success, so there is nothing to parse or return.
export async function confirmUpload(videoId: string): Promise<void> {
  const response = await apiFetch(`/api/videos/${videoId}/confirm`, { method: "POST" });
  await throwIfNotOk(response, "Could not confirm the upload.");
}

// GET /api/videos/{id} — polled by useVideoStatus (FLOW.md, Video
// Streaming Flow, step 2). 404 has no body (TypedResults.NotFound()), so
// it gets its own, more specific message rather than the generic fallback.
export async function getVideo(videoId: string): Promise<Video> {
  const response = await apiFetch(`/api/videos/${videoId}`);
  if (response.status === 404) {
    throw new ApiError("This video does not exist, or isn't yours.", 404);
  }
  await throwIfNotOk(response, "Could not load this video.");
  return parseJson<Video>(response);
}

// GET /api/videos?page=&pageSize= — DashboardPage.tsx (ARCHITECTURE.md section 6).
export async function listVideos(page = 1, pageSize = 20): Promise<ListVideosResult> {
  const response = await apiFetch(`/api/videos?page=${page}&pageSize=${pageSize}`);
  await throwIfNotOk(response, "Could not load your videos.");
  return parseJson<ListVideosResult>(response);
}
