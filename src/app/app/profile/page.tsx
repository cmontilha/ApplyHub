import { redirect } from 'next/navigation';
import { Briefcase, Building2, GraduationCap, Mail, ShieldCheck } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { ProfileNameForm } from '@/components/profile-name-form';
import { createClient } from '@/lib/supabase/server';

function formatName(email: string) {
    const local = email.split('@')[0] ?? '';
    return local
        .replace(/[._-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default async function ProfilePage() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const [applicationsCountRes, companiesCountRes, certificationsCountRes] = await Promise.all([
        supabase.from('applications').select('id', { count: 'exact', head: true }),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('certifications').select('id', { count: 'exact', head: true }),
    ]);

    const applicationsCount = applicationsCountRes.count ?? 0;
    const companiesCount = companiesCountRes.count ?? 0;
    const certificationsCount = certificationsCountRes.count ?? 0;
    const metadataName =
        typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name.trim()
            : '';
    const displayName = metadataName || formatName(user.email ?? 'ApplyHub User');

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Account and activity overview inside ApplyHub.
                </p>
            </header>

            <article className="card p-6">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/40 bg-gradient-to-br from-blue-600 to-cyan-600 text-lg font-bold text-white">
                        {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-slate-900">{displayName}</h3>
                        <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="h-4 w-4 text-slate-500" />
                            {user.email}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            Authenticated via Supabase Auth
                        </p>
                    </div>
                </div>

                <ProfileNameForm initialName={displayName} />
            </article>

            <div className="grid gap-4 md:grid-cols-3">
                <article className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Applications</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-3xl font-bold text-slate-900">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                        {applicationsCount}
                    </p>
                </article>

                <article className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Companies</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-3xl font-bold text-slate-900">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        {companiesCount}
                    </p>
                </article>

                <article className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Certifications</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-3xl font-bold text-slate-900">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                        {certificationsCount}
                    </p>
                </article>
            </div>

            <article className="card p-4">
                <h3 className="text-sm font-semibold text-slate-800">Session</h3>
                <p className="mt-1 text-sm text-slate-600">End your session securely from your profile.</p>
                <div className="mt-4 max-w-xs">
                    <LogoutButton />
                </div>
            </article>
        </section>
    );
}
