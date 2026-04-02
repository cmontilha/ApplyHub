'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    Briefcase,
    Building2,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
    FileText,
    Globe2,
    GraduationCap,
    HardDrive,
    Linkedin,
    Link2,
    MessageSquare,
    Users,
} from 'lucide-react';

type NavItem = {
    href: string;
    label: string;
    icon: typeof BarChart3;
};

type NavSection = {
    title: string;
    items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Overview',
        items: [{ href: '/app/dashboard', label: 'Dashboard', icon: BarChart3 }],
    },
    {
        title: 'Pipeline',
        items: [
            { href: '/app/applications', label: 'Applications', icon: Briefcase },
            { href: '/app/companies', label: 'Companies', icon: Building2 },
            { href: '/app/networking', label: 'Networking', icon: Users },
            { href: '/app/websites-to-apply', label: 'Websites To Apply', icon: Globe2 },
        ],
    },
    {
        title: 'Library',
        items: [
            { href: '/app/links', label: 'Links', icon: Link2 },
            { href: '/app/drive', label: 'Drive', icon: HardDrive },
        ],
    },
    {
        title: 'Career Assets',
        items: [
            { href: '/app/resumes', label: 'Resumes', icon: FolderOpen },
            { href: '/app/pitch', label: 'Pitch', icon: MessageSquare },
            { href: '/app/certifications', label: 'Certifications', icon: GraduationCap },
            { href: '/app/tips-for-resume', label: 'Tips for Resume', icon: FileText },
            { href: '/app/linkedin-content', label: 'LinkedIn Content', icon: Linkedin },
        ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const persisted = window.localStorage.getItem('applyhub-sidebar-collapsed');
        if (persisted === '1') {
            setIsCollapsed(true);
        }
    }, []);

    function handleToggle() {
        setIsCollapsed(current => {
            const next = !current;
            window.localStorage.setItem('applyhub-sidebar-collapsed', next ? '1' : '0');
            return next;
        });
    }

    return (
        <aside
            className={`w-full border-b border-cyan-400/20 bg-gradient-to-b from-[#031029] via-[#08204a] to-[#0a2d66] md:flex md:h-full md:shrink-0 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:border-r-cyan-400/20 md:transition-[width] md:duration-300 ${
                isCollapsed ? 'md:w-20' : 'md:w-64'
            }`}
        >
            <div className="px-4 py-4">
                <Link
                    href="/app/dashboard"
                    title="Go to dashboard"
                    className={`flex min-w-0 items-center gap-3 rounded-xl border border-transparent p-1 transition-colors duration-200 hover:border-cyan-300/30 hover:bg-cyan-400/10 ${
                        isCollapsed ? 'md:justify-center' : ''
                    }`}
                >
                    <Image
                        src="/brand/applyhub-logo.png"
                        alt="ApplyHub logo"
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg border border-cyan-300/50 bg-slate-900/70 object-cover p-0.5"
                    />
                    <div className={`${isCollapsed ? 'md:hidden' : ''}`}>
                        <h1 className="text-2xl font-bold text-slate-100">ApplyHub</h1>
                    </div>
                </Link>
            </div>

            <nav className="space-y-3 px-4 pb-4 md:space-y-4 md:pb-0">
                {NAV_SECTIONS.map(section => (
                    <section key={section.title} className="space-y-1.5">
                        <p
                            className={`px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 ${
                                isCollapsed ? 'md:hidden' : ''
                            }`}
                        >
                            {section.title}
                        </p>

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-1 md:gap-1">
                            {section.items.map(item => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={`${section.title} • ${item.label}`}
                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
                                            isActive
                                                ? 'border-cyan-300/50 bg-cyan-300/20 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]'
                                                : 'border-transparent text-slate-300 hover:border-cyan-300/30 hover:bg-slate-800/50 hover:text-slate-100'
                                        } ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className={`${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </nav>

            <div className="px-4 pb-4 pt-4 md:mt-auto">
                <button
                    type="button"
                    onClick={handleToggle}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={`inline-flex w-full items-center gap-2 rounded-xl border border-cyan-300/30 bg-transparent px-4 py-2 text-sm font-medium text-slate-100 transition-all duration-200 hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0 ${
                        isCollapsed ? 'md:justify-center md:px-2' : 'justify-center'
                    }`}
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    <span className={`${isCollapsed ? 'md:hidden' : ''}`}>
                        {isCollapsed ? 'Expand' : 'Collapse'}
                    </span>
                </button>
            </div>
        </aside>
    );
}
