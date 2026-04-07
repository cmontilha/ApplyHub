export default function TipsForResumePage() {
    const coreTips = [
        {
            title: 'Foque em resultados',
            description:
                'Use bullets com resultados mensuraveis, como impacto em receita, reducao de latencia, ganho de conversao ou economia de custos.',
            example: 'Reduzi o tempo de carregamento em 38%, elevando a conversao do checkout em 11%.',
        },
        {
            title: 'Personalize para cada vaga',
            description:
                'Ajuste sua linguagem para a descricao da vaga e priorize projetos e tecnologias mais relevantes.',
            example: 'Se a vaga pede React e TypeScript, coloque esses projetos no topo.',
        },
        {
            title: 'Use verbos de acao fortes',
            description:
                'Comece cada bullet com verbos de acao e evite frases vagas. Deixe autoria e impacto claros.',
            example: 'Desenhei, implementei, automatizei, otimizei, liderei, migrei, reduzi.',
        },
        {
            title: 'Mostre profundidade e protagonismo',
            description:
                'Destaque escopo, decisoes de arquitetura e colaboracao com produto/design/stakeholders.',
            example: 'Liderei a migracao de uma API legada para gateway tipado usado por 4 times.',
        },
    ];

    const structureChecklist = [
        'Cabecalho com nome, email, LinkedIn e portfolio/GitHub',
        'Resumo de 2-3 linhas alinhado com a vaga-alvo',
        'Experiencias com bullets focados em impacto',
        'Projetos com stack + resultados',
        'Habilidades por categoria (Linguagens, Frontend, Backend, Cloud)',
        'Formacao e certificacoes relevantes',
    ];

    const quickAudit = [
        'Uma pagina para perfis junior/pleno quando possivel',
        'Formato de data e tempo verbal consistentes',
        'Sem erros gramaticais ou links quebrados',
        'Sem buzzwords genericas sem evidencia',
        'Layout amigavel para ATS (sem colunas/tabelas complexas no curriculo principal)',
    ];

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-100">Dicas para curriculo</h2>
                <p className="mt-1 text-sm text-slate-300">
                    Diretrizes praticas para deixar seu curriculo mais claro, forte e competitivo.
                </p>
            </header>

            <div className="card p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">Dicas essenciais de curriculo</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    {coreTips.map(tip => (
                        <article
                            key={tip.title}
                            className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4"
                        >
                            <h4 className="text-sm font-semibold text-slate-100">{tip.title}</h4>
                            <p className="mt-1 text-sm text-slate-300">{tip.description}</p>
                            <p className="mt-2 text-xs text-cyan-200/90">
                                <span className="font-semibold text-cyan-100">Exemplo:</span> {tip.example}
                            </p>
                        </article>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Estrutura recomendada</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        {structureChecklist.map(item => (
                            <li key={item} className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-3 py-2">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Auditoria rapida de 5 minutos</h3>
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
                    Dica: ao aplicar para uma vaga, reflita as palavras-chave da descricao no curriculo e
                    mantenha exemplos baseados em evidencia. Isso costuma melhorar o matching no ATS e a triagem de recrutadores.
                </p>
            </div>
        </section>
    );
}
