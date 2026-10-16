// File: useVideoUpload.ts
// Purpose: Orchestrates the entire upload sequence — request URL, PUT the
// file directly to storage, confirm — the only place that sequence is
// written (ARCHITECTURE.md section 3.1).
// Logic/Approach: The direct-to-storage PUT (FLOW.md, Video Upload Flow,
// step 5) uses XMLHttpRequest, not fetch: fetch has no upload-progress
// event, and ARCHITECTURE.md is explicit that VideoUploader "renders
// upload progress from the PUT request's progress events." Every other
// call goes through api/videos.ts (fetch-based) as usual.
import { useCallback, useState } from "react";
import { requestUploadUrl, confirmUpload } from "../api/videos";
import { ApiError } from "../api/client";

export type UploadPhase = "idle" | "requesting" | "uploading" | "confirming" | "done" | "error";

interface UseVideoUploadResult {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  upload: (title: string, file: File) => Promise<string>;
  reset: () => void;
}

// Runs the request-URL, direct PUT and confirm sequence.
export function useVideoUpload(): UseVideoUploadResult {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (title: string, file: File): Promise<string> => {
    setError(null);
    setProgress(0);

    try {
      setPhase("requesting");
      const { videoId, uploadUrl } = await requestUploadUrl(title, file.name);

      setPhase("uploading");
      await putFileWithProgress(uploadUrl, file, setProgress);

      setPhase("confirming");
      await confirmUpload(videoId);

      setPhase("done");
      return videoId;
    } catch (err) {
      setPhase("error");
      setError(err instanceof ApiError ? err.message : "The upload failed. Please try again.");
      throw err;
    }
  }, []);

  return { phase, progress, error, upload, reset };
}

// Pre-signed URLs are single-use for exactly one PUT and are not bound to
// a Content-Type (S3StorageService.cs never sets one when signing), so any
// Content-Type here is accepted — the file's own type is sent for clean
// storage metadata, nothing more.
function putFileWithProgress(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new ApiError("The upload to storage failed. Please try again.", xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("The upload to storage failed — check your connection.", 0));
    xhr.onabort = () => reject(new ApiError("The upload was cancelled.", 0));

    xhr.send(file);
  });
}
