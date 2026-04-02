import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DriveFile } from '@/types/database';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_EXPIRATION_SECONDS = 60 * 60;

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
]);

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
};

type DriveFileListItem = DriveFile & {
    download_url: string | null;
};

function sanitizeFileName(fileName: string) {
    const normalized = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
    return normalized.length > 0 ? normalized : 'file';
}

function getFileExtension(fileName: string) {
    const normalized = fileName.trim().toLowerCase();
    const parts = normalized.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1];
}

function resolveAllowedMimeType(file: File) {
    const mimeType = file.type.toLowerCase();
    if (ALLOWED_MIME_TYPES.has(mimeType)) return mimeType;

    const extension = getFileExtension(file.name);
    return EXTENSION_TO_MIME_TYPE[extension] ?? null;
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
        .from('drive_files')
        .select('id, user_id, file_name, storage_path, file_size_bytes, mime_type, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const files: DriveFile[] = data ?? [];
    const storagePaths = files.map(item => item.storage_path);
    const signedUrlByPath = new Map<string, string | null>();

    if (storagePaths.length > 0) {
        const { data: signedUrls, error: signedUrlsError } = await supabase
            .storage
            .from('drive-files')
            .createSignedUrls(storagePaths, SIGNED_URL_EXPIRATION_SECONDS);

        if (!signedUrlsError && signedUrls) {
            for (const item of signedUrls) {
                if (!item.path) continue;
                signedUrlByPath.set(item.path, item.signedUrl ?? null);
            }
        }
    }

    const payload: DriveFileListItem[] = files.map(item => ({
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
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size <= 0) {
        return NextResponse.json({ error: 'File cannot be empty' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
            { error: `File exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit` },
            { status: 400 }
        );
    }

    const allowedMimeType = resolveAllowedMimeType(file);
    if (!allowedMimeType) {
        return NextResponse.json(
            { error: 'Only PDF and image files (PNG/JPG/WEBP/GIF) are allowed' },
            { status: 400 }
        );
    }

    const sanitizedFileName = sanitizeFileName(file.name);
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase
        .storage
        .from('drive-files')
        .upload(storagePath, await file.arrayBuffer(), {
            contentType: allowedMimeType,
            upsert: false,
        });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: created, error: insertError } = await supabase
        .from('drive_files')
        .insert({
            user_id: user.id,
            file_name: sanitizedFileName,
            storage_path: storagePath,
            file_size_bytes: file.size,
            mime_type: allowedMimeType,
        })
        .select('id, user_id, file_name, storage_path, file_size_bytes, mime_type, created_at')
        .single();

    if (insertError) {
        await supabase.storage.from('drive-files').remove([storagePath]);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: signedUrlData } = await supabase
        .storage
        .from('drive-files')
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRATION_SECONDS);

    return NextResponse.json(
        {
            ...(created as DriveFile),
            download_url: signedUrlData?.signedUrl ?? null,
        } satisfies DriveFileListItem,
        { status: 201 }
    );
}
