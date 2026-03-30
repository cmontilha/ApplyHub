import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LINKEDIN_CONTENT_STATUS_OPTIONS } from '@/lib/constants';
import type { LinkedinContentStatus } from '@/types/database';

type CreateLinkedinContentPayload = {
    scheduled_date?: unknown;
    scheduled_time?: unknown;
    theme?: unknown;
    content_type?: unknown;
    title_hook?: unknown;
    content?: unknown;
    objective?: unknown;
    cta?: unknown;
    status?: unknown;
    performance?: unknown;
};

function toRequiredDate(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

    const [year, month, day] = trimmed.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() + 1 !== month ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return trimmed;
}

function toRequiredTime(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) return null;

    const [, hours, minutes, seconds] = match;
    return `${hours}:${minutes}:${seconds ?? '00'}`;
}

function toNullableText(value: unknown): { valid: boolean; value: string | null } {
    if (value === undefined || value === null) {
        return { valid: true, value: null };
    }

    if (typeof value !== 'string') {
        return { valid: false, value: null };
    }

    const trimmed = value.trim();
    return { valid: true, value: trimmed || null };
}

function isLinkedinContentStatus(value: unknown): value is LinkedinContentStatus {
    return (
        typeof value === 'string' &&
        LINKEDIN_CONTENT_STATUS_OPTIONS.includes(value as LinkedinContentStatus)
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
        .from('linkedin_content_plans')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .order('created_at', { ascending: true });

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

    let body: CreateLinkedinContentPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const scheduledDate = toRequiredDate(body.scheduled_date);
    if (!scheduledDate) {
        return NextResponse.json({ error: 'scheduled_date must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    }

    const scheduledTime = toRequiredTime(body.scheduled_time);
    if (!scheduledTime) {
        return NextResponse.json({ error: 'scheduled_time must be a valid time (HH:MM or HH:MM:SS)' }, { status: 400 });
    }

    if (typeof body.theme !== 'string' || !body.theme.trim()) {
        return NextResponse.json({ error: 'theme is required' }, { status: 400 });
    }

    const contentType = toNullableText(body.content_type);
    if (!contentType.valid) {
        return NextResponse.json({ error: 'content_type must be text' }, { status: 400 });
    }

    const titleHook = toNullableText(body.title_hook);
    if (!titleHook.valid) {
        return NextResponse.json({ error: 'title_hook must be text' }, { status: 400 });
    }

    const content = toNullableText(body.content);
    if (!content.valid) {
        return NextResponse.json({ error: 'content must be text' }, { status: 400 });
    }

    const objective = toNullableText(body.objective);
    if (!objective.valid) {
        return NextResponse.json({ error: 'objective must be text' }, { status: 400 });
    }

    const cta = toNullableText(body.cta);
    if (!cta.valid) {
        return NextResponse.json({ error: 'cta must be text' }, { status: 400 });
    }

    const rawStatus = body.status ?? 'planned';
    if (!isLinkedinContentStatus(rawStatus)) {
        return NextResponse.json(
            {
                error: `status must be one of: ${LINKEDIN_CONTENT_STATUS_OPTIONS.join(', ')}`,
            },
            { status: 400 }
        );
    }

    const performance = toNullableText(body.performance);
    if (!performance.valid) {
        return NextResponse.json({ error: 'performance must be text' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('linkedin_content_plans')
        .insert({
            user_id: user.id,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            theme: body.theme.trim(),
            content_type: contentType.value,
            title_hook: titleHook.value,
            content: content.value,
            objective: objective.value,
            cta: cta.value,
            status: rawStatus,
            performance: performance.value,
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
