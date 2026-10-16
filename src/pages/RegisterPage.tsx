// File: RegisterPage.tsx
// Purpose: Not in ARCHITECTURE.md's original page list (which only names
// LoginPage), but necessary: AuthEndpoints.cs implements a full
// /api/auth/register route, and without a page for it there would be no
// way for a first-time visitor to ever get an account.
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { ApiError } from "../api/client";

// Account creation form.
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password, displayName);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-faint">Start uploading and streaming in a couple of minutes.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Name</span>
          <input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)}
            maxLength={100}
            required
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            maxLength={254}
            required
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            required
            minLength={8}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink focus:border-accent"
          />
          <span className="text-xs text-ink-faint">At least 8 characters, with an uppercase letter, a lowercase letter and a number.</span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-status-failed">
            {error}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-faint">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Log in
        </Link>
      </p>
    </div>
  );
}
