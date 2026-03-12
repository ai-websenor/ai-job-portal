import { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '@/layout/AuthLayout';
import { AppLayout } from '@/layout/AppLayout';
import { LoadingSpinner } from '@/components/lib/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import allRoutes from '@/routes/routes';
import routePath from '@/routes/routePath';

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  // Check both isAuthenticated flag and token presence
  if (!isAuthenticated || !token) {
    return <Navigate to={routePath.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

// Auth Route Wrapper (redirects to dashboard if already authenticated)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  // Only redirect if both authenticated AND has valid token
  if (isAuthenticated && token) {
    return <Navigate to={routePath.DASHBOARD} replace />;
  }

  return <AuthLayout>{children}</AuthLayout>;
};

// Route Renderer with Rehydration Check
const RouteRenderer = () => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Wait for store to rehydrate from localStorage
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={40} text="Initializing..." />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={40} text="Loading..." />
        </div>
      }
    >
      <Routes>
        {allRoutes.map((route) => {
          let element;
          if (route.noWrapper) {
            element = route.element;
          } else if (route.isAuthRoute) {
            element = <AuthRoute>{route.element}</AuthRoute>;
          } else {
            element = <ProtectedRoute>{route.element}</ProtectedRoute>;
          }

          return <Route key={route.path} path={route.path} element={element} />;
        })}
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteRenderer />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
