// Types TypeScript pour les tables Supabase

// Table: users
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  profession: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

// Table: cvs
export interface CV {
  id: string;
  user_id: string;
  file_url: string;
  skills: string[] | null;
  experience_years: number | null;
  education: string | null;
  created_at: string;
  updated_at: string;
}

// Table: job_offers
export interface JobOffer {
  id: string;
  title: string;
  company: string;
  city: string | null;
  country: string | null;
  job_url: string;
  description: string | null;
  profession: string | null;
  scraped_at: string;
}

// Table: applications
export type ApplicationStatus = 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';

export interface Application {
  id: string;
  user_id: string;
  cv_id: string;
  job_offer_id: string;
  status: ApplicationStatus;
  cover_letter: string | null;
  applied_at: string;
  response_received_at: string | null;
}

// Table: notifications
export interface Notification {
  id: string;
  user_id: string;
  application_id: string | null;
  message: string;
  sent_at: string;
}

// Type Database qui regroupe toutes les tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      cvs: {
        Row: CV;
        Insert: Omit<CV, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CV, 'id' | 'user_id' | 'created_at'>>;
      };
      job_offers: {
        Row: JobOffer;
        Insert: Omit<JobOffer, 'id' | 'scraped_at'>;
        Update: Partial<Omit<JobOffer, 'id' | 'scraped_at'>>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, 'id' | 'applied_at' | 'response_received_at'>;
        Update: Partial<Omit<Application, 'id' | 'user_id' | 'applied_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'sent_at'>;
        Update: Partial<Omit<Notification, 'id' | 'sent_at'>>;
      };
    };
  };
}

// Types helper pour faciliter l'utilisation
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
