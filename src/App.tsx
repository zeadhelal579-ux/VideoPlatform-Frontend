// File: App.tsx
// Purpose: Composes components and hooks together — routing and layout
// live here so individual pages stay focused on their own content
// (ARCHITECTURE.md section 3.1).
// Logic/Approach: <ErrorBoundary> wraps only the routed page area, so a crash
// inside one page (or a lazy chunk that failed to load) leaves the Navbar and
// Footer on screen and offers a reload instead of a blank page. The heavy
// player is not imported here at all — WatchPage loads it lazily.
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DemoBanner } from "./components/layout/DemoBanner";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadPage } from "./pages/UploadPage";
import { WatchPage } from "./pages/WatchPage";

// Root component: navigation, error boundary and the route table.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <DemoBanner />
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <UploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/watch/:id"
                  element={
                    <ProtectedRoute>
                      <WatchPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Fallback page for unknown URLs.
function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">Page not found</h1>
      <Link to="/" className="text-sm font-medium text-accent hover:text-accent-hover">
        Back home
      </Link>
    </div>
  );
}
