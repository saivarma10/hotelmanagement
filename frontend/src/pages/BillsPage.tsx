import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../auth';
import { printBill } from '../components/BillPrint';
import type { Bill, BillListItem, PaymentMethod } from '../types';
import { formatMoney, formatDate, formatTime } from '../utils';

type DatePreset = 'today' | 'yesterday' | 'week';

function presetToRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (preset === 'today') {
    return { dateFrom: fmt(today), dateTo: fmt(today) };
  }
  if (preset === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { dateFrom: fmt(y), dateTo: fmt(y) };
  }
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  return { dateFrom: fmt(weekAgo), dateTo: fmt(today) };
}

export default function BillsPage() {
  const { outlet } = useAuth();
  const [preset, setPreset] = useState<DatePreset>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [showDayEnd, setShowDayEnd] = useState(false);

  const range = presetToRange(preset);

  const billsQuery = useQuery({
    queryKey: ['bills', outlet?.id, preset, paymentFilter, search, page],
    queryFn: () =>
      api.listBills(outlet!.id, {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        paymentMethod: paymentFilter || undefined,
        search: search || undefined,
        page,
        limit: 20,
      }),
    enabled: !!outlet?.id,
  });

  const dayEndQuery = useQuery({
    queryKey: ['day-end', outlet?.id, range.dateTo],
    queryFn: () => api.getDayEndSummary(outlet!.id, range.dateTo),
    enabled: !!outlet?.id && showDayEnd,
  });

  const detailQuery = useQuery({
    queryKey: ['bill', selectedBillId],
    queryFn: () => api.getBill(selectedBillId!),
    enabled: !!selectedBillId,
  });

  if (!outlet) {
    return <div className="p-8 text-center text-slate-500">No outlet selected.</div>;
  }

  const data = billsQuery.data;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bill History</h1>
          <p className="text-slate-500 text-sm mt-1">
            View, search, and reprint past invoices — like Petpooja sales register
          </p>
        </div>
        <button
          onClick={() => setShowDayEnd((v) => !v)}
          className="text-sm border border-brand-600 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-50"
        >
          {showDayEnd ? 'Hide' : 'Show'} Day End Summary
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['today', 'yesterday', 'week'] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPreset(p);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                preset === p
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p === 'week' ? 'Last 7 days' : p}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value as PaymentMethod | '');
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All payments</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>

          <form
            className="flex gap-2 flex-1 min-w-[200px]"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              setPage(1);
            }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search bill #, order #, or table..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
                className="text-sm text-slate-500 hover:underline px-2"
              >
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Period summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Bills" value={String(data.summary.billCount)} />
          <SummaryCard label="Total Sales" value={formatMoney(data.summary.totalSales)} highlight />
          <SummaryCard label="GST Collected" value={formatMoney(data.summary.totalTax)} />
          <SummaryCard label="Discounts" value={formatMoney(data.summary.totalDiscount)} />
        </div>
      )}

      {/* Day end — Petpooja biller-wise */}
      {showDayEnd && dayEndQuery.data && (
        <div className="bg-slate-900 text-white rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-3">
            Day End — {dayEndQuery.data.date}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-slate-400 text-xs uppercase mb-2">Payment breakdown</p>
              {Object.entries(dayEndQuery.data.paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-sm py-1">
                  <span>{method}</span>
                  <span>{formatMoney(amount)}</span>
                </div>
              ))}
              <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(dayEndQuery.data.totalSales)}</span>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase mb-2">Biller-wise (cashier)</p>
              {dayEndQuery.data.billerWise.length === 0 ? (
                <p className="text-slate-500 text-sm">No bills today</p>
              ) : (
                dayEndQuery.data.billerWise.map((b) => (
                  <div key={b.name} className="text-sm py-2 border-b border-slate-800 last:border-0">
                    <div className="flex justify-between font-medium">
                      <span>{b.name}</span>
                      <span>{formatMoney(b.totalSales)}</span>
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      {b.billCount} bill(s) ·{' '}
                      {Object.entries(b.payments)
                        .map(([m, a]) => `${m} ${formatMoney(a)}`)
                        .join(' · ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bills table */}
      {billsQuery.isLoading ? (
        <p className="text-slate-500 text-center py-12">Loading bills...</p>
      ) : data?.bills.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-xl">
          <p className="text-slate-500">No bills found for this period.</p>
          <p className="text-slate-400 text-sm mt-1">Bills appear here after Bill & Pay on the POS.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Bill #</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Table</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cashier</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data?.bills.map((bill) => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    onView={() => setSelectedBillId(bill.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedBillId && detailQuery.data && (
        <BillDetailModal
          bill={detailQuery.data}
          onClose={() => setSelectedBillId(null)}
          onReprint={() => printBill(detailQuery.data!)}
        />
      )}
    </div>
  );
}

function SummaryCard({
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
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-brand-700' : ''}`}>{value}</p>
    </div>
  );
}

function BillRow({ bill, onView }: { bill: BillListItem; onView: () => void }) {
  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-4 py-3 font-medium">#{bill.billNumber}</td>
      <td className="px-4 py-3 text-slate-600">
        {formatDate(bill.createdAt)}
        <span className="text-slate-400 ml-1">{formatTime(bill.createdAt)}</span>
      </td>
      <td className="px-4 py-3">
        {bill.table}
        <span className="text-slate-400 text-xs ml-1">({bill.area})</span>
      </td>
      <td className="px-4 py-3 text-slate-600">{bill.cashier}</td>
      <td className="px-4 py-3">
        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
          {bill.paymentMethods.join(' + ')}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium">{formatMoney(bill.total)}</td>
      <td className="px-4 py-3 text-right">
        <button onClick={onView} className="text-brand-600 hover:underline text-sm">
          View
        </button>
      </td>
    </tr>
  );
}

function BillDetailModal({
  bill,
  onClose,
  onReprint,
}: {
  bill: Bill;
  onClose: () => void;
  onReprint: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">Bill #{bill.billNumber}</h3>
              <p className="text-sm text-slate-500">
                {formatDate(bill.createdAt)} {formatTime(bill.createdAt)}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
              ×
            </button>
          </div>

          <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Outlet</span>
              <span>{bill.outletName}</span>
            </div>
            {bill.table && (
              <div className="flex justify-between">
                <span className="text-slate-500">Table</span>
                <span>
                  {bill.table} ({bill.area})
                </span>
              </div>
            )}
            {bill.orderNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Order</span>
                <span>#{bill.orderNumber}</span>
              </div>
            )}
            {bill.cashier && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier</span>
                <span>{bill.cashier}</span>
              </div>
            )}
            {bill.gstNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">GSTIN</span>
                <span className="text-xs">{bill.gstNumber}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-3 space-y-2">
            {bill.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {item.quantity}× {item.name}
                  {item.variation ? ` (${item.variation})` : ''}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(bill.subtotal)}</span>
            </div>
            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{formatMoney(bill.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST ({bill.taxRate}%)</span>
              <span>{formatMoney(bill.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span>{formatMoney(bill.total)}</span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            {bill.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{p.method}{p.reference ? ` (${p.reference})` : ''}</span>
                <span>{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onReprint}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700"
            >
              Reprint Bill
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border rounded-lg text-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
