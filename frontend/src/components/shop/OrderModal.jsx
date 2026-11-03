import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, BadgePercent, Minus, Plus, FileText, CreditCard, AlertTriangle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Field, { inputCls } from '../shared/Field';
import downloadInvoicePdf from '../../lib/invoice';
import { inrFull, fmtQty, num } from '../../lib/format';

/* ------------------------------------------------------------------ */
/* Order submission — sent DIRECTLY from the browser via Web3Forms.     */
/* No backend/database involved, so no DB errors on Vercel.             */
/*                                                                      */
/* Access key : 4f44b7c9-2b62-4181-9334-ffd924deabfb                    */
/* Endpoint   : https://api.web3forms.com/submit                        */
/* Recipient  : arshathibrahim8@gmail.com (hidden `to` field + subject)  */
/* ------------------------------------------------------------------ */
const WEB3FORMS_ACCESS_KEY = '4f44b7c9-2b62-4181-9334-ffd924deabfb';
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const OWNER_EMAIL = 'arshathibrahim8@gmail.com';

const SLOTS = ['Immediate', 'Morning (7–11 AM)', 'Afternoon (12–4 PM)', 'Evening (4–8 PM)'];
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const minQtyOf = (product) => (product?.discount_tier_qty ? Number(product.discount_tier_qty) : 1);
const makeReference = (prefix) => {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
};

