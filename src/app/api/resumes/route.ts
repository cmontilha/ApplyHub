import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Resume } from '@/types/database';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_EXPIRATION_SECONDS = 60 * 60;

type ResumeListItem = Resume & {
    download_url: string | null;
};

function sanitizeFileName(fileName: string) {
    const normalized = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeBase = normalized.length > 0 ? normalized : 'resume.pdf';
    return safeBase.toLowerCase().endsWith('.pdf') ? safeBase : `${safeBase}.pdf`;
}

function isPdfFile(file: File) {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    return mimeType === 'application/pdf' || fileName.endsWith('.pdf');
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
        .from('resumes')
        .select('id, user_id, file_name, storage_path, file_size_bytes, mime_type, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resumes: Resume[] = data ?? [];
    const storagePaths = resumes.map(item => item.storage_path);
    const signedUrlByPath = new Map<string, string | null>();

    if (storagePaths.length > 0) {
        const { data: signedUrls, error: signedUrlsError } = await supabase
            .storage
            .from('resumes')
            .createSignedUrls(storagePaths, SIGNED_URL_EXPIRATION_SECONDS);

        if (!signedUrlsError && signedUrls) {
            for (const item of signedUrls) {
                signedUrlByPath.set(item.path, item.signedUrl ?? null);
            }
        }
    }

    const payload: ResumeListItem[] = resumes.map(item => ({
        ...item,
        download_url: signedUrlByPath.get(item.storage_path) ?? null,
    }));

    return NextResponse.json(payload);
}

export async function POST(request: Request) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (!isPdfFile(file)) {
        return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    if (file.size <= 0) {
        return NextResponse.json({ error: 'File cannot be empty' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
        return NextResponse.json(
            { error: `File exceeds ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB limit` },
            { status: 400 }
        );
    }

    const sanitizedFileName = sanitizeFileName(file.name);
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase
        .storage
        .from('resumes')
        .upload(storagePath, await file.arrayBuffer(), {
            contentType: 'application/pdf',
            upsert: false,
        });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: created, error: insertError } = await supabase
        .from('resumes')
        .insert({
            user_id: user.id,
            file_name: sanitizedFileName,
            storage_path: storagePath,
            file_size_bytes: file.size,
            mime_type: 'application/pdf',
        })
        .select('id, user_id, file_name, storage_path, file_size_bytes, mime_type, created_at')
        .single();

    if (insertError) {
        await supabase.storage.from('resumes').remove([storagePath]);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: signedUrlData } = await supabase
        .storage
        .from('resumes')
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRATION_SECONDS);

    return NextResponse.json(
        {
            ...(created as Resume),
            download_url: signedUrlData?.signedUrl ?? null,
        } satisfies ResumeListItem,
        { status: 201 }
    );
}
