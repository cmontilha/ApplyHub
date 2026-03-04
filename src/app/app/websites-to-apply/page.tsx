'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import { WEBSITE_APPLICATION_TYPE_OPTIONS, toLabel } from '@/lib/constants';
import type { WebsiteApplicationType, WebsiteToApply } from '@/types/database';

type WebsiteToApplyFormValues = {
    name: string;
    website_url: string;
    type: WebsiteApplicationType;
};

function getInitialFormState(): WebsiteToApplyFormValues {
    return {
        name: '',
        website_url: '',
        type: 'both',
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

export default function WebsitesToApplyPage() {
    const [websites, setWebsites] = useState<WebsiteToApply[]>([]);
    const [formValues, setFormValues] = useState<WebsiteToApplyFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<WebsiteToApplyFormValues>(getInitialFormState);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function loadWebsites() {
        setLoadingList(true);
        setError(null);
        try {
            const data = await parseResponse<WebsiteToApply[]>(await fetch('/api/websites-to-apply'));
            setWebsites(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadWebsites();
    }, []);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<WebsiteToApply>(
                await fetch('/api/websites-to-apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
            );

            setWebsites(current => [created, ...current]);
            setFormValues(getInitialFormState());
            setSuccessMessage('Website added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(website: WebsiteToApply) {
        setEditingId(website.id);
        setEditingValues({
            name: website.name,
            website_url: website.website_url,
            type: website.type,
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEdit(websiteId: string) {
        setSavingRowId(websiteId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<WebsiteToApply>(
                await fetch(`/api/websites-to-apply/${websiteId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingValues),
                })
            );

            setWebsites(current => current.map(item => (item.id === websiteId ? updated : item)));
            cancelEdit();
            setSuccessMessage('Website updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDelete(websiteId: string) {
        const confirmed = window.confirm('Delete this website?');
        if (!confirmed) return;

        setDeletingRowId(websiteId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/websites-to-apply/${websiteId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setWebsites(current => current.filter(item => item.id !== websiteId));
            if (editingId === websiteId) {
                cancelEdit();
            }
            setSuccessMessage('Website removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Websites To Apply</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Save job websites by scope (both, nacional, internacional) to speed up applications.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Add Website</h3>
                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreate}>
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
                            Website URL *
                        </label>
                        <input
                            id="website_url"
                            type="url"
                            required
                            className="input"
                            placeholder="https://..."
                            value={formValues.website_url}
                            onChange={event =>
                                setFormValues(current => ({ ...current, website_url: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="type">
                            Type
                        </label>
                        <select
                            id="type"
                            className="input"
                            value={formValues.type}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    type: event.target.value as WebsiteApplicationType,
                                }))
                            }
                        >
                            {WEBSITE_APPLICATION_TYPE_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {toLabel(option)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 xl:col-span-3">
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Add Website'}
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

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Website</th>
                            <th>Type</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading websites...
                                    </span>
                                </td>
                            </tr>
                        ) : websites.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                    No websites added.
                                </td>
                            </tr>
                        ) : (
                            websites.map(website => {
                                const rowBusy = savingRowId === website.id || deletingRowId === website.id;
                                const isEditing = editingId === website.id;
                                const safeWebsiteUrl = toSafeExternalUrl(website.website_url);

                                return (
                                    <tr key={website.id}>
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
                                                website.name
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[220px]"
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
                                                website.website_url
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <select
                                                    className="input min-w-[170px]"
                                                    value={editingValues.type}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            type: event.target.value as WebsiteApplicationType,
                                                        }))
                                                    }
                                                >
                                                    {WEBSITE_APPLICATION_TYPE_OPTIONS.map(option => (
                                                        <option key={option} value={option}>
                                                            {toLabel(option)}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                toLabel(website.type)
                                            )}
                                        </td>
                                        <td>{new Date(website.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex flex-wrap gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            disabled={rowBusy}
                                                            onClick={() => saveEdit(website.id)}
                                                        >
                                                            {savingRowId === website.id ? (
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
                                                        disabled={rowBusy || Boolean(editingId)}
                                                        onClick={() => startEdit(website)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    disabled={rowBusy}
                                                    onClick={() => handleDelete(website.id)}
                                                >
                                                    {deletingRowId === website.id ? (
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
