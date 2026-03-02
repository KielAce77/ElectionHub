import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VoteEntry from './pages/voting/VoteEntry';
import PublicBallot from './pages/voting/PublicBallot';
import AdminDashboard from './pages/admin/AdminDashboard';
import ElectionManager from './pages/admin/ElectionManager';
import ElectionResults from './pages/admin/ElectionResults';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
      </div>
    );
  }

  // If you are logged in, you can access admin routes
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
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

  // Final check: Send to admin if session exists, otherwise to public vote
  return user ? <Navigate to="/admin/" replace /> : <Navigate to="/vote" replace />;
};

const AdminTrailingSlash = () => {
  const location = useLocation();
  const { pathname, search, hash } = location;

  // Normalize admin routes to always include a trailing slash.
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
          duration: 2500
        }}
      />
      <Router>
        <AdminTrailingSlash />
        <div className="min-h-screen bg-transparent text-slate-100">
          <Routes>
            {/* Public Voting Routes */}
            <Route path="/vote" element={<VoteEntry />} />
            <Route path="/ballot/:token" element={<PublicBallot />} />

            {/* Admin Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Dashboard Routes */}
            <Route path="/admin/" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/results/" element={
              <ProtectedRoute>
                <ElectionResults />
              </ProtectedRoute>
            } />
            <Route path="/admin/elections/" element={
              <ProtectedRoute>
                <ElectionManager />
              </ProtectedRoute>
            } />
            <Route path="/admin/elections/:id/" element={
              <ProtectedRoute>
                <ElectionManager />
              </ProtectedRoute>
            } />

            {/* Token pasted into address bar */}
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
