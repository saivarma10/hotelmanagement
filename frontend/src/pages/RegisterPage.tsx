import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import AuthLayout from '../components/AuthLayout';
import Spinner from '../components/ui/Spinner';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: '',
    outletName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/setup" replace />;

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        organizationName: form.organizationName,
        outletName: form.outletName,
        name: form.name,
        email: form.email,
        password: form.password,
      });
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your restaurant"
      subtitle="Set up your business in under 2 minutes"
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-900">Business / group name</span>
          <input
            value={form.organizationName}
            onChange={(e) => update('organizationName', e.target.value)}
            placeholder="Sharma Foods Pvt Ltd"
            className="input-field mt-1.5"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-900">Restaurant / outlet name</span>
          <input
            value={form.outletName}
            onChange={(e) => update('outletName', e.target.value)}
            placeholder="Sharma Dhaba — Pune"
            className="input-field mt-1.5"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-900">Your name</span>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Raj Sharma"
            className="input-field mt-1.5"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-900">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="input-field mt-1.5"
            required
            autoComplete="email"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-900">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="input-field mt-1.5"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-900">Confirm</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              className="input-field mt-1.5"
              required
            />
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Creating account…
            </>
          ) : (
            'Create account & continue'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
