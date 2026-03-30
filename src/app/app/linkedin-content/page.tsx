'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { CalendarDays, Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import { LINKEDIN_CONTENT_STATUS_OPTIONS, toLabel } from '@/lib/constants';
import type { LinkedinContentPlan, LinkedinContentStatus } from '@/types/database';

type LinkedinContentFormValues = {
    scheduled_date: string;
    scheduled_time: string;
    theme: string;
    content_type: string;
    title_hook: string;
    content: string;
    objective: string;
    cta: string;
    status: LinkedinContentStatus;
    performance: string;
};

function isLinkedinContentStatus(value: unknown): value is LinkedinContentStatus {
    return (
        typeof value === 'string' &&
        LINKEDIN_CONTENT_STATUS_OPTIONS.includes(value as LinkedinContentStatus)
    );
}

function toStatusValue(value: unknown): LinkedinContentStatus {
    if (isLinkedinContentStatus(value)) return value;
    return 'planned';
}

const STATUS_BADGE_STYLES: Record<LinkedinContentStatus, string> = {
    planned: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100',
    scheduled: 'border-amber-400/50 bg-amber-500/20 text-amber-100',
    posted: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100',
    not_done: 'border-rose-400/50 bg-rose-500/20 text-rose-100',
};

const STATUS_ROW_STYLES: Record<LinkedinContentStatus, string> = {
    planned: 'bg-cyan-500/[0.04]',
    scheduled: 'bg-amber-500/[0.05]',
    posted: 'bg-emerald-500/[0.06]',
    not_done: 'bg-rose-500/[0.05]',
};

function getStatusBadgeClass(status: LinkedinContentStatus) {
    return STATUS_BADGE_STYLES[status];
}

function getStatusRowClass(status: LinkedinContentStatus) {
    return STATUS_ROW_STYLES[status];
}

function getInitialFormState(): LinkedinContentFormValues {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);

    return {
        scheduled_date: localDate,
        scheduled_time: '09:00',
        theme: '',
        content_type: '',
        title_hook: '',
        content: '',
        objective: '',
        cta: '',
        status: 'planned',
        performance: '',
    };
}

function sortPlans(plans: LinkedinContentPlan[]) {
    return [...plans].sort((a, b) => {
        if (a.scheduled_date !== b.scheduled_date) {
            return a.scheduled_date.localeCompare(b.scheduled_date);
        }

        if (a.scheduled_time !== b.scheduled_time) {
            return a.scheduled_time.localeCompare(b.scheduled_time);
        }

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Something went wrong';
}

function toTimeInputValue(value: string) {
    const [hours = '', minutes = ''] = value.split(':');
    if (!hours || !minutes) return '';
    return `${hours}:${minutes}`;
}

function formatDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Date(year, month - 1, day).toLocaleDateString();
}

function formatTime(value: string) {
    const [hours = '', minutes = ''] = value.split(':');
    if (!hours || !minutes) return value;
    return `${hours}:${minutes}`;
}

function toCellText(value: string | null) {
    if (!value) return '-';
    const trimmed = value.trim();
    return trimmed || '-';
}

const CONTENT_PREVIEW_LENGTH = 170;

function getContentPreview(value: string, maxLength = CONTENT_PREVIEW_LENGTH) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
        return { preview: normalized, truncated: false };
    }

    return {
        preview: `${normalized.slice(0, maxLength).trimEnd()}...`,
        truncated: true,
    };
}

function openNativeDatePicker(input: HTMLInputElement | null) {
    const pickerInput = input as (HTMLInputElement & { showPicker?: () => void }) | null;
    pickerInput?.showPicker?.();
}

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Request failed');
    }

    return response.json() as Promise<T>;
}

