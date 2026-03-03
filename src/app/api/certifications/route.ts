import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CERT_DIFFICULTY_OPTIONS } from '@/lib/constants';
import type { CertDifficulty } from '@/types/database';

type CreateCertificationPayload = {
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

export async function GET() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('certifications')
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

    let body: CreateCertificationPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (body.difficulty !== undefined && body.difficulty !== null && body.difficulty !== '') {
        if (!isValidDifficulty(body.difficulty)) {
            return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
        }
    }

    if (body.price !== undefined && body.price !== null && body.price !== '' && parsePrice(body.price) === null) {
        return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('certifications')
        .insert({
            user_id: user.id,
            name: body.name.trim(),
            area: toNullableString(body.area),
            difficulty: body.difficulty ? (body.difficulty as CertDifficulty) : null,
            market_recognition: toNullableString(body.market_recognition),
            price: parsePrice(body.price),
            notes: toNullableString(body.notes),
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
