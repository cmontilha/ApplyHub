import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CreateCompanyPayload = {
    name?: unknown;
    website_url?: unknown;
    industries?: unknown;
    contacts?: unknown;
    notes?: unknown;
};

function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

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

function parseIndustries(value: unknown): { valid: boolean; value: string[] | null } {
    if (value === undefined || value === null) {
        return { valid: true, value: null };
    }

    if (!Array.isArray(value)) {
        return { valid: false, value: null };
    }

    const seen = new Set<string>();
    const sanitized: string[] = [];

    for (const item of value) {
        if (typeof item !== 'string') {
            return { valid: false, value: null };
        }

        const trimmed = item.trim();
        if (!trimmed) continue;

        const dedupeKey = trimmed.toLocaleLowerCase();
        if (seen.has(dedupeKey)) continue;

        seen.add(dedupeKey);
        sanitized.push(trimmed);
    }

    return { valid: true, value: sanitized.length > 0 ? sanitized : null };
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
        .from('companies')
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

    let body: CreateCompanyPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (body.website_url !== undefined && body.website_url !== null && body.website_url !== '') {
        const websiteUrl = toNullableHttpUrl(body.website_url);
        if (!websiteUrl) {
            return NextResponse.json(
                { error: 'website_url must be a valid http/https URL' },
                { status: 400 }
            );
        }
    }

    const parsedIndustries = parseIndustries(body.industries);
    if (!parsedIndustries.valid) {
        return NextResponse.json({ error: 'industries must be an array of strings' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('companies')
        .insert({
            user_id: user.id,
            name: body.name.trim(),
            website_url: toNullableHttpUrl(body.website_url),
            industries: parsedIndustries.value,
            contacts: toNullableString(body.contacts),
            notes: toNullableString(body.notes),
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
