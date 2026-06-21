import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import { getDefaultRoute } from '../permissions';
import AuthLayout from '../components/AuthLayout';
import Spinner from '../components/ui/Spinner';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={getDefaultRoute(user.role)} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      navigate(getDefaultRoute(loggedIn.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your restaurant workspace"
      footer={
        <>
          New restaurant?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-900">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field mt-1.5"
            placeholder="you@restaurant.com"
            required
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-900">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1.5"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>

        <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-xs text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-900 mb-1">Demo credentials</p>
          <p>Owner: admin@demo.com / password123</p>
          <p className="mt-1">Staff: waiter@demo.com · kitchen@demo.com · cashier@demo.com</p>
        </div>
      </form>
    </AuthLayout>
  );
}
