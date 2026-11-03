import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { TrendingUp, Wallet, ClipboardList, AlertTriangle, ShoppingCart, Truck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { admin } from '../../../lib/api';
import { inr, fmtQty } from '../../../lib/format';
import { MOCK_ANALYTICS, USE_MOCK_DB } from '../../../lib/mockData';

const PIE_COLORS = ['#16a34a', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#64748b'];

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Sample analytics — no live database call (Vercel-safe). Reconnect
    // admin.analytics() here when a backend returns.
    setData(MOCK_ANALYTICS);
    /* Live fetch (disabled while USE_MOCK_DB)
    admin.analytics({ days: 14 })
      .then(({ data: d }) => setData(d))
      .catch((e) => setErr(e.message));
    */
  }, []);

  if (err) return <Alert msg={err} />;
  if (!data) return <div className="animate-pulse rounded-3xl bg-white p-10 dark:bg-slate-800">Loading intelligence…</div>;

  const k = data.kpis || {};

  const cards = [
    { label: 'Total Revenue', value: inr(k.revenue), icon: TrendingUp, tint: 'bg-emerald-500' },
    { label: 'Advance Collected', value: inr(k.advance_collected), icon: Wallet, tint: 'bg-sky-500' },
    { label: 'Live Orders', value: k.orders, icon: ShoppingCart, tint: 'bg-indigo-500' },
    { label: 'Avg Order Value', value: inr(k.avg_order_value), icon: ClipboardList, tint: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{c.label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${c.tint}`}><c.icon size={17} /></span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Sales trend */}
        <div className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2 dark:bg-slate-800">
          <h3 className="mb-1 font-bold text-slate-800 dark:text-white">Revenue trend (14 days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.salesTrend} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v) => inr(v)} labelFormatter={(l) => new Date(l).toLocaleDateString('en-IN')} />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#rev)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown + top products */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
            <h3 className="mb-3 font-bold text-slate-800 dark:text-white">Orders by status</h3>
            <StatusList b={data.statusBreakdown} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
            <h3 className="mb-3 font-bold text-slate-800 dark:text-white">Best sellers</h3>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No sales yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{fmtQty(p.qty)} {p.unit_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Category spread */}
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
          <h3 className="mb-2 font-bold text-slate-800 dark:text-white">Revenue by category</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={data.categorySales} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.categorySales.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => inr(v)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Low stock list */}
        <div className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2 dark:bg-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
            <AlertTriangle size={17} className="text-amber-500" /> Low stock alerts ({data.lowStock.length})
          </h3>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">All products above their minimum alert level. Nice.</p>
          ) : (
            <div className="scrollbar-thin max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <tr><th className="pb-2">Product</th><th>Category</th><th>Stock</th><th>Alert at</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.lowStock.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-semibold text-slate-800 dark:text-white">{p.name} <span className="text-xs text-slate-400 dark:text-slate-500">{p.brand}</span></td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">{p.category}</td>
                      <td className="py-2 font-bold text-amber-600 dark:text-amber-400">{fmtQty(p.current_stock)} {p.unit_type}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">≥ {fmtQty(p.minimum_alert_stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusList({ b }) {
  const items = [
    { k: 'pending_payment', label: 'Pending payment', icon: Clock, tint: 'text-amber-500 bg-amber-50 dark:bg-amber-950' },
    { k: 'advance_paid', label: 'Advance paid', icon: Wallet, tint: 'text-sky-500 bg-sky-50 dark:bg-sky-950' },
    { k: 'dispatched', label: 'Out for delivery', icon: Truck, tint: 'text-violet-500 bg-violet-50 dark:bg-violet-950' },
    { k: 'delivered', label: 'Delivered', icon: CheckCircle2, tint: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' },
    { k: 'cancelled', label: 'Cancelled', icon: XCircle, tint: 'text-rose-500 bg-rose-50 dark:bg-rose-950' },
  ];
  return (
    <ul className="space-y-1.5">
      {items.map((s) => (
        <li key={s.k} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${s.tint}`}><s.icon size={14} /></span>
          <span className="flex-1">{s.label}</span>
          <b>{b[s.k]}</b>
        </li>
      ))}
    </ul>
  );
}

function Alert({ msg }) {
  return <div className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{msg}</div>;
}