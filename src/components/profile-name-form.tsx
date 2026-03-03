'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ProfileNameFormProps = {
    initialName: string;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Something went wrong';
}

export function ProfileNameForm({ initialName }: ProfileNameFormProps) {
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState(initialName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setSuccess('');

        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            setError('Name must have at least 2 characters.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: trimmedName },
            });

            if (error) {
                setError(error.message);
                return;
            }

            setSuccess('Name updated successfully.');
            router.refresh();
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </p>
            ) : null}

            {success ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {success}
                </p>
            ) : null}

            <div>
                <label className="label" htmlFor="profile-name">
                    Full name
                </label>
                <input
                    id="profile-name"
                    type="text"
                    className="input max-w-md"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Your full name"
                    required
                />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {loading ? 'Saving...' : 'Save Name'}
            </button>
        </form>
    );
}
