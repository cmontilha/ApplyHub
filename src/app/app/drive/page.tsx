'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, FileImage, FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';

type DriveFileItem = {
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

function toPdfPreviewUrl(url: string) {
    return `${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
}

function isPdfFile(item: DriveFileItem) {
    return (
        item.mime_type.toLowerCase() === 'application/pdf' ||
        item.file_name.trim().toLowerCase().endsWith('.pdf')
    );
}

function isImageFile(item: DriveFileItem) {
    return item.mime_type.toLowerCase().startsWith('image/');
}

export default function DrivePage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [files, setFiles] = useState<DriveFileItem[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshingLinks, setRefreshingLinks] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fileCountLabel = useMemo(() => {
        if (files.length === 0) return 'No files uploaded yet.';
        if (files.length === 1) return '1 file uploaded.';
        return `${files.length} files uploaded.`;
    }, [files.length]);

    async function loadFiles(showLoader = true) {
        if (showLoader) {
            setLoadingList(true);
        } else {
            setRefreshingLinks(true);
        }
        setError(null);

        try {
            const data = await parseResponse<DriveFileItem[]>(await fetch('/api/drive'));
            setFiles(data);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            if (showLoader) {
                setLoadingList(false);
            } else {
                setRefreshingLinks(false);
            }
        }
    }

    useEffect(() => {
        void loadFiles();
    }, []);

    async function handleUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Choose an image or PDF file first.');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const created = await parseResponse<DriveFileItem>(
                await fetch('/api/drive', {
                    method: 'POST',
                    body: formData,
                })
            );

            setFiles(current => [created, ...current]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setSelectedFileName('');
            setSuccessMessage('File uploaded to Drive.');
        } catch (uploadError) {
            setError(getErrorMessage(uploadError));
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(fileId: string) {
        const confirmed = window.confirm('Delete this file?');
        if (!confirmed) return;

        setDeletingId(fileId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/drive/${fileId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setFiles(current => current.filter(item => item.id !== fileId));
            setSuccessMessage('File deleted.');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Drive</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Upload and organize images or PDFs in one place with visual preview cards.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Upload to Drive</h3>
                <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleUpload}>
                    <div>
                        <label htmlFor="drive-file" className="label">
                            Image or PDF file (max 20MB)
                        </label>
                        <input
                            ref={fileInputRef}
                            id="drive-file"
                            type="file"
                            accept=".pdf,application/pdf,image/*"
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
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                            {uploading ? 'Uploading...' : 'Upload File'}
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
                    <h3 className="text-base font-semibold text-slate-100 md:text-lg">Drive Files</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">{fileCountLabel}</p>
                        {files.length > 0 ? (
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={refreshingLinks}
                                onClick={() => void loadFiles(false)}
                            >
                                {refreshingLinks ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                {refreshingLinks ? 'Refreshing...' : 'Refresh Links'}
                            </button>
                        ) : null}
                    </div>
                </div>

                {loadingList ? (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-8 text-center text-slate-400">
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading drive files...
                        </span>
                    </div>
                ) : files.length === 0 ? (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-8 text-center text-slate-400">
                        No files uploaded yet.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {files.map(item => {
                            const safeDownloadUrl = toSafeExternalUrl(item.download_url);
                            const previewUrl = safeDownloadUrl ? toPdfPreviewUrl(safeDownloadUrl) : null;
                            const isDeleting = deletingId === item.id;
                            const isImage = isImageFile(item);
                            const isPdf = isPdfFile(item);

                            return (
                                <article
                                    key={item.id}
                                    className="overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-cyan-950/25 shadow-[0_18px_36px_rgba(2,6,23,0.45)]"
                                >
                                    <div className="relative h-36 border-b border-slate-700/70 bg-slate-950/80">
                                        {safeDownloadUrl && isImage ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={safeDownloadUrl}
                                                    alt={`${item.file_name} preview`}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </>
                                        ) : safeDownloadUrl && isPdf && previewUrl ? (
                                            <iframe
                                                src={previewUrl}
                                                title={`${item.file_name} preview`}
                                                className="pointer-events-none h-full w-full border-0"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                                                {isImage ? (
                                                    <FileImage className="h-7 w-7 text-slate-400" />
                                                ) : (
                                                    <FileText className="h-7 w-7 text-slate-400" />
                                                )}
                                            </div>
                                        )}

                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
                                        <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] font-medium uppercase tracking-wide text-cyan-100/90">
                                            {isPdf ? 'PDF Preview' : isImage ? 'Image Preview' : 'File Preview'}
                                        </p>
                                    </div>

                                    <div className="space-y-3 p-4">
                                        <div>
                                            <p className="line-clamp-2 text-base font-semibold text-slate-100">
                                                {item.file_name}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {formatFileSize(item.file_size_bytes)} • {item.mime_type}
                                            </p>
                                        </div>

                                        <p className="text-xs text-slate-400">
                                            Uploaded on {new Date(item.created_at).toLocaleDateString()}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {safeDownloadUrl ? (
                                                <a
                                                    href={safeDownloadUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-primary"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    Open
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => void loadFiles(false)}
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    Refresh Link
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="btn-danger"
                                                disabled={isDeleting}
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                {isDeleting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
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
