import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CreatePitchPayload = {
    name?: unknown;
    pitch?: unknown;
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
        .from('pitches')
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

    let body: CreatePitchPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (typeof body.pitch !== 'string' || !body.pitch.trim()) {
        return NextResponse.json({ error: 'pitch is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('pitches')
        .insert({
            user_id: user.id,
            name: body.name.trim(),
            pitch: body.pitch.trim(),
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
