export const FOLLOW_UP_INTERVAL_MONTHS = 5;

export function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function isIsoDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getTodayIsoDate() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

export function addMonthsToIsoDate(isoDate: string, months: number) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const base = new Date(Date.UTC(year, month - 1, day));

    const baseYear = base.getUTCFullYear();
    const baseMonth = base.getUTCMonth();
    const targetMonthIndex = baseMonth + months;

    const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const safeDay = Math.min(day, maxDay);

    const next = new Date(Date.UTC(targetYear, targetMonth, safeDay));
    return next.toISOString().slice(0, 10);
}

export function buildLegacyContact(input: {
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
}) {
    const values = [input.email, input.phone, input.linkedin_url]
        .map(value => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);

    return values.length > 0 ? values.join(' | ') : null;
}
