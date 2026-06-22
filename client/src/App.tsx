import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, useAuth, useUser } from '@clerk/react';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LogClimb from './pages/LogClimb';
import History from './pages/History';
import ClimbDetail from './pages/ClimbDetail';
import Profile from './pages/Profile';
import Feed from './pages/Feed';
import UserProfile from './pages/UserProfile';
import ShareClimb from './pages/ShareClimb';
import { setGetToken } from './utils/authStore';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

function AuthPageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left branding panel — large screens only */}
      <div className="hidden lg:flex lg:w-[460px] flex-col justify-between bg-gray-900 border-r border-gray-800 p-10 overflow-hidden">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⛰️</span>
          <span className="font-bold text-white text-lg tracking-tight">14ers Tracker</span>
        </div>

        <div className="space-y-5">
          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
            Track every<br />Colorado<br />summit.
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-xs">
            Log your 14er climbs, earn badge patches, and share achievements with fellow mountaineers.
          </p>
          <div className="flex gap-4 text-xs text-gray-600 font-medium tracking-widest uppercase pt-1">
            <span>58 peaks</span>
            <span>·</span>
            <span>7 ranges</span>
            <span>·</span>
            <span>53,000+ ft</span>
          </div>
        </div>

        {/* Mountain silhouette */}
        <div className="relative -mx-10 -mb-10">
          <svg viewBox="0 0 460 140" className="w-full" preserveAspectRatio="xMidYMax meet">
            <defs>
              <linearGradient id="mtnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            {/* Back range */}
            <polygon points="0,140 40,95 85,115 130,70 175,100 220,55 265,85 310,45 355,75 400,50 460,80 460,140" fill="#1e2a3a" />
            {/* Front range */}
            <polygon points="0,140 30,110 70,125 110,88 160,115 200,72 250,100 295,62 340,92 385,65 430,85 460,72 460,140" fill="url(#mtnGrad)" />
          </svg>
        </div>
      </div>

      {/* Right: Clerk form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
        {/* Mobile-only header */}
        <div className="lg:hidden mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">⛰️</span>
            <span className="font-bold text-white text-2xl tracking-tight">14ers Tracker</span>
          </div>
          <p className="text-gray-500 text-sm">Track your Colorado summit journey</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// Syncs Clerk's getToken into the API layer so fetch calls can include the Bearer token
function AuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setGetToken(() => getToken());
  }, [getToken]);
  return null;
}

// Wraps protected routes — shows loading skeleton while Clerk initialises, redirects to sign-in if not authed
function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <>
      <AuthSync />
      <Layout />
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/sign-in">
      <BrowserRouter>
        <Routes>
          {/* Auth pages — Clerk's hosted components with branded wrapper */}
          <Route
            path="/sign-in/*"
            element={
              <AuthPageWrapper>
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
              </AuthPageWrapper>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <AuthPageWrapper>
                <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
              </AuthPageWrapper>
            }
          />

          {/* Public share page — no auth required */}
          <Route path="/share/:id" element={<ShareClimb />} />

          {/* Protected app routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/log" element={<LogClimb />} />
            <Route path="/history" element={<History />} />
            <Route path="/climbs/:id" element={<ClimbDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users/:id" element={<UserProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
