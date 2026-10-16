// File: LoginPage.tsx
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { ApiError } from "../api/client";

// Sign-in form.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: Location } | null)?.from?.pathname ?? "/dashboard";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-faint">Log in to upload and watch your videos.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            required
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-muted">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            required
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink focus:border-accent"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-status-failed">
            {error}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-faint">
        New here?{" "}
        <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
          Create an account
        </Link>
      </p>
    </div>
  );
}
