'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }

        const emailRedirectTo = `${window.location.origin}/auth/confirm?next=/app/dashboard`;
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            const sessionResponse = await fetch('/api/auth/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                }),
            });

            if (!sessionResponse.ok) {
                const payload = await sessionResponse.json().catch(() => null);
                setError(payload?.error ?? 'Could not persist session on server.');
                setLoading(false);
                return;
            }

            router.replace('/app/dashboard');
            router.refresh();
            return;
        }

        setSuccess(true);
        setLoading(false);
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#030712]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(14,165,233,0.20),transparent_33%),radial-gradient(circle_at_80%_88%,rgba(37,99,235,0.24),transparent_35%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:30px_30px] opacity-40" />

            <div className="relative flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="mb-8 flex items-center justify-center gap-3">
                        <Image
                            src="/brand/applyhub-logo.png"
                            alt="ApplyHub logo"
                            width={56}
                            height={56}
                            priority
                            className="h-14 w-14 rounded-xl border border-cyan-300/40 bg-slate-900/70 object-cover p-1"
                        />
                        <span className="text-2xl font-bold tracking-tight text-slate-100">ApplyHub</span>
                    </div>

                    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-8 backdrop-blur-xl">
                        {success ? (
                            <div className="py-4 text-center">
                                <CheckCircle className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
                                <h2 className="text-xl font-bold text-slate-100">Confirm your email</h2>
                                <p className="mb-6 mt-2 text-sm text-slate-400">
                                    We sent a confirmation link to{' '}
                                    <strong className="text-slate-200">{email}</strong>.
                                </p>
                                <Link href="/login" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                                    Back to sign in
                                </Link>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-slate-100">Create account</h1>
                                <p className="mb-6 mt-1 text-sm text-slate-400">
                                    Start managing your job search in one place.
                                </p>

                                {error ? (
                                    <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                                        {error}
                                    </div>
                                ) : null}

                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-300">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            placeholder="you@example.com"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-300">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            placeholder="Min. 6 characters"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-gradient-to-r from-blue-600 to-cyan-600 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        {loading ? 'Creating account...' : 'Create account'}
                                    </button>
                                </form>

                                <p className="mt-6 text-center text-sm text-slate-400">
                                    Already have an account?{' '}
                                    <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
                                        Sign in
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-center text-xs tracking-wide text-slate-500/80">
                © 2026. All rights reserved.
            </p>
        </div>
    );
}
