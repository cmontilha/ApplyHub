'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import { CERT_DIFFICULTY_OPTIONS, toLabel } from '@/lib/constants';
import type { CertDifficulty, Certification } from '@/types/database';

type CertificationFormValues = {
    name: string;
    area: string;
    difficulty: CertDifficulty | '';
    market_recognition: string;
    price: string;
    notes: string;
};

function getInitialFormState(): CertificationFormValues {
    return {
        name: '',
        area: '',
        difficulty: '',
        market_recognition: '',
        price: '',
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

export default function CertificationsPage() {
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [formValues, setFormValues] = useState<CertificationFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<CertificationFormValues>(getInitialFormState);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function loadCertifications() {
        setLoadingList(true);
        setError(null);
        try {
            const data = await parseResponse<Certification[]>(await fetch('/api/certifications'));
            setCertifications(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadCertifications();
    }, []);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<Certification>(
                await fetch('/api/certifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formValues,
                        difficulty: formValues.difficulty || null,
                    }),
                })
            );

            setCertifications(current => [created, ...current]);
            setFormValues(getInitialFormState());
            setSuccessMessage('Certification added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(certification: Certification) {
        setEditingId(certification.id);
        setEditingValues({
            name: certification.name,
            area: certification.area ?? '',
            difficulty: certification.difficulty ?? '',
            market_recognition: certification.market_recognition ?? '',
            price: certification.price !== null ? String(certification.price) : '',
            notes: certification.notes ?? '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEdit(certificationId: string) {
        setSavingRowId(certificationId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<Certification>(
                await fetch(`/api/certifications/${certificationId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...editingValues,
                        difficulty: editingValues.difficulty || null,
                    }),
                })
            );

            setCertifications(current =>
                current.map(item => (item.id === certificationId ? updated : item))
            );
            cancelEdit();
            setSuccessMessage('Certification updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDelete(certificationId: string) {
        const confirmed = window.confirm('Delete this certification?');
        if (!confirmed) return;

        setDeletingRowId(certificationId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/certifications/${certificationId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setCertifications(current => current.filter(item => item.id !== certificationId));
            if (editingId === certificationId) {
                cancelEdit();
            }
            setSuccessMessage('Certification removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Keep track of certifications with effort and market value.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-800">Add Certification</h3>
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
                        <label className="label" htmlFor="area">
                            Area
                        </label>
                        <input
                            id="area"
                            type="text"
                            className="input"
                            value={formValues.area}
                            onChange={event =>
                                setFormValues(current => ({ ...current, area: event.target.value }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="difficulty">
                            Difficulty
                        </label>
                        <select
                            id="difficulty"
                            className="input"
                            value={formValues.difficulty}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    difficulty: event.target.value as CertDifficulty | '',
                                }))
                            }
                        >
                            <option value="">Select</option>
                            {CERT_DIFFICULTY_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {toLabel(option)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label" htmlFor="market_recognition">
                            Market Recognition
                        </label>
                        <input
                            id="market_recognition"
                            type="text"
                            className="input"
                            value={formValues.market_recognition}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    market_recognition: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="price">
                            Price
                        </label>
                        <input
                            id="price"
                            type="number"
                            min="0"
                            step="0.01"
                            className="input"
                            value={formValues.price}
                            onChange={event =>
                                setFormValues(current => ({ ...current, price: event.target.value }))
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

                    <div className="md:col-span-2 xl:col-span-3">
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Add Certification'}
                        </button>
                    </div>
                </form>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Area</th>
                            <th>Difficulty</th>
                            <th>Market Recognition</th>
                            <th>Price</th>
                            <th>Notes</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-gray-500">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading certifications...
                                    </span>
                                </td>
                            </tr>
                        ) : certifications.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-gray-500">
                                    No certifications added.
                                </td>
                            </tr>
                        ) : (
                            certifications.map(certification => {
                                const rowBusy =
                                    savingRowId === certification.id || deletingRowId === certification.id;
                                const isEditing = editingId === certification.id;

                                return (
                                    <tr key={certification.id}>
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
                                                certification.name
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[160px]"
                                                    value={editingValues.area}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            area: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                certification.area || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <select
                                                    className="input min-w-[140px]"
                                                    value={editingValues.difficulty}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            difficulty: event.target
                                                                .value as CertDifficulty | '',
                                                        }))
                                                    }
                                                >
                                                    <option value="">Select</option>
                                                    {CERT_DIFFICULTY_OPTIONS.map(option => (
                                                        <option key={option} value={option}>
                                                            {toLabel(option)}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : certification.difficulty ? (
                                                toLabel(certification.difficulty)
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[180px]"
                                                    value={editingValues.market_recognition}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            market_recognition: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                certification.market_recognition || '-'
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[120px]"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={editingValues.price}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            price: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : certification.price !== null ? (
                                                `$${Number(certification.price).toFixed(2)}`
                                            ) : (
                                                '-'
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
                                                certification.notes || '-'
                                            )}
                                        </td>
                                        <td>{new Date(certification.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            disabled={rowBusy}
                                                            onClick={() => saveEdit(certification.id)}
                                                        >
                                                            {savingRowId === certification.id ? (
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
                                                        onClick={() => startEdit(certification)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    disabled={rowBusy}
                                                    onClick={() => handleDelete(certification.id)}
                                                >
                                                    {deletingRowId === certification.id ? (
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
