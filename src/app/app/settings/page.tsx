'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Something went wrong';
}

export default function SettingsPage() {
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
            setEmailError('Please enter a valid email.');
            return;
        }

        if (newEmail === currentEmail) {
            setEmailError('Enter a different email to update.');
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

            setEmailSuccess('Confirmation email sent. Check inbox to complete email change.');
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
            setPasswordError('Current password is required.');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }

        if (!currentEmail) {
            setPasswordError('Could not verify your account email.');
            return;
        }

        if (newPassword === currentPassword) {
            setPasswordError('New password must be different from current password.');
            return;
        }

        setUpdatingPassword(true);

        try {
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: currentEmail,
                password: currentPassword,
            });

            if (verifyError) {
                setPasswordError('Current password is incorrect.');
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                setPasswordError(error.message);
                return;
            }

            setCurrentPassword('');
            setNewPassword('');
            setPasswordSuccess('Password updated successfully.');
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
                    Loading settings...
                </span>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
                <p className="mt-1 text-sm text-slate-300">Update your account credentials securely.</p>
            </header>

            <article className="card p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-100">Change Email</h3>
                </div>

                <p className="mb-4 text-xs text-slate-400">Current email: {currentEmail}</p>

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
                            New Email
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
                        {updatingEmail ? 'Updating...' : 'Update Email'}
                    </button>
                </form>
            </article>

            <article className="card p-5">
                <div className="mb-4 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-100">Change Password</h3>
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
                            Current Password
                        </label>
                        <input
                            id="current-password"
                            type="password"
                            className="input"
                            value={currentPassword}
                            onChange={event => setCurrentPassword(event.target.value)}
                            placeholder="Your current password"
                            required
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="new-password">
                            New Password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            placeholder="Minimum 6 characters"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={updatingPassword}>
                        {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {updatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </article>
        </section>
    );
}
