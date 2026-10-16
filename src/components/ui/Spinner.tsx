// File: Spinner.tsx
// Purpose: One loading indicator, reused everywhere something is in
// flight (button loading states, page-level loading, polling).
interface SpinnerProps {
  size?: number;
  className?: string;
}

// Accessible loading indicator.
export function Spinner({ size = 20, className = "" }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
