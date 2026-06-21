import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchGuestMenu } from '../publicApi';
import { formatMoney } from '../utils';
import type { GuestMenuCategory } from '../types';
import Spinner from '../components/ui/Spinner';

export default function GuestMenuPage() {
  const { token } = useParams<{ token: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['guest-menu', token],
    queryFn: () => fetchGuestMenu(token!),
    enabled: !!token,
    staleTime: 60_000,
  });

  const categories = data?.categories ?? [];
  const selectedId = activeCategory ?? categories[0]?.id ?? null;

  const itemCount = useMemo(
    () => categories.reduce((n, c) => n + c.items.length, 0),
    [categories],
  );

  useEffect(() => {
    document.title = data ? `${data.outlet.name} · Menu` : 'Digital Menu';
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center gap-4">
        <Spinner className="h-8 w-8 text-amber-800" />
        <p className="text-sm text-stone-500 font-medium">Preparing your menu…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-6">
        <div className="card max-w-sm w-full p-8 text-center animate-slide-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-2xl">
            🍽
          </div>
          <h1 className="font-display text-xl font-semibold text-stone-900">Menu unavailable</h1>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">
            {error instanceof Error ? error.message : 'Please ask our team for a printed menu.'}
          </p>
        </div>
      </div>
    );
  }

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    categoryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-28 font-sans">
      {/* Hero header */}
      <header className="relative overflow-hidden bg-[#1c1917] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(180,83,9,0.15),_transparent_50%)]" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
        <div className="relative px-5 pt-10 pb-8 max-w-lg mx-auto">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 font-semibold mb-3">
            Digital Menu
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight leading-tight">
            {data.outlet.name}
          </h1>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2">
            <span className="text-amber-300 text-sm font-medium">Table {data.table.name}</span>
            <span className="text-white/30">·</span>
            <span className="text-white/70 text-sm">{data.table.area}</span>
          </div>
          {data.outlet.address && (
            <p className="text-white/45 text-xs mt-4 leading-relaxed">{data.outlet.address}</p>
          )}
        </div>
      </header>

      {/* Category nav — sticky pills */}
      {categories.length > 1 && (
        <nav className="sticky top-0 z-20 bg-[#faf7f2]/90 backdrop-blur-lg border-b border-stone-200/80">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide max-w-lg mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => scrollToCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  selectedId === cat.id
                    ? 'bg-[#1c1917] text-white shadow-md'
                    : 'bg-white text-stone-600 border border-stone-200/80 hover:border-stone-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Menu */}
      <main className="px-4 py-6 max-w-lg mx-auto space-y-10 animate-fade-in">
        {categories.length === 0 ? (
          <p className="text-center text-stone-500 py-16 text-sm">Menu is being updated. Please check back shortly.</p>
        ) : (
          categories.map((cat) => (
            <section
              key={cat.id}
              ref={(el) => {
                categoryRefs.current[cat.id] = el;
              }}
              className="scroll-mt-16"
            >
              <CategorySection category={cat} />
            </section>
          ))
        )}
      </main>

      {/* Footer bar */}
      <footer className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-stone-800">Browse-only menu</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Call your server to place an order</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{itemCount} items</p>
            <p className="text-[10px] text-stone-400">Prices in ₹</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategorySection({ category }: { category: GuestMenuCategory }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="font-display text-2xl font-semibold text-stone-900">{category.name}</h2>
        <span className="text-xs font-medium text-stone-400">{category.items.length} items</span>
      </div>
      <div className="space-y-3">
        {category.items.map((item, i) => (
          <article
            key={item.id}
            className="group rounded-2xl bg-white border border-stone-200/60 p-4 shadow-sm hover:shadow-md transition-shadow animate-slide-up"
            style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <VegBadge isVeg={item.isVeg} />
                <div>
                  <h3 className="font-semibold text-stone-900 leading-snug">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-stone-500 mt-1.5 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              <p className="font-display text-lg font-semibold text-amber-900 whitespace-nowrap shrink-0 tabular-nums">
                {formatMoney(item.price)}
              </p>
            </div>

            {item.variations.length > 0 && (
              <div className="mt-4 ml-7 rounded-xl bg-stone-50 border border-stone-100 divide-y divide-stone-100 overflow-hidden">
                {item.variations.map((v) => (
                  <div key={v.id} className="flex justify-between px-3 py-2.5 text-sm">
                    <span className="text-stone-600">{v.name}</span>
                    <span className="font-semibold text-stone-800 tabular-nums">{formatMoney(v.price)}</span>
                  </div>
                ))}
              </div>
            )}

            {item.addons.length > 0 && (
              <div className="mt-3 ml-7 flex flex-wrap gap-1.5">
                {item.addons.map((a) => (
                  <span
                    key={a.id}
                    className="text-[11px] font-medium bg-amber-50 text-amber-900/80 border border-amber-100 px-2.5 py-1 rounded-full"
                  >
                    + {a.name} · {formatMoney(a.price)}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`mt-1 w-[18px] h-[18px] border-2 rounded-[3px] shrink-0 flex items-center justify-center ${
        isVeg ? 'border-green-600' : 'border-red-600'
      }`}
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </span>
  );
}
