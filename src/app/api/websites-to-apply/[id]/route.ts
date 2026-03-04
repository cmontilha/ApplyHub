import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_APPLICATION_TYPE_OPTIONS } from '@/lib/constants';
import type { WebsiteApplicationType } from '@/types/database';

type UpdateWebsiteToApplyPayload = {
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

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: UpdateWebsiteToApplyPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        name?: string;
        website_url?: string;
        type?: WebsiteApplicationType;
    } = {};

    if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
        }
        updates.name = body.name.trim();
    }

    if (body.website_url !== undefined) {
        const websiteUrl = toRequiredHttpUrl(body.website_url);
        if (!websiteUrl) {
            return NextResponse.json(
                { error: 'website_url must be a valid http/https URL' },
                { status: 400 }
            );
        }
        updates.website_url = websiteUrl;
    }

    if (body.type !== undefined) {
        if (!isValidWebsiteType(body.type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        updates.type = body.type;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('websites_to_apply')
        .update(updates as never)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
        .from('websites_to_apply')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
