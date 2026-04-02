import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    addMonthsToIsoDate,
    buildLegacyContact,
    FOLLOW_UP_INTERVAL_MONTHS,
    getTodayIsoDate,
    isIsoDate,
    toNullableString,
} from '@/lib/networking';

type CreateNetworkingPayload = {
    name?: unknown;
    company?: unknown;
    role_title?: unknown;
    email?: unknown;
    phone?: unknown;
    linkedin_url?: unknown;
    notes?: unknown;
    last_contact_at?: unknown;
    birthday_date?: unknown;
};

function toNullableHttpUrl(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
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
        .from('networking_contacts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: CreateNetworkingPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const email = toNullableString(body.email);
    const phone = toNullableString(body.phone);
    const linkedin_url = toNullableHttpUrl(body.linkedin_url);

    if (body.linkedin_url !== undefined && body.linkedin_url !== null && body.linkedin_url !== '') {
        if (!linkedin_url) {
            return NextResponse.json(
                { error: 'linkedin_url must be a valid http/https URL' },
                { status: 400 }
            );
        }
    }

    if (!email && !phone && !linkedin_url) {
        return NextResponse.json(
            { error: 'At least one contact method is required (email, phone, or linkedin_url)' },
            { status: 400 }
        );
    }

    let lastContactAt = getTodayIsoDate();
    if (body.last_contact_at !== undefined && body.last_contact_at !== null && body.last_contact_at !== '') {
        if (typeof body.last_contact_at !== 'string' || !isIsoDate(body.last_contact_at)) {
            return NextResponse.json(
                { error: 'last_contact_at must be a valid date in YYYY-MM-DD format' },
                { status: 400 }
            );
        }
        lastContactAt = body.last_contact_at;
    }

    let birthdayDate: string | null = null;
    if (body.birthday_date !== undefined && body.birthday_date !== null && body.birthday_date !== '') {
        if (typeof body.birthday_date !== 'string' || !isIsoDate(body.birthday_date)) {
            return NextResponse.json(
                { error: 'birthday_date must be a valid date in YYYY-MM-DD format' },
                { status: 400 }
            );
        }
        birthdayDate = body.birthday_date;
    }

    const nextFollowUpAt = addMonthsToIsoDate(lastContactAt, FOLLOW_UP_INTERVAL_MONTHS);

    const { data, error } = await supabase
        .from('networking_contacts')
        .insert({
            user_id: user.id,
            name: body.name.trim(),
            company: toNullableString(body.company),
            role_title: toNullableString(body.role_title),
            email,
            phone,
            linkedin_url,
            contact: buildLegacyContact({ email, phone, linkedin_url }),
            notes: toNullableString(body.notes),
            last_contact_at: lastContactAt,
            next_follow_up_at: nextFollowUpAt,
            birthday_date: birthdayDate,
            follow_up_interval_months: FOLLOW_UP_INTERVAL_MONTHS,
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
