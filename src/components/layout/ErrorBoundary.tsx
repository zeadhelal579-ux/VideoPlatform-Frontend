// File: ErrorBoundary.tsx
// Purpose: Catches an error thrown while rendering any page (a bug, or a lazy
// chunk that failed to load) and shows a recovery screen instead of leaving
// the person with a blank page — React unmounts the whole tree on an
// uncaught render error.
// Logic/Approach: React only supports error boundaries as class components.
// The exported wrapper keys the boundary by the current path, so moving to
// another page (the header stays usable) clears a previous error.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { buttonClasses } from "../ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Visible in the browser console; send it to an error tracker here if one is added later.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="font-display text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="text-sm text-ink-faint">This page failed to load. Reloading usually fixes it.</p>
        <button type="button" className={buttonClasses("primary")} onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}

// Wrapper that resets the boundary whenever the route changes.
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const location = useLocation();
  return <ErrorBoundaryInner key={location.pathname}>{children}</ErrorBoundaryInner>;
}
