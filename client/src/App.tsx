import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, useAuth, useUser } from '@clerk/react';
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
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          {/* Auth pages — Clerk's hosted components */}
          <Route
            path="/sign-in/*"
            element={
              <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
              </div>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
              </div>
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
