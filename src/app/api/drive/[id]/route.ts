import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DriveFile } from '@/types/database';

type DriveFileLookup = Pick<DriveFile, 'id' | 'storage_path'>;

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

    const { data: file, error: fetchError } = await supabase
        .from('drive_files')
        .select('id, storage_path')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
        .from('drive_files')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await supabase.storage.from('drive-files').remove([(file as DriveFileLookup).storage_path]);

    return new NextResponse(null, { status: 204 });
}
