import { useState } from 'react';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import Spinner from './ui/Spinner';

export default function PinSwitchModal({ onClose }: { onClose: () => void }) {
  const { pinSwitch } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;
    setError('');
    setLoading(true);
    try {
      await pinSwitch(pin);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <form
        onSubmit={submit}
        className="card w-full max-w-sm p-6 space-y-5 animate-slide-up shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Switch staff</h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Enter a 4-digit PIN to hand off this terminal to another team member.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full transition-all ${
                pin.length > i ? 'bg-brand-600 scale-110' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field text-center text-3xl tracking-[0.6em] font-mono !py-4"
          autoFocus
          aria-label="4-digit PIN"
        />

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={loading || pin.length !== 4} className="btn-primary flex-1 py-2.5">
            {loading ? <Spinner className="h-4 w-4" /> : 'Switch user'}
          </button>
        </div>
      </form>
    </div>
  );
}
