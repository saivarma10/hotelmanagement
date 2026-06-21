import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { getSetupStatus } from '../setup/status';
import { hasPermission, canPinSwitch } from '../permissions';
import { ROLE_LABELS } from '../permissions';
import PinSwitchModal from './PinSwitchModal';
import {
  IconGrid,
  IconReceipt,
  IconChef,
  IconSettings,
  IconChart,
  IconLogout,
  IconKey,
} from './icons';

const NAV_ITEMS = [
  { to: '/', label: 'Floor', permission: 'floor.view' as const, icon: IconGrid },
  { to: '/bills', label: 'Bills', permission: 'bills.view' as const, icon: IconReceipt },
  { to: '/kitchen', label: 'Kitchen', permission: 'kitchen.view' as const, icon: IconChef },
  { to: '/setup', label: 'Setup', permission: 'setup.manage' as const, icon: IconSettings },
  { to: '/reports', label: 'Reports', permission: 'reports.view' as const, icon: IconChart },
];

export default function Layout() {
  const { user, outlet, logout } = useAuth();
  const [pinOpen, setPinOpen] = useState(false);
  const location = useLocation();
  const isKitchenRoute = location.pathname.startsWith('/kitchen');

  const canSeeSetup = hasPermission(user, 'setup.manage');

  const statusQuery = useQuery({
    queryKey: ['setup-status', outlet?.id],
    queryFn: () => getSetupStatus(outlet!.id),
    enabled: !!outlet?.id && canSeeSetup,
  });

  const needsSetup = canSeeSetup && statusQuery.data && !statusQuery.data.complete;
  const visibleNav = NAV_ITEMS.filter((item) => hasPermission(user, item.permission));

  // Kitchen gets full-bleed dark UI — skip standard chrome
  if (isKitchenRoute && hasPermission(user, 'kitchen.view')) {
    return (
      <>
        <Outlet />
        {pinOpen && <PinSwitchModal onClose={() => setPinOpen(false)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col fixed inset-y-0 z-30 bg-slate-950 text-white">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-sm shadow-lg shadow-brand-900/40">
            R
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm tracking-tight truncate">RestoOS</p>
            <p className="text-[11px] text-slate-500 truncate">{outlet?.name ?? 'No outlet'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-item-active relative' : 'nav-item-idle')}
            >
              <item.icon className="w-5 h-5 shrink-0 opacity-90" />
              {item.label}
              {item.to === '/setup' && needsSetup && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800/80 p-3 space-y-2">
          <div className="rounded-xl bg-slate-900/80 px-3 py-2.5">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
          <div className="flex gap-1">
            {canPinSwitch(user?.role) && (
              <button
                type="button"
                onClick={() => setPinOpen(true)}
                className="btn-ghost flex-1 !text-slate-400 !py-2 !text-xs hover:!bg-slate-800 hover:!text-white"
                title="Switch staff via PIN"
              >
                <IconKey className="w-4 h-4" />
                PIN
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="btn-ghost flex-1 !text-slate-400 !py-2 !text-xs hover:!bg-slate-800 hover:!text-red-300"
            >
              <IconLogout className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64 min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3">
          <div>
            <p className="font-semibold text-sm text-slate-900">RestoOS</p>
            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{outlet?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {canPinSwitch(user?.role) && (
              <button type="button" onClick={() => setPinOpen(true)} className="btn-secondary !px-3 !py-2 text-xs">
                PIN
              </button>
            )}
            <button type="button" onClick={logout} className="btn-ghost !px-2 !py-2">
              <IconLogout className="w-5 h-5" />
            </button>
          </div>
        </header>

        {needsSetup && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-3 text-sm text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="font-medium">Complete setup to start taking orders</span>
            <NavLink to="/setup" className="text-brand-700 font-semibold hover:underline text-sm shrink-0">
              Continue setup →
            </NavLink>
          </div>
        )}

        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-md safe-area-pb">
          <div className="flex justify-around px-1 py-1.5">
            {visibleNav.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[56px] text-[10px] font-semibold transition ${
                    isActive ? 'text-brand-600' : 'text-slate-400'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {pinOpen && <PinSwitchModal onClose={() => setPinOpen(false)} />}
    </div>
  );
}
