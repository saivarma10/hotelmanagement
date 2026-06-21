import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatMoney } from '../utils';

export default function ReportsPage() {
  const { outlet } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['day-summary', outlet?.id, date],
    queryFn: () => api.daySummary(outlet!.id, date),
    enabled: !!outlet?.id,
  });

  if (!outlet) {
    return <div className="p-8 text-center text-slate-500">No outlet selected.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Day End Report</h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => refetch()}
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading report...</p>}
      {error && <p className="text-red-600">Failed to load report</p>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Sales" value={formatMoney(data.totalSales)} highlight />
            <StatCard label="Bills" value={String(data.billCount)} />
            <StatCard label="Orders" value={String(data.orderCount)} />
            <StatCard label="Cancelled" value={String(data.cancelledOrders)} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white rounded-xl border p-5">
              <h3 className="font-medium mb-3">Payment Breakdown</h3>
              {Object.keys(data.paymentBreakdown).length === 0 ? (
                <p className="text-slate-400 text-sm">No payments today</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span>{method}</span>
                      <span className="font-medium">{formatMoney(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t mt-3 pt-3 flex justify-between text-sm">
                <span>Total Tax (GST)</span>
                <span>{formatMoney(data.totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Discount</span>
                <span>{formatMoney(data.totalDiscount)}</span>
              </div>
            </section>

            <section className="bg-white rounded-xl border p-5">
              <h3 className="font-medium mb-3">Top Items</h3>
              {data.itemWise.length === 0 ? (
                <p className="text-slate-400 text-sm">No items sold today</p>
              ) : (
                <div className="space-y-2">
                  {data.itemWise.slice(0, 10).map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span>
                        {item.name}{' '}
                        <span className="text-slate-400">×{item.quantity}</span>
                      </span>
                      <span className="font-medium">{formatMoney(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? 'bg-brand-50 border-brand-200' : 'bg-white'}`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-brand-700' : ''}`}>{value}</p>
    </div>
  );
}
