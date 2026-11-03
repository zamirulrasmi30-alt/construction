import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Truck, HandCoins, PackageCheck, FileCheck, XCircle } from 'lucide-react';
import Navbar from '../../components/shop/Navbar';
import { findMockOrder, USE_MOCK_DB } from '../../lib/mockData';
import { inrFull, STATUS_META } from '../../lib/format';

const STEP_ORDER = ['pending_payment', 'advance_paid', 'dispatched', 'delivered'];

export default function TrackOrder() {
  const [orderNo, setOrderNo] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const track = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (USE_MOCK_DB) {
        // Sample lookup — no live database call (Vercel-safe). Matching
        // normalises digits so "ORD-202610-0001" and last-10 phone digits work.
        const mock = findMockOrder(orderNo.trim(), phone.trim());
        if (!mock) throw new Error('No matching sample order — try ORD-202610-0001 / 9840012345.');
        setOrder(mock);
        return;
      }
      // Live path (disabled while USE_MOCK_DB): re-add api.trackOrder here
      // together with the api.js import when a backend returns.
    } catch (ex) {
      setErr(ex.message);
      setOrder(null);
    } finally {
      setBusy(false);
    }
  };

  const current = order ? STEP_ORDER.indexOf(order.order_status) : -1;
  const cancelled = order?.order_status === 'cancelled';

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
          <PackageSearch size={22} className="text-emerald-600 dark:text-emerald-500" /> Track your bulk order
        </h1>
        <form onSubmit={track} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input placeholder="Order number (ORD-2026MM-0001)" value={orderNo} onChange={(e) => setOrderNo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <input placeholder="Registered phone" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            {busy ? '…' : 'Track'}
          </button>
        </form>

        {err && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>}

        {order && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Order</p>
                <p className="font-extrabold text-slate-900 dark:text-white">{order.order_number}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_META[order.order_status]?.color}`}>
                {STATUS_META[order.order_status]?.label}
              </span>
            </div>

            {/* Timeline */}
            <div className="mt-6">
              {cancelled ? (
                <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <XCircle size={18} /> This order was cancelled{order.vehicle_number ? '' : ' by the owner.'}
                </div>
              ) : (
                <ol className="space-y-1">
                  {STEP_ORDER.map((s, i) => {
                    const done = i <= current;
                    const Icon = [Truck, HandCoins, PackageCheck, FileCheck][i];
                    return (
                      <li key={s} className="flex items-start gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                          <Icon size={15} />
                        </span>
                        <div className={done ? '' : 'opacity-40'}>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{STATUS_META[s].label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{stepNote(s, order, done)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <dl className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 dark:border-slate-700">
              <div><dt className="text-xs text-slate-400 dark:text-slate-500">Advance paid</dt><dd className="font-bold text-emerald-700 dark:text-emerald-400">{inrFull(order.advance_paid)}</dd></div>
              <div><dt className="text-xs text-slate-400 dark:text-slate-500">Balance due</dt><dd className="font-bold text-slate-800 dark:text-white">{inrFull(order.balance_due)}</dd></div>
              <div><dt className="text-xs text-slate-400 dark:text-slate-500">Delivery</dt><dd>{order.delivery_date || '—'} {order.delivery_slot || ''}</dd></div>
              <div><dt className="text-xs text-slate-400 dark:text-slate-500">Address</dt><dd className="text-xs">{order.delivery_address}</dd></div>
            </dl>
            {(order.vehicle_number || order.driver_contact) && (
              <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
                Dispatch: {order.vehicle_number || '—'} · Driver: {order.driver_contact || '—'}
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          Need help? Call BuildSupply at <b>+91 98400 12345</b> · <Link to="/" className="text-emerald-700 hover:underline dark:text-emerald-400">← Back to catalog</Link>
        </p>
      </div>
    </div>
  );
}

function stepNote(s, order, done) {
  const d = order.delivery_date ? new Date(order.delivery_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
  switch (s) {
    case 'pending_payment':
      return done ? 'Order received. Advance payment pending.' : 'You will reach this stage next.';
    case 'advance_paid':
      return done ? `Advance of ${inrFull(order.advance_paid)} confirmed.` : 'Owner confirms your advance against this order.';
    case 'dispatched':
      return done ? `Out for delivery${order.vehicle_number ? ` · ${order.vehicle_number}` : ''}.` : 'Stock is reserved and loaded for delivery.';
    case 'delivered':
      return done ? `Delivered on ${d}. Balance collected on site.` : 'Materials delivered and balance collected.';
    default:
      return '';
  }
}