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

    return (
        <div className="min-h-screen md:flex md:h-screen md:overflow-hidden">
            <AppSidebar />
            <div className="w-full md:flex md:min-w-0 md:flex-1 md:flex-col">
                <header className="sticky top-0 z-20 flex items-center justify-end border-b border-slate-700/80 bg-gradient-to-r from-[#06132c] via-[#0b1e43] to-[#0b2a64] px-4 py-3 md:shrink-0 md:px-8">
                    <ProfileButton userEmail={user.email ?? 'Signed user'} />
                </header>
                <main className="w-full p-4 md:min-h-0 md:flex-1 md:overflow-auto md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
