import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { ProfileButton } from '@/components/profile-button';
import { createClient } from '@/lib/supabase/server';

type AppLayoutProps = {
    children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const metadataName =
        typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name.trim()
            : '';
    const fallbackName = (user.email ?? 'Usuario').split('@')[0]?.replace(/[._-]/g, ' ') ?? 'Usuario';
    const firstName = (metadataName || fallbackName).split(/\s+/).filter(Boolean)[0] ?? 'Usuario';
    const normalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    return (
        <div className="min-h-screen md:flex md:h-screen md:overflow-hidden">
            <AppSidebar />
            <div className="w-full md:flex md:min-w-0 md:flex-1 md:flex-col">
                <header className="sticky top-0 z-20 flex items-center justify-end border-b border-cyan-400/20 bg-gradient-to-r from-[#031029] via-[#0a1d3f] to-[#0b2b5e] px-4 py-3 md:shrink-0 md:px-8">
                    <ProfileButton
                        userEmail={user.email ?? 'Usuario conectado'}
                        userFirstName={normalizedFirstName}
                    />
                </header>
                <main className="app-main w-full p-4 md:min-h-0 md:flex-1 md:overflow-auto md:p-8">
                    <div className="mx-auto w-full max-w-[1500px]">{children}</div>
                </main>
            </div>
        </div>
    );
}
