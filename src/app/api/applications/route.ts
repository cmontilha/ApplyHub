import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    APPLICATION_CATEGORY_OPTIONS,
    APPLICATION_STATUS_OPTIONS,
    WORK_MODE_OPTIONS,
} from '@/lib/constants';
import type { ApplicationCategory, ApplicationStatus, WorkMode } from '@/types/database';

type CreateApplicationPayload = {
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
        .select('*')
        .order('applied_date', { ascending: false })
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

    let body: CreateApplicationPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.applied_date !== 'string' || !isValidDateString(body.applied_date)) {
        return NextResponse.json({ error: 'applied_date is required in YYYY-MM-DD format' }, { status: 400 });
    }

    if (typeof body.company !== 'string' || !body.company.trim()) {
        return NextResponse.json({ error: 'company is required' }, { status: 400 });
    }

    if (typeof body.role_title !== 'string' || !body.role_title.trim()) {
        return NextResponse.json({ error: 'role_title is required' }, { status: 400 });
    }

    const workMode = body.work_mode ?? 'remote';
    const status = body.status ?? 'applied';
    const category = body.category ?? 'no_referral';

    if (!isValidWorkMode(workMode)) {
        return NextResponse.json({ error: 'Invalid work_mode' }, { status: 400 });
    }

    if (!isValidStatus(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (!isValidCategory(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('applications')
        .insert({
            user_id: user.id,
            applied_date: body.applied_date,
            company: body.company.trim(),
            role_title: body.role_title.trim(),
            work_mode: workMode,
            location: toNullableString(body.location),
            job_url: toNullableString(body.job_url),
            status,
            category,
            recruiter_contact_notes: toNullableString(body.recruiter_contact_notes),
            notes: toNullableString(body.notes),
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
