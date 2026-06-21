import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiError } from '../api';
import { guestMenuUrl } from '../publicApi';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';

export default function QrMenuSection({ outletId }: { outletId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const qrQuery = useQuery({
    queryKey: ['qr-menu', outletId],
    queryFn: () => api.getQrMenu(outletId),
  });

  const toggleEnabled = async () => {
    if (!qrQuery.data) return;
    setBusy(true);
    setError('');
    try {
      await api.setQrMenuEnabled(outletId, !qrQuery.data.qrMenuEnabled);
      setMessage(qrQuery.data.qrMenuEnabled ? 'QR menu paused.' : 'QR menu is now live.');
      queryClient.invalidateQueries({ queryKey: ['qr-menu', outletId] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  };

  if (qrQuery.isLoading) {
    return (
      <div className="mt-12 flex items-center gap-2 text-sm text-slate-500">
        <Spinner className="h-4 w-4" />
        Loading QR codes…
      </div>
    );
  }

  if (qrQuery.error || !qrQuery.data) {
    return <p className="mt-12 text-sm text-red-600">Could not load QR menu settings.</p>;
  }

  const { qrMenuEnabled, areas } = qrQuery.data;
  const tableCount = areas.reduce((n, a) => n + a.tables.length, 0);

  return (
    <section className="mt-12 pt-10 border-t border-slate-200 qr-menu-section">
      <PageHeader
        title="QR digital menu"
        description="Print a unique QR code per table. Guests scan to browse your live menu on their phone — no app required."
        actions={
          <>
            <button
              type="button"
              onClick={toggleEnabled}
              disabled={busy}
              className={`btn px-4 py-2.5 ${
                qrMenuEnabled
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'btn-secondary'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${qrMenuEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {qrMenuEnabled ? 'Live' : 'Paused'}
            </button>
            {tableCount > 0 && (
              <button type="button" onClick={() => window.print()} className="btn-primary px-4 py-2.5 print:hidden">
                Print all QR
              </button>
            )}
          </>
        }
      />

      {message && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {!qrMenuEnabled && (
        <div className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          QR menu is paused — guest scans will show &quot;unavailable&quot; until you turn it back on.
        </div>
      )}

      {tableCount === 0 ? (
        <p className="text-sm text-slate-500">Add tables in the floor plan step to generate QR codes.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 qr-print-grid">
          {areas.map((area) =>
            area.tables.map((table) => {
              const url = guestMenuUrl(table.qrToken);
              return (
                <div
                  key={table.id}
                  className="card p-6 flex flex-col items-center text-center qr-card hover:shadow-md transition-shadow"
                >
                  <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-200">
                    <QRCodeSVG value={url} size={128} level="M" includeMargin />
                  </div>
                  <p className="font-bold text-slate-900 mt-4 text-lg">{table.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{area.name}</p>
                  <p className="text-[10px] text-slate-400 mt-3 break-all max-w-full leading-relaxed px-1">
                    {url}
                  </p>
                </div>
              );
            }),
          )}
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .qr-menu-section, .qr-menu-section * { visibility: visible; }
          .qr-menu-section { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
          .qr-print-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .qr-card { break-inside: avoid; border: 1px solid #ddd !important; box-shadow: none !important; }
        }
      `}</style>
    </section>
  );
}
