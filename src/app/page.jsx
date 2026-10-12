'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import MahalaxmiLogo from '@/components/MahalaxmiLogo';
import { User, Key, ArrowRight, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('admin@mahalaxmi.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seedStatus, setSeedStatus] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.token && res.user) {
        setAuth(res.user, res.token);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. If first time running, click Seed Database below.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    setSeedStatus('Seeding database with sample hierarchy & inventory...');
    setError('');

    try {
      const res = await apiFetch('/seed', { method: 'POST' });
      setSeedStatus('Database seeded successfully! You can now log in.');
      setEmail('admin@mahalaxmi.com');
      setPassword('Password@123');
    } catch (err) {
      setError('Seed failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogins = [
    { label: 'Admin', email: 'admin@mahalaxmi.com', desc: 'Suresh Singhania • Full Enterprise Authority' },
    { label: 'Director (Indore)', email: 'rajesh.director@mahalaxmi.com', desc: 'Rajesh Sharma • Oversees West Division + Mixed Team' },
    { label: 'Director (Central)', email: 'sunita.director@mahalaxmi.com', desc: 'Sunita Deshmukh • Parallel Branch Isolation Test' },
    { label: 'Sales Manager', email: 'vikram.manager@mahalaxmi.com', desc: 'Vikram Joshi • Supervises Sales Team' },
    { label: 'Sales Exec', email: 'amit.sales@mahalaxmi.com', desc: 'Amit Patel • Closed Registered Booking Plot-101' },
    { label: 'Direct Sales (Mixed Team)', email: 'neha.sales@mahalaxmi.com', desc: 'Neha Verma • Reports directly to Director Rajesh' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Graphic Accents - Brand Green & Gold (No Black) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-700/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card - Major White with Brand Green Header & Gold accents */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gold-500/20 overflow-hidden relative z-10">
        {/* Header - Brand Green (#30534A) with Official Logo from Image */}
        <div className="bg-brand-700 px-6 pt-7 pb-6 text-white text-center border-b border-brand-800/80 relative">
          <div className="flex justify-center mb-2">
            <MahalaxmiLogo variant="on-dark" layout="stacked" size="md" showTagline={true} />
          </div>
          <p className="text-[11px] text-brand-100/90 tracking-wide mt-2">
            Enterprise Hierarchy-Driven Plot Sales & Incentive Platform
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {seedStatus && (
            <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-gold-600 flex-shrink-0" />
              <span>{seedStatus}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-950 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600/70">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mahalaxmi.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-brand-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 text-brand-950 placeholder:text-slate-400 bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-950 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600/70">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-brand-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 text-brand-950 placeholder:text-slate-400 bg-white transition"
                />
              </div>
            </div>

            {/* Primary Action Button - Major Green with Gold Accent (No Black) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg border border-gold-500/30 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-gold-300" />
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <ArrowRight className="w-4 h-4 text-gold-300" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-brand-100">
            <span className="block text-center text-[11px] font-bold text-brand-800/80 uppercase tracking-wider mb-2.5">
              Quick Role Test Logins (Password: Password@123)
            </span>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {quickLogins.map((q) => (
                <button
                  key={q.email}
                  type="button"
                  onClick={() => {
                    setEmail(q.email);
                    setPassword('Password@123');
                  }}
                  className={`text-left p-2.5 rounded-xl border text-xs transition flex justify-between items-center ${
                    email === q.email
                      ? 'bg-gold-50/90 border-gold-400 font-medium text-gold-950 shadow-xs'
                      : 'bg-brand-50/40 border-brand-100 text-brand-950 hover:bg-brand-100/60'
                  }`}
                >
                  <span className="font-semibold">{q.label}</span>
                  <span className="text-[11px] text-slate-500 truncate ml-2">{q.desc}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSeed}
              disabled={loading}
              className="mt-4 w-full py-2.5 px-3 border border-dashed border-gold-400 bg-gold-50/60 hover:bg-gold-100/80 text-gold-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gold-600" />
              Seed / Reset Database (Roles, Tree, Projects, Plots)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
