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
    birthday_date: string;
    notes: string;
};

function getHojeLocalDate() {
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
        last_contact_at: getHojeLocalDate(),
        birthday_date: '',
        notes: '',
    };
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Algo deu errado';
}

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Falha na requisicao');
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
            setSuccessMessage('Contato adicionado.');
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
            birthday_date: contact.birthday_date ?? '',
            notes: contact.notes ?? '',
        });
    }

    function cancelEditar() {
        setEditingId(null);
        setEditingValues(getInitialFormState());
    }

    async function saveEditar(contactId: string) {
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
            cancelEditar();
            setSuccessMessage('Contato atualizado.');
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        } finally {
            setSavingRowId(null);
        }
    }

    async function handleDelete(contactId: string) {
        const confirmed = window.confirm('Excluir este contato?');
        if (!confirmed) return;

        setDeletingRowId(contactId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/networking/${contactId}`, { method: 'DELETE' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Falha na requisicao');
            }

            setContacts(current => current.filter(item => item.id !== contactId));
            if (editingId === contactId) {
                cancelEditar();
            }
            setSuccessMessage('Contato removido.');
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
            setSuccessMessage('Follow-up atualizado. Proxima revisao agendada para 5 meses.');
        } catch (followUpError) {
            setError(getErrorMessage(followUpError));
        } finally {
            setFollowUpRowId(null);
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Rede de contatos</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Gerencie pessoas, contatos e seu ciclo de follow-up de 5 meses.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Adicionar contato</h3>
                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreate}>
                    <div>
                        <label className="label" htmlFor="name">
                            Nome *
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
                            Empresa
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
                            Cargo
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
                            Ultimo contato *
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
                        <label className="label" htmlFor="birthday_date">
                            Aniversario
                        </label>
                        <input
                            id="birthday_date"
                            type="date"
                            className="input"
                            value={formValues.birthday_date}
                            onChange={event =>
                                setFormValues(current => ({
                                    ...current,
                                    birthday_date: event.target.value,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="phone">
                            Telefone
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
                            Observacoes
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
                            Adicione pelo menos um meio de contato (email, telefone ou LinkedIn).
                        </p>
                        <button
                            className="btn-primary"
                            type="submit"
                            disabled={submitting || !hasContactMethod}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? 'Salvando...' : 'Adicionar contato'}
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
                            <th>Nome</th>
                            <th>Empresa</th>
                            <th>Cargo</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>LinkedIn</th>
                            <th>Aniversario</th>
                            <th>Ultimo contato</th>
                            <th>Proximo follow-up</th>
                            <th>Observacoes</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingList ? (
                            <tr>
                                <td colSpan={11} className="py-12 text-center text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando contatos...
                                    </span>
                                </td>
                            </tr>
                        ) : contacts.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="py-12 text-center text-slate-400">
                                    Nenhum contato adicionado.
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
                                                    Perfil <ExternalLink className="h-3 w-3" />
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
                                                    value={editingValues.birthday_date}
                                                    onChange={event =>
                                                        setEditingValues(current => ({
                                                            ...current,
                                                            birthday_date: event.target.value,
                                                        }))
                                                    }
                                                />
                                            ) : (
                                                formatDate(contact.birthday_date)
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
                                                            onClick={() => saveEditar(contact.id)}
                                                        >
                                                            {savingRowId === contact.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                            Salvar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-secondary"
                                                            disabled={rowBusy}
                                                            onClick={cancelEditar}
                                                        >
                                                            <X className="h-4 w-4" />
                                                            Cancelar
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
                                                        Editar
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
                                                    Follow-up concluido
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
                                                    Excluir
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
