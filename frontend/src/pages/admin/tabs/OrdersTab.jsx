import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { admin } from '../../../lib/api';
import { inrFull, fmtQty, dateOnly, STATUS_META } from '../../../lib/format';
import OrderDetailModal from './OrderDetailModal';
import { MOCK_ORDERS, USE_MOCK_DB } from '../../../lib/mockData';

export default function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    try {
      if (USE_MOCK_DB) {
        // Served from the sample dataset — no live database call, so Vercel
        // deployments cannot hit DB connection/column errors.
        let rows = MOCK_ORDERS;
        if (status !== 'all') rows = rows.filter((o) => o.order_status === status);
        if (q.trim()) {
          const t = q.trim().toLowerCase();
          rows = rows.filter((o) =>
            `${o.order_number} ${o.customer_name || ''} ${o.customer_phone || ''}`.toLowerCase().includes(t)
          );
        }
        setOrders(rows);
        return;
      }
      const params = {};
      if (status !== 'all') params.status = status;
      if (q.trim()) params.q = q.trim();
      const { data } = await admin.orders(params);
      setOrders(data);
    } catch (e) {
      setErr(e.message);
      setOrders([]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {['all', ...Object.keys(STATUS_META)].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition ${status === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'}`}>
            {s === 'all' ? 'All' : STATUS_META[s].label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Name / order / phone…" className="rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <button onClick={load} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-800" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>}

      {orders === null ? (
        <Loading />
      ) : orders.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">No orders in this view.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Advance</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 dark:text-white">{o.order_number}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{dateOnly(o.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{o.customer_name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{o.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{o.order_items?.length ?? 0} line(s)</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{inrFull(o.total_amount)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">{inrFull(o.advance_paid)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{inrFull(o.balance_due)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{dateOnly(o.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.order_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <OrderDetailModal
          orderId={selected.id}
          onClose={() => setSelected(null)}
          onChanged={async () => { await load(); setSelected(null); }}
        />
      )}
    </div>
  );
}

export function StatusPill({ status }) {
  const m = STATUS_META[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${m?.color || ''}`}>{m?.label || status}</span>;
}

export function QtyList({ items }) {
  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.id} className="flex justify-between text-sm">
          <span className="text-slate-700 dark:text-slate-300">{it.product_name}</span>
          <span className="ml-3 whitespace-nowrap font-semibold text-slate-900 dark:text-white">{fmtQty(it.quantity)} {it.unit_type}</span>
        </li>
      ))}
    </ul>
  );
}

function Loading() {
  return <div className="animate-pulse rounded-2xl bg-white p-10 shadow-sm dark:bg-slate-800">Loading orders…</div>;
}