import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type UpdateCompanyPayload = {
    name?: unknown;
    website_url?: unknown;
    contacts?: unknown;
    notes?: unknown;
};

function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

    let body: UpdateCompanyPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        name?: string;
        website_url?: string | null;
        contacts?: string | null;
        notes?: string | null;
    } = {};

    if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
        }
        updates.name = body.name.trim();
    }

    if (body.website_url !== undefined) {
        updates.website_url = toNullableString(body.website_url);
    }

    if (body.contacts !== undefined) {
        updates.contacts = toNullableString(body.contacts);
    }

    if (body.notes !== undefined) {
        updates.notes = toNullableString(body.notes);
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('companies')
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
        .from('companies')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
