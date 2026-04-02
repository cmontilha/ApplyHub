'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import type { Company } from '@/types/database';

const POPULAR_INDUSTRIES = [
    'Tech',
    'Banking',
    'Oil & Gas',
    'Semiconductors',
    'Retail',
    'Telecom',
    'Healthcare',
    'Insurance',
    'Consumer Goods',
    'Automotive',
    'Energy',
    'Chemicals',
    'Aerospace',
    'Materials',
    'Logistics',
] as const;

type CompanyFormValues = {
    name: string;
    website_url: string;
    industries: string[];
    contacts: string;
    notes: string;
};

type IndustryMultiSelectProps = {
    id: string;
    values: string[];
    onChange: (nextValues: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
};

type IndustryTone = {
    tag: string;
    button: string;
    buttonActive: string;
};

const INDUSTRY_TONES: IndustryTone[] = [
    {
        tag: 'border-sky-300/35 bg-sky-500/15 text-sky-100',
        button: 'border-sky-400/45 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20',
        buttonActive: 'border-sky-200/80 bg-sky-400/35 text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.4)_inset]',
    },
    {
        tag: 'border-emerald-300/35 bg-emerald-500/15 text-emerald-100',
        button: 'border-emerald-400/45 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20',
        buttonActive:
            'border-emerald-200/80 bg-emerald-400/35 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.4)_inset]',
    },
    {
        tag: 'border-amber-300/35 bg-amber-500/15 text-amber-100',
        button: 'border-amber-400/45 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
        buttonActive: 'border-amber-200/80 bg-amber-400/35 text-amber-50 shadow-[0_0_0_1px_rgba(252,211,77,0.4)_inset]',
    },
    {
        tag: 'border-fuchsia-300/35 bg-fuchsia-500/15 text-fuchsia-100',
        button: 'border-fuchsia-400/45 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20',
        buttonActive:
            'border-fuchsia-200/80 bg-fuchsia-400/35 text-fuchsia-50 shadow-[0_0_0_1px_rgba(244,114,182,0.4)_inset]',
    },
    {
        tag: 'border-indigo-300/35 bg-indigo-500/15 text-indigo-100',
        button: 'border-indigo-400/45 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20',
        buttonActive:
            'border-indigo-200/80 bg-indigo-400/35 text-indigo-50 shadow-[0_0_0_1px_rgba(129,140,248,0.4)_inset]',
    },
    {
        tag: 'border-rose-300/35 bg-rose-500/15 text-rose-100',
        button: 'border-rose-400/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20',
        buttonActive: 'border-rose-200/80 bg-rose-400/35 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.4)_inset]',
    },
    {
        tag: 'border-teal-300/35 bg-teal-500/15 text-teal-100',
        button: 'border-teal-400/45 bg-teal-500/10 text-teal-100 hover:bg-teal-500/20',
        buttonActive: 'border-teal-200/80 bg-teal-400/35 text-teal-50 shadow-[0_0_0_1px_rgba(45,212,191,0.4)_inset]',
    },
    {
        tag: 'border-orange-300/35 bg-orange-500/15 text-orange-100',
        button: 'border-orange-400/45 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20',
        buttonActive:
            'border-orange-200/80 bg-orange-400/35 text-orange-50 shadow-[0_0_0_1px_rgba(251,146,60,0.4)_inset]',
    },
];

const INDUSTRY_TONE_BY_KEY: Record<string, number> = {
    tech: 0,
    banking: 1,
    'oil & gas': 2,
    semiconductors: 3,
    retail: 4,
    telecom: 5,
    healthcare: 6,
    insurance: 7,
    'consumer goods': 0,
    automotive: 1,
    energy: 2,
    chemicals: 3,
    aerospace: 4,
    materials: 5,
    logistics: 6,
};

function normalizeIndustry(value: string) {
    return value.trim().toLocaleLowerCase();
}

function getIndustryTone(industry: string): IndustryTone {
    const key = normalizeIndustry(industry);
    const mappedIndex = INDUSTRY_TONE_BY_KEY[key];

    if (mappedIndex !== undefined) {
        return INDUSTRY_TONES[mappedIndex % INDUSTRY_TONES.length];
    }

    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
        hash = (hash << 5) - hash + key.charCodeAt(index);
        hash |= 0;
    }

    const toneIndex = Math.abs(hash) % INDUSTRY_TONES.length;
    return INDUSTRY_TONES[toneIndex];
}

