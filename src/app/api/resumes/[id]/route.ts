import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Resume } from '@/types/database';

type ResumeLookup = Pick<Resume, 'id' | 'storage_path'>;

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

    const { data: resume, error: fetchError } = await supabase
        .from('resumes')
        .select('id, storage_path')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!resume) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await supabase.storage.from('resumes').remove([(resume as ResumeLookup).storage_path]);

    return new NextResponse(null, { status: 204 });
}