export default function OrderModal({ product, onClose, onPlaced }) {
  const [qty, setQty] = useState(minQtyOf(product));
  const [deliveryDate, setDeliveryDate] = useState(tomorrow());
  const [slot, setSlot] = useState('Immediate');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [advanceMode, setAdvanceMode] = useState('percent');
  const [advancePercent, setAdvancePercent] = useState(20);
  const [preview, setPreview] = useState(null);
  const [previewErr, setPreviewErr] = useState(null);
  const [quote, setQuote] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);
  const [placed, setPlaced] = useState(null);

  // Local price estimate mirroring the backend (/pricing/quote) formula:
  // gross − bulk tier discount + 18% GST + flat freight estimate. All
  // computed locally, so no live database call happens anywhere.
  const localQuote = (qtyVal) => {
    const gross = num(product.price_per_unit) * num(qtyVal);
    const tierActive =
      product.discount_tier_qty != null &&
      Number(qtyVal) >= Number(product.discount_tier_qty) &&
      product.discount_tier_percent != null;
    const discount = tierActive ? num((gross * Number(product.discount_tier_percent)) / 100) : 0;
    const gstRate = 18;
    const gst = num(((gross - discount) * gstRate) / 100);
    const freight = 2000; // flat estimate; finalised with the owner on confirmation
    return {
      item_subtotal: num(gross),
      discount_amount: discount,
      gst_rate: gstRate,
      gst_amount: gst,
      freight_charge: freight,
      total_amount: num(gross - discount + gst + freight),
      source: 'local',
    };
  };

  useEffect(() => {
    // Price preview computed locally on every quantity change — instant,
    // offline-safe, and identical to the server-side formula.
    setPreview(localQuote(qty));
    setPreviewErr(null);
  }, [qty, product]);

  const advanceDue = useMemo(() => {
    if (!preview) return 0;
    if (advanceMode === 'full') return preview.total_amount;
    return num((preview.total_amount * advancePercent) / 100);
  }, [preview, advanceMode, advancePercent]);

  const balanceDue = useMemo(() => (preview ? num(preview.total_amount) - advanceDue : 0), [preview, advanceDue]);

  const canPlace = Boolean(name.trim() && phone.trim() && street.trim() && pincode.trim() && qty > 0 && preview);

  /**
   * Send the complete order directly via Web3Forms using the exact
   * credentials above. Recipient included as a hidden `to` field and in the
   * subject. Never throws — returns { sent, message } where `message` is the
   * plain-text summary reused by the mailto fallback in the success modal.
   */
  const sendOrderEmail = async (orderNumber) => {
    if (!preview) {
      console.warn('[order-email] skipped — no price preview available yet');
      return { sent: false, message: '' };
    }

    const unitPrice = preview ? num(preview.item_subtotal) / qty : product.price_per_unit;
    const discountTierActive =
      product.discount_tier_qty != null && qty >= Number(product.discount_tier_qty);
    const discountNote =
      discountTierActive && product.discount_tier_percent
        ? `${product.discount_tier_percent}% bulk tier applied`
        : 'None';
    const paymentMode = advanceMode === 'full' ? 'Full payment' : `${advancePercent}% advance booking`;
    const subject = `🚨 New Order ${orderNumber} — ${name} (to ${OWNER_EMAIL})`;

    const message = [
      'NEW ORDER REQUEST',
      '=================',
      '',
      `Order No        : ${orderNumber}`,
      `Recipient       : ${OWNER_EMAIL}`,
      '',
      'CUSTOMER DETAILS',
      `Name            : ${name}`,
      `Phone           : ${phone}`,
      `Email           : ${email || '(not provided)'}`,
      `Delivery address: ${street}${landmark ? `, ${landmark}` : ''} — ${pincode}`,
      '',
      'SCHEDULE',
      `Delivery date   : ${deliveryDate}`,
      `Time slot       : ${slot}`,
      '',
      'ORDER SUMMARY',
      `Item            : ${product.name}${product.brand ? ` (${product.brand})` : ''}`,
      `Quantity        : ${fmtQty(qty)} ${product.unit_type}`,
      `Unit price      : ${inrFull(unitPrice)} / ${product.unit_type}`,
      `Bulk discount   : ${discountNote}`,
      `Item subtotal   : ${inrFull(preview.item_subtotal)}`,
      `GST @ ${preview.gst_rate}%: ${inrFull(preview.gst_amount)}`,
      `Freight (est.)  : ${inrFull(preview.freight_charge)}`,
      `TOTAL AMOUNT    : ${inrFull(preview.total_amount)}`,
      `Advance due now : ${inrFull(advanceDue)}`,
      `Balance on delivery: ${inrFull(balanceDue)}`,
      `Payment mode    : ${paymentMode}`,
    ].join('\n');

    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject,
      to: OWNER_EMAIL, // recipient email — hidden body field
      replyto: email || undefined,
      from_name: name,
      order_number: orderNumber,
      customer_name: name,
      customer_phone: phone,
      email: email || 'not-provided@example.com',
      delivery_address: street + (landmark ? `, ${landmark}` : '') + ` — ${pincode}`,
      delivery_date: deliveryDate,
      delivery_slot: slot,
      item: product.name,
      brand: product.brand || '',
      quantity: `${fmtQty(qty)} ${product.unit_type}`,
      unit_price: `${inrFull(unitPrice)} / ${product.unit_type}`,
      item_subtotal: inrFull(preview.item_subtotal),
      gst_amount: inrFull(preview.gst_amount),
      freight_charge: inrFull(preview.freight_charge),
      total_amount: inrFull(preview.total_amount),
      advance_due: inrFull(advanceDue),
      balance_on_delivery: inrFull(balanceDue),
      payment_mode: paymentMode,
      message,
    };

    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        console.log('[web3forms] order email sent');
        return { sent: true, message };
      }
      console.error('[web3forms] failed:', body.message || res.status);
      return { sent: false, message };
    } catch (err) {
      console.error('[web3forms] error:', err.message);
      return { sent: false, message };
    }
  };

  const submit = async () => {
    if (!preview || placing) return;
    setPlacing(true);
    setSubmitErr(null);

    try {
      const orderNumber = makeReference('ORD');
      // Sends the complete order details straight from the browser to the
      // owner's inbox via Web3Forms — no backend/API/DB step of any kind.
      const { sent: emailSent, message: emailBody } = await sendOrderEmail(orderNumber);

      setPlaced({
        order_number: orderNumber,
        email_sent: emailSent,
        mailto_body: emailBody,
        customer_name: name,
        customer_email: email || '',
        customer_phone: phone,
        street_address: street,
        landmark: landmark || '',
        pincode,
        full_address: `${street}${landmark ? `, ${landmark}` : ''} — ${pincode}`,
        delivery_date: deliveryDate,
        delivery_slot: slot,
        payment_mode: advanceMode === 'full' ? 'Full payment' : `${advancePercent}% advance booking`,
        item_name: product.name + (product.brand ? ` (${product.brand})` : ''),
        item_qty: `${fmtQty(qty)} ${product.unit_type}`,
        unit_price: product.price_per_unit,
        item_subtotal: preview.item_subtotal,
        discount_amount: preview.discount_amount,
        gst_rate: preview.gst_rate,
        gst_amount: preview.gst_amount,
        freight_charge: preview.freight_charge,
        total_amount: preview.total_amount,
        advance_due: advanceDue,
        balance_due: balanceDue,
      });
    } catch (err) {
      setSubmitErr(err.message || 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const downloadConfirmationInvoice = () => {
    if (!placed) return;
    downloadInvoicePdf({
      order_number: placed.order_number,
      created_at: new Date().toISOString(),
      customer_name: placed.customer_name,
      customer_email: placed.customer_email,
      customer_phone: placed.customer_phone,
      delivery_address: placed.street_address,
      landmark: placed.landmark,
      pincode: placed.pincode,
      order_items: [{
        product_name: product.name,
        brand: product.brand || '',
        quantity: qty,
        unit_type: product.unit_type,
        unit_price_effective: placed.unit_price,
        subtotal: placed.item_subtotal,
      }],
      item_subtotal: placed.item_subtotal,
      discount_amount: placed.discount_amount,
      gst_rate: placed.gst_rate,
      gst_amount: placed.gst_amount,
      freight_charge: placed.freight_charge,
      total_amount: placed.total_amount,
      payment_status: 'advance_pending',
      advance_paid: placed.advance_due,
      balance_due: placed.balance_due,
      delivery_date: placed.delivery_date,
      delivery_slot: placed.delivery_slot,
    });
  };

  // Quotation generated locally (client-side PDF) — no backend /quotes call.
  const requestQuotation = () => {
    const number = makeReference('QUO');
    const local = localQuote(qty);
    downloadInvoicePdf({
      order_number: number,
      created_at: new Date().toISOString(),
      customer_name: name,
      customer_email: email || '',
      customer_phone: phone,
      delivery_address: street,
      landmark: landmark || '',
      pincode,
      order_items: [{
        product_name: product.name,
        brand: product.brand || '',
        quantity: qty,
        unit_type: product.unit_type,
        unit_price_effective: product.price_per_unit,
        subtotal: local.item_subtotal,
      }],
      item_subtotal: local.item_subtotal,
      discount_amount: local.discount_amount,
      gst_rate: local.gst_rate,
      gst_amount: local.gst_amount,
      freight_charge: local.freight_charge,
      total_amount: local.total_amount,
      payment_status: 'quotation',
      advance_paid: 0,
      balance_due: local.total_amount,
    }, 'QUOTATION');
    setQuote({ number, url: null });
  };

  return (
    <>
      {/* Order form — hidden once the order is placed and confirmed. */}
      <Modal open={!placed} title={`Order — ${product.name}`} onClose={onClose} size="max-w-3xl">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            {/* 1. Quantity */}
            <Section icon={<BadgePercent size={15} />} title="1 · Quantity">
              <div className="flex items-center gap-3">
                <button onClick={() => setQty((val) => Math.max(0.5, val - 0.5))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <Minus size={16} />
                </button>
                <input
                  type="number" min="0.5" step="0.5" value={qty}
                  onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-lg font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button onClick={() => setQty((val) => val + 0.5)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <Plus size={16} />
                </button>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{product.unit_type}</span>
              </div>
              {product.discount_tier_qty != null && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  Bulk tier active: {product.discount_tier_percent}% off when quantity ≥ {fmtQty(product.discount_tier_qty)} {product.unit_type}.
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Sold by the {product.unit_type}. For mixed units (Brass + Tons) please request a quotation.</p>
            </Section>

            {/* 2. Deliverability */}
            <Section icon={<CalendarDays size={15} />} title="2 · Delivery date & time slot">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Expected delivery date" required>
                  <input type="date" min={today()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Time slot" required>
                  <select value={slot} onChange={(e) => setSlot(e.target.value)} className={inputCls}>
                    {SLOTS.map((sItem) => <option key={sItem}>{sItem}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            {/* 3. Site location */}
            <Section icon={<MapPin size={15} />} title="3 · Site location / delivery address">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Customer name" required>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Site owner / supervisor name" />
                  </Field>
                  <Field label="Phone" required>
                    <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
                  </Field>
                  <Field label="Email" hint="For the owner to reach you directly (reply-to).">
                    <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </Field>
                </div>
                <Field label="Street / delivery address" required>
                  <textarea rows={2} className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="House / site number, street, area" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Landmark">
                    <input className={inputCls} value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near bus stop / water tank" />
                  </Field>
                  <Field label="Pincode">
                    <input className={inputCls} value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="600 000" />
                  </Field>
                </div>
              </div>
            </Section>

            {/* 4. Advance */}
            <Section icon={<CreditCard size={15} />} title="4 · Advance payment">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAdvanceMode('percent')}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${advanceMode === 'percent' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  % Advance booking
                </button>
                <button onClick={() => setAdvanceMode('full')}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${advanceMode === 'full' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  Full payment
                </button>
              </div>
              {advanceMode === 'percent' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {[20, 30, 50].map((p) => (
                    <button key={p} onClick={() => setAdvancePercent(p)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${advancePercent === p ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {p}%
                    </button>
                  ))}
                </div>
              )}
              {preview && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {advanceMode === 'full'
                    ? `Pay ${inrFull(preview.total_amount)} now — balance ₹0 on delivery.`
                    : `Pay advance of ${inrFull(advanceDue)} now; balance ${inrFull(balanceDue)} collected by the driver on delivery.`}
                </p>
              )}
            </Section>
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <h4 className="mb-3 font-bold text-slate-800 dark:text-white">Order summary</h4>
              {quote ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Quotation <b>{quote.number}</b> generated &amp; downloaded. Share it with our office before paying the advance.
                </div>
              ) : (
                <>
                  <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{fmtQty(qty)} {product.unit_type} — {product.name}</p>
                  {preview ? (
                    <div className="space-y-1.5 text-sm">
                      <TotalRow label="Item subtotal" value={inrFull(preview.item_subtotal)} />
                      {num(preview.discount_amount) > 0 && <TotalRow label="Bulk discount" value={`− ${inrFull(preview.discount_amount)}`} negative />}
                      <TotalRow label={`GST @ ${preview.gst_rate}%`} value={inrFull(preview.gst_amount)} />
                      <TotalRow label="Freight (est.)" value={inrFull(preview.freight_charge)} />
                      <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                      <TotalRow label="Total" value={inrFull(preview.total_amount)} bold />
                      <TotalRow label="Advance due now" value={inrFull(advanceDue)} accent />
                      <TotalRow label="Balance on delivery" value={inrFull(balanceDue)} />
                    </div>
                  ) : previewErr ? (
                    <p className="flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                      <AlertTriangle size={14} /> {previewErr}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Calculating price…</p>
                  )}
                  <div className="mt-4 grid gap-2">
                    <Button disabled={!canPlace || placing} onClick={submit}>
                      {placing ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Placing order…</span>
                      ) : (
                        'Place Order Now'
                      )}
                    </Button>
                    <Button variant="secondary" onClick={requestQuotation}>
                      <FileText size={15} /> Request Price Quotation (PDF)
                    </Button>
                    {submitErr && (
                      <p className="flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                        <AlertTriangle size={14} /> {submitErr}
                      </p>
                    )}
                  </div>
                  <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    Your complete order details are emailed directly to the owner ({OWNER_EMAIL}), who confirms stock &amp; dispatch.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Success confirmation — shown after Web3Forms accepts the submission. */}
      {placed && (
        <Modal open title="Order Confirmed" onClose={onClose} size="max-w-lg">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 size={30} />
            </span>
            <h4 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">Order placed successfully!</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Reference <b className="text-slate-800 dark:text-slate-100">{placed.order_number}</b>
            </p>
          </div>

          <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <ConfirmRow label="Item" value={`${placed.item_name} · ${placed.item_qty}`} />
            <ConfirmRow label="Total amount" value={inrFull(placed.total_amount)} />
            <ConfirmRow label="Advance due now" value={inrFull(placed.advance_due)} highlight />
            <ConfirmRow label="Balance on delivery" value={inrFull(placed.balance_due)} />
            <ConfirmRow label="Delivery" value={`${placed.delivery_date} · ${placed.delivery_slot}`} />
            <ConfirmRow label="Deliver to" value={placed.full_address} />
            <ConfirmRow label="Payment mode" value={placed.payment_mode} />
          </div>

          <p className={`mt-4 rounded-xl p-3 text-xs ${placed.email_sent ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>
            {placed.email_sent
              ? `✓ The complete order details have been emailed to the owner (${OWNER_EMAIL}). Our team will contact you shortly to confirm payment & dispatch.`
              : `Order confirmed. The automatic email to ${OWNER_EMAIL} could not be sent just now — use "Open in Email App" below to forward the details from your own mail client.`}
          </p>

          <div className="mt-4 grid gap-2">
            <Button onClick={downloadConfirmationInvoice}>
              <FileText size={15} /> Download Invoice (PDF)
            </Button>
            {!placed.email_sent && (
              <a
                href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(`New Order ${placed.order_number} — ${placed.customer_name}`)}&body=${encodeURIComponent(placed.mailto_body || '')}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Mail size={15} /> Open in Email App (backup)
              </a>
            )}
            <Button variant="secondary" onClick={() => onPlaced && onPlaced({ order: placed })}>
              Continue Shopping
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Section({ icon, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-900 text-amber-400 dark:bg-amber-400 dark:text-slate-900">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function ConfirmRow({ label, value, highlight }) {
  return (
    <div className={`flex justify-between gap-4 ${highlight ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}>
      <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, bold, negative, accent }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-extrabold text-slate-900 dark:text-white' : ''} ${accent ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}>
      <span>{label}</span>
      <span className={negative ? 'text-rose-500' : ''}>{value}</span>
    </div>
  );
}
