// File: VideoUploader.tsx
// Purpose: Lets the user pick a file and title, and renders upload
// progress from the PUT request's progress events (ARCHITECTURE.md
// section 3.1) via useVideoUpload.
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { useVideoUpload } from "../../hooks/useVideoUpload";
import { Button } from "../ui/Button";
import { formatFileSize } from "../../utils/formatters";
import { SUPPORTED_VIDEO_ACCEPT, UNSUPPORTED_FILE_MESSAGE, isSupportedVideoFile } from "../../utils/videoFiles";

interface VideoUploaderProps {
  onUploaded: (videoId: string) => void;
}

// Drop zone and title form that drive the whole upload.
export function VideoUploader({ onUploaded }: VideoUploaderProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { phase, progress, error, upload } = useVideoUpload();

  const isBusy = phase === "requesting" || phase === "uploading" || phase === "confirming";

  // Accepts a chosen/dropped file only when it is a supported video; otherwise shows why and keeps the form empty.
  function handleFileChosen(chosen: File | null) {
    if (chosen && !isSupportedVideoFile(chosen)) {
      setFile(null);
      setFileError(UNSUPPORTED_FILE_MESSAGE);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError(null);
    setFile(chosen);
    if (chosen && !title) {
      setTitle(chosen.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) handleFileChosen(dropped);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !title.trim() || isBusy) return;

    try {
      const videoId = await upload(title.trim(), file);
      onUploaded(videoId);
    } catch {
      // useVideoUpload already captured the message in `error` — nothing more to do here.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Choose a video file"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
          px-6 py-12 text-center transition-colors
          ${isDragOver ? "border-accent bg-accent/5" : "border-border hover:border-ink-faint"} focus-visible:border-accent`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_VIDEO_ACCEPT}
          className="hidden"
          onChange={(event: ChangeEvent<HTMLInputElement>) => handleFileChosen(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <p className="font-medium text-ink">{file.name}</p>
            <p className="text-sm text-ink-faint">{formatFileSize(file.size)} — click to choose a different file</p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink">Drop a video here, or click to browse</p>
            <p className="text-sm text-ink-faint">It'll be transcoded into 1080p / 720p / 480p automatically.</p>
          </>
        )}
      </div>

      {fileError && (
        <p role="alert" className="text-sm text-status-failed">
          {fileError}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Title</span>
        <input
          type="text"
          value={title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
          placeholder="Give your video a title"
          maxLength={200}
          required
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-faint
            focus:border-accent"
        />
      </label>

      {isBusy && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${phase === "uploading" ? progress : 100}%` }}
            />
          </div>
          <p className="text-xs text-ink-faint">{phaseLabel(phase, progress)}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-status-failed">
          {error}
        </p>
      )}

      <Button type="submit" isLoading={isBusy} disabled={!file || !title.trim()}>
        {isBusy ? "Uploading…" : "Upload video"}
      </Button>
    </form>
  );
}

// Human-readable text for the current upload phase.
function phaseLabel(phase: string, progress: number): string {
  switch (phase) {
    case "requesting":
      return "Preparing upload…";
    case "uploading":
      return `Uploading… ${progress}%`;
    case "confirming":
      return "Finishing up…";
    default:
      return "";
  }
}
