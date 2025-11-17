import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import './App.css';
import AppLayout from './components/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import StockPage from './pages/StockPage';

function RequireAuth() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const { user } = useAuth();
  const defaultPath = user ? '/stock' : '/';

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/stock" element={<StockPage />} />
          <Route path="/history" element={<OrderHistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
