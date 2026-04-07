import type {
    ApplicationCategory,
    ApplicationStatus,
    CertDifficulty,
    LinkedinContentStatus,
    WebsiteApplicationType,
    WorkMode,
} from '@/types/database';

export const WORK_MODE_OPTIONS: WorkMode[] = ['onsite', 'hybrid', 'remote'];
export const APPLICATION_STATUS_OPTIONS: ApplicationStatus[] = [
    'applied',
    'in_progress',
    'interview',
    'rejected',
    'offer',
];
export const APPLICATION_CATEGORY_OPTIONS: ApplicationCategory[] = [
    'referral',
    'no_referral',
    'recruiter_contact',
];
export const CERT_DIFFICULTY_OPTIONS: CertDifficulty[] = ['easy', 'medium', 'hard'];
export const WEBSITE_APPLICATION_TYPE_OPTIONS: WebsiteApplicationType[] = [
    'both',
    'nacional',
    'internacional',
];
export const LINKEDIN_CONTENT_STATUS_OPTIONS: LinkedinContentStatus[] = [
    'planned',
    'scheduled',
    'posted',
    'not_done',
];

export function toLabel(value: string) {
    const labels: Record<string, string> = {
        onsite: 'Presencial',
        hybrid: 'Hibrido',
        remote: 'Remoto',
        applied: 'Aplicado',
        in_progress: 'Em andamento',
        interview: 'Entrevista',
        rejected: 'Rejeitado',
        offer: 'Oferta',
        referral: 'Indicacao',
        no_referral: 'Sem indicacao',
        recruiter_contact: 'Contato de recrutador',
        easy: 'Facil',
        medium: 'Medio',
        hard: 'Dificil',
        both: 'Nacional e internacional',
        nacional: 'Nacional',
        internacional: 'Internacional',
        planned: 'Planejado',
        scheduled: 'Agendado',
        posted: 'Publicado',
        not_done: 'Nao feito',
    };

    const translated = labels[value];
    if (translated) {
        return translated;
    }

    return value
        .split('_')
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}
