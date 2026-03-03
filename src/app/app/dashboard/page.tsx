'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

type DashboardFollowUpItem = {
    id: string;
    name: string;
    company: string | null;
    role_title: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    last_contact_at: string | null;
    next_follow_up_at: string;
    days_until_follow_up: number;
    is_overdue: boolean;
};

type DashboardData = {
    total_applications: number;
    total_interviews: number;
    total_rejected: number;
    total_offers: number;
    referral_count: number;
    no_referral_count: number;
    due_follow_ups: number;
    applications_per_month: Array<{
        month: string;
        count: number;
    }>;
    applications_per_year: Array<{
        year: string;
        count: number;
    }>;
    networking_followups: DashboardFollowUpItem[];
};

type ChartView = 'monthly' | 'yearly';

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

function formatIsoDate(isoDate: string | null) {
    if (!isoDate) return '-';
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllFollowUps, setShowAllFollowUps] = useState(false);
    const [followUpSubmittingId, setFollowUpSubmittingId] = useState<string | null>(null);
    const [chartView, setChartView] = useState<ChartView>('monthly');

    async function loadDashboard() {
        setLoading(true);
        setError(null);

        try {
            const payload = await parseResponse<DashboardData>(await fetch('/api/dashboard'));
            setData(payload);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadDashboard();
    }, []);

    const referralRatio = useMemo(() => {
        if (!data || data.total_applications === 0) return '0%';
        const ratio = (data.referral_count / data.total_applications) * 100;
        return `${ratio.toFixed(0)}%`;
    }, [data]);

    const chartMeta = useMemo(() => {
        if (!data) {
            return {
                title: 'Applications per Month',
                subtitle: 'Grouped by applied date.',
                xKey: 'month' as const,
                data: [] as DashboardData['applications_per_month'],
            };
        }

        if (chartView === 'yearly') {
            return {
                title: 'Applications per Year',
                subtitle: 'Grouped by year.',
                xKey: 'year' as const,
                data: data.applications_per_year,
            };
        }

        return {
            title: 'Applications per Month',
            subtitle: 'Grouped by month and year.',
            xKey: 'month' as const,
            data: data.applications_per_month,
        };
    }, [chartView, data]);

    const networkingSummary = useMemo(() => {
        if (!data) {
            return {
                className: 'border-slate-700/70 bg-slate-900/70 text-slate-200',
                text: 'No follow-up data available.',
            };
        }

        const overdueCount = data.networking_followups.filter(item => item.days_until_follow_up < 0).length;
        const dueTodayCount = data.networking_followups.filter(item => item.days_until_follow_up === 0).length;
        const dueSoonCount = data.networking_followups.filter(
            item => item.days_until_follow_up > 0 && item.days_until_follow_up <= 7
        ).length;

        if (overdueCount > 0) {
            return {
                className: 'border-red-500/40 bg-red-500/15 text-red-200',
                text: `${overdueCount} follow-up${overdueCount > 1 ? 's are' : ' is'} overdue.`,
            };
        }

        if (dueTodayCount > 0) {
            return {
                className: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
                text: `${dueTodayCount} follow-up${dueTodayCount > 1 ? 's are' : ' is'} due today.`,
            };
        }

        if (dueSoonCount > 0) {
            return {
                className: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200',
                text: `${dueSoonCount} follow-up${dueSoonCount > 1 ? 's are' : ' is'} due in the next 7 days.`,
            };
        }

        return {
            className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
            text: 'No overdue follow-ups. Your networking cadence is up to date.',
        };
    }, [data]);

    async function handleMarkFollowUpDone(contactId: string) {
        setFollowUpSubmittingId(contactId);
        setError(null);
        try {
            await parseResponse(
                await fetch(`/api/networking/${contactId}/follow-up`, {
                    method: 'POST',
                })
            );
            await loadDashboard();
        } catch (followUpError) {
            setError(getErrorMessage(followUpError));
        } finally {
            setFollowUpSubmittingId(null);
        }
    }

    if (loading) {
        return (
            <section className="card flex min-h-[280px] items-center justify-center">
                <span className="inline-flex items-center gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading dashboard...
                </span>
            </section>
        );
    }

    if (error) {
        return (
            <section className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {error}
            </section>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Dashboard</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Real-time metrics from your application pipeline.
                </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <article className="card p-4">
                    <p className="text-sm text-slate-400">Total Applications</p>
                    <p className="mt-2 text-3xl font-bold">{data.total_applications}</p>
                </article>

                <article className="card p-4">
                    <p className="text-sm text-slate-400">Total Interviews</p>
                    <p className="mt-2 text-3xl font-bold">{data.total_interviews}</p>
                </article>

                <article className="card p-4">
                    <p className="text-sm text-slate-400">Total Rejected</p>
                    <p className="mt-2 text-3xl font-bold">{data.total_rejected}</p>
                </article>

                <article className="card p-4">
                    <p className="text-sm text-slate-400">Total Offers</p>
                    <p className="mt-2 text-3xl font-bold">{data.total_offers}</p>
                </article>

                <article className="card p-4">
                    <p className="text-sm text-slate-400">Referral Applications</p>
                    <p className="mt-2 text-3xl font-bold">{data.referral_count}</p>
                </article>

                <article className="card p-4">
                    <p className="text-sm text-slate-400">Referral Ratio</p>
                    <p className="mt-2 text-3xl font-bold">{referralRatio}</p>
                </article>
            </div>

            <div className="card p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">{chartMeta.title}</h3>
                        <p className="text-xs text-slate-400">{chartMeta.subtitle}</p>
                    </div>

                    <div className="inline-flex rounded-lg border border-slate-700/70 bg-slate-900/70 p-1">
                        <button
                            type="button"
                            onClick={() => setChartView('monthly')}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                chartView === 'monthly'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-300 hover:bg-slate-800/80'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartView('yearly')}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                chartView === 'yearly'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-300 hover:bg-slate-800/80'
                            }`}
                        >
                            Yearly
                        </button>
                    </div>
                </div>

                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartMeta.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2b47" />
                            <XAxis dataKey={chartMeta.xKey} stroke="#94a3b8" fontSize={12} />
                            <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">Networking Follow-ups</h3>
                        <p className="text-xs text-slate-400">Showing the nearest follow-up dates.</p>
                    </div>
                    {data.networking_followups.length > 5 ? (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowAllFollowUps(current => !current)}
                        >
                            {showAllFollowUps ? (
                                <>
                                    <ChevronUp className="h-4 w-4" /> Show less
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-4 w-4" />
                                    Show all ({data.networking_followups.length})
                                </>
                            )}
                        </button>
                    ) : null}
                </div>

                <div
                    className={`mb-4 rounded-lg border px-3 py-2 text-sm font-medium ${networkingSummary.className}`}
                >
                    {networkingSummary.text}
                </div>

                {data.networking_followups.length === 0 ? (
                    <p className="text-sm text-slate-400">No follow-ups scheduled yet.</p>
                ) : (
                    <div className="space-y-3">
                        {(showAllFollowUps
                            ? data.networking_followups
                            : data.networking_followups.slice(0, 5)
                        ).map(item => {
                            const badgeStyles = item.is_overdue
                                ? 'border border-red-500/40 bg-red-500/15 text-red-200'
                                : item.days_until_follow_up <= 7
                                  ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200'
                                  : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-200';

                            const daysLabel = item.is_overdue
                                ? `${Math.abs(item.days_until_follow_up)}d overdue`
                                : item.days_until_follow_up === 0
                                  ? 'Due today'
                                  : `${item.days_until_follow_up}d left`;

                            return (
                                <article
                                    key={item.id}
                                    className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {[item.company, item.role_title].filter(Boolean).join(' • ') || '-'}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Last contact:{' '}
                                                {formatIsoDate(item.last_contact_at)}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Next follow-up: {formatIsoDate(item.next_follow_up_at)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`badge ${badgeStyles}`}>{daysLabel}</span>
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                onClick={() => handleMarkFollowUpDone(item.id)}
                                                disabled={followUpSubmittingId === item.id}
                                            >
                                                {followUpSubmittingId === item.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                )}
                                                Follow-up done
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
