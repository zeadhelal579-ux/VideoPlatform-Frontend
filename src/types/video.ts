// File: video.ts
// Purpose: Mirrors VideoPlatform.Application's VideoDto.cs field-for-field
// (ARCHITECTURE.md section 3.1 — "video.ts declares a Video interface that
// mirrors the backend's VideoDto.cs field-for-field"). System.Text.Json's
// default policy is camelCase, and VideoDto's Status is written with
// .ToString() (GetVideoHandler.cs / ListVideosHandler.cs), so it arrives
// as the exact C# enum member name — not a number.

export type VideoStatus = "Pending" | "Queued" | "Processing" | "Ready" | "Failed";

export interface Video {
  id: string;
  title: string;
  status: VideoStatus;
  masterPlaylistUrl: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// The exact shape RequestUploadUrlHandler returns
// (RequestUploadUrlCommand.cs: `RequestUploadUrlResult(Guid VideoId, string UploadUrl)`).
export interface RequestUploadUrlResult {
  videoId: string;
  uploadUrl: string;
}

// The exact shape ListVideosHandler returns
// (ListVideosQuery.cs: `ListVideosResult(IReadOnlyList<VideoDto> Items, int TotalCount, int Page, int PageSize)`).
export interface ListVideosResult {
  items: Video[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// True when processing is over (Ready or Failed).
export function isTerminalStatus(status: VideoStatus): boolean {
  return status === "Ready" || status === "Failed";
}
