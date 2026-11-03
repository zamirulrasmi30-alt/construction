import { useEffect, useState } from 'react';
import { PackagePlus, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { admin } from '../../../lib/api';
import Modal from '../../../components/shared/Modal';
import Button from '../../../components/shared/Button';
import Field, { inputCls } from '../../../components/shared/Field';
import { inr, fmtQty } from '../../../lib/format';
import { MOCK_INVENTORY, USE_MOCK_DB } from '../../../lib/mockData';

export default function InventoryTab() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [receive, setReceive] = useState(null);
  const [adjust, setAdjust] = useState(null);

  const load = async () => {
    setErr(null);
    try {
      if (USE_MOCK_DB) {
        // Sample dataset — no live database call (Vercel-safe).
        setRows(MOCK_INVENTORY);
        return;
      }
      const { data } = await admin.inventory();
      setRows(data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const healthBadge = {
    healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    low: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    out_of_stock: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {rows ? `${rows.filter((r) => r.health !== 'healthy').length} item(s) need attention` : ' '}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAdjust({ product: null })}>
            <SlidersHorizontal size={15} /> Adjust stock
          </Button>
          <Button onClick={() => setReceive({ product: null })}>
            <PackagePlus size={15} /> Stock In (Procurement)
          </Button>
          <button onClick={load} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-800" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>}

      {rows === null ? (
        <div className="animate-pulse rounded-2xl bg-white p-10 shadow-sm dark:bg-slate-800">Loading inventory…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">Current balance</th>
                  <th className="px-4 py-3 text-right">Alert at</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {rows.map((p) => (
                  <tr key={p.id} className={`${p.health !== 'healthy' ? 'bg-amber-50/40 dark:bg-amber-950/30' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.brand || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.category}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{inr(p.price_per_unit)}/{p.unit_type}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">{fmtQty(p.current_stock)} {p.unit_type}</td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{fmtQty(p.minimum_alert_stock)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${healthBadge[p.health]}`}>
                        {p.health === 'out_of_stock' ? 'Out of stock' : p.health === 'low' ? 'Low stock' : 'Healthy'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setReceive({ product: p })} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900">Stock In</button>
                        <button onClick={() => setAdjust({ product: p })} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Adjust</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receive && (
        <StockInModal
          product={receive.product}
          allProducts={rows || []}
          onClose={() => setReceive(null)}
          onDone={async () => { await load(); setReceive(null); }}
        />
      )}
      {adjust && (
        <AdjustModal
          product={adjust.product}
          allProducts={rows || []}
          onClose={() => setAdjust(null)}
          onDone={async () => { await load(); setAdjust(null); }}
        />
      )}
    </div>
  );
}

function ProductPicker({ allProducts, value, onChange }) {
  return (
    <select className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select product…</option>
      {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit_type})</option>)}
    </select>
  );
}

function StockInModal({ product, allProducts, onClose, onDone }) {
  const [productId, setProductId] = useState(product?.id || '');
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    if (USE_MOCK_DB) {
      // Sample data — no live database write on Vercel.
      setMsg({ ok: true, text: 'Sample data mode — stock log recorded locally.' });
      setTimeout(onDone, 800);
      return;
    }
    try {
      await admin.receiveStock({ product_id: productId, quantity: Number(qty), supplier, notes });
      setMsg({ ok: true, text: 'Stock received & ledger updated ✓' });
      setTimeout(onDone, 600);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  return (
    <Modal open title="Stock In — procurement log" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Product" required><ProductPicker allProducts={allProducts} value={productId} onChange={setProductId} /></Field>
        <Field label="Quantity received" required><input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 15" /></Field>
        <Field label="Supplier / reference"><input className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. SRV-10452, Gopal Traders" /></Field>
        <Field label="Notes"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice #, batch…" /></Field>
        {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'}`}>{msg.text}</p>}
        <Button disabled={!productId || !(Number(qty) > 0)} onClick={submit}>Add to stock & ledger</Button>
      </div>
    </Modal>
  );
}

function AdjustModal({ product, allProducts, onClose, onDone }) {
  const [productId, setProductId] = useState(product?.id || '');
  const [delta, setDelta] = useState('');
  const [notes, setNotes] = useState('Manual adjustment');
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    if (USE_MOCK_DB) {
      // Sample data — no live database write on Vercel.
      setMsg({ ok: true, text: 'Sample data mode — adjustment acknowledged locally.' });
      setTimeout(onDone, 800);
      return;
    }
    try {
      await admin.adjustStock({ product_id: productId, delta: Number(delta), notes });
      setMsg({ ok: true, text: 'Adjustment recorded ✓' });
      setTimeout(onDone, 600);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  return (
    <Modal open title="Manual stock adjustment" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Product" required><ProductPicker allProducts={allProducts} value={productId} onChange={setProductId} /></Field>
        <Field label="Delta (signed)" required hint="Use negative to write off, positive to add back.">
          <input className={inputCls} value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. -2 or +3.5" />
        </Field>
        <Field label="Reason"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'}`}>{msg.text}</p>}
        <Button disabled={!productId || !Number.isFinite(Number(delta)) || Number(delta) === 0} onClick={submit}>Save adjustment</Button>
      </div>
    </Modal>
  );
}