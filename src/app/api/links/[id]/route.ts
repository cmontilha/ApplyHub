import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchLinkPreview,
    getUrlHostnameLabel,
    toNullableString,
    toRequiredHttpUrl,
} from '@/lib/link-preview';

type UpdateSavedLinkPayload = {
    url?: unknown;
    title?: unknown;
    notes?: unknown;
};

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

    let body: UpdateSavedLinkPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        url?: string;
        title?: string;
        notes?: string | null;
        description?: string | null;
        preview_image_url?: string | null;
        site_name?: string | null;
    } = {};

    if (body.url !== undefined) {
        const safeUrl = toRequiredHttpUrl(body.url);
        if (!safeUrl) {
            return NextResponse.json({ error: 'url must be a valid http/https URL' }, { status: 400 });
        }
        updates.url = safeUrl;
    }

    if (body.title !== undefined) {
        if (typeof body.title !== 'string' || !body.title.trim()) {
            return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
        }
        updates.title = body.title.trim();
    }

    if (body.notes !== undefined) {
        updates.notes = toNullableString(body.notes);
    }

    if (updates.url) {
        const preview = await fetchLinkPreview(updates.url);

        updates.description = preview.description;
        updates.preview_image_url = preview.preview_image_url;
        updates.site_name = preview.site_name;

        if (!updates.title) {
            updates.title = preview.title ?? getUrlHostnameLabel(updates.url);
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('saved_links')
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
        .from('saved_links')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
