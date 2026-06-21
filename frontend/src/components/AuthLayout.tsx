import type { ReactNode } from 'react';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[48%] relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-700/40 via-brand-950 to-brand-950" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute top-20 right-0 h-64 w-64 rounded-full bg-emerald-400/5 blur-2xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-900/50">
                <span className="text-lg font-bold">R</span>
              </div>
              <span className="text-xl font-bold tracking-tight">RestoOS</span>
            </div>
          </div>
          <div className="space-y-6 max-w-md">
            <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-tight tracking-tight">
              Run your restaurant like a pro
            </h2>
            <p className="text-brand-100/80 text-lg leading-relaxed">
              Floor plan, KOT, billing, kitchen display, QR menus, and staff roles — one platform built for Indian F&B.
            </p>
            <ul className="space-y-3 text-sm text-brand-200/90">
              {['Multi-role staff access', 'Live QR digital menus', 'GST billing & day-end reports'].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600/30 text-brand-300 text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-brand-300/50">Trusted by restaurants across India</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-slate-50">
        <div className="mx-auto w-full max-w-md animate-slide-up">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">R</div>
            <span className="text-lg font-bold text-slate-900">RestoOS</span>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="card p-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
