import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/stock', label: 'Available stock' },
  { to: '/history', label: 'Previous orders' },
  { to: '/about', label: 'About' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>MS Order Maker</h1>
          <p className="app-subtitle">Fast orders on top of MoySklad</p>
        </div>
        <div className="user-panel" data-testid="user-panel">
          {user ? (
            <>
              <div>
                <p className="user-name">{user.email}</p>
                <p className="user-email">
                  Price list:{' '}
                  {user.priceLevel === 'basic' ? 'Basic (opt)' : 'Level 1'}
                </p>
              </div>
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <p className="user-name">Please sign in</p>
          )}
        </div>
      </header>

      {user && (
        <nav aria-label="Primary" className="app-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
