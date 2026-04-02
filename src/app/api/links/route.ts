import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchLinkPreview,
    getUrlHostnameLabel,
    toNullableString,
    toRequiredHttpUrl,
} from '@/lib/link-preview';

type CreateSavedLinkPayload = {
    url?: unknown;
    title?: unknown;
    notes?: unknown;
};

export async function GET() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('saved_links')
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

    let body: CreateSavedLinkPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const safeUrl = toRequiredHttpUrl(body.url);
    if (!safeUrl) {
        return NextResponse.json({ error: 'url must be a valid http/https URL' }, { status: 400 });
    }

    const customTitle = toNullableString(body.title);
    const notes = toNullableString(body.notes);
    const preview = await fetchLinkPreview(safeUrl);

    const title = customTitle ?? preview.title ?? getUrlHostnameLabel(safeUrl);

    const { data, error } = await supabase
        .from('saved_links')
        .insert({
            user_id: user.id,
            url: safeUrl,
            title,
            notes,
            description: preview.description,
            preview_image_url: preview.preview_image_url,
            site_name: preview.site_name,
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
