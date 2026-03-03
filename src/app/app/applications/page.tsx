'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trash2 } from 'lucide-react';
import {
    APPLICATION_CATEGORY_OPTIONS,
    APPLICATION_STATUS_OPTIONS,
    WORK_MODE_OPTIONS,
    toLabel,
} from '@/lib/constants';
import type {
    Application,
    ApplicationCategory,
    ApplicationStatus,
    WorkMode,
} from '@/types/database';

type ApplicationFormValues = {
    applied_date: string;
    company: string;
    role_title: string;
    work_mode: WorkMode;
    location: string;
    job_url: string;
    status: ApplicationStatus;
    category: ApplicationCategory;
    recruiter_contact_notes: string;
    notes: string;
};

function getInitialFormState(): ApplicationFormValues {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);

    return {
        applied_date: localDate,
        company: '',
        role_title: '',
        work_mode: 'remote',
        location: '',
        job_url: '',
        status: 'applied',
        category: 'no_referral',
        recruiter_contact_notes: '',
        notes: '',
    };
}

function sortApplications(data: Application[]) {
    return [...data].sort((a, b) => {
        if (a.applied_date === b.applied_date) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.applied_date < b.applied_date ? 1 : -1;
    });
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

export default function ApplicationsPage() {
    const [formValues, setFormValues] = useState<ApplicationFormValues>(getInitialFormState);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function loadApplications() {
        setLoadingList(true);
        setError(null);

        try {
            const data = await parseResponse<Application[]>(await fetch('/api/applications'));
            setApplications(sortApplications(data));
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadApplications();
    }, []);

    async function handleCreateApplication(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<Application>(
                await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
            );

            setApplications(current => sortApplications([created, ...current]));
            setFormValues(getInitialFormState());
            setSuccessMessage('Application added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleInlineUpdate(
        applicationId: string,
        payload: Partial<Pick<Application, 'status' | 'category'>>
    ) {
        setSavingRowId(applicationId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<Application>(
                await fetch(`/api/applications/${applicationId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            );

            setApplications(current =>
                current.map(item => (item.id === applicationId ? updated : item))
            );
            setSuccessMessage('Application updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDeleteApplication(applicationId: string) {
        const confirmed = window.confirm('Delete this application?');
        if (!confirmed) return;

        setDeletingRowId(applicationId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/applications/${applicationId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setApplications(current => current.filter(item => item.id !== applicationId));
            setSuccessMessage('Application removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Add new applications and update pipeline status in place.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-800">New Application</h3>
                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateApplication}>
                    <div>
                        <label className="label" htmlFor="applied_date">
                            Applied Date *
                        </label>
                        <input
                            id="applied_date"
                            type="date"
                            required
                            className="input"
                            value={formValues.applied_date}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    applied_date: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="company">
                            Company *
                        </label>
                        <input
                            id="company"
                            type="text"
                            required
                            className="input"
                            placeholder="Company name"
                            value={formValues.company}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    company: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="role_title">
                            Role Title *
                        </label>
                        <input
                            id="role_title"
                            type="text"
                            required
                            className="input"
                            placeholder="Frontend Engineer"
                            value={formValues.role_title}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    role_title: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="work_mode">
                            Work Mode
                        </label>
                        <select
                            id="work_mode"
                            className="input"
                            value={formValues.work_mode}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    work_mode: event.target.value as WorkMode,
                                }))
                            }
                        >
                            {WORK_MODE_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {toLabel(option)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label" htmlFor="location">
                            Location
                        </label>
                        <input
                            id="location"
                            type="text"
                            className="input"
                            placeholder="Sao Paulo - SP"
                            value={formValues.location}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    location: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="job_url">
                            Job URL
                        </label>
                        <input
                            id="job_url"
                            type="url"
                            className="input"
                            placeholder="https://..."
                            value={formValues.job_url}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    job_url: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="status">
                            Status
                        </label>
                        <select
                            id="status"
                            className="input"
                            value={formValues.status}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    status: event.target.value as ApplicationStatus,
                                }))
                            }
                        >
                            {APPLICATION_STATUS_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {toLabel(option)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label" htmlFor="category">
                            Category
                        </label>
                        <select
                            id="category"
                            className="input"
                            value={formValues.category}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    category: event.target.value as ApplicationCategory,
                                }))
                            }
                        >
                            {APPLICATION_CATEGORY_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {toLabel(option)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="recruiter_contact_notes">
                            Recruiter Contact Notes
                        </label>
                        <input
                            id="recruiter_contact_notes"
                            type="text"
                            className="input"
                            placeholder="Optional notes"
                            value={formValues.recruiter_contact_notes}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    recruiter_contact_notes: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="notes">
                            Notes
                        </label>
                        <input
                            id="notes"
                            type="text"
                            className="input"
                            placeholder="Optional notes"
                            value={formValues.notes}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    notes: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-4">
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Add Application'}
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
                            <th>Date</th>
                            <th>Company</th>
                            <th>Role</th>
                            <th>Work Mode</th>
                            <th>Location</th>
                            <th>Job URL</th>
                            <th>Status</th>
                            <th>Category</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={9} className="py-12 text-center text-gray-500">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading applications...
                                    </span>
                                </td>
                            </tr>
                        ) : applications.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-12 text-center text-gray-500">
                                    No applications yet.
                                </td>
                            </tr>
                        ) : (
                            applications.map(application => {
                                const rowBusy =
                                    savingRowId === application.id || deletingRowId === application.id;

                                return (
                                    <tr key={application.id}>
                                        <td>{application.applied_date}</td>
                                        <td>{application.company}</td>
                                        <td>{application.role_title}</td>
                                        <td>{toLabel(application.work_mode)}</td>
                                        <td>{application.location || '-'}</td>
                                        <td>
                                            {application.job_url ? (
                                                <Link
                                                    href={application.job_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-brand-600 hover:underline"
                                                >
                                                    Open
                                                </Link>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                className="input min-w-[150px]"
                                                value={application.status}
                                                disabled={rowBusy}
                                                onChange={event =>
                                                    handleInlineUpdate(application.id, {
                                                        status: event.target.value as ApplicationStatus,
                                                    })
                                                }
                                            >
                                                {APPLICATION_STATUS_OPTIONS.map(option => (
                                                    <option key={option} value={option}>
                                                        {toLabel(option)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                className="input min-w-[180px]"
                                                value={application.category}
                                                disabled={rowBusy}
                                                onChange={event =>
                                                    handleInlineUpdate(application.id, {
                                                        category: event.target.value as ApplicationCategory,
                                                    })
                                                }
                                            >
                                                {APPLICATION_CATEGORY_OPTIONS.map(option => (
                                                    <option key={option} value={option}>
                                                        {toLabel(option)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn-danger"
                                                disabled={rowBusy}
                                                onClick={() => handleDeleteApplication(application.id)}
                                            >
                                                {deletingRowId === application.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                                Delete
                                            </button>
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
