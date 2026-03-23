'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CheckCircle2, Edit3, Loader2, Save, Trash2, X } from 'lucide-react';
import { toLabel } from '@/lib/constants';
import type { ApplicationCategory, ApplicationStatus, WorkMode } from '@/types/database';

type DashboardFollowUpItem = {
    id: string;
    name: string;
    company: string | null;
    role_title: string | null;
    last_contact_at: string | null;
    next_follow_up_at: string;
    days_until_follow_up: number;
    is_overdue: boolean;
};

type DashboardWebsiteItem = {
    id: string;
    name: string;
    website_url: string;
    type: 'both' | 'nacional' | 'internacional';
    created_at: string;
};

type DashboardCompanyItem = {
    id: string;
    name: string;
    website_url: string | null;
    contacts: string | null;
    notes: string | null;
    created_at: string;
};

type DashboardCompanyFormValues = {
    name: string;
    website_url: string;
    contacts: string;
    notes: string;
};

type DashboardPitchItem = {
    id: string;
    name: string;
    pitch: string;
    created_at: string;
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
    applications_list: DashboardApplicationItem[];
    websites_to_apply: DashboardWebsiteItem[];
    companies: DashboardCompanyItem[];
    pitches: DashboardPitchItem[];
    networking_followups: DashboardFollowUpItem[];
};

type ChartView = 'monthly' | 'yearly';
type PaginationItem = number | 'ellipsis';

type DashboardApplicationItem = {
    id: string;
    applied_date: string;
    company: string;
    role_title: string;
    work_mode: WorkMode;
    location: string | null;
    job_url: string | null;
    status: ApplicationStatus;
    category: ApplicationCategory;
    recruiter_contact_notes: string | null;
    notes: string | null;
};

const APPLICATIONS_PER_PAGE = 10;
const WATCH_LIST_PER_PAGE = 10;
const WEBSITES_PER_PAGE = 5;
const COMPANIES_PER_PAGE = 3;
const FOLLOW_UPS_PER_PAGE = 5;

