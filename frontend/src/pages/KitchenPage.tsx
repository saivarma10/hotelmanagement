import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { getPosHomeRoute } from '../permissions';
import { formatTime } from '../utils';
import { IconRefresh, IconLogout, IconArrowLeft } from '../components/icons';
import Spinner from '../components/ui/Spinner';

export default function KitchenPage() {
  const { outlet, logout, user } = useAuth();
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ['kitchen', outlet?.id],
    queryFn: () => api.getKitchenQueue(outlet!.id),
    enabled: !!outlet?.id,
    refetchInterval: 5000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kitchen', outlet?.id] });
  };

  const itemReadyMutation = useMutation({
    mutationFn: (itemId: string) => api.markKitchenItemReady(itemId),
    onSuccess: invalidate,
  });

  const kotReadyMutation = useMutation({
    mutationFn: (kotId: string) => api.markKotReady(kotId),
    onSuccess: invalidate,
  });

  if (!outlet) {
    return <div className="p-8 text-center text-slate-500">No outlet selected.</div>;
  }

  const queue = queueQuery.data;
  const backTo = getPosHomeRoute(user);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="shrink-0 px-5 py-4 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition shrink-0"
            >
              <IconArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to POS</span>
            </Link>
          ) : null}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-bold text-sm shadow-lg shadow-orange-900/30 shrink-0">
            KDS
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">Kitchen Display</h1>
            <p className="text-slate-500 text-xs mt-0.5 truncate">
              {outlet.name} · Live · refreshes every 5s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-sm font-bold px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            {queue?.pendingCount ?? 0} cooking
          </span>
          <button
            type="button"
            onClick={() => queueQuery.refetch()}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 transition"
          >
            <IconRefresh className={`w-4 h-4 ${queueQuery.isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Logout"
          >
            <IconLogout className="w-5 h-5" />
          </button>
        </div>
      </header>

      {queueQuery.isLoading && (
        <div className="flex-1 flex items-center justify-center gap-3 text-slate-400">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Loading queue…</span>
        </div>
      )}

      {queueQuery.error && (
        <p className="p-8 text-red-400 text-center">
          {queueQuery.error instanceof ApiError ? queueQuery.error.message : 'Failed to load'}
        </p>
      )}

      {queue && queue.pendingCount === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-3xl mb-4">
            ✓
          </div>
          <p className="text-xl font-semibold text-slate-200">All caught up</p>
          <p className="text-slate-500 text-sm mt-2">No items waiting in the kitchen</p>
        </div>
      )}

      {queue && queue.pendingCount > 0 && (
        <div className="p-6 grid lg:grid-cols-3 gap-6">
          {/* Aggregated prep list — Petpooja-style batch view */}
          <section className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Prep list (batch)
            </h2>
            <div className="space-y-2">
              {queue.aggregated.map((row) => (
                <div
                  key={row.key}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{row.name}</span>
                    {row.variation && (
                      <span className="text-slate-400 text-sm"> ({row.variation})</span>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-orange-400">×{row.quantity}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Same item across tables grouped together so chefs can batch-cook.
            </p>
          </section>

          {/* Individual KOT tickets */}
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              KOT tickets
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {queue.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`rounded-xl border-2 p-4 ${
                    ticket.ageMinutes >= 15
                      ? 'border-red-500 bg-red-950/40'
                      : ticket.ageMinutes >= 8
                        ? 'border-amber-500 bg-amber-950/30'
                        : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-lg font-bold">KOT #{ticket.kotNumber}</span>
                      <p className="text-sm text-slate-400">
                        {ticket.table} · {ticket.area} · Order #{ticket.orderNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          ticket.ageMinutes >= 15
                            ? 'text-red-400'
                            : ticket.ageMinutes >= 8
                              ? 'text-amber-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {ticket.ageMinutes}m ago
                      </span>
                      <p className="text-xs text-slate-500">{formatTime(ticket.createdAt)}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {ticket.items.map((item) => (
                      <li key={item.id} className="flex justify-between items-start gap-2">
                        <div className="text-sm">
                          <span className="font-semibold">
                            {item.quantity}× {item.name}
                          </span>
                          {item.variation && (
                            <span className="text-slate-400"> ({item.variation})</span>
                          )}
                          {item.addons.length > 0 && (
                            <p className="text-xs text-slate-400">+ {item.addons.join(', ')}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-amber-300 italic">Note: {item.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => itemReadyMutation.mutate(item.id)}
                          disabled={itemReadyMutation.isPending}
                          className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded disabled:opacity-50"
                        >
                          Ready
                        </button>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => kotReadyMutation.mutate(ticket.id)}
                    disabled={kotReadyMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
                  >
                    Mark entire KOT ready
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
