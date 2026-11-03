import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HardHat, Lock, ArrowLeft } from 'lucide-react';
import Button from '../../components/shared/Button';
import { admin } from '../../lib/api';
import { USE_MOCK_DB } from '../../lib/mockData';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  const submit = async () => {
    setErr(null);
    try {
      if (USE_MOCK_DB) {
        // Sample data mode — grant demo access locally without a backend
        // login call (so the dashboard is viewable on Vercel).
        localStorage.setItem('bs_admin_token', 'mock-admin-token');
        navigate('/admin', { replace: true });
        return;
      }
      await admin.login(username, password);
      navigate('/admin', { replace: true });
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-white p-7 shadow-2xl dark:bg-slate-800">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-amber-400 dark:bg-amber-400 dark:text-slate-900">
            <HardHat size={26} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Owner Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inventories · orders · dispatch · analytics</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
          >
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-900" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-900" />
            {err && <p className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-600 dark:bg-rose-950 dark:text-rose-300">{err}</p>}
            <Button className="w-full" onClick={submit}>
              <Lock size={15} /> Sign in
            </Button>
          </form>

          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Default demo credentials: <b>admin</b> / <b>admin123</b>. Override via <code>ADMIN_USERNAME</code> &amp; <code>ADMIN_PASSWORD</code> in backend/.env.
          </p>
        </div>
        <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-white">
          <ArrowLeft size={14} /> Back to storefront
        </Link>
      </div>
    </div>
  );
}