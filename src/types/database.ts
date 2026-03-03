export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type ApplicationStatus = 'applied' | 'in_progress' | 'interview' | 'rejected' | 'offer';
export type ApplicationCategory = 'referral' | 'no_referral' | 'recruiter_contact';
export type CertDifficulty = 'easy' | 'medium' | 'hard';

export interface Application {
    id: string;
    user_id: string;
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
    created_at: string;
}

export interface Company {
    id: string;
    user_id: string;
    name: string;
    website_url: string | null;
    contacts: string | null;
    notes: string | null;
    created_at: string;
}

export interface Certification {
    id: string;
    user_id: string;
    name: string;
    area: string | null;
    difficulty: CertDifficulty | null;
    market_recognition: string | null;
    price: number | null;
    notes: string | null;
    created_at: string;
}

export interface NetworkingContact {
    id: string;
    user_id: string;
    name: string;
    company: string | null;
    role_title: string | null;
    contact: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    notes: string | null;
    last_contact_at: string | null;
    next_follow_up_at: string | null;
    follow_up_interval_months: number;
    created_at: string;
}

export interface Database {
    public: {
        Tables: {
            applications: {
                Row: Application;
                Insert: Omit<Application, 'id' | 'created_at'>;
                Update: Partial<Omit<Application, 'id' | 'user_id' | 'created_at'>>;
            };
            companies: {
                Row: Company;
                Insert: Omit<Company, 'id' | 'created_at'>;
                Update: Partial<Omit<Company, 'id' | 'user_id' | 'created_at'>>;
            };
            certifications: {
                Row: Certification;
                Insert: Omit<Certification, 'id' | 'created_at'>;
                Update: Partial<Omit<Certification, 'id' | 'user_id' | 'created_at'>>;
            };
            networking_contacts: {
                Row: NetworkingContact;
                Insert: Omit<NetworkingContact, 'id' | 'created_at'>;
                Update: Partial<Omit<NetworkingContact, 'id' | 'user_id' | 'created_at'>>;
            };
        };
        Enums: {
            work_mode: WorkMode;
            application_status: ApplicationStatus;
            application_category: ApplicationCategory;
            cert_difficulty: CertDifficulty;
        };
    };
}
