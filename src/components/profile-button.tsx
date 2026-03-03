'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Loader2, LogOut, Settings, UserCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ProfileButtonProps = {
    userEmail: string;
};

function getInitials(email: string) {
    const username = email.split('@')[0] || 'AH';
    const parts = username
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return username.slice(0, 2).toUpperCase();
}

export function ProfileButton({ userEmail }: ProfileButtonProps) {
    const pathname = usePathname();
    const router = useRouter();
    const initials = getInitials(userEmail);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    async function handleLogout() {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        const supabase = createClient();
        await supabase.auth.signOut();

        router.replace('/login');
        router.refresh();
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                title="Open profile menu"
                onClick={() => setIsOpen(current => !current)}
                className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold tracking-wide text-white transition-all duration-200 ${
                    isOpen
                        ? 'border-cyan-300/70 bg-cyan-500/30'
                        : 'border-slate-300 bg-slate-900 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-slate-800'
                }`}
            >
                {initials}
            </button>

            {isOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 text-slate-200 shadow-xl backdrop-blur-xl">
                    <p className="truncate px-2 py-1 text-xs text-slate-400">{userEmail}</p>

                    <Link
                        href="/app/profile"
                        className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-slate-800 hover:text-white"
                    >
                        <UserCircle2 className="h-4 w-4" />
                        Profile
                    </Link>

                    <Link
                        href="/app/settings"
                        className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-slate-800 hover:text-white"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors duration-150 hover:bg-red-500/15 hover:text-red-200 disabled:opacity-60"
                    >
                        {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        {isLoggingOut ? 'Signing out...' : 'Logout'}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
