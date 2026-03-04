'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import type { Pitch } from '@/types/database';

type PitchFormValues = {
    name: string;
    pitch: string;
};

function getInitialFormState(): PitchFormValues {
    return {
        name: '',
        pitch: '',
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

function getPitchPreview(value: string) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 160) return normalized;
    return `${normalized.slice(0, 160)}...`;
}

export default function PitchPage() {
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [formValues, setFormValues] = useState<PitchFormValues>(getInitialFormState);
    const [loadingList, setLoadingList] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingPitchId, setDeletingPitchId] = useState<string | null>(null);
    const [savingPitchId, setSavingPitchId] = useState<string | null>(null);
    const [editingPitchId, setEditingPitchId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<PitchFormValues>(getInitialFormState);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [activePitch, setActivePitch] = useState<Pitch | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    async function loadPitches() {
        setLoadingList(true);
        setError(null);

        try {
            const data = await parseResponse<Pitch[]>(await fetch('/api/pitches'));
            setPitches(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadPitches();
    }, []);

    useEffect(() => {
        if (!activePitch) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activePitch]);

    useEffect(() => {
        if (!activePitch) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [activePitch]);

    useEffect(() => {
        if (isModalOpen || !activePitch) return;
        const timer = window.setTimeout(() => setActivePitch(null), 180);
        return () => window.clearTimeout(timer);
    }, [activePitch, isModalOpen]);

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const created = await parseResponse<Pitch>(
                await fetch('/api/pitches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formValues),
                })
            );

            setPitches(current => [created, ...current]);
            setFormValues(getInitialFormState());
            setSuccessMessage('Pitch added.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setSubmitting(false);
        }
    }

    function openPitchDetails(pitch: Pitch) {
        setActivePitch(pitch);
        setIsModalOpen(true);
    }

    function closePitchDetails() {
        setIsModalOpen(false);
        setEditingPitchId(null);
        setEditingValues(getInitialFormState());
    }

    function startEditPitch(pitch: Pitch) {
        setEditingPitchId(pitch.id);
        setEditingValues({
            name: pitch.name,
            pitch: pitch.pitch,
        });
        setError(null);
        setSuccessMessage(null);
    }

    function cancelEditPitch() {
        setEditingPitchId(null);
        setEditingValues(getInitialFormState());
    }

    async function handleSavePitch(pitchId: string) {
        setSavingPitchId(pitchId);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await parseResponse<Pitch>(
                await fetch(`/api/pitches/${pitchId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingValues),
                })
            );

            setPitches(current => current.map(item => (item.id === pitchId ? updated : item)));
            setActivePitch(current => (current?.id === pitchId ? updated : current));
            cancelEditPitch();
            setSuccessMessage('Pitch updated.');
        } catch (saveError) {
            setError(getErrorMessage(saveError));
        } finally {
            setSavingPitchId(null);
        }
    }

    async function handleDeletePitch(pitchId: string) {
        const confirmed = window.confirm('Delete this pitch?');
        if (!confirmed) return;

        setDeletingPitchId(pitchId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/pitches/${pitchId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setPitches(current => current.filter(item => item.id !== pitchId));

            if (activePitch?.id === pitchId) {
                closePitchDetails();
            }

            setSuccessMessage('Pitch removed.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingPitchId(null);
        }
    }

    const pitchCountLabel = useMemo(() => {
        if (pitches.length === 0) return 'No pitches saved yet.';
        if (pitches.length === 1) return '1 pitch saved.';
        return `${pitches.length} pitches saved.`;
    }, [pitches.length]);

    const isEditingActivePitch = Boolean(activePitch && editingPitchId === activePitch.id);

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Pitch</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Save short pitch versions and open any one in focus mode to read the full text.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Add Pitch</h3>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
                    <div className="md:col-span-1">
                        <label className="label" htmlFor="pitch-name">
                            Name *
                        </label>
                        <input
                            id="pitch-name"
                            type="text"
                            required
                            className="input"
                            placeholder="Elevator pitch - Backend"
                            value={formValues.name}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="label" htmlFor="pitch-content">
                            Pitch *
                        </label>
                        <textarea
                            id="pitch-content"
                            required
                            className="input min-h-[160px] resize-y"
                            placeholder="Write your full pitch here..."
                            value={formValues.pitch}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    pitch: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-slate-400">{pitchCountLabel}</p>
                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Saving...' : 'Save Pitch'}
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
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-100 md:text-lg">Saved Pitches</h3>
                    <p className="text-xs text-slate-400">Click a card to open full pitch.</p>
                </div>

                {loadingList ? (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-8 text-center text-slate-400">
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading pitches...
                        </span>
                    </div>
                ) : pitches.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-8 text-center text-slate-400">
                        No pitches added yet.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pitches.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => openPitchDetails(item)}
                                className="group rounded-2xl border border-amber-300/25 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-amber-950/35 p-4 text-left shadow-[0_18px_36px_rgba(2,6,23,0.45)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-[0_24px_48px_rgba(2,6,23,0.55)]"
                            >
                                <div className="mb-3 h-1.5 w-14 rounded-full bg-amber-300/40 transition-colors group-hover:bg-amber-300/55" />
                                <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                    {getPitchPreview(item.pitch)}
                                </p>
                                <p className="mt-3 text-xs text-slate-400">
                                    Saved on {new Date(item.created_at).toLocaleDateString()}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {activePitch ? (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
                        isModalOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                >
                    <button
                        type="button"
                        aria-label="Close pitch modal"
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={closePitchDetails}
                    />

                    <article
                        className={`relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-2xl border border-amber-300/35 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-amber-950/35 p-5 shadow-[0_32px_80px_rgba(2,6,23,0.75)] transition-all duration-200 ${
                            isModalOpen ? 'scale-100' : 'scale-95'
                        }`}
                    >
                        <header className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-100">{activePitch.name}</h3>
                                <p className="text-xs text-slate-400">
                                    Saved on {new Date(activePitch.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {isEditingActivePitch ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            disabled={savingPitchId === activePitch.id}
                                            onClick={() => handleSavePitch(activePitch.id)}
                                        >
                                            {savingPitchId === activePitch.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            disabled={savingPitchId === activePitch.id}
                                            onClick={cancelEditPitch}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => startEditPitch(activePitch)}
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        Edit
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={closePitchDetails}
                                >
                                    <X className="h-4 w-4" />
                                    Close
                                </button>
                            </div>
                        </header>

                        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/55 p-4">
                            {isEditingActivePitch ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="label" htmlFor="pitch-edit-name">
                                            Name *
                                        </label>
                                        <input
                                            id="pitch-edit-name"
                                            className="input"
                                            value={editingValues.name}
                                            onChange={event =>
                                                setEditingValues(current => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="label" htmlFor="pitch-edit-content">
                                            Pitch *
                                        </label>
                                        <textarea
                                            id="pitch-edit-content"
                                            className="input min-h-[260px] resize-y"
                                            value={editingValues.pitch}
                                            onChange={event =>
                                                setEditingValues(current => ({
                                                    ...current,
                                                    pitch: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                                    {activePitch.pitch}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={deletingPitchId === activePitch.id || isEditingActivePitch}
                                onClick={() => handleDeletePitch(activePitch.id)}
                            >
                                {deletingPitchId === activePitch.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Delete
                            </button>
                        </div>
                    </article>
                </div>
            ) : null}
        </section>
    );
}
