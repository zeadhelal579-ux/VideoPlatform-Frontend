// File: HomePage.tsx
import { useAuth } from "../hooks/useAuth";
import { ButtonLink } from "../components/ui/ButtonLink";

const STEPS = [
  {
    title: "Upload",
    body: "Your file goes straight to storage over a secure, time-limited URL — it never passes through our servers.",
  },
  {
    title: "Process",
    body: "A background worker transcodes it into 1080p, 720p, and 480p, packaged as HLS chunks.",
  },
  {
    title: "Stream",
    body: "Playback quality adjusts automatically to your connection, switching between qualities with no buffering.",
  },
];

// Landing page.
export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        Upload once. <span className="text-accent">Stream anywhere.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-ink-muted">
        Adaptive bitrate streaming that adjusts to every viewer's connection automatically — no stuttering, no manual
        quality picking.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink to={user ? "/upload" : "/register"}>{user ? "Upload a video" : "Get started"}</ButtonLink>
        <ButtonLink to={user ? "/dashboard" : "/login"} variant="secondary">
          {user ? "Go to dashboard" : "Log in"}
        </ButtonLink>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-lg border border-border bg-surface p-5">
            <span className="font-display text-sm font-bold text-accent">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="mt-2 font-display text-base font-semibold text-ink">{step.title}</h2>
            <p className="mt-1.5 text-sm text-ink-faint">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
