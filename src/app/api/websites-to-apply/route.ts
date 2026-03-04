import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_APPLICATION_TYPE_OPTIONS } from '@/lib/constants';
import type { WebsiteApplicationType } from '@/types/database';

type CreateWebsiteToApplyPayload = {
    name?: unknown;
    website_url?: unknown;
    type?: unknown;
};

function toRequiredHttpUrl(value: unknown) {
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

function isValidWebsiteType(value: unknown): value is WebsiteApplicationType {
    return (
        typeof value === 'string' &&
        WEBSITE_APPLICATION_TYPE_OPTIONS.includes(value as WebsiteApplicationType)
    );
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
        .from('websites_to_apply')
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

    let body: CreateWebsiteToApplyPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const websiteUrl = toRequiredHttpUrl(body.website_url);
    if (!websiteUrl) {
        return NextResponse.json({ error: 'website_url must be a valid http/https URL' }, { status: 400 });
    }

    const websiteType = body.type ?? 'both';
    if (!isValidWebsiteType(websiteType)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('websites_to_apply')
        .insert({
            user_id: user.id,
            name: body.name.trim(),
            website_url: websiteUrl,
            type: websiteType,
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
