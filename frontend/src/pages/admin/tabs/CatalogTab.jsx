import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Layers, Upload, ImageIcon } from 'lucide-react';
import { admin } from '../../../lib/api';
import Modal from '../../../components/shared/Modal';
import Button from '../../../components/shared/Button';
import Field, { inputCls } from '../../../components/shared/Field';
import { inr, fmtQty } from '../../../lib/format';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, USE_MOCK_DB } from '../../../lib/mockData';

export default function CatalogTab() {
  const [cats, setCats] = useState(null);
  const [prods, setProds] = useState(null);
  const [err, setErr] = useState(null);
  const [showCat, setShowCat] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingProd, setEditingProd] = useState(null);

  const load = async () => {
    setErr(null);
    try {
      if (USE_MOCK_DB) {
        // Mock catalog data — no live database call, so Vercel deployments
        // never hit DB connection or column errors.
        setCats(MOCK_CATEGORIES);
        setProds(MOCK_PRODUCTS);
        return;
      }
      const [c, p] = await Promise.all([admin.categories(), admin.products({ status: 'all' })]);
      setCats(c.data);
      setProds(p.data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const prodCat = (id) => cats?.find((c) => c.id === id);

  return (
    <div className="space-y-6">
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>}

      {/* Categories */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Layers size={16} /> Categories &amp; measurement units
          </h3>
          <Button onClick={() => setShowCat(true)}><Plus size={15} /> New category</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cats === null ? (
            <div className="animate-pulse rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-800" />
          ) : (
            cats.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{c.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{c.product_count} products</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingCat(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"><Pencil size={14} /></button>
                    <button onClick={async () => {
                      if (USE_MOCK_DB) { window.alert('Sample data mode — catalogue changes require the backend.'); return; }
                      if (confirm(`Delete category "${c.name}"?`)) { await admin.deleteCategory(c.id); load(); }
                    }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-300"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(c.unit_types || []).map((u) => (
                    <span key={u} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{u}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Products */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Products</h3>
          <Button onClick={() => setEditingProd({})}><Plus size={15} /> Add product</Button>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {prods === null ? (
                  <tr><td className="px-4 py-6 text-slate-400 dark:text-slate-500">Loading…</td></tr>
                ) : prods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.brand || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{prodCat(p.category_id)?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{inr(p.price_per_unit)}/{p.unit_type}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{fmtQty(p.current_stock)}</td>
                    <td className="px-4 py-3 text-xs text-emerald-700 dark:text-emerald-400">
                      {p.discount_tier_qty ? `${p.discount_tier_percent}% @ ≥${fmtQty(p.discount_tier_qty)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditingProd(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"><Pencil size={14} /></button>
                        <button onClick={async () => {
                          if (USE_MOCK_DB) { window.alert('Sample data mode — catalogue changes require the backend.'); return; }
                          if (confirm(`Delete "${p.name}"?`)) { await admin.deleteProduct(p.id); load(); }
                        }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-300"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showCat && (
        <CategoryModal
          onClose={() => setShowCat(false)}
          onDone={async () => { await load(); setShowCat(false); }}
        />
      )}
      {editingCat && (
        <CategoryModal
          category={editingCat}
          onClose={() => setEditingCat(null)}
          onDone={async () => { await load(); setEditingCat(null); }}
        />
      )}
      {editingProd && (
        <ProductModal
          product={editingProd}
          categories={cats || []}
          onClose={() => setEditingProd(null)}
          onDone={async () => { await load(); setEditingProd(null); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Category
function CategoryModal({ category, onClose, onDone }) {
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [units, setUnits] = useState((category?.unit_types || []).join(', '));
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    if (USE_MOCK_DB) {
      setMsg({ ok: true, text: 'Sample data mode — change not persisted (backend offline).' });
      setTimeout(onDone, 800);
      return;
    }
    try {
      const unitList = units.split(',').map((u) => u.trim()).filter(Boolean);
      if (isEdit) await admin.updateCategory(category.id, { name, description, unit_types: unitList });
      else await admin.createCategory({ name, description, unit_types: unitList });
      setMsg({ ok: true, text: 'Saved ✓' });
      setTimeout(onDone, 500);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  return (
    <Modal open title={isEdit ? 'Edit category' : 'New category'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Category name" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electricals" /></Field>
        <Field label="Description"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Measurement units (comma separated)" required hint="Shown to customers. e.g. Tons, Brass, Units">
          <input className={inputCls} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Tons, Brass, Units" />
        </Field>
        {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</p>}
        <Button disabled={!name.trim()} onClick={submit}>Save category</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Product
function ProductModal({ product, categories, onClose, onDone }) {
  const isEdit = Boolean(product.id);
  const [f, setF] = useState({
    category_id: product.category_id || categories[0]?.id || '',
    name: product.name || '',
    brand: product.brand || '',
    description: product.description || '',
    price_per_unit: product.price_per_unit ?? '',
    unit_type: product.unit_type || 'Units',
    minimum_alert_stock: product.minimum_alert_stock ?? 0,
    image_url: product.image_url || '',
    discount_tier_qty: product.discount_tier_qty ?? '',
    discount_tier_percent: product.discount_tier_percent ?? '',
    status: product.status || 'active',
    opening_stock: '',
    supplier_name: '',
  });
  const [msg, setMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      if (USE_MOCK_DB) {
        setUploadMsg({ ok: false, text: 'Image upload needs the backend (sample mode).' });
        return;
      }
      const { url } = await admin.uploadImage(file);
      setF((prev) => ({ ...prev, image_url: url }));
      setUploadMsg({ ok: true, text: 'Image uploaded ✓' });
    } catch (err) {
      setUploadMsg({ ok: false, text: err.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const unitOptions = categories.find((c) => c.id === f.category_id)?.unit_types || [];

  const submit = async () => {
    if (USE_MOCK_DB) {
      setMsg({ ok: true, text: 'Sample data mode — change not persisted (backend offline).' });
      setTimeout(onDone, 800);
      return;
    }
    try {
      const payload = {
        category_id: f.category_id, name: f.name, brand: f.brand || null,
        description: f.description || null, price_per_unit: Number(f.price_per_unit),
        unit_type: f.unit_type, minimum_alert_stock: Number(f.minimum_alert_stock || 0),
        image_url: f.image_url || null,
        discount_tier_qty: f.discount_tier_qty ? Number(f.discount_tier_qty) : null,
        discount_tier_percent: f.discount_tier_percent ? Number(f.discount_tier_percent) : null,
        status: f.status,
      };
      if (!isEdit) {
        payload.opening_stock = Number(f.opening_stock || 0);
        payload.supplier_name = f.supplier_name || null;
        await admin.createProduct(payload);
      } else {
        await admin.updateProduct(product.id, payload);
      }
      setMsg({ ok: true, text: 'Saved ✓' });
      setTimeout(onDone, 500);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  return (
    <Modal open title={isEdit ? 'Edit product' : 'Add product (quick add)'} onClose={onClose} size="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Category" required>
            <select className={inputCls} value={f.category_id} onChange={set('category_id')}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Product name" required><input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Custom Wood Door" /></Field>
        <Field label="Brand"><input className={inputCls} value={f.brand} onChange={set('brand')} placeholder="e.g. Ramco" /></Field>
        <div className="sm:col-span-2">
          <Field label="Description"><input className={inputCls} value={f.description} onChange={set('description')} /></Field>
        </div>
        <Field label="Price per unit" required><input className={inputCls} type="number" min="0" step="0.01" value={f.price_per_unit} onChange={set('price_per_unit')} /></Field>
        <Field label="Unit type" required>
          <input className={inputCls} list="unit-options" value={f.unit_type} onChange={set('unit_type')} />
          <datalist id="unit-options">
            {(unitOptions.length ? unitOptions : ['Tons', 'Bags', 'Units', 'Square Feet', 'Metric Tons', 'Rolls']).map((u) => <option key={u} value={u} />)}
          </datalist>
        </Field>
        <Field label="Minimum alert stock"><input className={inputCls} type="number" min="0" value={f.minimum_alert_stock} onChange={set('minimum_alert_stock')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Product image">
            <div className="flex flex-wrap items-center gap-3">
              {f.image_url ? (
                <img src={f.image_url} alt="preview" className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-300">
                  <ImageIcon size={22} />
                </div>
              )}
              <label className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${uploading ? 'cursor-wait' : ''}`}>
                <Upload size={15} />
                {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
              </label>
              {uploadMsg && (
                <p className={`rounded-lg px-2.5 py-1.5 text-xs ${uploadMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                  {uploadMsg.text}
                </p>
              )}
            </div>
          </Field>
          <Field label="Image URL">
            <input className={inputCls} value={f.image_url} onChange={set('image_url')} placeholder="https://… or /uploads/…" />
          </Field>
        </div>
        <Field label="Bulk discount qty (≥)" hint="e.g. 20"><input className={inputCls} type="number" min="0" value={f.discount_tier_qty} onChange={set('discount_tier_qty')} /></Field>
        <Field label="Discount %" hint="e.g. 5"><input className={inputCls} type="number" min="0" max="50" value={f.discount_tier_percent} onChange={set('discount_tier_percent')} /></Field>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={set('status')}>
            <option value="active">active</option><option value="inactive">inactive</option>
          </select>
        </Field>
        {!isEdit && (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <Field label="Opening stock (ledger IN)" hint="Creates first ledger entry">
              <input className={inputCls} type="number" min="0" value={f.opening_stock} onChange={set('opening_stock')} />
            </Field>
            <Field label="Supplier name"><input className={inputCls} value={f.supplier_name} onChange={set('supplier_name')} /></Field>
          </div>
        )}
      </div>
      {msg && <p className={`mt-3 rounded-lg p-2.5 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</p>}
      <div className="mt-4">
        <Button disabled={!f.name || !(Number(f.price_per_unit) >= 0) || !f.category_id} onClick={submit}>
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>
      </div>
    </Modal>
  );
}