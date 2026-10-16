// File: Navbar.tsx
// Purpose: Site-wide header: brand, primary navigation (signed-in only) and
// the account actions.
// Logic/Approach: Mobile-first. On narrow screens the three groups cannot
// share one row (brand + Dashboard + Upload + Log out is wider than a 360px
// phone), so the bar is allowed to wrap: brand and account actions stay on the
// first row and the navigation drops to a full-width second row. From the
// `sm` breakpoint up it is a single row again, with the navigation between
// the other two.
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";

// Top navigation with the sign-in state.
export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/90 backdrop-blur-sm">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:py-4"
      >
        <Link to="/" className="font-display text-lg font-bold tracking-tight text-ink">
          Video<span className="text-accent">Platform</span>
        </Link>

        {user && (
          <div className="order-3 -ml-3 flex w-full items-center gap-1 sm:order-none sm:ml-0 sm:w-auto">
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/upload" label="Upload" />
          </div>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-ink-faint sm:inline">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-ink-muted hover:text-ink">
                Log in
              </Link>
              <ButtonLink to="/register" variant="primary" size="sm">
                Sign up
              </ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// One navigation link with active styling.
function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "text-ink" : "text-ink-faint hover:text-ink"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
