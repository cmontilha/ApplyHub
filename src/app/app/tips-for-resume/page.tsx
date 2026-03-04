export default function TipsForResumePage() {
    const coreTips = [
        {
            title: 'Keep It Results-Focused',
            description:
                'Use bullet points with measurable outcomes, such as revenue impact, latency reduction, conversion gain, or cost savings.',
            example: 'Reduced page load time by 38%, improving checkout conversion by 11%.',
        },
        {
            title: 'Customize for Each Role',
            description:
                'Match your wording to the job description and prioritize the most relevant projects and technologies for that vacancy.',
            example: 'If the role asks for React and TypeScript, move those projects to the top.',
        },
        {
            title: 'Use Strong Action Verbs',
            description:
                'Start each bullet with action verbs and avoid vague phrases. Make ownership and impact clear.',
            example: 'Designed, implemented, automated, optimized, led, migrated, reduced.',
        },
        {
            title: 'Show Depth and Ownership',
            description:
                'Highlight scope, architecture decisions, and collaboration with product/design/stakeholders.',
            example: 'Led migration from legacy API to typed gateway used by 4 teams.',
        },
    ];

    const structureChecklist = [
        'Header with Name, Email, LinkedIn, Portfolio/GitHub',
        '2-3 line summary aligned with target role',
        'Experience with impact-first bullets',
        'Projects with stack + outcomes',
        'Skills grouped by category (Languages, Frontend, Backend, Cloud)',
        'Education and relevant certifications',
    ];

    const quickAudit = [
        'One page for early/mid-level profiles when possible',
        'Consistent date format and tense',
        'No grammar errors or broken links',
        'No generic buzzwords without proof',
        'ATS-friendly layout (no complex columns/tables in the main resume)',
    ];

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Tips for Resume</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Practical guidelines to make your resume clearer, stronger, and more competitive.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Core Resume Tips</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    {coreTips.map(tip => (
                        <article
                            key={tip.title}
                            className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4"
                        >
                            <h4 className="text-sm font-semibold text-slate-100">{tip.title}</h4>
                            <p className="mt-1 text-sm text-slate-300">{tip.description}</p>
                            <p className="mt-2 text-xs text-cyan-200/90">
                                <span className="font-semibold text-cyan-100">Example:</span> {tip.example}
                            </p>
                        </article>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Recommended Structure</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        {structureChecklist.map(item => (
                            <li key={item} className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-3 py-2">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Quick 5-Minute Audit</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        {quickAudit.map(item => (
                            <li key={item} className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-3 py-2">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="card border-cyan-400/25 bg-cyan-500/10 p-4">
                <p className="text-sm text-cyan-100">
                    Tip: when you apply to a role, mirror the job description keywords in your resume and
                    keep examples evidence-based. This usually improves ATS matching and recruiter screening.
                </p>
            </div>
        </section>
    );
}
