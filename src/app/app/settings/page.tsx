'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Algo deu errado';
}

export default function ConfiguracoesPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loadingUser, setLoadingUser] = useState(true);
    const [currentEmail, setCurrentEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [updatingEmail, setUpdatingEmail] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        async function loadUser() {
            setLoadingUser(true);
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error || !user) {
                router.replace('/login');
                return;
            }

            const email = user.email ?? '';
            setCurrentEmail(email);
            setNewEmail(email);
            setLoadingUser(false);
        }

        void loadUser();
    }, [router, supabase.auth]);

    async function handleUpdateEmail(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setEmailError('');
        setEmailSuccess('');

        if (!newEmail || !newEmail.includes('@')) {
            setEmailError('Digite um email valido.');
            return;
        }

        if (newEmail === currentEmail) {
            setEmailError('Digite um email diferente para atualizar.');
            return;
        }

        setUpdatingEmail(true);

        try {
            const { error } = await supabase.auth.updateUser(
                { email: newEmail },
                {
                    emailRedirectTo: `${window.location.origin}/auth/confirm?next=/app/settings`,
                }
            );

            if (error) {
                setEmailError(error.message);
                return;
            }

            setEmailSuccess('Email de confirmacao enviado. Verifique sua caixa de entrada para concluir a troca.');
        } catch (error) {
            setEmailError(getErrorMessage(error));
        } finally {
            setUpdatingEmail(false);
        }
    }

    async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword) {
            setPasswordError('A senha atual e obrigatoria.');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('A senha precisa ter pelo menos 6 caracteres.');
            return;
        }

        if (!currentEmail) {
            setPasswordError('Nao foi possivel validar o email da sua conta.');
            return;
        }

        if (newPassword === currentPassword) {
            setPasswordError('A nova senha precisa ser diferente da senha atual.');
            return;
        }

        setUpdatingPassword(true);

        try {
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: currentEmail,
                password: currentPassword,
            });

            if (verifyError) {
                setPasswordError('A senha atual esta incorreta.');
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                setPasswordError(error.message);
                return;
            }

            setCurrentPassword('');
            setNewPassword('');
            setPasswordSuccess('Senha atualizada com sucesso.');
        } catch (error) {
            setPasswordError(getErrorMessage(error));
        } finally {
            setUpdatingPassword(false);
        }
    }

    if (loadingUser) {
        return (
            <section className="card flex min-h-[220px] items-center justify-center">
                <span className="inline-flex items-center gap-2 text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando configuracoes...
                </span>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Configuracoes</h2>
                <p className="mt-1 text-sm text-slate-300">Atualize os dados da sua conta com seguranca.</p>
            </header>

            <article className="card p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-100">Alterar email</h3>
                </div>

                <p className="mb-4 text-xs text-slate-400">Email atual: {currentEmail}</p>

                {emailError ? (
                    <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                        {emailError}
                    </p>
                ) : null}

                {emailSuccess ? (
                    <p className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                        {emailSuccess}
                    </p>
                ) : null}

                <form onSubmit={handleUpdateEmail} className="space-y-3">
                    <div>
                        <label className="label" htmlFor="new-email">
                            Novo email
                        </label>
                        <input
                            id="new-email"
                            type="email"
                            className="input"
                            value={newEmail}
                            onChange={event => setNewEmail(event.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={updatingEmail}>
                        {updatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {updatingEmail ? 'Atualizando...' : 'Atualizar email'}
                    </button>
                </form>
            </article>

            <article className="card p-5">
                <div className="mb-4 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-100">Alterar senha</h3>
                </div>

                {passwordError ? (
                    <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                        {passwordError}
                    </p>
                ) : null}

                {passwordSuccess ? (
                    <p className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                        {passwordSuccess}
                    </p>
                ) : null}

                <form onSubmit={handleUpdatePassword} className="space-y-3">
                    <div>
                        <label className="label" htmlFor="current-password">
                            Senha atual
                        </label>
                        <input
                            id="current-password"
                            type="password"
                            className="input"
                            value={currentPassword}
                            onChange={event => setCurrentPassword(event.target.value)}
                            placeholder="Sua senha atual"
                            required
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="new-password">
                            Nova senha
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            placeholder="Minimo 6 caracteres"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={updatingPassword}>
                        {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {updatingPassword ? 'Atualizando...' : 'Atualizar senha'}
                    </button>
                </form>
            </article>
        </section>
    );
}