function sanitizeIndustryList(values: string[] | null | undefined) {
    if (!Array.isArray(values)) return [];

    const seen = new Set<string>();
    const sanitized: string[] = [];

    for (const value of values) {
        if (typeof value !== 'string') continue;

        const trimmed = value.trim();
        if (!trimmed) continue;

        const normalized = normalizeIndustry(trimmed);
        if (seen.has(normalized)) continue;

        seen.add(normalized);
        sanitized.push(trimmed);
    }

    return sanitized;
}

function toNullableIndustryList(values: string[] | null | undefined) {
    const sanitized = sanitizeIndustryList(values);
    return sanitized.length > 0 ? sanitized : null;
}

function normalizeCompany(company: Company): Company {
    return {
        ...company,
        industries: toNullableIndustryList(company.industries),
    };
}

function getInitialFormState(): CompanyFormValues {
    return {
        name: '',
        website_url: '',
        industries: [],
        contacts: '',
        notes: '',
    };
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Something went wrong';
}

function toSafeExternalUrl(value: string | null) {
    if (!value) return null;
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

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Request failed');
    }

    return response.json() as Promise<T>;
}

function IndustryMultiSelect({
    id,
    values,
    onChange,
    placeholder = 'Select or add industries...',
    disabled = false,
}: IndustryMultiSelectProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const selectedSet = useMemo(
        () => new Set(values.map(item => normalizeIndustry(item))),
        [values]
    );

    const normalizedQuery = normalizeIndustry(query);
    const trimmedQuery = query.trim();

    const suggestions = useMemo(() => {
        return POPULAR_INDUSTRIES.filter(item => {
            const normalizedItem = normalizeIndustry(item);
            if (selectedSet.has(normalizedItem)) return false;
            if (!normalizedQuery) return true;
            return normalizedItem.includes(normalizedQuery);
        });
    }, [normalizedQuery, selectedSet]);

    const hasExactSuggestionMatch = useMemo(() => {
        return POPULAR_INDUSTRIES.some(item => normalizeIndustry(item) === normalizedQuery);
    }, [normalizedQuery]);

    const canAddCustom =
        trimmedQuery.length > 0 &&
        !selectedSet.has(normalizedQuery) &&
        !hasExactSuggestionMatch;

    useEffect(() => {
        if (!open) return;

        const handlePointerDownOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        window.addEventListener('mousedown', handlePointerDownOutside);
        return () => window.removeEventListener('mousedown', handlePointerDownOutside);
    }, [open]);

    function addIndustry(rawValue: string) {
        const trimmed = rawValue.trim();
        if (!trimmed) return;

        const normalized = normalizeIndustry(trimmed);
        if (selectedSet.has(normalized)) {
            setQuery('');
            return;
        }

        onChange([...values, trimmed]);
        setQuery('');
        setOpen(true);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }

    function removeIndustry(valueToRemove: string) {
        const normalizedToRemove = normalizeIndustry(valueToRemove);
        onChange(values.filter(item => normalizeIndustry(item) !== normalizedToRemove));
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            if (!trimmedQuery) return;

            event.preventDefault();
            if (suggestions.length > 0) {
                addIndustry(suggestions[0]);
                return;
            }

            if (canAddCustom) {
                addIndustry(trimmedQuery);
            }
            return;
        }

        if (event.key === 'Backspace' && !query && values.length > 0) {
            removeIndustry(values[values.length - 1]);
            return;
        }

        if (event.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div className="relative" ref={rootRef}>
            <div
                className={`flex min-h-[42px] w-full flex-wrap items-center gap-2 rounded-xl border bg-slate-950/75 px-3 py-2 transition-all duration-150 ${
                    open ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-600'
                } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                onClick={() => {
                    if (disabled) return;
                    setOpen(true);
                    inputRef.current?.focus();
                }}
            >
                {values.map(industry => (
                    <span
                        key={industry}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-100"
                    >
                        {industry}
                        <button
                            type="button"
                            className="rounded-full p-0.5 text-cyan-100/80 hover:bg-cyan-400/20 hover:text-white"
                            onClick={event => {
                                event.stopPropagation();
                                removeIndustry(industry);
                            }}
                            aria-label={`Remove ${industry}`}
                            disabled={disabled}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}

                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={event => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            </div>

            {open ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-600 bg-slate-950/95 shadow-[0_20px_45px_rgba(2,8,23,0.45)] backdrop-blur">
                    <div className="max-h-56 overflow-y-auto py-1">
                        {suggestions.map(industry => (
                            <button
                                key={industry}
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-cyan-500/15 hover:text-cyan-100"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => addIndustry(industry)}
                            >
                                <span>{industry}</span>
                                <span className="text-xs text-slate-400">Popular</span>
                            </button>
                        ))}

                        {canAddCustom ? (
                            <button
                                type="button"
                                className="flex w-full items-center justify-between border-t border-slate-700 px-3 py-2 text-left text-sm text-emerald-200 transition-colors hover:bg-emerald-500/15"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => addIndustry(trimmedQuery)}
                            >
                                <span>{`Add "${trimmedQuery}"`}</span>
                                <span className="text-xs text-emerald-300/80">Custom</span>
                            </button>
                        ) : null}

                        {suggestions.length === 0 && !canAddCustom ? (
                            <p className="px-3 py-2 text-sm text-slate-400">No matching industries.</p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [formValues, setFormValues] = useState<CompanyFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<CompanyFormValues>(getInitialFormState);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [industryFilter, setIndustryFilter] = useState<string | null>(null);

    const industryFilterOptions = useMemo(() => {
        const mapped = new Map<string, { label: string; count: number }>();

        for (const company of companies) {
            for (const industry of sanitizeIndustryList(company.industries)) {
                const normalized = normalizeIndustry(industry);
                const existing = mapped.get(normalized);

                if (existing) {
                    existing.count += 1;
                } else {
                    mapped.set(normalized, { label: industry, count: 1 });
                }
            }
        }

        return Array.from(mapped.entries())
            .map(([normalized, data]) => ({
                normalized,
                label: data.label,
                count: data.count,
            }))
            .sort((first, second) => {
                if (second.count !== first.count) return second.count - first.count;
                return first.label.localeCompare(second.label);
            });
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        if (!industryFilter) return companies;

        const normalizedFilter = normalizeIndustry(industryFilter);
        return companies.filter(company =>
            sanitizeIndustryList(company.industries).some(
                industry => normalizeIndustry(industry) === normalizedFilter
            )
        );
    }, [companies, industryFilter]);

    useEffect(() => {
        if (!industryFilter) return;

        const stillAvailable = industryFilterOptions.some(
            option => option.normalized === normalizeIndustry(industryFilter)
        );

        if (!stillAvailable) {
            setIndustryFilter(null);
        }
    }, [industryFilter, industryFilterOptions]);

    async function loadCompanies() {
        setLoadingList(true);
        setError(null);
        try {
            const data = await parseResponse<Company[]>(await fetch('/api/companies'));
            setCompanies(data.map(normalizeCompany));
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadCompanies();
    }, []);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = normalizeCompany(
                await parseResponse<Company>(
                    await fetch('/api/companies', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formValues),
                    })
                )
            );

            setCompanies(current => [created, ...current]);
            setFormValues(getInitialFormState());
            setSuccessMessage('Company added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(company: Company) {
        setEditingId(company.id);
        setEditingValues({
            name: company.name,
            website_url: company.website_url ?? '',
            industries: sanitizeIndustryList(company.industries),
            contacts: company.contacts ?? '',
            notes: company.notes ?? '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEdit(companyId: string) {
        setSavingRowId(companyId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = normalizeCompany(
                await parseResponse<Company>(
                    await fetch(`/api/companies/${companyId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editingValues),
                    })
                )
            );

            setCompanies(current => current.map(item => (item.id === companyId ? updated : item)));
            cancelEdit();
            setSuccessMessage('Company updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDelete(companyId: string) {
        const confirmed = window.confirm('Delete this company?');
        if (!confirmed) return;

        setDeletingRowId(companyId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setCompanies(current => current.filter(item => item.id !== companyId));
            if (editingId === companyId) {
                cancelEdit();
            }
            setSuccessMessage('Company removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Companies</h2>
                <p className="mt-1 text-sm text-slate-300">Maintain your target companies watchlist.</p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Add Company</h3>
                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreate}>
                    <div>
                        <label className="label" htmlFor="name">
                            Name *
                        </label>
                        <input
                            id="name"
                            type="text"
                            required
                            className="input"
                            value={formValues.name}
                            onChange={event =>
                                setFormValues(current => ({ ...current, name: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="website_url">
                            Website
                        </label>
                        <input
                            id="website_url"
                            type="url"
                            className="input"
                            placeholder="https://..."
                            value={formValues.website_url}
                            onChange={event =>
                                setFormValues(current => ({ ...current, website_url: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="contacts">
                            Contacts
                        </label>
                        <input
                            id="contacts"
                            type="text"
                            className="input"
                            value={formValues.contacts}
                            onChange={event =>
                                setFormValues(current => ({ ...current, contacts: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="notes">
                            Notes
                        </label>
                        <input
                            id="notes"
                            type="text"
                            className="input"
                            value={formValues.notes}
                            onChange={event =>
                                setFormValues(current => ({ ...current, notes: event.target.value }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-4">
                        <label className="label" htmlFor="industries">
                            Industry
                        </label>
                        <IndustryMultiSelect
                            id="industries"
                            values={formValues.industries}
                            onChange={nextValues =>
                                setFormValues(current => ({ ...current, industries: nextValues }))
                            }
                            placeholder="Click to see suggestions or type to search..."
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-4">
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Add Company'}
                        </button>
                    </div>
                </form>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                    {error}
                </div>
            ) : null}

            {successMessage ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                    {successMessage}
                </div>
            ) : null}

            <div className="card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">Filter by industry</h3>
                        <p className="text-xs text-slate-400">
                            Click one industry to show only related companies.
                        </p>
                    </div>
                    {industryFilter ? (
                        <button
                            type="button"
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                            onClick={() => setIndustryFilter(null)}
                        >
                            Clear filter
                        </button>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            industryFilter === null
                                ? 'border-cyan-300/80 bg-cyan-400/30 text-cyan-50'
                                : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-cyan-400/40 hover:bg-slate-800'
                        }`}
                        onClick={() => setIndustryFilter(null)}
                    >
                        All industries
                        <span className="rounded-full bg-slate-950/45 px-2 py-0.5 text-[11px] text-slate-200">
                            {companies.length}
                        </span>
                    </button>

                    {industryFilterOptions.map(option => {
                        const tone = getIndustryTone(option.label);
                        const isActive =
                            industryFilter !== null &&
                            normalizeIndustry(industryFilter) === option.normalized;

                        return (
                            <button
                                key={option.normalized}
                                type="button"
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                                    isActive ? tone.buttonActive : tone.button
                                }`}
                                onClick={() =>
                                    setIndustryFilter(current =>
                                        current && normalizeIndustry(current) === option.normalized
                                            ? null
                                            : option.label
                                    )
                                }
                            >
                                {option.label}
                                <span className="rounded-full bg-slate-950/45 px-2 py-0.5 text-[11px] text-slate-100">
                                    {option.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Website</th>
                            <th>Industries</th>
                            <th>Contacts</th>
                            <th>Notes</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading companies...
                                    </span>
                                </td>
                            </tr>
                        ) : filteredCompanies.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                    {industryFilter
                                        ? `No companies found for industry "${industryFilter}".`
                                        : 'No companies added.'}
                                </td>
                            </tr>
                        ) : (
                            filteredCompanies.map(company => {
                                const rowBusy = savingRowId === company.id || deletingRowId === company.id;
                                const isEditing = editingId === company.id;
                                const safeWebsiteUrl = toSafeExternalUrl(company.website_url);
                                const companyIndustries = sanitizeIndustryList(company.industries);

                                return (
                                    <tr key={company.id}>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[180px]"
                                                    value={editingValues.name}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                company.name
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[200px]"
                                                    value={editingValues.website_url}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            website_url: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : safeWebsiteUrl ? (
                                                <Link
                                                    href={safeWebsiteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-cyan-300 hover:underline"
                                                >
                                                    Open
                                                </Link>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <div className="min-w-[270px]">
                                                    <IndustryMultiSelect
                                                        id={`industry-${company.id}`}
                                                        values={editingValues.industries}
                                                        onChange={nextValues =>
                                                            setEditingValues(current => ({
                                                                ...current,
                                                                industries: nextValues,
                                                            }))
                                                        }
                                                        placeholder="Select or add..."
                                                        disabled={rowBusy}
                                                    />
                                                </div>
                                            ) : companyIndustries.length > 0 ? (
                                                <div className="flex min-w-[240px] flex-wrap gap-1.5">
                                                    {companyIndustries.map(industry => (
                                                        <span
                                                            key={industry}
                                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${getIndustryTone(industry).tag}`}
                                                        >
                                                            {industry}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[200px]"
                                                    value={editingValues.contacts}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            contacts: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                company.contacts || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[220px]"
                                                    value={editingValues.notes}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            notes: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                company.notes || '-'
                                            )}
                                        </td>
                                        <td>{new Date(company.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            disabled={rowBusy}
                                                            onClick={() => saveEdit(company.id)}
                                                        >
                                                            {savingRowId === company.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-secondary"
                                                            disabled={rowBusy}
                                                            onClick={cancelEdit}
                                                        >
                                                            <X className="h-4 w-4" />
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        disabled={rowBusy}
                                                        onClick={() => startEdit(company)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    disabled={rowBusy}
                                                    onClick={() => handleDelete(company.id)}
                                                >
                                                    {deletingRowId === company.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
