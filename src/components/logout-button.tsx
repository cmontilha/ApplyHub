'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type LogoutButtonProps = {
    className?: string;
    compact?: boolean;
};

export function LogoutButton({ className = '', compact = false }: LogoutButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogout() {
        if (loading) return;
        setLoading(true);

        const supabase = createClient();
        await supabase.auth.signOut();

        router.push('/login');
        router.refresh();
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            className={`btn-secondary w-full justify-center ${className}`}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {!compact ? (loading ? 'Saindo...' : 'Sair') : null}
        </button>
    );
}
