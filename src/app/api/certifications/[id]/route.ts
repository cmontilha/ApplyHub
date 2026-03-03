import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CERT_DIFFICULTY_OPTIONS } from '@/lib/constants';
import type { CertDifficulty } from '@/types/database';

type UpdateCertificationPayload = {
    name?: unknown;
    area?: unknown;
    difficulty?: unknown;
    market_recognition?: unknown;
    price?: unknown;
    notes?: unknown;
};

function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function isValidDifficulty(value: unknown): value is CertDifficulty {
    return typeof value === 'string' && CERT_DIFFICULTY_OPTIONS.includes(value as CertDifficulty);
}

function parsePrice(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
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

    let body: UpdateCertificationPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        name?: string;
        area?: string | null;
        difficulty?: CertDifficulty | null;
        market_recognition?: string | null;
        price?: number | null;
        notes?: string | null;
    } = {};

    if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
        }
        updates.name = body.name.trim();
    }

    if (body.area !== undefined) {
        updates.area = toNullableString(body.area);
    }

    if (body.difficulty !== undefined) {
        if (body.difficulty === null || body.difficulty === '') {
            updates.difficulty = null;
        } else if (!isValidDifficulty(body.difficulty)) {
            return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
        } else {
            updates.difficulty = body.difficulty;
        }
    }

    if (body.market_recognition !== undefined) {
        updates.market_recognition = toNullableString(body.market_recognition);
    }

    if (body.price !== undefined) {
        const parsedPrice = parsePrice(body.price);
        if (body.price !== null && body.price !== '' && parsedPrice === null) {
            return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
        }
        updates.price = parsedPrice;
    }

    if (body.notes !== undefined) {
        updates.notes = toNullableString(body.notes);
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('certifications')
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
        .from('certifications')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
