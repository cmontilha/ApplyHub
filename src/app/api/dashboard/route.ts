import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayIsoDate } from '@/lib/networking';

type DashboardSeriesItem = {
    month: string;
    count: number;
};

type DashboardYearSeriesItem = {
    year: string;
    count: number;
};

type DashboardFollowUpItem = {
    id: string;
    name: string;
    company: string | null;
    role_title: string | null;
    last_contact_at: string | null;
    next_follow_up_at: string;
    days_until_follow_up: number;
    is_overdue: boolean;
};

type DashboardApplicationItem = {
    id: string;
    applied_date: string;
    company: string;
    role_title: string;
    work_mode: string;
    location: string | null;
    job_url: string | null;
    status: string;
    category: string;
    recruiter_contact_notes: string | null;
    notes: string | null;
    created_at: string;
};

type DashboardWebsiteItem = {
    id: string;
    name: string;
    website_url: string;
    type: 'both' | 'nacional' | 'internacional';
    created_at: string;
};

type DashboardCompanyItem = {
    id: string;
    name: string;
    website_url: string | null;
    contacts: string | null;
    notes: string | null;
    created_at: string;
};

type DashboardPitchItem = {
    id: string;
    name: string;
    pitch: string;
    created_at: string;
};

function monthKeyToLabel(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date);
}

function dateDiffInDays(fromIsoDate: string, toIsoDate: string) {
    const [fromYear, fromMonth, fromDay] = fromIsoDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toIsoDate.split('-').map(Number);

    const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
    const toUtc = Date.UTC(toYear, toMonth - 1, toDay);
    return Math.round((toUtc - fromUtc) / 86400000);
}

export async function GET() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('applications')
        .select(
            'id, applied_date, company, role_title, work_mode, location, job_url, status, category, recruiter_contact_notes, notes, created_at'
        )
        .order('applied_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const applications: DashboardApplicationItem[] = data ?? [];

    const totals = {
        total_applications: applications.length,
        total_interviews: applications.filter(item => item.status === 'interview').length,
        total_rejected: applications.filter(item => item.status === 'rejected').length,
        total_offers: applications.filter(item => item.status === 'offer').length,
        referral_count: applications.filter(item => item.category === 'referral').length,
        no_referral_count: applications.filter(item => item.category === 'no_referral').length,
    };

    const groupedByMonth = new Map<string, number>();
    const groupedByYear = new Map<string, number>();

    for (const item of applications) {
        const [year, month] = item.applied_date.split('-');
        const monthKey = `${year}-${month}`;
        groupedByMonth.set(monthKey, (groupedByMonth.get(monthKey) ?? 0) + 1);
        groupedByYear.set(year, (groupedByYear.get(year) ?? 0) + 1);
    }

    const applications_per_month: DashboardSeriesItem[] = Array.from(groupedByMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({
            month: monthKeyToLabel(month),
            count,
        }));

    const applications_per_year: DashboardYearSeriesItem[] = Array.from(groupedByYear.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, count]) => ({
            year,
            count,
        }));

    const { data: followUpsData, error: followUpsError } = await supabase
        .from('networking_contacts')
        .select('id, name, company, role_title, last_contact_at, next_follow_up_at')
        .not('next_follow_up_at', 'is', null)
        .order('next_follow_up_at', { ascending: true });

    if (followUpsError) {
        return NextResponse.json({ error: followUpsError.message }, { status: 500 });
    }

    const todayIsoDate = getTodayIsoDate();
    const networking_followups: DashboardFollowUpItem[] = (followUpsData ?? [])
        .filter(item => typeof item.next_follow_up_at === 'string')
        .map(item => {
            const daysUntilFollowUp = dateDiffInDays(todayIsoDate, item.next_follow_up_at as string);
            return {
                id: item.id,
                name: item.name,
                company: item.company,
                role_title: item.role_title,
                last_contact_at: item.last_contact_at,
                next_follow_up_at: item.next_follow_up_at as string,
                days_until_follow_up: daysUntilFollowUp,
                is_overdue: daysUntilFollowUp < 0,
            };
        });

    const { data: websitesData, error: websitesError } = await supabase
        .from('websites_to_apply')
        .select('id, name, website_url, type, created_at')
        .order('created_at', { ascending: false });

    if (websitesError) {
        return NextResponse.json({ error: websitesError.message }, { status: 500 });
    }

    const websites_to_apply: DashboardWebsiteItem[] = websitesData ?? [];

    const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, website_url, contacts, notes, created_at')
        .order('created_at', { ascending: false });

    if (companiesError) {
        return NextResponse.json({ error: companiesError.message }, { status: 500 });
    }

    const companies: DashboardCompanyItem[] = companiesData ?? [];

    const { data: pitchesData, error: pitchesError } = await supabase
        .from('pitches')
        .select('id, name, pitch, created_at')
        .order('created_at', { ascending: false });

    if (pitchesError) {
        return NextResponse.json({ error: pitchesError.message }, { status: 500 });
    }

    const pitches: DashboardPitchItem[] = pitchesData ?? [];

    return NextResponse.json({
        ...totals,
        applications_per_month,
        applications_per_year,
        applications_list: applications,
        websites_to_apply,
        companies,
        pitches,
        due_follow_ups: networking_followups.filter(item => item.days_until_follow_up <= 0).length,
        networking_followups,
    });
}
