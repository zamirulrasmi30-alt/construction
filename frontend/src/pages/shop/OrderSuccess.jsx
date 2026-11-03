import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText } from 'lucide-react';
import Navbar from '../../components/shop/Navbar';
import { findMockOrder, USE_MOCK_DB } from '../../lib/mockData';
import { inrFull } from '../../lib/format';
import downloadInvoicePdf from '../../lib/invoice';

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const orderNo = params.get('order');
  const phone = params.get('phone');
  const [order, setOrder] = useState(null);
  const [ok, setOk] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!orderNo || !phone) return;
    const load = async () => {
      try {
        if (USE_MOCK_DB) {
          // Sample lookup — no live database call (Vercel-safe).
          const mock = findMockOrder(orderNo, phone);
          if (!mock) throw new Error('No matching sample order — try ORD-202610-0001 / 9840012345.');
          setOrder(mock);
          return;
        }
        setErr('Backend offline — order lookup unavailable.');
      } catch (e) {
        setErr(e.message);
      }
    };
    load();
  }, [orderNo, phone]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-12">
        {order ? (
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950">
              <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Order placed successfully</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Order <b className="text-emerald-700 dark:text-emerald-400">{order.order_number}</b> · {order.customer_name}
                </p>
              </div>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Info k="Order status" v={order.order_status.replace('_', ' ')} />
              <Info k="Total amount" v={inrFull(order.total_amount)} />
              <Info k="Advance due now" v={inrFull(order.total_amount - order.balance_due)} highlight />
              <Info k="Balance on delivery" v={inrFull(order.balance_due)} />
              <Info k="Delivery date" v={order.delivery_date || '—'} />
              <Info k="Slot" v={order.delivery_slot || '—'} />
            </dl>

            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-300">
              Share your <b>order number</b> with the site supervisor. The owner will confirm the advance and
              dispatch — stock is reserved automatically at dispatch.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={() => downloadInvoicePdf(order)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                <FileText size={15} /> Download Invoice (PDF)
              </button>
              <button onClick={() => downloadInvoicePdf(order, 'RECEIPT')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Delivery Receipt (balance to collect)
              </button>
            </div>

            <div className="mt-6 flex justify-between text-xs">
              <Link to="/track" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Track this order →</Link>
              <Link to="/" className="font-semibold text-slate-500 hover:underline dark:text-slate-400">Continue shopping</Link>
            </div>
          </div>
        ) : err ? (
          <p className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>
        ) : (
          <LoadingState orderNo={orderNo} />
        )}
      </div>
    </div>
  );
}

function LoadingState({ orderNo }) {
  return (
    <div className="rounded-3xl bg-white p-10 text-center shadow-sm dark:bg-slate-800">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      {orderNo ? <p className="text-sm text-slate-500 dark:text-slate-400">Fetching order {orderNo}…</p> : <p className="text-sm text-slate-500 dark:text-slate-400">No order reference found.</p>}
    </div>
  );
}

function Info({ k, v, highlight }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950 dark:ring-emerald-900' : 'bg-slate-50 dark:bg-slate-700/40'}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</dt>
      <dd className={`mt-0.5 font-bold ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>{v}</dd>
    </div>
  );
}