export default function LinkedinContentPage() {
    const [plans, setPlans] = useState<LinkedinContentPlan[]>([]);
    const [formValues, setFormValues] = useState<LinkedinContentFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<LinkedinContentFormValues>(getInitialFormState);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const createDateInputRef = useRef<HTMLInputElement | null>(null);
    const editDateInputRef = useRef<HTMLInputElement | null>(null);
    const [expandedContentIds, setExpandedContentIds] = useState<Set<string>>(new Set());
    const scheduledPlans = plans.filter(plan => toStatusValue(plan.status) === 'scheduled');

    function openCreateDatePicker() {
        openNativeDatePicker(createDateInputRef.current);
    }

    function openEditDatePicker() {
        openNativeDatePicker(editDateInputRef.current);
    }

    function toggleContentExpanded(planId: string) {
        setExpandedContentIds(current => {
            const next = new Set(current);
            if (next.has(planId)) {
                next.delete(planId);
            } else {
                next.add(planId);
            }
            return next;
        });
    }

    async function loadPlans() {
        setLoadingList(true);
        setError(null);

        try {
            const data = await parseResponse<LinkedinContentPlan[]>(await fetch('/api/linkedin-content'));
            setPlans(sortPlans(data));
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadPlans();
    }, []);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<LinkedinContentPlan>(
                await fetch('/api/linkedin-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
            );

            setPlans(current => sortPlans([...current, created]));
            setFormValues(getInitialFormState());
            setSuccessMessage('LinkedIn content row added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(plan: LinkedinContentPlan) {
        setEditingId(plan.id);
        setEditingValues({
            scheduled_date: plan.scheduled_date,
            scheduled_time: toTimeInputValue(plan.scheduled_time),
            theme: plan.theme,
            content_type: plan.content_type ?? '',
            title_hook: plan.title_hook ?? '',
            content: plan.content ?? '',
            objective: plan.objective ?? '',
            cta: plan.cta ?? '',
            status: toStatusValue(plan.status),
            performance: plan.performance ?? '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEdit(planId: string) {
        setSavingRowId(planId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<LinkedinContentPlan>(
                await fetch(`/api/linkedin-content/${planId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingValues),
                })
            );

            setPlans(current => sortPlans(current.map(item => (item.id === planId ? updated : item))));
            cancelEdit();
            setSuccessMessage('LinkedIn content row updated.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDelete(planId: string) {
        const confirmed = window.confirm('Delete this planned LinkedIn content row?');
        if (!confirmed) return;

        setDeletingRowId(planId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/linkedin-content/${planId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setPlans(current => current.filter(item => item.id !== planId));
            setExpandedContentIds(current => {
                if (!current.has(planId)) return current;
                const next = new Set(current);
                next.delete(planId);
                return next;
            });
            if (editingId === planId) {
                cancelEdit();
            }
            setSuccessMessage('LinkedIn content row removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">LinkedIn Content</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Plan your post pipeline in report order, keep hooks and CTA ready, and track status/performance.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Add Planned Post</h3>
                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreate}>
                    <div>
                        <label className="label" htmlFor="scheduled_date">
                            Date *
                        </label>
                        <div className="relative">
                            <input
                                id="scheduled_date"
                                ref={createDateInputRef}
                                type="date"
                                required
                                className="input pr-10"
                                value={formValues.scheduled_date}
                                onFocus={openCreateDatePicker}
                                onClick={openCreateDatePicker}
                                onChange={event =>
                                    setFormValues(current => ({
                                        ...current,
                                        scheduled_date: event.target.value,
                                    }))
                                }
                            />
                            <button
                                type="button"
                                onClick={openCreateDatePicker}
                                className="absolute inset-y-0 right-2 inline-flex items-center text-slate-300 transition-colors hover:text-cyan-200"
                                aria-label="Open calendar"
                            >
                                <CalendarDays className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="label" htmlFor="scheduled_time">
                            Time *
                        </label>
                        <input
                            id="scheduled_time"
                            type="time"
                            required
                            className="input"
                            value={formValues.scheduled_time}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    scheduled_time: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="label" htmlFor="theme">
                            Theme *
                        </label>
                        <input
                            id="theme"
                            type="text"
                            required
                            className="input"
                            placeholder="Ex: AI, Career, Projects..."
                            value={formValues.theme}
                            onChange={event =>
                                setFormValues(current => ({ ...current, theme: event.target.value }))
                            }
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="content_type">
                            Content Type
                        </label>
                        <input
                            id="content_type"
                            type="text"
                            className="input"
                            placeholder="Ex: Image + Comment"
                            value={formValues.content_type}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    content_type: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="title_hook">
                            Title / Hook
                        </label>
                        <input
                            id="title_hook"
                            type="text"
                            className="input"
                            value={formValues.title_hook}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    title_hook: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-4">
                        <label className="label" htmlFor="content">
                            Content
                        </label>
                        <textarea
                            id="content"
                            className="input min-h-[90px]"
                            value={formValues.content}
                            onChange={event =>
                                setFormValues(current => ({ ...current, content: event.target.value }))
                            }
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="objective">
                            Objective
                        </label>
                        <input
                            id="objective"
                            type="text"
                            className="input"
                            value={formValues.objective}
                            onChange={event =>
                                setFormValues(current => ({ ...current, objective: event.target.value }))
                            }
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="cta">
                            CTA (Call to Action)
                        </label>
                        <input
                            id="cta"
                            type="text"
                            className="input"
                            value={formValues.cta}
                            onChange={event =>
                                setFormValues(current => ({ ...current, cta: event.target.value }))
                            }
                        />
                    </div>

                    <div className="xl:col-span-2">
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
                                    status: event.target.value as LinkedinContentStatus,
                                }))
                            }
                        >
                            {LINKEDIN_CONTENT_STATUS_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {toLabel(option)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="label" htmlFor="performance">
                            Performance
                        </label>
                        <input
                            id="performance"
                            type="text"
                            className="input"
                            placeholder="Ex: 2,100 views"
                            value={formValues.performance}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    performance: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 xl:col-span-4">
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Add to Plan'}
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
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
                        Scheduled Queue
                    </p>
                    <span className={`badge border ${getStatusBadgeClass('scheduled')}`}>
                        {scheduledPlans.length} Scheduled
                    </span>
                </div>

                {scheduledPlans.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        No posts with status <span className="font-medium text-slate-200">Scheduled</span>.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {scheduledPlans.map(plan => (
                            <div
                                key={plan.id}
                                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2"
                            >
                                <p className="text-xs text-amber-100">
                                    {formatDate(plan.scheduled_date)} at {formatTime(plan.scheduled_time)}
                                </p>
                                <p className="text-sm font-medium text-slate-100">{plan.theme}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Theme</th>
                            <th>Content Type</th>
                            <th>Title / Hook</th>
                            <th>Content</th>
                            <th>Objective</th>
                            <th>CTA</th>
                            <th>Status</th>
                            <th>Performance</th>
                            <th className="sticky right-0 z-20 bg-slate-900/95 shadow-[-8px_0_14px_-12px_rgba(2,8,23,1)]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={11} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading plan...
                                    </span>
                                </td>
                            </tr>
                        ) : plans.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="py-12 text-center text-slate-400">
                                    No LinkedIn content rows added.
                                </td>
                            </tr>
                        ) : (
                            plans.map(plan => {
                                const rowBusy = savingRowId === plan.id || deletingRowId === plan.id;
                                const isEditing = editingId === plan.id;
                                const statusValue = toStatusValue(plan.status);
                                const statusBadgeClass = getStatusBadgeClass(statusValue);
                                const statusRowClass = getStatusRowClass(statusValue);
                                const fullContent = (plan.content ?? '').trim();
                                const { preview: contentPreview, truncated: isContentTruncated } =
                                    getContentPreview(fullContent);
                                const isContentExpanded = expandedContentIds.has(plan.id);

                                return (
                                    <tr key={plan.id} className={statusRowClass}>
                                        <td>
                                            {isEditing ? (
                                                <div className="relative min-w-[165px]">
                                                    <input
                                                        ref={editDateInputRef}
                                                        type="date"
                                                        className="input min-w-[165px] pr-10"
                                                        value={editingValues.scheduled_date}
                                                        onFocus={openEditDatePicker}
                                                        onClick={openEditDatePicker}
                                                        onChange={event =>
                                                            setEditingValues(current => ({
                                                                ...current,
                                                                scheduled_date: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={openEditDatePicker}
                                                        className="absolute inset-y-0 right-2 inline-flex items-center text-slate-300 transition-colors hover:text-cyan-200"
                                                        aria-label="Open calendar"
                                                    >
                                                        <CalendarDays className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                formatDate(plan.scheduled_date)
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    className="input min-w-[130px]"
                                                    value={editingValues.scheduled_time}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            scheduled_time: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                formatTime(plan.scheduled_time)
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[180px]"
                                                    value={editingValues.theme}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            theme: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                <span className="block max-w-[180px] whitespace-normal break-words">
                                                    {toCellText(plan.theme)}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[180px]"
                                                    value={editingValues.content_type}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            content_type: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                <span className="block max-w-[200px] whitespace-normal break-words">
                                                    {toCellText(plan.content_type)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="max-w-[230px] whitespace-normal">
                                            {isEditing ? (
                                                <textarea
                                                    className="input min-h-[80px] min-w-[220px]"
                                                    value={editingValues.title_hook}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            title_hook: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                <span className="block break-words">{toCellText(plan.title_hook)}</span>
                                            )}
                                        </td>
                                        <td className="max-w-[280px] whitespace-normal">
                                            {isEditing ? (
                                                <textarea
                                                    className="input min-h-[90px] min-w-[250px]"
                                                    value={editingValues.content}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            content: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : !fullContent ? (
                                                <span className="block break-words">-</span>
                                            ) : isContentTruncated ? (
                                                <button
                                                    type="button"
                                                    className="block w-full text-left"
                                                    onClick={() => toggleContentExpanded(plan.id)}
                                                >
                                                    <span className="block break-words">
                                                        {isContentExpanded ? fullContent : contentPreview}
                                                    </span>
                                                    <span className="mt-1 inline-block text-xs font-medium text-cyan-300 hover:text-cyan-200">
                                                        {isContentExpanded ? 'Show less' : 'Show more'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="block break-words">{fullContent}</span>
                                            )}
                                        </td>
                                        <td className="max-w-[220px] whitespace-normal">
                                            {isEditing ? (
                                                <textarea
                                                    className="input min-h-[80px] min-w-[220px]"
                                                    value={editingValues.objective}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            objective: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                <span className="block break-words">{toCellText(plan.objective)}</span>
                                            )}
                                        </td>
                                        <td className="max-w-[220px] whitespace-normal">
                                            {isEditing ? (
                                                <textarea
                                                    className="input min-h-[80px] min-w-[220px]"
                                                    value={editingValues.cta}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            cta: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                <span className="block break-words">{toCellText(plan.cta)}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <select
                                                    className="input min-w-[160px]"
                                                    value={editingValues.status}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            status: event.target.value as LinkedinContentStatus,
                                                        }))
                                                    }
                                                >
                                                    {LINKEDIN_CONTENT_STATUS_OPTIONS.map(option => (
                                                        <option key={option} value={option}>
                                                            {toLabel(option)}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span
                                                    className={`badge whitespace-nowrap border ${statusBadgeClass}`}
                                                >
                                                    {toLabel(statusValue)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="max-w-[180px] whitespace-normal">
                                            {isEditing ? (
                                                <input
                                                    className="input min-w-[160px]"
                                                    value={editingValues.performance}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            performance: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                <span className="block break-words">
                                                    {toCellText(plan.performance)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="sticky right-0 bg-slate-950/90 shadow-[-8px_0_14px_-12px_rgba(2,8,23,1)] backdrop-blur">
                                            <div className="flex flex-wrap gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            disabled={rowBusy}
                                                            onClick={() => saveEdit(plan.id)}
                                                        >
                                                            {savingRowId === plan.id ? (
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
                                                        onClick={() => startEdit(plan)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    disabled={rowBusy}
                                                    onClick={() => handleDelete(plan.id)}
                                                >
                                                    {deletingRowId === plan.id ? (
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
