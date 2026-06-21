import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import type { StaffMember, UserRole } from '../types';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, STAFF_ROLES } from '../permissions';

export default function StaffSection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.listStaff(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  return (
    <div className="mt-10 pt-8 border-t">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Staff & Roles</h2>
          <p className="text-sm text-slate-500 mt-1">
            Add waiters, cashiers, kitchen staff — each gets role-based access (Petpooja-style).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setError('');
          }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
        >
          {showForm ? 'Cancel' : '+ Add staff'}
        </button>
      </div>

      {message && (
        <div className="mb-4 bg-brand-50 text-brand-800 text-sm px-4 py-2 rounded-lg">{message}</div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {showForm && (
        <AddStaffForm
          onCreated={() => {
            setShowForm(false);
            setMessage('Staff member added.');
            setError('');
            refresh();
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      <div className="bg-white rounded-xl border overflow-hidden mt-4">
        {staffQuery.isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading staff...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">PIN</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(staffQuery.data ?? []).map((member) => (
                <StaffRow
                  key={member.id}
                  member={member}
                  onChanged={() => {
                    setMessage('Staff updated.');
                    refresh();
                  }}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {STAFF_ROLES.map((role) => (
          <div key={role} className="text-xs bg-slate-50 rounded-lg px-3 py-2 border">
            <span className="font-medium text-slate-700">{ROLE_LABELS[role]}</span>
            <span className="text-slate-500"> — {ROLE_DESCRIPTIONS[role]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddStaffForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CAPTAIN' as UserRole,
    pin: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await api.createStaff({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        pin: form.pin || undefined,
      });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to add staff');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-slate-50 rounded-xl border p-4 space-y-3 mb-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Role
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          PIN (optional, 4 digits)
          <input
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="e.g. 1234"
            className="mt-1 w-full border rounded-lg px-3 py-2 font-mono"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {busy ? 'Adding...' : 'Add staff member'}
      </button>
    </form>
  );
}

function StaffRow({
  member,
  onChanged,
  onError,
}: {
  member: StaffMember;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isOwner = member.role === 'OWNER';

  const toggleActive = async () => {
    if (isOwner) return;
    setBusy(true);
    try {
      await api.updateStaff(member.id, { isActive: !member.isActive });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (role: UserRole) => {
    if (isOwner) return;
    setBusy(true);
    try {
      await api.updateStaff(member.id, { role });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className={`border-t ${!member.isActive ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 font-medium">{member.name}</td>
      <td className="px-4 py-3 text-slate-600">{member.email}</td>
      <td className="px-4 py-3">
        {isOwner ? (
          <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded">
            {ROLE_LABELS.OWNER}
          </span>
        ) : (
          <select
            value={member.role}
            disabled={busy}
            onChange={(e) => changeRole(e.target.value as UserRole)}
            className="border rounded px-2 py-1 text-xs"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-slate-500">{member.pin ?? '—'}</td>
      <td className="px-4 py-3">
        {member.isActive ? (
          <span className="text-green-700 text-xs">Active</span>
        ) : (
          <span className="text-red-600 text-xs">Inactive</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {!isOwner && (
          <button
            type="button"
            disabled={busy}
            onClick={toggleActive}
            className="text-xs text-brand-600 hover:underline disabled:opacity-50"
          >
            {member.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </td>
    </tr>
  );
}
