import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    APPLICATION_CATEGORY_OPTIONS,
    APPLICATION_STATUS_OPTIONS,
    WORK_MODE_OPTIONS,
} from '@/lib/constants';
import type { ApplicationCategory, ApplicationStatus, WorkMode } from '@/types/database';

type UpdateApplicationPayload = {
    applied_date?: unknown;
    company?: unknown;
    role_title?: unknown;
    work_mode?: unknown;
    location?: unknown;
    job_url?: unknown;
    status?: unknown;
    category?: unknown;
    recruiter_contact_notes?: unknown;
    notes?: unknown;
};

function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function isValidDateString(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidWorkMode(value: unknown): value is WorkMode {
    return typeof value === 'string' && WORK_MODE_OPTIONS.includes(value as WorkMode);
}

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
        applied_date?: string;
        company?: string;
        role_title?: string;
        work_mode?: WorkMode;
        location?: string | null;
        job_url?: string | null;
        status?: ApplicationStatus;
        category?: ApplicationCategory;
        recruiter_contact_notes?: string | null;
        notes?: string | null;
    } = {};

    if (body.applied_date !== undefined) {
        if (typeof body.applied_date !== 'string' || !isValidDateString(body.applied_date)) {
            return NextResponse.json(
                { error: 'applied_date must be in YYYY-MM-DD format' },
                { status: 400 }
            );
        }
        updates.applied_date = body.applied_date;
    }

    if (body.company !== undefined) {
        if (typeof body.company !== 'string' || !body.company.trim()) {
            return NextResponse.json({ error: 'company cannot be empty' }, { status: 400 });
        }
        updates.company = body.company.trim();
    }

    if (body.role_title !== undefined) {
        if (typeof body.role_title !== 'string' || !body.role_title.trim()) {
            return NextResponse.json({ error: 'role_title cannot be empty' }, { status: 400 });
        }
        updates.role_title = body.role_title.trim();
    }

    if (body.work_mode !== undefined) {
        if (!isValidWorkMode(body.work_mode)) {
            return NextResponse.json({ error: 'Invalid work_mode' }, { status: 400 });
        }
        updates.work_mode = body.work_mode;
    }

    if (body.location !== undefined) {
        updates.location = toNullableString(body.location);
    }

    if (body.job_url !== undefined) {
        updates.job_url = toNullableString(body.job_url);
    }

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

    if (body.recruiter_contact_notes !== undefined) {
        updates.recruiter_contact_notes = toNullableString(body.recruiter_contact_notes);
    }

    if (body.notes !== undefined) {
        updates.notes = toNullableString(body.notes);
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
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }
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
