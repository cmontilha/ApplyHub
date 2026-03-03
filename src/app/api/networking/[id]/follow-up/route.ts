import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addMonthsToIsoDate, FOLLOW_UP_INTERVAL_MONTHS, getTodayIsoDate } from '@/lib/networking';

export async function POST(
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

    const { data: existing, error: existingError } = await supabase
        .from('networking_contacts')
        .select('id, follow_up_interval_months')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (existingError) {
        if (existingError.code === 'PGRST116') {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const lastContactAt = getTodayIsoDate();
    const intervalMonths = existing.follow_up_interval_months ?? FOLLOW_UP_INTERVAL_MONTHS;
    const nextFollowUpAt = addMonthsToIsoDate(lastContactAt, intervalMonths);

    const { data, error } = await supabase
        .from('networking_contacts')
        .update({
            last_contact_at: lastContactAt,
            next_follow_up_at: nextFollowUpAt,
        } as never)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select('*')
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
