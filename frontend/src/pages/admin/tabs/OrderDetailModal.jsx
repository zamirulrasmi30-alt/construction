import { useEffect, useState } from 'react';
import { Phone, MapPin, CalendarDays, FileText, Truck, HandCoins, PackageCheck, XCircle } from 'lucide-react';
import Modal from '../../../components/shared/Modal';
import Button from '../../../components/shared/Button';
import Field, { inputCls } from '../../../components/shared/Field';
import { admin } from '../../../lib/api';
import { inrFull, fmtQty, dateOnly, STATUS_META } from '../../../lib/format';
import downloadInvoicePdf from '../../../lib/invoice';
import { MOCK_ORDERS, USE_MOCK_DB } from '../../../lib/mockData';
import { QtyList, StatusPill } from './OrdersTab';

export default function OrderDetailModal({ orderId, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);
  const [advance, setAdvance] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [collected, setCollected] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState(null);

  const load = async () => {
    try {
      if (USE_MOCK_DB) {
        // Mock lookup — no live database call (Vercel-safe).
        const mock = MOCK_ORDERS.find((x) => x.id === orderId);
        if (mock) {
          setOrder(mock);
          setErr(null);
          return;
        }
        setErr('Order not found in the sample dataset.');
        return;
      }
      const { data } = await admin.order(orderId);
      setOrder(data);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  };

  const close = () => {
    onChanged?.();
    onClose();
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId]);

  const act = (fn, msg) => async () => {
    if (USE_MOCK_DB) {
      // Sample data — status transitions require the backend (no DB writes).
      setNote({ ok: false, text: 'Sample data mode — this action requires the backend.' });
      return;
    }
    try {
      await fn();
      setNote({ ok: true, text: msg });
      await load();
    } catch (e) {
      setNote({ ok: false, text: e.message });
    }
  };

  if (!order) return <Modal open title="Order detail" onClose={close} size="max-w-3xl"><p className="py-8 text-sm text-slate-400 dark:text-slate-500">{err || 'Loading…'}</p></Modal>;

  const o = order;
  return (
    <Modal open title={`Order ${o.order_number}`} onClose={close} size="max-w-3xl">
      <div className="space-y-5">
        {note && (
          <p className={`rounded-xl p-3 text-sm ${note.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'}`}>{note.text}</p>
        )}

        {/* Customer + delivery */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <Phone size={13} /> Client
            </h4>
            <p className="font-bold text-slate-800 dark:text-white">{o.customer_name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{o.customer_phone}</p>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" /> {o.delivery_address}{o.landmark ? `, ${o.landmark}` : ''} {o.pincode ? `— ${o.pincode}` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <CalendarDays size={13} /> Delivery
            </h4>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{dateOnly(o.delivery_date)} · {o.delivery_slot || '—'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <Truck size={14} className="text-slate-400 dark:text-slate-500" /> {o.vehicle_number || 'Vehicle not assigned'}{o.driver_contact ? ` · ${o.driver_contact}` : ''}
            </p>
            <div className="mt-2"><StatusPill status={o.order_status} /></div>
          </div>
        </section>

        {/* Finance */}
        <section className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <Fin label="Items subtotal" v={inrFull(o.item_subtotal)} />
            {Number(o.discount_amount) > 0 && <Fin label="Bulk discount" v={`− ${inrFull(o.discount_amount)}`} neg />}
            <Fin label={`GST @ ${o.gst_rate ?? 18}%`} v={inrFull(o.gst_amount)} />
            <Fin label="Freight (est.)" v={inrFull(o.freight_charge)} />
            <Fin label="Total amount" v={inrFull(o.total_amount)} bold />
            <Fin label="Advance paid" v={inrFull(o.advance_paid)} accent />
            <Fin label="Balance due" v={inrFull(o.balance_due)} bold />
          </div>
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Items</h4>
          <QtyList items={o.order_items || []} />
        </section>

        {/* Actions by status */}
        <section className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Process order</h4>

          {/* pending_payment -> advance */}
          {o.order_status === 'pending_payment' && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label={`Advance amount received (due: ${inrFull(o.total_amount)})`}>
                <input className={inputCls} value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="e.g. 4500" />
              </Field>
              <div className="flex items-end gap-2">
                <Button onClick={act(() => admin.recordAdvance(o.id, Number(advance)), 'Advance recorded ✓')}>Record advance</Button>
              </div>
            </div>
          )}

          {/* advance_paid -> dispatch */}
          {o.order_status === 'advance_paid' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Vehicle number" hint="e.g. Tipper TN 01 AB 1234">
                  <input className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="TN 01 AB 1234" />
                </Field>
                <Field label="Driver contact">
                  <input className={inputCls} value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="+91 98XXXXXX00" />
                </Field>
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Dispatch reserves and deducts stock for every line immediately.</p>
              <div className="mt-3">
                <Button onClick={act(() => admin.dispatch(o.id, { vehicle_number: vehicle, driver_contact: driver }), 'Order dispatched — stock deducted ✓')}>
                  <Truck size={15} /> Confirm Dispatch &amp; Deduct Stock
                </Button>
              </div>
            </>
          )}

          {/* dispatched -> deliver */}
          {o.order_status === 'dispatched' && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label={`Balance collected on delivery (due: ${inrFull(o.balance_due)})`}>
                <input className={inputCls} value={collected} onChange={(e) => setCollected(e.target.value)} placeholder={String(o.balance_due)} />
              </Field>
              <div className="flex items-end gap-2">
                <Button onClick={act(() => admin.deliver(o.id, Number(collected) || 0), 'Delivery completed ✓')}>
                  <PackageCheck size={15} /> Mark Delivered &amp; Collect
                </Button>
              </div>
            </div>
          )}

          {(o.order_status === 'delivered' || o.order_status === 'dispatched') && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => downloadInvoicePdf(o, 'INVOICE')}>
                <FileText size={15} /> Invoice PDF
              </Button>
              <Button variant="secondary" onClick={() => downloadInvoicePdf(o, 'RECEIPT')}>
                <FileText size={15} /> Collection Receipt
              </Button>
            </div>
          )}

          {/* cancel (unless delivered) */}
          {!['delivered', 'cancelled'].includes(o.order_status) && (
            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation reason (auto-restocks if dispatched)" />
                <Button variant="danger" onClick={act(() => admin.cancel(o.id, reason), 'Order cancelled ✓')}>
                  <XCircle size={15} /> Cancel Order
                </Button>
              </div>
            </div>
          )}
        </section>

        {o.notes && <p className="text-xs text-slate-400 dark:text-slate-500"><b>Notes:</b> {o.notes}</p>}
      </div>
    </Modal>
  );
}

function Fin({ label, v, bold, accent, neg }) {
  return (
    <div className="flex justify-between rounded-lg bg-white px-3 py-2 dark:bg-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold ${bold ? 'font-extrabold text-slate-900 dark:text-white' : ''} ${accent ? 'text-emerald-700 dark:text-emerald-400' : ''} ${neg ? 'text-rose-500' : ''}`}>{v}</span>
    </div>
  );
}