import { Suspense, lazy, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNav from './components/layout/BottomNav';
import OfflineBanner from './components/ui/OfflineBanner';
import ToastContainer from './components/ui/ToastContainer';
import SplashScreen from './components/SplashScreen';
import { useAuth } from './hooks/useAuth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Catalogue from './pages/Catalogue';
import PlantDetail from './pages/PlantDetail';
import Identify from './pages/Identify';
import CarePlan from './pages/CarePlan';
import Profile from './pages/Profile';
import PublicWishlist from './pages/PublicWishlist';

const SPLASH_DURATION_MS = 1500;

// Fabric.js (used only by the garden map canvas) is large enough to noticeably
// bloat every other route's initial load, so this one page is code-split.
const GardenMap = lazy(() => import('./pages/GardenMap'));

function FullScreenSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-green-600 dark:border-neutral-800 dark:border-t-green-400"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

function App() {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  const showBottomNav = location.pathname !== '/onboarding';
  // Public wishlist pages must render for anyone with the link, signed in or
  // not — exempt from both the auth-loading gate and the sign-in redirect.
  const isPublicRoute = location.pathname.startsWith('/wishlist/');

  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  let content: ReactNode;
  if (isPublicRoute) {
    content = (
      <Routes>
        <Route path="/wishlist/:userId" element={<PublicWishlist />} />
      </Routes>
    );
  } else if (isLoading) {
    content = <FullScreenSpinner />;
  } else if (!session && location.pathname !== '/onboarding') {
    content = <Navigate to="/onboarding" replace />;
  } else if (session && location.pathname === '/onboarding') {
    content = <Navigate to="/" replace />;
  } else {
    content = (
      <div className={showBottomNav ? 'pb-16' : undefined}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/plant/:id" element={<PlantDetail />} />
          <Route
            path="/map"
            element={
              <Suspense fallback={<FullScreenSpinner />}>
                <GardenMap />
              </Suspense>
            }
          />
          <Route path="/identify" element={<Identify />} />
          <Route path="/care" element={<CarePlan />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        {showBottomNav && <BottomNav />}
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      <OfflineBanner />
      {content}
      <ToastContainer />
    </>
  );
}

export default App;
