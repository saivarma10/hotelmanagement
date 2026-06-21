import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { hasPermission } from '../permissions';
import { formatMoney } from '../utils';
import AddItemModal from '../components/AddItemModal';
import { printKot } from '../components/KotPrint';
import { printBill } from '../components/BillPrint';
import Spinner from '../components/ui/Spinner';
import type { MenuItem, PaymentMethod } from '../types';

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { outlet, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showBill, setShowBill] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  const menuQuery = useQuery({
    queryKey: ['menu', outlet?.id],
    queryFn: () => api.getMenu(outlet!.id),
    enabled: !!outlet?.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['floor', outlet?.id] });
  };

  const addItemMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.addOrderItem>[1]) =>
      api.addOrderItem(orderId!, data),
    onSuccess: () => {
      setSelectedItem(null);
      invalidate();
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.cancelOrderItem(itemId),
    onSuccess: invalidate,
  });

  const handleCancelItem = (itemId: string, status: string) => {
    const msg =
      status === 'SENT_TO_KITCHEN'
        ? 'Cancel this item? Kitchen will be notified (item marked cancelled).'
        : 'Remove this item from the order?';
    if (window.confirm(msg)) {
      removeItemMutation.mutate(itemId);
    }
  };

  const kotMutation = useMutation({
    mutationFn: () => api.sendKot(orderId!),
    onSuccess: (kot) => {
      invalidate();
      printKot(kot);
    },
  });

  const order = orderQuery.data;
  const categories = menuQuery.data?.categories ?? [];
  const pendingItems = order?.items.filter((i) => i.status === 'PENDING') ?? [];
  const activeItems = order?.items.filter((i) => i.status !== 'CANCELLED') ?? [];
  const orderTotal = activeItems.reduce((s, i) => s + i.lineTotal, 0);

  if (orderQuery.isLoading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <Spinner />
        <span className="text-sm font-medium">Loading order…</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-shell text-center py-16">
        <p className="text-red-600 font-medium">Order not found</p>
        <Link to="/" className="btn-primary inline-flex mt-4 px-6 py-2.5">
          Back to floor
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-8rem)] lg:min-h-[calc(100dvh-1rem)]">
      {/* Menu panel */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link to="/" className="btn-secondary !py-2 !px-3 text-xs">
            ← Floor
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-bold text-slate-900 truncate">
              {order.table.name}
            </h2>
            <span className="text-slate-400">·</span>
            <span className="text-sm text-slate-500">#{order.orderNumber}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
            {order.status.replace('_', ' ')}
          </span>
        </div>

        {menuQuery.isLoading ? (
          <p className="text-slate-500">Loading menu...</p>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <section key={cat.id}>
                <h3 className="font-medium text-slate-700 mb-2 sticky top-0 bg-white py-1">
                  {cat.name}
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      disabled={order.status === 'BILLED'}
                      className="text-left card p-3 hover:border-brand-400 hover:shadow-md transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <div className="text-brand-700 text-sm mt-1">
                        ₹{item.variations[0]?.price ?? item.price}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Cart panel */}
      <div className="w-96 flex flex-col bg-slate-50">
        <div className="p-4 border-b bg-white">
          <h3 className="font-semibold">Current Order</h3>
          <p className="text-sm text-slate-500">{order.table.area}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {order.items.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No items yet</p>
          ) : (
            order.items.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg p-3 border text-sm ${
                  item.status === 'CANCELLED' ? 'opacity-50 border-red-200 bg-red-50' : ''
                }`}
              >
                <div className="flex justify-between">
                  <div className={item.status === 'CANCELLED' ? 'line-through' : ''}>
                    <span className="font-medium">{item.menuItem.name}</span>
                    {item.variation && (
                      <span className="text-slate-500"> ({item.variation.name})</span>
                    )}
                    <span className="text-slate-500"> × {item.quantity}</span>
                  </div>
                  <span className={item.status === 'CANCELLED' ? 'line-through' : ''}>
                    {formatMoney(item.lineTotal)}
                  </span>
                </div>
                {item.addons.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    + {item.addons.map((a) => a.name).join(', ')}
                  </div>
                )}
                {item.notes && (
                  <div className="text-xs text-slate-500 italic mt-1">{item.notes}</div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${itemStatusClass(item.status)}`}>
                    {itemStatusLabel(item.status)}
                  </span>
                  {(item.status === 'PENDING' || item.status === 'SENT_TO_KITCHEN') &&
                    order.status !== 'BILLED' && (
                      <button
                        onClick={() => handleCancelItem(item.id, item.status)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {item.status === 'PENDING' ? 'Remove' : 'Cancel item'}
                      </button>
                    )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-white space-y-3">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatMoney(orderTotal)}</span>
          </div>

          <div className={`grid gap-2 ${hasPermission(user, 'billing.manage') ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              onClick={() => kotMutation.mutate()}
              disabled={
                pendingItems.length === 0 ||
                kotMutation.isPending ||
                order.status === 'BILLED'
              }
              className="bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {kotMutation.isPending ? 'Sending...' : `Send KOT (${pendingItems.length})`}
            </button>
            {hasPermission(user, 'billing.manage') && (
              <button
                onClick={() => setShowBill(true)}
                disabled={activeItems.length === 0 || order.status === 'BILLED'}
                className="bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Bill & Pay
              </button>
            )}
          </div>

          {kotMutation.error && (
            <p className="text-xs text-red-600">
              {kotMutation.error instanceof ApiError
                ? kotMutation.error.message
                : 'KOT failed'}
            </p>
          )}
        </div>
      </div>

      {selectedItem && (
        <AddItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={(data) => addItemMutation.mutate(data)}
        />
      )}

      {showBill && (
        <BillModal
          orderId={order.id}
          onClose={() => setShowBill(false)}
          onSettled={(bill) => {
            printBill(bill);
            setShowBill(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

function itemStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Not sent';
    case 'SENT_TO_KITCHEN':
      return 'In kitchen';
    case 'SERVED':
      return 'Served';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

function itemStatusClass(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-slate-100 text-slate-600';
    case 'SENT_TO_KITCHEN':
      return 'bg-orange-100 text-orange-800';
    case 'SERVED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100';
  }
}

function BillModal({
  orderId,
  onClose,
  onSettled,
}: {
  orderId: string;
  onClose: () => void;
  onSettled: (bill: import('../types').Bill) => void;
}) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [payments, setPayments] = useState<
    Array<{ method: PaymentMethod; amount: number; reference?: string }>
  >([{ method: 'CASH', amount: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const previewQuery = useQuery({
    queryKey: ['bill-preview', orderId, discountPercent, discountAmount],
    queryFn: () => api.previewBill(orderId, discountPercent, discountAmount),
  });

  const preview = previewQuery.data;

  const updatePayment = (index: number, field: string, value: string | number) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const addPayment = () => {
    setPayments((prev) => [...prev, { method: 'UPI', amount: 0 }]);
  };

  const handleSettle = async () => {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      const bill = await api.settleBill(orderId, {
        payments,
        discountPercent: discountPercent || undefined,
        discountAmount: discountAmount || undefined,
      });
      const fullBill = await api.getBill(bill.id);
      onSettled(fullBill);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Settlement failed');
    } finally {
      setLoading(false);
    }
  };

  const paymentTotal = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = preview ? preview.total - paymentTotal : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Settle Bill</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
              ×
            </button>
          </div>

          {previewQuery.isLoading ? (
            <p className="text-slate-500">Calculating...</p>
          ) : preview ? (
            <>
              <div className="text-sm space-y-1 bg-slate-50 rounded-lg p-3">
                {preview.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatMoney(item.lineTotal)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatMoney(preview.subtotal)}</span>
                  </div>
                  {preview.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-{formatMoney(preview.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({preview.taxRate}%)</span>
                    <span>{formatMoney(preview.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatMoney(preview.total)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Discount %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  />
                </label>
                <label className="text-sm">
                  Discount ₹
                  <input
                    type="number"
                    min={0}
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  />
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Payments</span>
                  <button onClick={addPayment} className="text-xs text-brand-600">
                    + Split payment
                  </button>
                </div>
                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={p.method}
                        onChange={(e) => updatePayment(i, 'method', e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={p.amount || ''}
                        onChange={(e) => updatePayment(i, 'amount', Number(e.target.value))}
                        placeholder="Amount"
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                      />
                      {p.method === 'UPI' && (
                        <input
                          value={p.reference ?? ''}
                          onChange={(e) => updatePayment(i, 'reference', e.target.value)}
                          placeholder="Ref"
                          className="w-24 border rounded-lg px-2 py-1.5 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {remaining > 0 && (
                  <button
                    onClick={() =>
                      setPayments((prev) => {
                        const copy = [...prev];
                        copy[0] = { ...copy[0], amount: preview.total };
                        return copy;
                      })
                    }
                    className="text-xs text-brand-600 mt-2"
                  >
                    Fill full amount ({formatMoney(preview.total)})
                  </button>
                )}
                {remaining !== 0 && (
                  <p
                    className={`text-sm mt-2 ${remaining > 0 ? 'text-red-600' : 'text-amber-600'}`}
                  >
                    {remaining > 0
                      ? `Short by ${formatMoney(remaining)}`
                      : `Change: ${formatMoney(-remaining)}`}
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleSettle}
                disabled={loading || paymentTotal < preview.total}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Settle & Print Bill'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
