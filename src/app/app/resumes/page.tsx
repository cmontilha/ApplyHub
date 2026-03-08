'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react';

type ResumeItem = {
    id: string;
    user_id: string;
    file_name: string;
    storage_path: string;
    file_size_bytes: number;
    mime_type: string;
    created_at: string;
    download_url: string | null;
};

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

function formatFileSize(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '-';
    if (bytes < 1024) return `${bytes} B`;

    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(2)} MB`;
}

export default function ResumesPage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [resumes, setResumes] = useState<ResumeItem[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function loadResumes() {
        setLoadingList(true);
        setError(null);

        try {
            const data = await parseResponse<ResumeItem[]>(await fetch('/api/resumes'));
            setResumes(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadResumes();
    }, []);

    async function handleUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Choose a PDF file first.');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const created = await parseResponse<ResumeItem>(
                await fetch('/api/resumes', {
                    method: 'POST',
                    body: formData,
                })
            );

            setResumes(current => [created, ...current]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setSelectedFileName('');
            setSuccessMessage('Resume uploaded.');
        } catch (uploadError) {
            setError(getErrorMessage(uploadError));
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(resumeId: string) {
        const confirmed = window.confirm('Delete this resume?');
        if (!confirmed) return;

        setDeletingId(resumeId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/resumes/${resumeId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setResumes(current => current.filter(item => item.id !== resumeId));
            setSuccessMessage('Resume deleted.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Resumes</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Upload and organize your resume PDFs in one place.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Upload Resume PDF</h3>
                <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleUpload}>
                    <div>
                        <label htmlFor="resume-file" className="label">
                            PDF file (max 10MB)
                        </label>
                        <input
                            ref={fileInputRef}
                            id="resume-file"
                            type="file"
                            accept=".pdf,application/pdf"
                            className="input"
                            onChange={event =>
                                setSelectedFileName(event.target.files?.[0]?.name ?? '')
                            }
                        />
                        <p className="mt-2 text-xs text-slate-400">
                            {selectedFileName ? `Selected: ${selectedFileName}` : 'No file selected.'}
                        </p>
                    </div>

                    <div className="flex items-end">
                        <button type="submit" className="btn-primary" disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploading ? 'Uploading...' : 'Upload PDF'}
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
                            <th>Size</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading resumes...
                                    </span>
                                </td>
                            </tr>
                        ) : resumes.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-slate-400">
                                    No resumes uploaded yet.
                                </td>
                            </tr>
                        ) : (
                            resumes.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <span className="inline-flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-cyan-300" />
                                            {item.file_name}
                                        </span>
                                    </td>
                                    <td>{formatFileSize(item.file_size_bytes)}</td>
                                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            {item.download_url ? (
                                                <a
                                                    href={item.download_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-secondary"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    Open
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => void loadResumes()}
                                                >
                                                    Refresh Link
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="btn-danger"
                                                disabled={deletingId === item.id}
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                {deletingId === item.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
