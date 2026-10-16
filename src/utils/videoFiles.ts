// File: videoFiles.ts
// Purpose: Client-side allow-list of video file types. It mirrors AllowedExtensions in the backend
//          (RequestUploadUrlHandler) so unsupported files are rejected before any upload starts.
// Logic: only the extension is checked here (browsers cannot reliably sniff containers); the Api repeats the
//        check and the Worker verifies the real container signature before FFmpeg ever sees the file.

export const SUPPORTED_VIDEO_EXTENSIONS = [
  ".mp4", ".m4v", ".mov", ".mkv", ".webm", ".avi", ".flv", ".wmv",
  ".mpg", ".mpeg", ".ts", ".m2ts", ".mts", ".3gp", ".3g2", ".ogv",
] as const;

// Value for the <input accept> attribute (extensions are honoured by every browser's file picker).
export const SUPPORTED_VIDEO_ACCEPT = SUPPORTED_VIDEO_EXTENSIONS.join(",");

// Message shown when the chosen file is not a supported video.
export const UNSUPPORTED_FILE_MESSAGE = "Unsupported file type. Choose a video such as MP4, MOV, MKV or WebM.";

// Returns true when the file name ends with one of the supported video extensions.
export function isSupportedVideoFile(file: { name: string }): boolean {
  const dot = file.name.lastIndexOf(".");
  if (dot < 0 || dot === file.name.length - 1) return false;
  const extension = file.name.slice(dot).toLowerCase();
  return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(extension);
}
