import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VoteEntry from './pages/voting/VoteEntry';
import PublicBallot from './pages/voting/PublicBallot';
import PublicResults from './pages/voting/PublicResults';
import AdminDashboard from './pages/admin/AdminDashboard';
import ElectionManager from './pages/admin/ElectionManager';
import ElectionResults from './pages/admin/ElectionResults';
import MobileNav from './components/MobileNav';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
      </div>
    );
  }

  // Authenticated users have access to administrative controls
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If we have a user but no profile yet, and we're not loading, 
  // it might be a transient state. We wait a tiny bit or show a specific syncing state
  // to prevent the "blank page until refresh" issue.
  if (user && !profile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Syncing Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <MobileNav />
    </>
  );
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white text-blue-700 font-bold">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em]">Synchronizing Credentials...</p>
        </div>
      </div>
    );
  }

  // Direct all users to the administrative entry point.
  // Logged-in admins see the dashboard; others are routed to the authentication portal.
  return <Navigate to="/admin/" replace />;
};

const AdminTrailingSlash = () => {
  const location = useLocation();
  const { pathname, search, hash } = location;

  // Ensure administrative URLs consistently include a trailing slash for route normalization.
  if (pathname.startsWith('/admin') && !pathname.endsWith('/')) {
    return <Navigate to={`${pathname}/${search}${hash}`} replace />;
  }

  return null;
};

const TokenDeepLink = () => {
  const { token } = useParams();
  const normalized = (token || '').trim().toUpperCase();
  const isToken = /^[A-Z0-9]{12}$/.test(normalized);

  if (!isToken) return <Navigate to="/" replace />;
  return <Navigate to={`/vote?token=${normalized}`} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: {
            borderRadius: '12px',
            background: '#0f172a',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '16px 24px',
          }
        }}
      />
      <Router>
        <AdminTrailingSlash />
        <div className="min-h-screen bg-transparent text-slate-100">
          <Routes>
            {/* Public Voter Portal */}
            <Route path="/vote" element={<VoteEntry />} />
            <Route path="/ballot/:token" element={<PublicBallot />} />
            <Route path="/results/:electionId" element={<PublicResults />} />

            {/* Admin Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Dashboard Routes */}
            <Route path="/admin" element={<Navigate to="/admin/" replace />} />
            <Route path="/admin/" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Results Routes - Supporting both ID and general view */}
            <Route path="/admin/results" element={<Navigate to="/admin/results/" replace />} />
            <Route path="/admin/results/" element={
              <ProtectedRoute>
                <ElectionResults />
              </ProtectedRoute>
            } />
            <Route path="/admin/results/:electionId" element={
              <ProtectedRoute>
                <ElectionResults />
              </ProtectedRoute>
            } />
            <Route path="/admin/elections/" element={
              <ProtectedRoute>
                <ElectionManager />
              </ProtectedRoute>
            } />
            <Route path="/admin/elections/:id" element={
              <ProtectedRoute>
                <ElectionManager />
              </ProtectedRoute>
            } />

            {/* Handling for direct URL access using a voting token */}
            <Route path="/:token" element={<TokenDeepLink />} />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

