import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Récupère le profil complet d'un utilisateur
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupère le CV d'un utilisateur
 */
export const getUserCV = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching user CV:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupère les détails d'une offre d'emploi
 */
export const getJobOffer = async (jobOfferId: string) => {
  try {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('id', jobOfferId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching job offer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crée une nouvelle candidature dans la table applications
 */
export const createApplication = async (applicationData: {
  user_id: string;
  cv_id: string;
  job_offer_id: string;
  cover_letter: string;
  status?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: applicationData.user_id,
        cv_id: applicationData.cv_id,
        job_offer_id: applicationData.job_offer_id,
        cover_letter: applicationData.cover_letter,
        status: applicationData.status || 'sent',
        applied_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating application:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crée une offre d'emploi ou récupère une existante (évite les doublons)
 * @param jobData - Détails de l'offre (job_url est unique)
 * @returns { success: boolean, data?: JobOffer, error?: string }
 */
export const createOrGetJobOffer = async (jobData: {
  title: string;
  company: string;
  city?: string;
  country?: string;
  job_url: string;
  description?: string;
  profession?: string;
  contact_email?: string;
}) => {
  try {
    console.log('🔍 Vérification si l\'offre existe déjà...');
    
    // Vérifier si l'offre existe déjà (par job_url unique)
    const { data: existingJob, error: searchError } = await supabase
      .from('job_offers')
      .select('*')
      .eq('job_url', jobData.job_url)
      .maybeSingle();

    if (searchError) {
      console.error('Erreur recherche offre:', searchError);
    }

    if (existingJob) {
      console.log(`✅ Offre existante trouvée (ID: ${existingJob.id})`);
      return { success: true, data: existingJob };
    }

    // L'offre n'existe pas, la créer
    console.log('📝 Création de la nouvelle offre...');
    const { data: newJob, error: insertError } = await supabase
      .from('job_offers')
      .insert({
        title: jobData.title,
        company: jobData.company,
        city: jobData.city || 'Non spécifié',
        country: jobData.country || 'France',
        job_url: jobData.job_url,
        description: jobData.description || '',
        profession: jobData.profession || jobData.title,
        contact_email: jobData.contact_email,
        scraped_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;
    
    console.log(`✅ Nouvelle offre créée (ID: ${newJob.id})`);
    return { success: true, data: newJob };
  } catch (error: any) {
    console.error('❌ Erreur création/récupération offre:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crée une notification
 */
export const createNotification = async (notificationData: {
  user_id: string;
  application_id: string | null;
  message: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationData.user_id,
        application_id: notificationData.application_id,
        message: notificationData.message,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Télécharge un fichier depuis Supabase Storage
 */
export const downloadFile = async (filePath: string): Promise<Buffer | null> => {
  try {
    const { data, error } = await supabase
      .storage
      .from('cvs')
      .download(filePath);

    if (error) throw error;
    
    const buffer = Buffer.from(await data.arrayBuffer());
    return buffer;
  } catch (error: any) {
    console.error('Error downloading file:', error);
    return null;
  }
};
