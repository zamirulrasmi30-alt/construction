import { useEffect, useState } from 'react';
import { RefreshCw, ArrowDownCircle, ArrowUpCircle, Wrench } from 'lucide-react';
import { admin } from '../../../lib/api';
import { fmtQty, dateOnly } from '../../../lib/format';
import { MOCK_LEDGER, USE_MOCK_DB } from '../../../lib/mockData';

export default function LedgerTab() {
  const [rows, setRows] = useState(null);
  const [type, setType] = useState('');
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    try {
      if (USE_MOCK_DB) {
        // Sample dataset — no live database call (Vercel-safe).
        setRows(type ? MOCK_LEDGER.filter((t) => t.type === type) : MOCK_LEDGER);
        return;
      }
      const { data } = await admin.ledger(type ? { type } : {});
      setRows(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [type]);

  const badge = {
    IN: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    OUT: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    ADJUSTMENT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {['', 'IN', 'OUT', 'ADJUSTMENT'].map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${type === t ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}>
            {t || 'All'}
          </button>
        ))}
        <button onClick={load} className="ml-auto grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-800" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>}

      {rows === null ? (
        <div className="animate-pulse rounded-2xl bg-white p-10 shadow-sm dark:bg-slate-800">Loading ledger…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {rows.map((t) => {
                  const Icon = t.type === 'IN' ? ArrowDownCircle : t.type === 'OUT' ? ArrowUpCircle : Wrench;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{dateOnly(t.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge[t.type]}`}>
                          <Icon size={12} /> {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                        {t.products?.name}
                        <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">({t.products?.unit_type})</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-extrabold ${t.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {t.quantity > 0 ? '+' : ''}{fmtQty(t.quantity)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.supplier_or_order_ref || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">{t.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}