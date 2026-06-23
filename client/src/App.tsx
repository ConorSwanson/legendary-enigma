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

// Dark appearance for Clerk's SignIn/SignUp — matches app palette, removes white card
const CLERK_APPEARANCE = {
  variables: {
    colorBackground: '#030712',
    colorText: '#f9fafb',
    colorTextSecondary: '#6b7280',
    colorInputBackground: '#111827',
    colorInputText: '#f9fafb',
    colorPrimary: '#38bdf8',
    colorDanger: '#f87171',
    borderRadius: '0.5rem',
    fontFamily: 'inherit',
  },
  elements: {
    card: { boxShadow: 'none', border: 'none', padding: '0', backgroundColor: 'transparent' },
    header: { display: 'none' },
    footerPages: { display: 'none' },
    socialButtonsBlockButton: { backgroundColor: '#111827', border: '1px solid #1f2937', color: '#f9fafb' },
    socialButtonsBlockButtonText: { color: '#f9fafb' },
    formFieldInput: { backgroundColor: '#111827', border: '1px solid #374151', color: '#f9fafb' },
    formFieldLabel: { color: '#9ca3af' },
    dividerLine: { backgroundColor: '#1f2937' },
    dividerText: { color: '#4b5563' },
    identityPreviewText: { color: '#f9fafb' },
    identityPreviewEditButton: { color: '#38bdf8' },
  },
};

const FEATURES = [
  'Earn a badge patch for every summit',
  'Share your climb with a story card',
  'Follow and track fellow climbers',
];

function AuthPageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 lg:flex">

      {/* ── Hero panel — full-width on mobile, sticky left column on desktop ── */}
      <div className="lg:w-[460px] lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen bg-gray-900 lg:border-r lg:border-gray-800 flex flex-col overflow-hidden">

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-10 lg:justify-between lg:py-10">

          {/* Logo */}
          <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-10 lg:mb-0">
            <span className="text-3xl lg:text-2xl">⛰️</span>
            <span className="font-bold text-white text-xl lg:text-lg tracking-tight">14ers Tracker</span>
          </div>

          {/* Headline + features */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4">
              Track every<br />Colorado<br />summit.
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-7 max-w-xs mx-auto lg:mx-0">
              Log your 14er climbs, collect badge patches, and share your achievements with fellow mountaineers.
            </p>
            <ul className="space-y-2.5">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 justify-center lg:justify-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats strip */}
          <div className="mt-10 lg:mt-0 flex gap-4 text-xs text-gray-600 font-medium tracking-widest uppercase justify-center lg:justify-start">
            <span>58 peaks</span><span>·</span><span>7 ranges</span><span>·</span><span>53k ft</span>
          </div>
        </div>

        {/* Mountain silhouette — bleeds into form section */}
        <div className="flex-shrink-0">
          <svg viewBox="0 0 460 90" className="w-full block" preserveAspectRatio="none">
            <polygon
              points="0,90 50,45 95,65 140,22 185,52 235,8 280,38 325,5 370,30 415,14 460,35 460,90"
              fill="#030712"
            />
          </svg>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-0 bg-gray-950">
        <div className="w-full max-w-sm">
          <p className="text-gray-600 text-xs uppercase tracking-widest text-center mb-6 font-medium">
            Sign in to continue
          </p>
          {children}
        </div>
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
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={CLERK_APPEARANCE} />
              </AuthPageWrapper>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <AuthPageWrapper>
                <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={CLERK_APPEARANCE} />
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
