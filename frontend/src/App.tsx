import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { getDefaultRoute } from './permissions';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FloorPage from './pages/FloorPage';
import OrderPage from './pages/OrderPage';
import ReportsPage from './pages/ReportsPage';
import SetupPage from './pages/SetupPage';
import BillsPage from './pages/BillsPage';
import KitchenPage from './pages/KitchenPage';
import GuestMenuPage from './pages/GuestMenuPage';
import Layout from './components/Layout';
import RoleRoute from './components/RoleRoute';
import Spinner from './components/ui/Spinner';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-bold shadow-md">
          R
        </div>
        <Spinner className="h-5 w-5 text-brand-600" />
        <p className="text-sm text-slate-500 font-medium">Loading workspace…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/m/:token" element={<GuestMenuPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<RoleRoute permission="floor.view"><FloorPage /></RoleRoute>} />
        <Route path="setup" element={<RoleRoute permission="setup.manage"><SetupPage /></RoleRoute>} />
        <Route path="bills" element={<RoleRoute permission="bills.view"><BillsPage /></RoleRoute>} />
        <Route path="kitchen" element={<RoleRoute permission="kitchen.view"><KitchenPage /></RoleRoute>} />
        <Route path="orders/:orderId" element={<RoleRoute permission="orders.manage"><OrderPage /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute permission="reports.view"><ReportsPage /></RoleRoute>} />
        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  );
}
