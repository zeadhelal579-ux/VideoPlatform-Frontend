// File: UploadPage.tsx
import { useNavigate } from "react-router-dom";
import { VideoUploader } from "../components/video/VideoUploader";

// Page that hosts the uploader.
export function UploadPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Upload a video</h1>
      <p className="mt-1.5 text-sm text-ink-faint">
        It'll process in the background — you can watch its progress on the next page.
      </p>

      <div className="mt-8">
        <VideoUploader onUploaded={(videoId) => navigate(`/watch/${videoId}`)} />
      </div>
    </div>
  );
}
