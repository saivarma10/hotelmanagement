import { useState } from 'react';
import type { MenuItem } from '../types';

interface Props {
  item: MenuItem;
  onAdd: (data: {
    menuItemId: string;
    variationId?: string;
    quantity: number;
    notes?: string;
    addonIds?: string[];
  }) => void;
  onClose: () => void;
}

export default function AddItemModal({ item, onAdd, onClose }: Props) {
  const [variationId, setVariationId] = useState(item.variations[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const basePrice =
    item.variations.find((v) => v.id === variationId)?.price ?? item.price;
  const addonTotal = item.addons
    .filter((a) => selectedAddons.includes(a.id))
    .reduce((s, a) => s + a.price, 0);
  const lineTotal = (basePrice + addonTotal) * quantity;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-sm text-slate-500">{item.isVeg ? 'Veg' : 'Non-Veg'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        {item.variations.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Size</p>
            <div className="flex flex-wrap gap-2">
              {item.variations.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariationId(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    variationId === v.id
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-slate-300'
                  }`}
                >
                  {v.name} — ₹{v.price}
                </button>
              ))}
            </div>
          </div>
        )}

        {item.addons.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Add-ons</p>
            <div className="space-y-2">
              {item.addons.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(a.id)}
                    onChange={() => toggleAddon(a.id)}
                  />
                  {a.name} (+₹{a.price})
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">Quantity</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Less spicy, no onion..."
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>

        <div className="flex items-center justify-between pt-2">
          <span className="font-semibold">₹{lineTotal.toFixed(2)}</span>
          <button
            onClick={() =>
              onAdd({
                menuItemId: item.id,
                variationId: variationId || undefined,
                quantity,
                notes: notes || undefined,
                addonIds: selectedAddons.length ? selectedAddons : undefined,
              })
            }
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
