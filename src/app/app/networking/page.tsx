'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Edit3, ExternalLink, Loader2, Save, Trash2, X } from 'lucide-react';
import type { NetworkingContact } from '@/types/database';

type NetworkingFormValues = {
    name: string;
    company: string;
    role_title: string;
    email: string;
    phone: string;
    linkedin_url: string;
    last_contact_at: string;
    notes: string;
};

function getTodayLocalDate() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function getInitialFormState(): NetworkingFormValues {
    return {
        name: '',
        company: '',
        role_title: '',
        email: '',
        phone: '',
        linkedin_url: '',
        last_contact_at: getTodayLocalDate(),
        notes: '',
    };
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Something went wrong';
}

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Request failed');
    }

    return response.json() as Promise<T>;
}

function formatDate(value: string | null) {
    if (!value) return '-';
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
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

export default function NetworkingPage() {
    const [contacts, setContacts] = useState<NetworkingContact[]>([]);
    const [formValues, setFormValues] = useState<NetworkingFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
    const [followUpRowId, setFollowUpRowId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<NetworkingFormValues>(getInitialFormState);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const hasContactMethod = useMemo(() => {
        return Boolean(
            formValues.email.trim() || formValues.phone.trim() || formValues.linkedin_url.trim()
        );
    }, [formValues.email, formValues.phone, formValues.linkedin_url]);

    async function loadNetworking() {
        setLoadingList(true);
        setError(null);
        try {
            const data = await parseResponse<NetworkingContact[]>(await fetch('/api/networking'));
            setContacts(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadNetworking();
    }, []);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<NetworkingContact>(
                await fetch('/api/networking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
            );

            setContacts(current => [created, ...current]);
            setFormValues(getInitialFormState());
            setSuccessMessage('Contact added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(contact: NetworkingContact) {
        setEditingId(contact.id);
        setEditingValues({
            name: contact.name,
            company: contact.company ?? '',
            role_title: contact.role_title ?? '',
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            linkedin_url: contact.linkedin_url ?? '',
            last_contact_at: contact.last_contact_at ?? '',
            notes: contact.notes ?? '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEdit(contactId: string) {
        setSavingRowId(contactId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<NetworkingContact>(
                await fetch(`/api/networking/${contactId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingValues),
                })
            );

            setContacts(current => current.map(item => (item.id === contactId ? updated : item)));
            cancelEdit();
            setSuccessMessage('Contact updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDelete(contactId: string) {
        const confirmed = window.confirm('Delete this contact?');
        if (!confirmed) return;

        setDeletingRowId(contactId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/networking/${contactId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setContacts(current => current.filter(item => item.id !== contactId));
            if (editingId === contactId) {
                cancelEdit();
            }
            setSuccessMessage('Contact removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingRowId(null);
        }
    }

    async function handleFollowUpDone(contactId: string) {
        setFollowUpRowId(contactId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<NetworkingContact>(
                await fetch(`/api/networking/${contactId}/follow-up`, {
                    method: 'POST',
                })
            );

            setContacts(current => current.map(item => (item.id === contactId ? updated : item)));
            setSuccessMessage('Follow-up updated. Next check scheduled in 5 months.');
        } catch (followUpError) {
            setError(getErrorMessage(followUpError));
        } finally {
            setFollowUpRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Networking</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Manage people, contacts, and your 5-month follow-up cycle.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Add Contact</h3>
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
                        <label className="label" htmlFor="company">
                            Company
                        </label>
                        <input
                            id="company"
                            type="text"
                            className="input"
                            value={formValues.company}
                            onChange={event =>
                                setFormValues(current => ({ ...current, company: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="role_title">
                            Role
                        </label>
                        <input
                            id="role_title"
                            type="text"
                            className="input"
                            value={formValues.role_title}
                            onChange={event =>
                                setFormValues(current => ({ ...current, role_title: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="last_contact_at">
                            Last Contact *
                        </label>
                        <input
                            id="last_contact_at"
                            type="date"
                            required
                            className="input"
                            value={formValues.last_contact_at}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    last_contact_at: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            value={formValues.email}
                            onChange={event =>
                                setFormValues(current => ({ ...current, email: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="phone">
                            Phone
                        </label>
                        <input
                            id="phone"
                            type="text"
                            className="input"
                            value={formValues.phone}
                            onChange={event =>
                                setFormValues(current => ({ ...current, phone: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="linkedin_url">
                            LinkedIn
                        </label>
                        <input
                            id="linkedin_url"
                            type="url"
                            className="input"
                            placeholder="https://linkedin.com/in/..."
                            value={formValues.linkedin_url}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    linkedin_url: event.target.value,
                                }))
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
                        <p className="mb-2 text-xs text-slate-400">
                            Add at least one contact method (email, phone, or LinkedIn).
                        </p>
                        <button
                            className="btn-primary"
                            type="submit"
                            disabled={submitting || !hasContactMethod}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Add Contact'}
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
                            <th>Company</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>LinkedIn</th>
                            <th>Last Contact</th>
                            <th>Next Follow-up</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={10} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts...
                                    </span>
                                </td>
                            </tr>
                        ) : contacts.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-12 text-center text-slate-400">
                                    No contacts added.
                                </td>
                            </tr>
                        ) : (
                            contacts.map(contact => {
                                const rowBusy =
                                    savingRowId === contact.id ||
                                    deletingRowId === contact.id ||
                                    followUpRowId === contact.id;
                                const isEditing = editingId === contact.id;
                                const safeLinkedinUrl = toSafeExternalUrl(contact.linkedin_url);
                                return (
                                    <tr key={contact.id}>
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
                                                contact.name
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[160px]"
                                                    value={editingValues.company}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            company: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                contact.company || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[160px]"
                                                    value={editingValues.role_title}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            role_title: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                contact.role_title || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[180px]"
                                                    value={editingValues.email}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            email: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                contact.email || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[150px]"
                                                    value={editingValues.phone}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            phone: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                contact.phone || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[220px]"
                                                    value={editingValues.linkedin_url}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            linkedin_url: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : safeLinkedinUrl ? (
                                                <Link
                                                    href={safeLinkedinUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                                                >
                                                    Profile <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input"
                                                    type="date"
                                                    value={editingValues.last_contact_at}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            last_contact_at: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                formatDate(contact.last_contact_at)
                                            )}
                                        </td>
                                        <td>{formatDate(contact.next_follow_up_at)}</td>
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
                                                contact.notes || '-'
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            disabled={rowBusy}
                                                            onClick={() => saveEdit(contact.id)}
                                                        >
                                                            {savingRowId === contact.id ? (
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
                                                        onClick={() => startEdit(contact)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    disabled={rowBusy}
                                                    onClick={() => handleFollowUpDone(contact.id)}
                                                >
                                                    {followUpRowId === contact.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    )}
                                                    Follow-up done
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    disabled={rowBusy}
                                                    onClick={() => handleDelete(contact.id)}
                                                >
                                                    {deletingRowId === contact.id ? (
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
