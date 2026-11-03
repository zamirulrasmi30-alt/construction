import { useEffect, useMemo, useState } from 'react';
import { Search, Construction, Layers, ShieldCheck, Truck } from 'lucide-react';
import Navbar from '../../components/shop/Navbar';
import ProductCard from '../../components/shop/ProductCard';
import ProductQuickView from '../../components/shop/ProductQuickView';
import OrderModal from '../../components/shop/OrderModal';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../../lib/mockData';

export default function Home() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [q, setQ] = useState('');
  const [orderProduct, setOrderProduct] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Mock catalog served locally — no live database/API calls, so Vercel
        // deployments never hit DB connection or column errors. Reconnect
        // api.categories()/api.products() here when a backend returns.
        setCategories(MOCK_CATEGORIES);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    let rows = products;
    if (activeCat !== 'all') rows = rows.filter((p) => p.category_id === activeCat);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      rows = rows.filter((p) => (p.name + ' ' + (p.brand || '')).toLowerCase().includes(t));
    }
    return rows;
  }, [products, activeCat, q]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
              <Truck size={14} /> Same-week site delivery · TN · KA · AP
            </p>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              Bulk construction materials, <span className="text-amber-400">priced for builders.</span>
            </h1>
            <p className="mt-4 max-w-lg text-slate-300">
              Cement, TMT steel, P-Sand, M-Sand, aggregates, doors, tiles and more — with live stock, bulk
              discounts, advance booking and GST-ready invoices.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#catalog" className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-amber-300">
                Browse Catalog
              </a>
              <a href="#quote-marquee" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Get a Quote
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ k: '7+', d: 'Material categories' }, { k: '200+', d: 'Live SKU count' }, { k: '18%', d: 'GST invoice ready' }, { k: '24/7', d: 'Order booking' }].map((f) => (
              <div key={f.d} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-2xl font-extrabold text-amber-400">{f.k}</p>
                <p className="text-xs text-slate-300">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
            <Construction size={20} className="text-emerald-600 dark:text-emerald-500" /> Live Material Catalog
          </h2>
          <div className="relative w-full max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search cement, TMT, sand…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-emerald-900"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="scrollbar-thin mt-5 flex gap-2 overflow-x-auto pb-2">
          <CatPill active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="All" />
          {categories.map((c) => (
            <CatPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} label={`${c.name} (${c.product_count})`} />
          ))}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl bg-slate-100 p-6 text-center text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <Layers className="mx-auto mb-2" /> No products match your filter.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onOrder={setOrderProduct} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        )}
      </section>

      {/* Trust strip */}
      <section className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-3 sm:px-6">
          {[
            { icon: <ShieldCheck size={22} />, t: 'Brand & weight verified', d: 'All materials ISI / branded with weighbridge slips.' },
            { icon: <Truck size={22} />, t: 'Fleet & driver tracking', d: 'Vehicle number and driver contact attached to every dispatch.' },
            { icon: <Construction size={22} />, t: 'Bulk tier pricing', d: 'Automatic % discount when you cross quantity thresholds.' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">{f.icon}</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{f.t}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {orderProduct && (
        <OrderModal
          product={orderProduct}
          onClose={() => setOrderProduct(null)}
          // OrderModal shows its own success confirmation; it just closes here.
          onPlaced={() => setOrderProduct(null)}
        />
      )}

      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onOrder={(p) => { setQuickViewProduct(null); setOrderProduct(p); }}
        />
      )}
    </div>
  );
}

function CatPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'}`}
    >
      {label}
    </button>
  );
}