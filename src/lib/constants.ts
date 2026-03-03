import type {
    ApplicationCategory,
    ApplicationStatus,
    CertDifficulty,
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

export function toLabel(value: string) {
    return value
        .split('_')
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}
