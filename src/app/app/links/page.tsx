'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Edit3, ExternalLink, Globe2, Loader2, Save, Trash2, X } from 'lucide-react';
import type { SavedLink } from '@/types/database';

type LinkFormValues = {
    url: string;
    title: string;
    notes: string;
};

function getInitialFormState(): LinkFormValues {
    return {
        url: '',
        title: '',
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

function toHostnameLabel(url: string) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./i, '');
    } catch {
        return 'website';
    }
}

function toCardSummary(item: SavedLink) {
    const source = item.notes || item.description;
    if (!source) return 'No notes yet.';
    const normalized = source.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 125) return normalized;
    return `${normalized.slice(0, 125)}...`;
}

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Request failed');
    }

    return response.json() as Promise<T>;
}

export default function LinksPage() {
    const [links, setLinks] = useState<SavedLink[]>([]);
    const [formValues, setFormValues] = useState<LinkFormValues>(getInitialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<LinkFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingLinkId, setSavingLinkId] = useState<string | null>(null);
    const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const linkCountLabel = useMemo(() => {
        if (links.length === 0) return 'No links saved yet.';
        if (links.length === 1) return '1 link saved.';
        return `${links.length} links saved.`;
    }, [links.length]);

    async function loadLinks() {
        setLoadingList(true);
        setError(null);
        try {
            const data = await parseResponse<SavedLink[]>(await fetch('/api/links'));
            setLinks(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadLinks();
    }, []);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<SavedLink>(
                await fetch('/api/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
            );

            setLinks(current => [created, ...current]);
            setFormValues(getInitialFormState());
            setSuccessMessage('Link saved.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(item: SavedLink) {
        setEditingId(item.id);
        setEditingValues({
            url: item.url,
            title: item.title,
            notes: item.notes ?? '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEdit(linkId: string) {
        setSavingLinkId(linkId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<SavedLink>(
                await fetch(`/api/links/${linkId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingValues),
                })
            );

            setLinks(current => current.map(item => (item.id === linkId ? updated : item)));
            cancelEdit();
            setSuccessMessage('Link updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingLinkId(null);
        }
    }

    async function handleDelete(linkId: string) {
        const confirmed = window.confirm('Delete this link?');
        if (!confirmed) return;

        setDeletingLinkId(linkId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setLinks(current => current.filter(item => item.id !== linkId));
            if (editingId === linkId) {
                cancelEdit();
            }
            setSuccessMessage('Link removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingLinkId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Links</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Save useful links in one place, like a mini drive, with auto preview cards.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Add Link</h3>
                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreate}>
                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="link-url">
                            Link URL *
                        </label>
                        <input
                            id="link-url"
                            type="url"
                            required
                            className="input"
                            placeholder="https://..."
                            value={formValues.url}
                            onChange={event =>
                                setFormValues(current => ({ ...current, url: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="link-title">
                            Custom Title
                        </label>
                        <input
                            id="link-title"
                            type="text"
                            className="input"
                            placeholder="Optional"
                            value={formValues.title}
                            onChange={event =>
                                setFormValues(current => ({ ...current, title: event.target.value }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-3">
                        <label className="label" htmlFor="link-notes">
                            Notes
                        </label>
                        <textarea
                            id="link-notes"
                            className="input min-h-[90px] resize-y"
                            placeholder="Optional notes for this link..."
                            value={formValues.notes}
                            onChange={event =>
                                setFormValues(current => ({ ...current, notes: event.target.value }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-slate-400">
                            Preview image and metadata are fetched automatically when available.
                        </p>
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Save Link'}
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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-100 md:text-lg">Saved Links</h3>
                    <p className="text-xs text-slate-400">{linkCountLabel}</p>
                </div>

                {loadingList ? (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-8 text-center text-slate-400">
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading links...
                        </span>
                    </div>
                ) : links.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-8 text-center text-slate-400">
                        No links added yet.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {links.map(item => {
                            const safeUrl = toSafeExternalUrl(item.url);
                            const safePreviewImage = toSafeExternalUrl(item.preview_image_url);
                            const isEditing = editingId === item.id;
                            const rowBusy = savingLinkId === item.id || deletingLinkId === item.id;
                            const hostLabel = toHostnameLabel(item.url);

                            return (
                                <article
                                    key={item.id}
                                    className="overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-cyan-950/25 shadow-[0_18px_36px_rgba(2,6,23,0.45)]"
                                >
                                    <div className="relative h-28 border-b border-slate-700/70 bg-slate-950/80">
                                        {safePreviewImage ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={safePreviewImage}
                                                    alt={`${item.title} preview`}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </>
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                                                <Globe2 className="h-6 w-6 text-slate-400" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                                        <p className="absolute bottom-2 left-3 text-[11px] font-medium uppercase tracking-wide text-cyan-100/90">
                                            {item.site_name || hostLabel}
                                        </p>
                                    </div>

                                    <div className="space-y-3 p-4">
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="label" htmlFor={`edit-url-${item.id}`}>
                                                        Link URL *
                                                    </label>
                                                    <input
                                                        id={`edit-url-${item.id}`}
                                                        className="input"
                                                        value={editingValues.url}
                                                        onChange={event =>
                                                            setEditingValues(current => ({
                                                                ...current,
                                                                url: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="label" htmlFor={`edit-title-${item.id}`}>
                                                        Title *
                                                    </label>
                                                    <input
                                                        id={`edit-title-${item.id}`}
                                                        className="input"
                                                        value={editingValues.title}
                                                        onChange={event =>
                                                            setEditingValues(current => ({
                                                                ...current,
                                                                title: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div>
                                                    <label className="label" htmlFor={`edit-notes-${item.id}`}>
                                                        Notes
                                                    </label>
                                                    <textarea
                                                        id={`edit-notes-${item.id}`}
                                                        className="input min-h-[80px] resize-y"
                                                        value={editingValues.notes}
                                                        onChange={event =>
                                                            setEditingValues(current => ({
                                                                ...current,
                                                                notes: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        disabled={rowBusy}
                                                        onClick={() => saveEdit(item.id)}
                                                    >
                                                        {savingLinkId === item.id ? (
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
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="text-base font-semibold text-slate-100">
                                                        {item.title}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {hostLabel}
                                                    </p>
                                                </div>

                                                <p className="text-sm leading-6 text-slate-300">
                                                    {toCardSummary(item)}
                                                </p>

                                                <p className="text-xs text-slate-400">
                                                    Saved on {new Date(item.created_at).toLocaleDateString()}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    {safeUrl ? (
                                                        <Link
                                                            href={safeUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-primary"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                            Open
                                                        </Link>
                                                    ) : (
                                                        <span className="btn-secondary cursor-not-allowed opacity-60">
                                                            Invalid URL
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        disabled={rowBusy}
                                                        onClick={() => startEdit(item)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn-danger"
                                                        disabled={rowBusy}
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        {deletingLinkId === item.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
