import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    addMonthsToIsoDate,
    buildLegacyContact,
    FOLLOW_UP_INTERVAL_MONTHS,
    isIsoDate,
    toNullableString,
} from '@/lib/networking';

type UpdateNetworkingPayload = {
    name?: unknown;
    company?: unknown;
    role_title?: unknown;
    email?: unknown;
    phone?: unknown;
    linkedin_url?: unknown;
    notes?: unknown;
    last_contact_at?: unknown;
    birthday_date?: unknown;
};

function toNullableHttpUrl(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: UpdateNetworkingPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
        name?: string;
        company?: string | null;
        role_title?: string | null;
        contact?: string | null;
        email?: string | null;
        phone?: string | null;
        linkedin_url?: string | null;
        notes?: string | null;
        last_contact_at?: string | null;
        next_follow_up_at?: string | null;
        birthday_date?: string | null;
    } = {};

    if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
        }
        updates.name = body.name.trim();
    }

    if (body.company !== undefined) {
        updates.company = toNullableString(body.company);
    }

    if (body.role_title !== undefined) {
        updates.role_title = toNullableString(body.role_title);
    }

    let contactFieldsChanged = false;

    if (body.email !== undefined) {
        updates.email = toNullableString(body.email);
        contactFieldsChanged = true;
    }

    if (body.phone !== undefined) {
        updates.phone = toNullableString(body.phone);
        contactFieldsChanged = true;
    }

    if (body.linkedin_url !== undefined) {
        const linkedinUrl = toNullableHttpUrl(body.linkedin_url);
        if (body.linkedin_url !== null && body.linkedin_url !== '' && !linkedinUrl) {
            return NextResponse.json(
                { error: 'linkedin_url must be a valid http/https URL' },
                { status: 400 }
            );
        }
        updates.linkedin_url = linkedinUrl;
        contactFieldsChanged = true;
    }

    if (body.last_contact_at !== undefined) {
        if (body.last_contact_at === null || body.last_contact_at === '') {
            updates.last_contact_at = null;
            updates.next_follow_up_at = null;
        } else if (typeof body.last_contact_at !== 'string' || !isIsoDate(body.last_contact_at)) {
            return NextResponse.json(
                { error: 'last_contact_at must be a valid date in YYYY-MM-DD format' },
                { status: 400 }
            );
        } else {
            updates.last_contact_at = body.last_contact_at;
            updates.next_follow_up_at = addMonthsToIsoDate(
                body.last_contact_at,
                FOLLOW_UP_INTERVAL_MONTHS
            );
        }
    }

    if (body.notes !== undefined) {
        updates.notes = toNullableString(body.notes);
    }

    if (body.birthday_date !== undefined) {
        if (body.birthday_date === null || body.birthday_date === '') {
            updates.birthday_date = null;
        } else if (typeof body.birthday_date !== 'string' || !isIsoDate(body.birthday_date)) {
            return NextResponse.json(
                { error: 'birthday_date must be a valid date in YYYY-MM-DD format' },
                { status: 400 }
            );
        } else {
            updates.birthday_date = body.birthday_date;
        }
    }

    if (contactFieldsChanged) {
        const { data: existingContact, error: existingError } = await supabase
            .from('networking_contacts')
            .select('email, phone, linkedin_url')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (existingError) {
            if (existingError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
            }
            return NextResponse.json({ error: existingError.message }, { status: 500 });
        }

        const mergedEmail = updates.email !== undefined ? updates.email : existingContact.email;
        const mergedPhone = updates.phone !== undefined ? updates.phone : existingContact.phone;
        const mergedLinkedin =
            updates.linkedin_url !== undefined ? updates.linkedin_url : existingContact.linkedin_url;

        if (!mergedEmail && !mergedPhone && !mergedLinkedin) {
            return NextResponse.json(
                { error: 'At least one contact method is required (email, phone, or linkedin_url)' },
                { status: 400 }
            );
        }

        updates.contact = buildLegacyContact({
            email: mergedEmail,
            phone: mergedPhone,
            linkedin_url: mergedLinkedin,
        });
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'At least one updatable field is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('networking_contacts')
        .update(updates as never)
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

    const { error } = await supabase
        .from('networking_contacts')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
}
