// File: Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-ink-faint sm:flex-row">
        <p>VideoPlatform — adaptive streaming, from upload to playback.</p>
        <p>Built with HLS, RabbitMQ, and FFmpeg.</p>
      </div>
    </footer>
  );
}
