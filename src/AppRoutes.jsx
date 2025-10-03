import { useAuth } from './hooks/useAuth.jsx';

function TopNav() {
  const { user, login, logout } = useAuth();

  return (
    <nav style={{ background: '#111', color: '#fff', padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
      <Link to="/" style={{ color: '#fff', fontWeight: 600 }}>SentinelSky</Link>
      <Link to="/dashboard" style={{ color: '#fff' }}>Dashboard</Link>
      <Link to="/reports" style={{ color: '#fff' }}>Reports</Link>

      <div style={{ marginLeft: 'auto' }}>
        {user ? (
          <button onClick={logout} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4 }}>
            Logout
          </button>
        ) : (
          <button onClick={login} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4 }}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
