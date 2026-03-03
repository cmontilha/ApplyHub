import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    supabaseResponse = NextResponse.next({ request });
                    supabaseResponse.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options, maxAge: 0 });
                    supabaseResponse = NextResponse.next({ request });
                    supabaseResponse.cookies.set({ name, value: '', ...options, maxAge: 0 });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const code = request.nextUrl.searchParams.get('code');

    // Support old confirmation links sent to /login?code=...
    if (pathname === '/login' && code) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/confirm';
        if (!url.searchParams.get('next')) {
            url.searchParams.set('next', '/app/applications');
        }
        return NextResponse.redirect(url);
    }

    // Redirect unauthenticated users trying to access protected routes
    if (!user && pathname.startsWith('/app')) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (user && (pathname === '/login' || pathname === '/signup')) {
        const url = request.nextUrl.clone();
        url.pathname = '/app/applications';
        return NextResponse.redirect(url);
    }

    // Redirect root to applications if logged in, else to login
    if (pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = user ? '/app/applications' : '/login';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
