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
export type WebsiteApplicationType = 'both' | 'nacional' | 'internacional';
export type LinkedinContentStatus = 'planned' | 'scheduled' | 'posted' | 'not_done';

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
    industries: string[] | null;
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
    birthday_date: string | null;
    follow_up_interval_months: number;
    created_at: string;
}

export interface WebsiteToApply {
    id: string;
    user_id: string;
    name: string;
    website_url: string;
    type: WebsiteApplicationType;
    created_at: string;
}

export interface Pitch {
    id: string;
    user_id: string;
    name: string;
    pitch: string;
    created_at: string;
}

export interface SavedLink {
    id: string;
    user_id: string;
    url: string;
    title: string;
    notes: string | null;
    description: string | null;
    preview_image_url: string | null;
    site_name: string | null;
    created_at: string;
}

export interface LinkedinContentPlan {
    id: string;
    user_id: string;
    scheduled_date: string;
    scheduled_time: string;
    theme: string;
    content_type: string | null;
    title_hook: string | null;
    content: string | null;
    objective: string | null;
    cta: string | null;
    status: LinkedinContentStatus;
    performance: string | null;
    created_at: string;
}

export interface Resume {
    id: string;
    user_id: string;
    file_name: string;
    storage_path: string;
    file_size_bytes: number;
    mime_type: string;
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
            websites_to_apply: {
                Row: WebsiteToApply;
                Insert: Omit<WebsiteToApply, 'id' | 'created_at'>;
                Update: Partial<Omit<WebsiteToApply, 'id' | 'user_id' | 'created_at'>>;
            };
            pitches: {
                Row: Pitch;
                Insert: Omit<Pitch, 'id' | 'created_at'>;
                Update: Partial<Omit<Pitch, 'id' | 'user_id' | 'created_at'>>;
            };
            saved_links: {
                Row: SavedLink;
                Insert: Omit<SavedLink, 'id' | 'created_at'>;
                Update: Partial<Omit<SavedLink, 'id' | 'user_id' | 'created_at'>>;
            };
            linkedin_content_plans: {
                Row: LinkedinContentPlan;
                Insert: Omit<LinkedinContentPlan, 'id' | 'created_at'>;
                Update: Partial<Omit<LinkedinContentPlan, 'id' | 'user_id' | 'created_at'>>;
            };
            resumes: {
                Row: Resume;
                Insert: Omit<Resume, 'id' | 'created_at'>;
                Update: Partial<Omit<Resume, 'id' | 'user_id' | 'created_at'>>;
            };
        };
        Enums: {
            work_mode: WorkMode;
            application_status: ApplicationStatus;
            application_category: ApplicationCategory;
            cert_difficulty: CertDifficulty;
            website_application_type: WebsiteApplicationType;
        };
    };
}
