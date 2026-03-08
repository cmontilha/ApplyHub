import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeNextPath(next: string | null) {
    if (!next) return '/app/dashboard';

    // Only allow local absolute paths and block protocol-relative or external URLs.
    if (!next.startsWith('/') || next.startsWith('//')) {
        return '/app/dashboard';
    }

    return next;
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = getSafeNextPath(requestUrl.searchParams.get('next'));

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=missing_code', requestUrl.origin));
    }

    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(new URL('/login?error=confirm_failed', requestUrl.origin));
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
}
