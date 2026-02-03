import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import { LogOut } from 'lucide-react';

const PrivateRoute = ({ roles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/agent'} replace />;
  }

  return <Outlet />;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          {user.first_name} <span style={{ opacity: 0.5 }}>({user.role})</span>
        </span>
        <button onClick={logout} className="btn-secondary flex-center gap-4" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div style={{ paddingTop: '80px' }}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<PrivateRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route element={<PrivateRoute roles={['agent', 'admin']} />}>
              <Route path="/agent" element={<AgentDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
