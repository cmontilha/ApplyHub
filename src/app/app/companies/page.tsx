'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import type { Company } from '@/types/database';

type CompanyFormValues = {
    name: string;
    website_url: string;
    contacts: string;
    notes: string;
};

function getInitialFormState(): CompanyFormValues {
    return {
        name: '',
        website_url: '',
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

    async function loadCompanies() {
        setLoadingList(true);
        setError(null);
        try {
            const data = await parseResponse<Company[]>(await fetch('/api/companies'));
            setCompanies(data);
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
            const created = await parseResponse<Company>(
                await fetch('/api/companies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
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
            const updated = await parseResponse<Company>(
                await fetch(`/api/companies/${companyId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingValues),
                })
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

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Website</th>
                            <th>Contacts</th>
                            <th>Notes</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading companies...
                                    </span>
                                </td>
                            </tr>
                        ) : companies.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                    No companies added.
                                </td>
                            </tr>
                        ) : (
                            companies.map(company => {
                                const rowBusy = savingRowId === company.id || deletingRowId === company.id;
                                const isEditing = editingId === company.id;
                                const safeWebsiteUrl = toSafeExternalUrl(company.website_url);
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
