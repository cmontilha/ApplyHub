import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SetSessionPayload = {
    access_token?: unknown;
    refresh_token?: unknown;
};

export async function POST(request: Request) {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
        return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
    }

    const origin = request.headers.get('origin');
    if (origin) {
        const requestOrigin = new URL(request.url).origin;
        if (origin !== requestOrigin) {
            return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
        }
    }

    let body: SetSessionPayload;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string') {
        return NextResponse.json(
            { error: 'access_token and refresh_token are required' },
            { status: 400 }
        );
    }

    const supabase = createClient();
    const { error } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
