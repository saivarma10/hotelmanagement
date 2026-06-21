import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { api, ApiError } from '../api';
import { getSetupStatus } from '../setup/status';
import { hasPermission } from '../permissions';
import StaffSection from '../components/StaffSection';
import QrMenuSection from '../components/QrMenuSection';
import type { Area } from '../types';

const STEPS = ['Restaurant', 'Floor Plan', 'Menu', 'Done'] as const;

export default function SetupPage() {
  const { outlet, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');

  const statusQuery = useQuery({
    queryKey: ['setup-status', outlet?.id],
    queryFn: () => getSetupStatus(outlet!.id),
    enabled: !!outlet?.id,
  });

  const floorQuery = useQuery({
    queryKey: ['floor', outlet?.id],
    queryFn: () => api.getFloor(outlet!.id),
    enabled: !!outlet?.id,
  });

  const menuQuery = useQuery({
    queryKey: ['menu', outlet?.id],
    queryFn: () => api.getMenu(outlet!.id),
    enabled: !!outlet?.id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['setup-status', outlet?.id] });
    queryClient.invalidateQueries({ queryKey: ['floor', outlet?.id] });
    queryClient.invalidateQueries({ queryKey: ['menu', outlet?.id] });
  };

  if (!outlet) {
    return (
      <div className="p-8 text-center text-slate-500">
        No outlet found. Please register first.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Restaurant Setup</h1>
        <p className="text-slate-500 mt-1">
          Configure <span className="font-medium text-slate-700">{outlet.name}</span> before going live
        </p>
      </div>

      <StepIndicator current={step} steps={STEPS} status={statusQuery.data} />

      {message && (
        <div className="mb-4 bg-brand-50 text-brand-800 text-sm px-4 py-2 rounded-lg">{message}</div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6">
        {step === 0 && (
          <OutletStep
            outlet={outlet}
            onSaved={async () => {
              await refreshProfile();
              setMessage('Restaurant details saved.');
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <FloorStep
            outletId={outlet.id}
            areas={floorQuery.data ?? []}
            loading={floorQuery.isLoading}
            onChanged={refresh}
            onNext={() => {
              if ((statusQuery.data?.tableCount ?? 0) === 0) {
                setMessage('Add at least one table before continuing.');
                return;
              }
              setMessage('');
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <MenuStep
            outletId={outlet.id}
            categories={menuQuery.data?.categories ?? []}
            loading={menuQuery.isLoading}
            onChanged={refresh}
            onNext={() => {
              if ((statusQuery.data?.itemCount ?? 0) === 0) {
                setMessage('Add at least one menu item before continuing.');
                return;
              }
              setMessage('');
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <DoneStep
            status={statusQuery.data}
            onGoLive={() => navigate('/')}
          />
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-sm px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50"
        >
          Back
        </button>
        {step < 3 && step !== 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            className="text-sm px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
          >
            Skip to next step
          </button>
        )}
        {statusQuery.data?.complete && step < 3 && (
          <Link
            to="/"
            className="text-sm px-4 py-2 text-brand-600 hover:underline self-center"
          >
            Go to POS →
          </Link>
        )}
      </div>

      {hasPermission(user, 'staff.manage') && <StaffSection />}
      {hasPermission(user, 'setup.manage') && outlet && <QrMenuSection outletId={outlet.id} />}
    </div>
  );
}

function StepIndicator({
  current,
  steps,
  status,
}: {
  current: number;
  steps: readonly string[];
  status?: { hasAreas: boolean; hasTables: boolean; hasMenu: boolean };
}) {
  const done = [
    true,
    status?.hasTables,
    status?.hasMenu,
    status?.hasMenu && status?.hasTables,
  ];

  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i === current
                ? 'bg-brand-600 text-white'
                : done[i]
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-100 text-slate-400'
            }`}
          >
            {done[i] && i !== current ? '✓' : i + 1}
          </div>
          <span className={`text-sm ${i === current ? 'font-medium' : 'text-slate-500'}`}>
            {label}
          </span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-slate-200 mx-1" />}
        </div>
      ))}
    </div>
  );
}

function OutletStep({
  outlet,
  onSaved,
}: {
  outlet: { id: string; name: string; address?: string | null; gstNumber?: string | null; gstRate: number };
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: outlet.name,
    address: outlet.address ?? '',
    gstNumber: outlet.gstNumber ?? '',
    gstRate: outlet.gstRate,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.updateOutlet(outlet.id, {
        name: form.name,
        address: form.address || undefined,
        gstNumber: form.gstNumber || undefined,
        gstRate: form.gstRate,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h2 className="font-semibold text-lg">Restaurant details</h2>
      <p className="text-sm text-slate-500">Basic info used on bills and reports.</p>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <label className="block">
        <span className="text-sm font-medium">Restaurant name</span>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full border rounded-lg px-3 py-2"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Address</span>
        <textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          rows={2}
          className="mt-1 w-full border rounded-lg px-3 py-2"
          placeholder="Shop 12, MG Road, Pune"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">GST number</span>
          <input
            value={form.gstNumber}
            onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="27AAAAA0000A1Z5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">GST rate (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.gstRate}
            onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Save & continue'}
      </button>
    </form>
  );
}

function FloorStep({
  outletId,
  areas,
  loading,
  onChanged,
  onNext,
}: {
  outletId: string;
  areas: Area[];
  loading: boolean;
  onChanged: () => void;
  onNext: () => void;
}) {
  const [areaName, setAreaName] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [tableName, setTableName] = useState('');
  const [bulkCount, setBulkCount] = useState(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (areas.length && !selectedAreaId) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  const addArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.createArea(outletId, areaName.trim());
      setAreaName('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add area');
    } finally {
      setBusy(false);
    }
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId || !tableName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.createTable(selectedAreaId, tableName.trim());
      setTableName('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add table');
    } finally {
      setBusy(false);
    }
  };

  const addBulkTables = async () => {
    if (!selectedAreaId || bulkCount < 1) return;
    setBusy(true);
    setError('');
    try {
      const area = areas.find((a) => a.id === selectedAreaId);
      const start = (area?.tables.length ?? 0) + 1;
      for (let i = 0; i < bulkCount; i++) {
        await api.createTable(selectedAreaId, `T${start + i}`, 4);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add tables');
    } finally {
      setBusy(false);
    }
  };

  const totalTables = areas.reduce((s, a) => s + a.tables.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Floor plan</h2>
        <p className="text-sm text-slate-500">
          Add dining areas (Main Hall, Terrace) and tables for each area.
        </p>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <form onSubmit={addArea} className="flex gap-2">
        <input
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          placeholder="Area name (e.g. Main Hall)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
        >
          Add area
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : areas.length === 0 ? (
        <p className="text-slate-400 text-sm italic">No areas yet. Add your first dining area above.</p>
      ) : (
        <div className="space-y-4">
          {areas.map((area) => (
            <div key={area.id} className="border rounded-lg p-4">
              <h3 className="font-medium">{area.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {area.tables.length === 0 ? (
                  <span className="text-xs text-slate-400">No tables</span>
                ) : (
                  area.tables.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs bg-slate-100 border px-2 py-1 rounded"
                    >
                      {t.name} ({t.capacity} seats)
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {areas.length > 0 && (
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-medium">Add tables</h3>
          <div className="flex gap-2 items-end flex-wrap">
            <label className="text-sm">
              Area
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="mt-1 block border rounded-lg px-3 py-2 text-sm"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <form onSubmit={addTable} className="flex gap-2 items-end">
              <label className="text-sm">
                Table name
                <input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="T1"
                  className="mt-1 block border rounded-lg px-3 py-2 text-sm w-24"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                Add
              </button>
            </form>
          </div>

          <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg">
            <label className="text-sm">
              Quick add
              <input
                type="number"
                min={1}
                max={20}
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                className="mt-1 block border rounded-lg px-3 py-2 text-sm w-20"
              />
            </label>
            <span className="text-sm text-slate-500 pb-2">tables (T1, T2…)</span>
            <button
              type="button"
              onClick={addBulkTables}
              disabled={busy}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm mb-0.5"
            >
              Add bulk
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-slate-500">{totalTables} table(s) total</span>
        <button
          type="button"
          onClick={onNext}
          className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700"
        >
          Continue to menu
        </button>
      </div>
    </div>
  );
}

function MenuStep({
  outletId,
  categories,
  loading,
  onChanged,
  onNext,
}: {
  outletId: string;
  categories: import('../types').Category[];
  loading: boolean;
  onChanged: () => void;
  onNext: () => void;
}) {
  const [categoryName, setCategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [itemForm, setItemForm] = useState({ name: '', price: '', isVeg: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (categories.length && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const cat = await api.createCategory(outletId, categoryName.trim());
      setCategoryName('');
      setSelectedCategoryId(cat.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add category');
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !itemForm.name.trim() || !itemForm.price) return;
    setBusy(true);
    setError('');
    try {
      await api.createMenuItem(outletId, {
        name: itemForm.name.trim(),
        price: Number(itemForm.price),
        categoryId: selectedCategoryId,
        isVeg: itemForm.isVeg,
      });
      setItemForm({ name: '', price: '', isVeg: true });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add item');
    } finally {
      setBusy(false);
    }
  };

  const itemCount = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Menu</h2>
        <p className="text-sm text-slate-500">Add categories and food items with prices.</p>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <form onSubmit={addCategory} className="flex gap-2">
        <input
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Category (e.g. Starters)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm"
        >
          Add category
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-slate-400 text-sm italic">No categories yet.</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="border rounded-lg p-4">
              <h3 className="font-medium">{cat.name}</h3>
              {cat.items.length === 0 ? (
                <p className="text-xs text-slate-400 mt-1">No items</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {cat.items.map((item) => (
                    <li key={item.id} className="text-sm flex justify-between">
                      <span>
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-1 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        {item.name}
                      </span>
                      <span>₹{item.price}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <form onSubmit={addItem} className="border-t pt-4 space-y-3">
          <h3 className="text-sm font-medium">Add menu item</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2 sm:col-span-1">
              Category
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm col-span-2 sm:col-span-1">
              Item name
              <input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Paneer Tikka"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              Price (₹)
              <input
                type="number"
                min={0}
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={itemForm.isVeg}
                onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.checked })}
              />
              Vegetarian
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Add item
          </button>
        </form>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-slate-500">{itemCount} item(s) total</span>
        <button
          type="button"
          onClick={onNext}
          className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700"
        >
          Finish setup
        </button>
      </div>
    </div>
  );
}

function DoneStep({
  status,
  onGoLive,
}: {
  status?: { tableCount: number; itemCount: number; complete: boolean };
  onGoLive: () => void;
}) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="text-5xl">🎉</div>
      <h2 className="text-xl font-semibold">You're ready to go live!</h2>
      <p className="text-slate-500 text-sm max-w-md mx-auto">
        Your restaurant is configured with {status?.tableCount ?? 0} tables and{' '}
        {status?.itemCount ?? 0} menu items. Start taking orders from the floor plan.
      </p>
      {!status?.complete && (
        <p className="text-amber-600 text-sm">
          Tip: Add more tables or menu items anytime from Setup.
        </p>
      )}
      <button
        onClick={onGoLive}
        className="bg-brand-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-700"
      >
        Open POS Floor Plan
      </button>
    </div>
  );
}
