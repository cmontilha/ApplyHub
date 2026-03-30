import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LINKEDIN_CONTENT_STATUS_OPTIONS } from '@/lib/constants';
import type { LinkedinContentStatus } from '@/types/database';

type UpdateLinkedinContentPayload = {
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
    if (value === null) {
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

    let body: UpdateLinkedinContentPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        scheduled_date?: string;
        scheduled_time?: string;
        theme?: string;
        content_type?: string | null;
        title_hook?: string | null;
        content?: string | null;
        objective?: string | null;
        cta?: string | null;
        status?: LinkedinContentStatus;
        performance?: string | null;
    } = {};

    if (body.scheduled_date !== undefined) {
        const scheduledDate = toRequiredDate(body.scheduled_date);
        if (!scheduledDate) {
            return NextResponse.json(
                { error: 'scheduled_date must be a valid date (YYYY-MM-DD)' },
                { status: 400 }
            );
        }
        updates.scheduled_date = scheduledDate;
    }

    if (body.scheduled_time !== undefined) {
        const scheduledTime = toRequiredTime(body.scheduled_time);
        if (!scheduledTime) {
            return NextResponse.json(
                { error: 'scheduled_time must be a valid time (HH:MM or HH:MM:SS)' },
                { status: 400 }
            );
        }
        updates.scheduled_time = scheduledTime;
    }

    if (body.theme !== undefined) {
        if (typeof body.theme !== 'string' || !body.theme.trim()) {
            return NextResponse.json({ error: 'theme cannot be empty' }, { status: 400 });
        }
        updates.theme = body.theme.trim();
    }

    if (body.content_type !== undefined) {
        const contentType = toNullableText(body.content_type);
        if (!contentType.valid) {
            return NextResponse.json({ error: 'content_type must be text or null' }, { status: 400 });
        }
        updates.content_type = contentType.value;
    }

    if (body.title_hook !== undefined) {
        const titleHook = toNullableText(body.title_hook);
        if (!titleHook.valid) {
            return NextResponse.json({ error: 'title_hook must be text or null' }, { status: 400 });
        }
        updates.title_hook = titleHook.value;
    }

    if (body.content !== undefined) {
        const content = toNullableText(body.content);
        if (!content.valid) {
            return NextResponse.json({ error: 'content must be text or null' }, { status: 400 });
        }
        updates.content = content.value;
    }

    if (body.objective !== undefined) {
        const objective = toNullableText(body.objective);
        if (!objective.valid) {
            return NextResponse.json({ error: 'objective must be text or null' }, { status: 400 });
        }
        updates.objective = objective.value;
    }

    if (body.cta !== undefined) {
        const cta = toNullableText(body.cta);
        if (!cta.valid) {
            return NextResponse.json({ error: 'cta must be text or null' }, { status: 400 });
        }
        updates.cta = cta.value;
    }

    if (body.status !== undefined) {
        if (!isLinkedinContentStatus(body.status)) {
            return NextResponse.json(
                {
                    error: `status must be one of: ${LINKEDIN_CONTENT_STATUS_OPTIONS.join(', ')}`,
                },
                { status: 400 }
            );
        }
        updates.status = body.status;
    }

    if (body.performance !== undefined) {
        const performance = toNullableText(body.performance);
        if (!performance.valid) {
            return NextResponse.json({ error: 'performance must be text or null' }, { status: 400 });
        }
        updates.performance = performance.value;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('linkedin_content_plans')
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
        .from('linkedin_content_plans')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
