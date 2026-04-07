'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthAnimatedHero } from '@/components/auth-animated-hero';

const TOP_STRIP_TEXT = 'ApplyHub | Pipeline visual | Contatos centralizados | Follow-up no tempo certo';
const HERO_HEADLINE = 'Domine suas candidaturas do primeiro clique ate a contratacao.';

const HERO_POINTS = [
    {
        title: 'Pipeline claro',
        description: 'Veja cada vaga por etapa, prioridade e proximo passo sem perder contexto.',
    },
    {
        title: 'Follow-up no prazo',
        description: 'Registre interacoes e retome contatos no momento certo.',
    },
    {
        title: 'Produtividade real',
        description: 'Menos planilhas soltas, mais foco nas candidaturas com potencial.',
    },
    {
        title: 'Historico completo',
        description: 'Tenha visibilidade de tudo o que ja enviou e o que ainda falta fazer.',
    },
];

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [typedHeadline, setTypedHeadline] = useState('');

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setTypedHeadline(HERO_HEADLINE);
            return;
        }

        let charIndex = 0;
        const timer = window.setInterval(() => {
            charIndex += 1;
            setTypedHeadline(HERO_HEADLINE.slice(0, charIndex));

            if (charIndex >= HERO_HEADLINE.length) {
                window.clearInterval(timer);
            }
        }, 38);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (!data.session) {
            setError('Could not create session. Please try again.');
            setLoading(false);
            return;
        }

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
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#030712]">
            <AuthAnimatedHero />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_34%,rgba(3,7,18,0.14),rgba(3,7,18,0.76)_47%,rgba(3,7,18,0.96)_100%)]" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-[70vw] bg-[radial-gradient(ellipse_at_22%_42%,rgba(2,6,23,0.16),rgba(2,6,23,0.72)_54%,rgba(2,6,23,0.96)_100%)]" />
            <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[110px]" />
            <div className="pointer-events-none absolute bottom-16 right-12 h-64 w-64 rounded-full bg-blue-500/20 blur-[130px]" />

            <header className="absolute inset-x-0 top-0 z-30 border-b border-cyan-300/20 bg-slate-950/82 backdrop-blur-xl">
                <div className="relative overflow-hidden py-2">
                    <div className="login-marquee-track text-[0.72rem] font-medium tracking-[0.08em] text-cyan-100/90">
                        <div className="login-marquee-group">
                            <span className="whitespace-nowrap">{TOP_STRIP_TEXT}</span>
                        </div>
                        <div aria-hidden className="login-marquee-group">
                            <span className="whitespace-nowrap">{TOP_STRIP_TEXT}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-20 mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-4 pb-8 pt-24 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-12">
                <section className="order-1 space-y-7 rounded-3xl border border-slate-100/10 bg-slate-950/52 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.58)] backdrop-blur-sm sm:p-8 lg:pr-6 lg:p-10">
                    <span className="inline-flex w-fit items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                        Plataforma de gestao de candidaturas
                    </span>

                    <h1
                        className="relative max-w-[15ch] text-4xl leading-[1.05] text-slate-50 [text-shadow:0_8px_26px_rgba(2,6,23,0.9)] sm:text-5xl lg:text-[3.65rem]"
                    >
                        <span aria-hidden className="invisible block">
                            {HERO_HEADLINE}
                        </span>
                        <span aria-live="polite" className="absolute inset-0 block">
                            {typedHeadline || '\u00a0'}
                            <span aria-hidden className="login-typing-cursor ml-1 text-cyan-300">
                                |
                            </span>
                        </span>
                    </h1>

                    <p className="max-w-xl text-base text-slate-200 [text-shadow:0_2px_16px_rgba(2,6,23,0.85)] sm:text-lg">
                        O ApplyHub centraliza vagas, empresas, contatos e suas proximas acoes para voce sair do caos e
                        avancar com consistencia no processo seletivo.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {HERO_POINTS.map(point => (
                            <article
                                key={point.title}
                                className="rounded-2xl border border-cyan-200/25 bg-slate-950/60 p-4 backdrop-blur-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-slate-900/80"
                            >
                                <h3 className="text-sm font-semibold text-cyan-100">{point.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{point.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="order-2 flex justify-center lg:justify-end">
                    <div className="w-full max-w-md rounded-[1.75rem] border border-cyan-100/20 bg-slate-950/72 p-6 shadow-[0_20px_80px_rgba(3,7,18,0.6)] backdrop-blur-2xl sm:p-8">
                        <div className="mb-7 flex items-center gap-3">
                            <Image
                                src="/brand/applyhub-logo.png"
                                alt="ApplyHub logo"
                                width={64}
                                height={64}
                                priority
                                className="h-14 w-14 rounded-xl border border-cyan-200/20 bg-slate-900/75 object-cover p-1.5"
                            />

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                                    Seu painel de carreira
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold text-slate-100">Entrar no ApplyHub</h2>
                            </div>
                        </div>

                        {error ? (
                            <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                                {error}
                            </div>
                        ) : null}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-200">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    placeholder="voce@exemplo.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/65 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/35"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-200">Senha</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/65 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/35"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/45 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Nao tem conta?{' '}
                            <Link href="/signup" className="font-medium text-cyan-300 transition-colors hover:text-cyan-200">
                                Crie agora
                            </Link>
                        </p>
                    </div>
                </section>
            </main>

            <p className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 text-center text-xs tracking-wide text-slate-500/80">
                © 2026 ApplyHub. Todos os direitos reservados.
            </p>

            <style jsx global>{`
                .login-marquee-track {
                    animation: loginMarquee 42s linear infinite;
                    display: flex;
                    min-width: 100%;
                    will-change: transform;
                }

                .login-marquee-group {
                    align-items: center;
                    display: flex;
                    flex: 0 0 100%;
                    justify-content: center;
                    padding: 0 1.5rem;
                }

                .login-typing-cursor {
                    animation: loginCursorBlink 1s steps(2, start) infinite;
                }

                @keyframes loginMarquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }

                @keyframes loginCursorBlink {
                    0%,
                    45% {
                        opacity: 1;
                    }
                    46%,
                    100% {
                        opacity: 0;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .login-marquee-track,
                    .login-typing-cursor {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}
