import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APPLICATION_CATEGORY_OPTIONS, APPLICATION_STATUS_OPTIONS } from '@/lib/constants';
import type { ApplicationCategory, ApplicationStatus } from '@/types/database';

type UpdateApplicationPayload = {
    status?: unknown;
    category?: unknown;
};

function isValidStatus(value: unknown): value is ApplicationStatus {
    return typeof value === 'string' && APPLICATION_STATUS_OPTIONS.includes(value as ApplicationStatus);
}

function isValidCategory(value: unknown): value is ApplicationCategory {
    return typeof value === 'string' && APPLICATION_CATEGORY_OPTIONS.includes(value as ApplicationCategory);
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

    let body: UpdateApplicationPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        status?: ApplicationStatus;
        category?: ApplicationCategory;
    } = {};

    if (body.status !== undefined) {
        if (!isValidStatus(body.status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        updates.status = body.status;
    }

    if (body.category !== undefined) {
        if (!isValidCategory(body.category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        updates.category = body.category;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('applications')
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
        .from('applications')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
