import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { getSetupStatus } from '../setup/status';
import { tableStatusStyles, tableStatusLabel } from '../utils';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { IconRefresh, IconGrid } from '../components/icons';

export default function FloorPage() {
  const { outlet } = useAuth();
  const navigate = useNavigate();

  const statusQuery = useQuery({
    queryKey: ['setup-status', outlet?.id],
    queryFn: () => getSetupStatus(outlet!.id),
    enabled: !!outlet?.id,
  });

  const { data: areas, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['floor', outlet?.id],
    queryFn: () => api.getFloor(outlet!.id),
    enabled: !!outlet?.id,
    refetchInterval: 10000,
  });

  const stats = areas?.reduce(
    (acc, area) => {
      for (const t of area.tables) {
        acc.total++;
        if (t.status === 'VACANT') acc.vacant++;
        else if (t.status === 'OCCUPIED') acc.occupied++;
        else if (t.status === 'BILLING') acc.billing++;
      }
      return acc;
    },
    { total: 0, vacant: 0, occupied: 0, billing: 0 },
  ) ?? { total: 0, vacant: 0, occupied: 0, billing: 0 };

  const openTable = async (tableId: string, activeOrderId?: string) => {
    if (!outlet) return;
    try {
      if (activeOrderId) {
        navigate(`/orders/${activeOrderId}`);
        return;
      }
      const order = await api.createOrder(tableId, outlet.id);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to open table');
    }
  };

  if (!outlet) {
    return (
      <EmptyState title="No outlet configured" description="Contact your administrator to assign an outlet." />
    );
  }

  if (statusQuery.data && !statusQuery.data.hasTables) {
    return (
      <div className="page-shell">
        <EmptyState
          icon={<IconGrid className="w-7 h-7" />}
          title="Set up your floor plan"
          description="Add dining areas and tables before you can start taking orders."
          action={
            <Link to="/setup" className="btn-primary px-6 py-2.5">
              Go to Setup
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <Spinner />
        <span className="text-sm font-medium">Loading floor plan…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Couldn’t load floor plan"
          description="Check your connection and try again."
          action={
            <button type="button" onClick={() => refetch()} className="btn-primary px-6 py-2.5">
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Floor plan"
        description="Tap a table to open or resume an order. Status updates every 10 seconds."
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary px-4 py-2.5"
          >
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total tables', value: stats.total, color: 'text-slate-900' },
          { label: 'Vacant', value: stats.vacant, color: 'text-emerald-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-amber-600' },
          { label: 'Billing', value: stats.billing, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-10">
        {areas?.map((area) => (
          <section key={area.id}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">{area.name}</h2>
              <span className="stat-pill">{area.tables.length} tables</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {area.tables.map((table) => {
                const styles = tableStatusStyles(table.status);
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => openTable(table.id, table.activeOrder?.id)}
                    className={`group relative text-left rounded-2xl border-2 p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${styles.card}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xl font-bold tracking-tight">{table.name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${styles.badge}`}>
                        {tableStatusLabel(table.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{table.capacity} seats</p>
                    {table.activeOrder ? (
                      <div className="mt-3 pt-3 border-t border-black/5">
                        <p className="text-xs font-semibold text-slate-500">Active order</p>
                        <p className="text-sm font-bold mt-0.5">#{table.activeOrder.orderNumber}</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Tap to open →
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
