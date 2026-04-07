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
    return 'Algo deu errado';
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
            setError('O nome precisa ter pelo menos 2 caracteres.');
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

            setSuccess('Nome atualizado com sucesso.');
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
                <p className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                    {error}
                </p>
            ) : null}

            {success ? (
                <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                    {success}
                </p>
            ) : null}

            <div>
                <label className="label" htmlFor="profile-name">
                    Nome completo
                </label>
                <input
                    id="profile-name"
                    type="text"
                    className="input max-w-md"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Seu nome completo"
                    required
                />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {loading ? 'Salvando...' : 'Salvar nome'}
            </button>
        </form>
    );
}