function getInitialCompanyFormState(): DashboardCompanyFormValues {
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

function getPitchPreview(value: string) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 160) return normalized;
    return `${normalized.slice(0, 160)}...`;
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
    if (totalPages <= 1) return [1];

    const pages = new Set<number>([1, totalPages]);

    for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
        if (page > 1 && page < totalPages) {
            pages.add(page);
        }
    }

    if (currentPage <= 3) {
        for (let page = 2; page <= Math.min(4, totalPages - 1); page += 1) {
            pages.add(page);
        }
    }

    if (currentPage >= totalPages - 2) {
        for (let page = Math.max(2, totalPages - 3); page < totalPages; page += 1) {
            pages.add(page);
        }
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const items: PaginationItem[] = [];

    sortedPages.forEach((page, index) => {
        const previousPage = sortedPages[index - 1];
        if (index > 0 && previousPage !== undefined && page - previousPage > 1) {
            items.push('ellipsis');
        }
        items.push(page);
    });

    return items;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followUpSubmittingId, setFollowUpSubmittingId] = useState<string | null>(null);
    const [chartView, setChartView] = useState<ChartView>('monthly');
    const [companyFilter, setCompanyFilter] = useState('');
    const [companiesFilter, setCompaniesFilter] = useState('');
    const [applicationsPage, setApplicationsPage] = useState(1);
    const [watchListPage, setWatchListPage] = useState(1);
    const [websitesPage, setWebsitesPage] = useState(1);
    const [companiesPage, setCompaniesPage] = useState(1);
    const [followUpsPage, setFollowUpsPage] = useState(1);
    const [activePitch, setActivePitch] = useState<DashboardPitchItem | null>(null);
    const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
    const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
    const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
    const [editingCompanyValues, setEditingCompanyValues] = useState<DashboardCompanyFormValues>(
        getInitialCompanyFormState
    );
    const [savingCompanyId, setSavingCompanyId] = useState<string | null>(null);
    const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

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

    useEffect(() => {
        setApplicationsPage(1);
    }, [companyFilter, data?.applications_list.length]);

    useEffect(() => {
        setFollowUpsPage(1);
    }, [data?.networking_followups.length]);

    useEffect(() => {
        setWebsitesPage(1);
    }, [data?.websites_to_apply.length]);

    useEffect(() => {
        setCompaniesPage(1);
    }, [companiesFilter, data?.companies.length]);

    useEffect(() => {
        if (!activePitch) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsPitchModalOpen(false);
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
        if (isPitchModalOpen || !activePitch) return;
        const timer = window.setTimeout(() => setActivePitch(null), 180);
        return () => window.clearTimeout(timer);
    }, [activePitch, isPitchModalOpen]);

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

    const summaryCards = useMemo(() => {
        const metrics = data ?? {
            total_applications: 0,
            total_interviews: 0,
            total_rejected: 0,
            total_offers: 0,
            referral_count: 0,
        };
        const watchListCount = (data?.applications_list ?? []).filter(
            item => item.status === 'in_progress' || item.status === 'interview'
        ).length;

        const defaultToneClass =
            'border-cyan-300/20 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-blue-950/80';

        return [
            {
                label: 'Total Applications',
                value: metrics.total_applications,
                toneClass: defaultToneClass,
                valueClass: 'text-slate-100',
            },
            {
                label: 'Watch List Applications',
                value: watchListCount,
                toneClass: defaultToneClass,
                valueClass: 'text-slate-100',
            },
            {
                label: 'Total Interviews',
                value: metrics.total_interviews,
                toneClass:
                    'border-amber-300/30 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-amber-950/50',
                valueClass: 'text-amber-200',
            },
            {
                label: 'Total Rejected',
                value: metrics.total_rejected,
                toneClass:
                    'border-red-300/30 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-red-950/50',
                valueClass: 'text-red-200',
            },
            {
                label: 'Total Offers',
                value: metrics.total_offers,
                toneClass:
                    'border-emerald-300/30 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-emerald-950/50',
                valueClass: 'text-emerald-200',
            },
            {
                label: 'Referral Ratio',
                value: referralRatio,
                toneClass: defaultToneClass,
                valueClass: 'text-slate-100',
            },
        ];
    }, [data, referralRatio]);

    const displayChartData = useMemo(() => {
        if (chartView !== 'monthly') {
            return chartMeta.data;
        }

        return chartMeta.data.map(item => {
            if ('month' in item && item.month === 'Mar 2026') {
                return {
                    ...item,
                    count: item.count + 2,
                };
            }

            return item;
        });
    }, [chartMeta.data, chartView]);

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

    const watchListApplications = useMemo(() => {
        if (!data) return [];

        return data.applications_list.filter(
            item => item.status === 'in_progress' || item.status === 'interview'
        );
    }, [data]);

    useEffect(() => {
        setWatchListPage(1);
    }, [watchListApplications.length]);

    const totalWatchListPages = useMemo(() => {
        return Math.max(1, Math.ceil(watchListApplications.length / WATCH_LIST_PER_PAGE));
    }, [watchListApplications.length]);

    const watchListPaginationItems = useMemo(
        () => getPaginationItems(watchListPage, totalWatchListPages),
        [watchListPage, totalWatchListPages]
    );

    useEffect(() => {
        if (watchListPage > totalWatchListPages) {
            setWatchListPage(totalWatchListPages);
        }
    }, [watchListPage, totalWatchListPages]);

    const paginatedWatchListApplications = useMemo(() => {
        const safePage = Math.min(watchListPage, totalWatchListPages);
        const startIndex = (safePage - 1) * WATCH_LIST_PER_PAGE;
        return watchListApplications.slice(startIndex, startIndex + WATCH_LIST_PER_PAGE);
    }, [watchListApplications, watchListPage, totalWatchListPages]);

    const watchListPageSummary = useMemo(() => {
        if (watchListApplications.length === 0) {
            return 'Showing 0 of 0';
        }

        const safePage = Math.min(watchListPage, totalWatchListPages);
        const startIndex = (safePage - 1) * WATCH_LIST_PER_PAGE;
        const from = startIndex + 1;
        const to = Math.min(startIndex + WATCH_LIST_PER_PAGE, watchListApplications.length);
        return `Showing ${from}-${to} of ${watchListApplications.length}`;
    }, [watchListApplications.length, watchListPage, totalWatchListPages]);

    const watchListMetrics = useMemo(() => {
        let inProgress = 0;
        let interview = 0;

        for (const item of watchListApplications) {
            if (item.status === 'in_progress') {
                inProgress += 1;
                continue;
            }
            if (item.status === 'interview') {
                interview += 1;
            }
        }

        return { inProgress, interview };
    }, [watchListApplications]);

    const filteredApplications = useMemo(() => {
        if (!data) return [];
        const normalizedFilter = companyFilter.trim().toLowerCase();
        if (!normalizedFilter) return data.applications_list;
        return data.applications_list.filter(item =>
            item.company.toLowerCase().includes(normalizedFilter) ||
            item.role_title.toLowerCase().includes(normalizedFilter)
        );
    }, [companyFilter, data]);

    const totalApplicationsPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredApplications.length / APPLICATIONS_PER_PAGE));
    }, [filteredApplications.length]);
    const applicationsPaginationItems = useMemo(
        () => getPaginationItems(applicationsPage, totalApplicationsPages),
        [applicationsPage, totalApplicationsPages]
    );

    useEffect(() => {
        if (applicationsPage > totalApplicationsPages) {
            setApplicationsPage(totalApplicationsPages);
        }
    }, [applicationsPage, totalApplicationsPages]);

    const paginatedApplications = useMemo(() => {
        const safePage = Math.min(applicationsPage, totalApplicationsPages);
        const startIndex = (safePage - 1) * APPLICATIONS_PER_PAGE;
        return filteredApplications.slice(startIndex, startIndex + APPLICATIONS_PER_PAGE);
    }, [applicationsPage, filteredApplications, totalApplicationsPages]);

    const applicationsPageSummary = useMemo(() => {
        if (filteredApplications.length === 0) {
            return 'Showing 0 of 0';
        }

        const safePage = Math.min(applicationsPage, totalApplicationsPages);
        const startIndex = (safePage - 1) * APPLICATIONS_PER_PAGE;
        const from = startIndex + 1;
        const to = Math.min(startIndex + APPLICATIONS_PER_PAGE, filteredApplications.length);
        return `Showing ${from}-${to} of ${filteredApplications.length}`;
    }, [applicationsPage, filteredApplications.length, totalApplicationsPages]);

    const totalWebsitesPages = useMemo(() => {
        if (!data) return 1;
        return Math.max(1, Math.ceil(data.websites_to_apply.length / WEBSITES_PER_PAGE));
    }, [data]);
    const websitesPaginationItems = useMemo(
        () => getPaginationItems(websitesPage, totalWebsitesPages),
        [websitesPage, totalWebsitesPages]
    );

    useEffect(() => {
        if (websitesPage > totalWebsitesPages) {
            setWebsitesPage(totalWebsitesPages);
        }
    }, [websitesPage, totalWebsitesPages]);

    const paginatedWebsites = useMemo(() => {
        if (!data) return [];
        const safePage = Math.min(websitesPage, totalWebsitesPages);
        const startIndex = (safePage - 1) * WEBSITES_PER_PAGE;
        return data.websites_to_apply.slice(startIndex, startIndex + WEBSITES_PER_PAGE);
    }, [data, websitesPage, totalWebsitesPages]);

    const websitesPageSummary = useMemo(() => {
        if (!data || data.websites_to_apply.length === 0) {
            return 'Showing 0 of 0';
        }

        const safePage = Math.min(websitesPage, totalWebsitesPages);
        const startIndex = (safePage - 1) * WEBSITES_PER_PAGE;
        const from = startIndex + 1;
        const to = Math.min(startIndex + WEBSITES_PER_PAGE, data.websites_to_apply.length);
        return `Showing ${from}-${to} of ${data.websites_to_apply.length}`;
    }, [data, websitesPage, totalWebsitesPages]);

    const filteredCompanies = useMemo(() => {
        if (!data) return [];

        const normalizedFilter = companiesFilter.trim().toLowerCase();
        if (!normalizedFilter) return data.companies;

        return data.companies.filter(item => item.name.toLowerCase().includes(normalizedFilter));
    }, [companiesFilter, data]);

    const totalCompaniesPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredCompanies.length / COMPANIES_PER_PAGE));
    }, [filteredCompanies.length]);
    const companiesPaginationItems = useMemo(
        () => getPaginationItems(companiesPage, totalCompaniesPages),
        [companiesPage, totalCompaniesPages]
    );

    useEffect(() => {
        if (companiesPage > totalCompaniesPages) {
            setCompaniesPage(totalCompaniesPages);
        }
    }, [companiesPage, totalCompaniesPages]);

    const paginatedCompanies = useMemo(() => {
        const safePage = Math.min(companiesPage, totalCompaniesPages);
        const startIndex = (safePage - 1) * COMPANIES_PER_PAGE;
        return filteredCompanies.slice(startIndex, startIndex + COMPANIES_PER_PAGE);
    }, [companiesPage, filteredCompanies, totalCompaniesPages]);

    const companiesPageSummary = useMemo(() => {
        if (filteredCompanies.length === 0) {
            return 'Showing 0 of 0';
        }

        const safePage = Math.min(companiesPage, totalCompaniesPages);
        const startIndex = (safePage - 1) * COMPANIES_PER_PAGE;
        const from = startIndex + 1;
        const to = Math.min(startIndex + COMPANIES_PER_PAGE, filteredCompanies.length);
        return `Showing ${from}-${to} of ${filteredCompanies.length}`;
    }, [companiesPage, filteredCompanies.length, totalCompaniesPages]);

    const totalFollowUpsPages = useMemo(() => {
        if (!data) return 1;
        return Math.max(1, Math.ceil(data.networking_followups.length / FOLLOW_UPS_PER_PAGE));
    }, [data]);
    const followUpsPaginationItems = useMemo(
        () => getPaginationItems(followUpsPage, totalFollowUpsPages),
        [followUpsPage, totalFollowUpsPages]
    );

    useEffect(() => {
        if (followUpsPage > totalFollowUpsPages) {
            setFollowUpsPage(totalFollowUpsPages);
        }
    }, [followUpsPage, totalFollowUpsPages]);

    const paginatedFollowUps = useMemo(() => {
        if (!data) return [];
        const safePage = Math.min(followUpsPage, totalFollowUpsPages);
        const startIndex = (safePage - 1) * FOLLOW_UPS_PER_PAGE;
        return data.networking_followups.slice(startIndex, startIndex + FOLLOW_UPS_PER_PAGE);
    }, [data, followUpsPage, totalFollowUpsPages]);

    const followUpsPageSummary = useMemo(() => {
        if (!data || data.networking_followups.length === 0) {
            return 'Showing 0 of 0';
        }

        const safePage = Math.min(followUpsPage, totalFollowUpsPages);
        const startIndex = (safePage - 1) * FOLLOW_UPS_PER_PAGE;
        const from = startIndex + 1;
        const to = Math.min(startIndex + FOLLOW_UPS_PER_PAGE, data.networking_followups.length);
        return `Showing ${from}-${to} of ${data.networking_followups.length}`;
    }, [data, followUpsPage, totalFollowUpsPages]);

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

    async function handleDeleteDashboardApplication(applicationId: string) {
        const confirmed = window.confirm('Delete this application?');
        if (!confirmed) return;

        setDeletingApplicationId(applicationId);
        setError(null);

        try {
            const response = await fetch(`/api/applications/${applicationId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            await loadDashboard();
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingApplicationId(null);
        }
    }

    function startEditCompany(company: DashboardCompanyItem) {
        setEditingCompanyId(company.id);
        setEditingCompanyValues({
            name: company.name,
            website_url: company.website_url ?? '',
            contacts: company.contacts ?? '',
            notes: company.notes ?? '',
        });
    }

    function cancelEditCompany() {
        setEditingCompanyId(null);
        setEditingCompanyValues(getInitialCompanyFormState());
    }

    async function saveEditCompany(companyId: string) {
        setSavingCompanyId(companyId);
        setError(null);

        try {
            const updated = await parseResponse<DashboardCompanyItem>(
                await fetch(`/api/companies/${companyId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingCompanyValues),
                })
            );

            setData(current =>
                current
                    ? {
                          ...current,
                          companies: current.companies.map(item =>
                              item.id === companyId ? updated : item
                          ),
                      }
                    : current
            );
            cancelEditCompany();
        } catch (saveError) {
            setError(getErrorMessage(saveError));
        } finally {
            setSavingCompanyId(null);
        }
    }

    async function handleDeleteCompany(companyId: string) {
        const confirmed = window.confirm('Delete this company?');
        if (!confirmed) return;

        setDeletingCompanyId(companyId);
        setError(null);

        try {
            const response = await fetch(`/api/companies/${companyId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error ?? 'Request failed');
            }

            setData(current =>
                current
                    ? {
                          ...current,
                          companies: current.companies.filter(item => item.id !== companyId),
                      }
                    : current
            );

            if (editingCompanyId === companyId) {
                cancelEditCompany();
            }
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingCompanyId(null);
        }
    }

    function openPitchDetails(pitch: DashboardPitchItem) {
        setActivePitch(pitch);
        setIsPitchModalOpen(true);
    }

    function closePitchDetails() {
        setIsPitchModalOpen(false);
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

            <div className="grid gap-5 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="space-y-4">
                    {summaryCards.map(card => (
                        <article
                            key={card.label}
                            className={`rounded-2xl px-4 py-2.5 shadow-[0_18px_38px_rgba(2,6,23,0.45)] ${card.toneClass}`}
                        >
                            <p className="text-xs text-slate-400">{card.label}</p>
                            <p className={`mt-1 text-2xl font-bold leading-none ${card.valueClass}`}>{card.value}</p>
                        </article>
                    ))}
                </div>

                <div className="card border-cyan-300/20 bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-blue-950/65 p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-2xl font-semibold text-slate-100">{chartMeta.title}</h3>
                            <p className="text-sm text-slate-400">{chartMeta.subtitle}</p>
                        </div>

                        <div className="inline-flex rounded-xl border border-slate-600/80 bg-slate-900/80 p-1">
                            <button
                                type="button"
                                onClick={() => setChartView('monthly')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    chartView === 'monthly'
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-300 hover:bg-slate-800/80'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartView('yearly')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    chartView === 'yearly'
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-300 hover:bg-slate-800/80'
                                }`}
                            >
                                Yearly
                            </button>
                        </div>
                    </div>

                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={displayChartData}
                                margin={{
                                    top: 28,
                                    right: 20,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1d2f4f" vertical={false} />
                                <XAxis
                                    dataKey={chartMeta.xKey}
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#020617',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: '#e2e8f0',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#22d3ee"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#67e8f9', stroke: '#0f172a', strokeWidth: 2 }}
                                    label={{ fill: '#cbd5e1', fontSize: 12, position: 'top' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="card p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-100 md:text-lg">
                            Watch List Applications
                        </h3>
                        <p className="text-sm text-slate-300">
                            Track applications with status In Progress or Interview.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="badge border border-cyan-500/40 bg-cyan-500/15 text-cyan-200">
                            In Progress: {watchListMetrics.inProgress}
                        </span>
                        <span className="badge border border-amber-500/40 bg-amber-500/15 text-amber-200">
                            Interview: {watchListMetrics.interview}
                        </span>
                    </div>
                </div>

                {watchListApplications.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        No applications in In Progress or Interview yet.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div className="table-wrapper">
                            <table className="min-w-[1200px]">
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedWatchListApplications.map(application => {
                                        const safeJobUrl = toSafeExternalUrl(application.job_url);
                                        const statusClass =
                                            application.status === 'interview'
                                                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200'
                                                : 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-200';

                                        return (
                                            <tr key={`watch-${application.id}`}>
                                                <td>{application.applied_date}</td>
                                                <td>{application.company}</td>
                                                <td>{application.role_title}</td>
                                                <td>{toLabel(application.work_mode)}</td>
                                                <td>{application.location || '-'}</td>
                                                <td>
                                                    {safeJobUrl ? (
                                                        <a
                                                            href={safeJobUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-cyan-300 hover:underline"
                                                        >
                                                            Open
                                                        </a>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusClass}`}>
                                                        {toLabel(application.status)}
                                                    </span>
                                                </td>
                                                <td>{toLabel(application.category)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">{watchListPageSummary}</p>

                            {watchListApplications.length > WATCH_LIST_PER_PAGE ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={watchListPage <= 1}
                                        onClick={() => setWatchListPage(current => Math.max(1, current - 1))}
                                    >
                                        Previous
                                    </button>

                                    {watchListPaginationItems.map((item, index) =>
                                        item === 'ellipsis' ? (
                                            <span
                                                key={`watchlist-ellipsis-${index}`}
                                                className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-slate-400"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setWatchListPage(item)}
                                                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                                                    watchListPage === item
                                                        ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100'
                                                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-300/40 hover:text-slate-100'
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={watchListPage >= totalWatchListPages}
                                        onClick={() =>
                                            setWatchListPage(current =>
                                                Math.min(totalWatchListPages, current + 1)
                                            )
                                        }
                                    >
                                        Next
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            <div className="card p-4">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-100 md:text-lg">Latest Applications</h3>
                        <p className="text-sm text-slate-300">
                            Showing your most recent applications with pagination.
                        </p>
                    </div>

                    <div className="w-full max-w-sm">
                        <label htmlFor="dashboard-company-filter" className="label">
                            Filter by company or role
                        </label>
                        <input
                            id="dashboard-company-filter"
                            type="text"
                            className="input"
                            placeholder="Search company or role..."
                            value={companyFilter}
                            onChange={event => setCompanyFilter(event.target.value)}
                        />
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="min-w-[1600px]">
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
                                <th className="min-w-[260px]">Recruiter Notes</th>
                                <th className="min-w-[320px]">Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-10 text-center text-slate-400">
                                        No applications found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                paginatedApplications.map(application => {
                                    const safeJobUrl = toSafeExternalUrl(application.job_url);
                                    const deletingRow = deletingApplicationId === application.id;

                                    return (
                                        <tr key={application.id}>
                                            <td>{application.applied_date}</td>
                                            <td>{application.company}</td>
                                            <td>{application.role_title}</td>
                                            <td>{toLabel(application.work_mode)}</td>
                                            <td>{application.location || '-'}</td>
                                            <td>
                                                {safeJobUrl ? (
                                                    <a
                                                        href={safeJobUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-cyan-300 hover:underline"
                                                    >
                                                        Open
                                                    </a>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td>{toLabel(application.status)}</td>
                                            <td>{toLabel(application.category)}</td>
                                            <td className="min-w-[260px] max-w-[360px] whitespace-normal break-words align-top text-slate-300">
                                                {application.recruiter_contact_notes || '-'}
                                            </td>
                                            <td className="min-w-[320px] max-w-[480px] whitespace-normal break-words align-top text-slate-300">
                                                {application.notes || '-'}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-danger"
                                                    disabled={deletingRow}
                                                    onClick={() =>
                                                        handleDeleteDashboardApplication(application.id)
                                                    }
                                                >
                                                    {deletingRow ? (
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">{applicationsPageSummary}</p>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={applicationsPage <= 1}
                            onClick={() =>
                                setApplicationsPage(current => Math.max(1, current - 1))
                            }
                        >
                            Previous
                        </button>

                        {applicationsPaginationItems.map((item, index) =>
                            item === 'ellipsis' ? (
                                <span
                                    key={`applications-ellipsis-${index}`}
                                    className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-slate-400"
                                >
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setApplicationsPage(item)}
                                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                                        applicationsPage === item
                                            ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100'
                                            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-300/40 hover:text-slate-100'
                                    }`}
                                >
                                    {item}
                                </button>
                            )
                        )}

                        <button
                            type="button"
                            className="btn-secondary"
                            disabled={applicationsPage >= totalApplicationsPages}
                            onClick={() =>
                                setApplicationsPage(current =>
                                    Math.min(totalApplicationsPages, current + 1)
                                )
                            }
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <div className="card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-100 md:text-lg">Websites To Apply</h3>
                        <p className="text-sm text-slate-300">
                            Showing your saved websites to apply.
                        </p>
                    </div>
                </div>

                {data.websites_to_apply.length === 0 ? (
                    <p className="text-sm text-slate-400">No websites saved yet.</p>
                ) : (
                    <div className="space-y-3">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Website</th>
                                        <th>Type</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedWebsites.map(item => {
                                        const safeWebsiteUrl = toSafeExternalUrl(item.website_url);
                                        return (
                                            <tr key={item.id}>
                                                <td>{item.name}</td>
                                                <td>
                                                    {safeWebsiteUrl ? (
                                                        <a
                                                            href={safeWebsiteUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-cyan-300 hover:underline"
                                                        >
                                                            Open
                                                        </a>
                                                    ) : (
                                                        item.website_url
                                                    )}
                                                </td>
                                                <td>{toLabel(item.type)}</td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {data.websites_to_apply.length > WEBSITES_PER_PAGE ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-slate-400">{websitesPageSummary}</p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={websitesPage <= 1}
                                        onClick={() =>
                                            setWebsitesPage(current => Math.max(1, current - 1))
                                        }
                                    >
                                        Previous
                                    </button>

                                    {websitesPaginationItems.map((item, index) =>
                                        item === 'ellipsis' ? (
                                            <span
                                                key={`websites-ellipsis-${index}`}
                                                className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-slate-400"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setWebsitesPage(item)}
                                                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                                                    websitesPage === item
                                                        ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100'
                                                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-300/40 hover:text-slate-100'
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={websitesPage >= totalWebsitesPages}
                                        onClick={() =>
                                            setWebsitesPage(current =>
                                                Math.min(totalWebsitesPages, current + 1)
                                            )
                                        }
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="card p-4">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-100 md:text-lg">Companies</h3>
                        <p className="text-sm text-slate-300">Showing your saved companies to apply.</p>
                    </div>

                    <div className="w-full max-w-sm">
                        <label htmlFor="dashboard-companies-filter" className="label">
                            Filter by company or role
                        </label>
                        <input
                            id="dashboard-companies-filter"
                            type="text"
                            className="input"
                            placeholder="Search company..."
                            value={companiesFilter}
                            onChange={event => setCompaniesFilter(event.target.value)}
                        />
                    </div>
                </div>

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
                            {paginatedCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        No companies found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCompanies.map(company => {
                                    const rowBusy =
                                        savingCompanyId === company.id || deletingCompanyId === company.id;
                                    const isEditing = editingCompanyId === company.id;
                                    const safeWebsiteUrl = toSafeExternalUrl(company.website_url);

                                    return (
                                        <tr key={company.id}>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        className="input min-w-[180px]"
                                                        value={editingCompanyValues.name}
                                                        onChange={event =>
                                                            setEditingCompanyValues(current => ({
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
                                                        value={editingCompanyValues.website_url}
                                                        onChange={event =>
                                                            setEditingCompanyValues(current => ({
                                                                ...current,
                                                                website_url: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                ) : safeWebsiteUrl ? (
                                                    <a
                                                        href={safeWebsiteUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-cyan-300 hover:underline"
                                                    >
                                                        Open
                                                    </a>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        className="input min-w-[200px]"
                                                        value={editingCompanyValues.contacts}
                                                        onChange={event =>
                                                            setEditingCompanyValues(current => ({
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
                                                        value={editingCompanyValues.notes}
                                                        onChange={event =>
                                                            setEditingCompanyValues(current => ({
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
                                                                onClick={() => saveEditCompany(company.id)}
                                                            >
                                                                {savingCompanyId === company.id ? (
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
                                                                onClick={cancelEditCompany}
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
                                                            onClick={() => startEditCompany(company)}
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                            Edit
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="btn-danger"
                                                        disabled={rowBusy}
                                                        onClick={() => handleDeleteCompany(company.id)}
                                                    >
                                                        {deletingCompanyId === company.id ? (
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">{companiesPageSummary}</p>

                    {filteredCompanies.length > COMPANIES_PER_PAGE ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={companiesPage <= 1}
                                onClick={() =>
                                    setCompaniesPage(current => Math.max(1, current - 1))
                                }
                            >
                                Previous
                            </button>

                            {companiesPaginationItems.map((item, index) =>
                                item === 'ellipsis' ? (
                                    <span
                                        key={`companies-ellipsis-${index}`}
                                        className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-slate-400"
                                    >
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setCompaniesPage(item)}
                                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                                            companiesPage === item
                                                ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100'
                                                : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-300/40 hover:text-slate-100'
                                        }`}
                                    >
                                        {item}
                                    </button>
                                )
                            )}

                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={companiesPage >= totalCompaniesPages}
                                onClick={() =>
                                    setCompaniesPage(current =>
                                        Math.min(totalCompaniesPages, current + 1)
                                    )
                                }
                            >
                                Next
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-100 md:text-lg">Saved Pitches</h3>
                        <p className="text-sm text-slate-300">Click a card to open full pitch.</p>
                    </div>
                </div>

                {data.pitches.length === 0 ? (
                    <p className="text-sm text-slate-400">No pitches added yet.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {data.pitches.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => openPitchDetails(item)}
                                className="group rounded-2xl border border-amber-300/25 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-amber-950/35 p-4 text-left shadow-[0_18px_36px_rgba(2,6,23,0.45)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-[0_24px_48px_rgba(2,6,23,0.55)]"
                            >
                                <div className="mb-3 h-1.5 w-14 rounded-full bg-amber-300/40 transition-colors group-hover:bg-amber-300/55" />
                                <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-300">
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

            <div className="card p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-100 md:text-lg">Networking Follow-ups</h3>
                        <p className="text-sm text-slate-300">Showing the nearest follow-up dates.</p>
                    </div>

                    <div
                        className={`rounded-lg border px-3 py-2 text-sm font-medium md:max-w-[420px] ${networkingSummary.className}`}
                    >
                        {networkingSummary.text}
                    </div>
                </div>

                {data.networking_followups.length === 0 ? (
                    <p className="text-sm text-slate-400">No follow-ups scheduled yet.</p>
                ) : (
                    <div className="space-y-3">
                        {paginatedFollowUps.map(item => {
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

                        {data.networking_followups.length > FOLLOW_UPS_PER_PAGE ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-slate-400">{followUpsPageSummary}</p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={followUpsPage <= 1}
                                        onClick={() =>
                                            setFollowUpsPage(current => Math.max(1, current - 1))
                                        }
                                    >
                                        Previous
                                    </button>

                                    {followUpsPaginationItems.map((item, index) =>
                                        item === 'ellipsis' ? (
                                            <span
                                                key={`followups-ellipsis-${index}`}
                                                className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-slate-400"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setFollowUpsPage(item)}
                                                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                                                    followUpsPage === item
                                                        ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100'
                                                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-300/40 hover:text-slate-100'
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={followUpsPage >= totalFollowUpsPages}
                                        onClick={() =>
                                            setFollowUpsPage(current =>
                                                Math.min(totalFollowUpsPages, current + 1)
                                            )
                                        }
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {activePitch ? (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
                        isPitchModalOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
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
                            isPitchModalOpen ? 'scale-100' : 'scale-95'
                        }`}
                    >
                        <header className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-100">{activePitch.name}</h3>
                                <p className="text-xs text-slate-400">
                                    Saved on {new Date(activePitch.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={closePitchDetails}
                            >
                                Close
                            </button>
                        </header>

                        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/55 p-4">
                            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                                {activePitch.pitch}
                            </p>
                        </div>
                    </article>
                </div>
            ) : null}
        </section>
    );
}
