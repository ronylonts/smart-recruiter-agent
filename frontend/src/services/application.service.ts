import { supabase } from './supabase';

// Types de réponse
interface ApplicationServiceResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// Types pour les filtres et pagination
interface ApplicationFilters {
  status?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Récupère toutes les candidatures d'un utilisateur avec pagination et filtres
 * @param userId - ID de l'utilisateur
 * @param filters - Filtres optionnels (statut, recherche, dates)
 * @param pagination - Options de pagination (page, limit)
 * @returns Promise<ApplicationServiceResponse>
 */
export const getUserApplications = async (
  userId: string,
  filters?: ApplicationFilters,
  pagination?: PaginationOptions
): Promise<ApplicationServiceResponse> => {
  try {
    let query = supabase
      .from('applications')
      .select(`
        *,
        job_offers (
          id,
          title,
          company,
          city,
          country,
          job_url,
          description,
          profession
        ),
        cvs (
          id,
          file_url,
          skills,
          experience_years,
          education
        )
      `, { count: 'exact' })
      .eq('user_id', userId);

    // Filtre par statut
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Filtre par recherche (entreprise ou poste)
    if (filters?.searchQuery) {
      // Note: Supabase ne supporte pas directement la recherche sur les jointures
      // On doit faire un filtre côté client ou utiliser une vue SQL
      // Pour l'instant, on récupère toutes les données et on filtre côté client
    }

    // Filtre par date d'envoi
    if (filters?.startDate) {
      query = query.gte('applied_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('applied_at', filters.endDate);
    }

    // Tri par date décroissante
    query = query.order('applied_at', { ascending: false });

    // Pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    query = query.range(startIndex, endIndex);

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des candidatures : ${error.message}`
      };
    }

    // Filtre côté client pour la recherche (si nécessaire)
    let filteredData = data || [];
    if (filters?.searchQuery && filteredData.length > 0) {
      const query = filters.searchQuery.toLowerCase();
      filteredData = filteredData.filter((app: any) => 
        app.job_offers?.company?.toLowerCase().includes(query) ||
        app.job_offers?.title?.toLowerCase().includes(query)
      );
    }

    return {
      success: true,
      message: 'Candidatures récupérées avec succès',
      data: {
        applications: filteredData,
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    };
  } catch (err: any) {
    console.error('getUserApplications error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};

/**
 * Récupère les détails complets d'une candidature
 * @param applicationId - ID de la candidature
 * @returns Promise<ApplicationServiceResponse>
 */
export const getApplicationById = async (
  applicationId: string
): Promise<ApplicationServiceResponse> => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_offers (
          id,
          title,
          company,
          city,
          country,
          job_url,
          description,
          profession,
          scraped_at
        ),
        cvs (
          id,
          file_url,
          skills,
          experience_years,
          education,
          created_at
        )
      `)
      .eq('id', applicationId)
      .single();

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération de la candidature : ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Candidature introuvable'
      };
    }

    return {
      success: true,
      message: 'Candidature récupérée avec succès',
      data: data
    };
  } catch (err: any) {
    console.error('getApplicationById error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};

/**
 * Met à jour le statut d'une candidature
 * @param applicationId - ID de la candidature
 * @param status - Nouveau statut
 * @returns Promise<ApplicationServiceResponse>
 */
export const updateApplicationStatus = async (
  applicationId: string,
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview'
): Promise<ApplicationServiceResponse> => {
  try {
    // Mise à jour du statut
    const updates: any = { status };

    // Si le statut change vers accepted, rejected ou interview, on met à jour response_received_at
    if (['accepted', 'rejected', 'interview'].includes(status)) {
      updates.response_received_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour du statut : ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Statut mis à jour avec succès',
      data: data
    };
  } catch (err: any) {
    console.error('updateApplicationStatus error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};

/**
 * Calcule les statistiques des candidatures d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @returns Promise<ApplicationServiceResponse>
 */
export const getApplicationStats = async (
  userId: string
): Promise<ApplicationServiceResponse> => {
  try {
    // Récupérer toutes les candidatures de l'utilisateur
    const { data, error } = await supabase
      .from('applications')
      .select('status, response_received_at, applied_at')
      .eq('user_id', userId) as {
        data: Array<{
          status: string;
          response_received_at: string | null;
          applied_at: string;
        }> | null;
        error: any;
      };

    if (error) {
      return {
        success: false,
        error: `Erreur lors du calcul des statistiques : ${error.message}`
      };
    }

    const applications = data || [];
    const total = applications.length;

    // Calculer les statistiques
    const stats = {
      total: total,
      pending: applications.filter(app => app.status === 'pending').length,
      sent: applications.filter(app => app.status === 'sent').length,
      accepted: applications.filter(app => app.status === 'accepted').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      interview: applications.filter(app => app.status === 'interview').length,
      
      // Réponses positives (accepté ou entretien)
      positiveResponses: applications.filter(
        app => app.status === 'accepted' || app.status === 'interview'
      ).length,
      
      // Réponses reçues (toutes les candidatures avec response_received_at)
      responsesReceived: applications.filter(
        app => app.response_received_at !== null
      ).length,
      
      // Taux de réponse (réponses positives / total)
      responseRate: total > 0 
        ? Math.round((applications.filter(
            app => app.status === 'accepted' || app.status === 'interview'
          ).length / total) * 100)
        : 0,
      
      // Temps moyen de réponse (en jours)
      averageResponseTime: 0
    };

    // Calculer le temps moyen de réponse
    const applicationsWithResponse = applications.filter(
      app => app.response_received_at !== null
    );

    if (applicationsWithResponse.length > 0) {
      const totalDays = applicationsWithResponse.reduce((sum, app) => {
        const appliedDate = new Date(app.applied_at);
        const responseDate = new Date(app.response_received_at!);
        const diffDays = Math.floor(
          (responseDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + diffDays;
      }, 0);
      
      stats.averageResponseTime = Math.round(totalDays / applicationsWithResponse.length);
    }

    return {
      success: true,
      message: 'Statistiques calculées avec succès',
      data: stats
    };
  } catch (err: any) {
    console.error('getApplicationStats error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};

/**
 * Récupère les dernières candidatures d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @param limit - Nombre de candidatures à récupérer (défaut: 5)
 * @returns Promise<ApplicationServiceResponse>
 */
export const getRecentApplications = async (
  userId: string,
  limit: number = 5
): Promise<ApplicationServiceResponse> => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_offers (
          id,
          title,
          company,
          city,
          country
        )
      `)
      .eq('user_id', userId)
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des candidatures récentes : ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Candidatures récentes récupérées avec succès',
      data: data || []
    };
  } catch (err: any) {
    console.error('getRecentApplications error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};

/**
 * Supprime une candidature
 * @param applicationId - ID de la candidature
 * @returns Promise<ApplicationServiceResponse>
 */
export const deleteApplication = async (
  applicationId: string
): Promise<ApplicationServiceResponse> => {
  try {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la suppression de la candidature : ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Candidature supprimée avec succès'
    };
  } catch (err: any) {
    console.error('deleteApplication error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};

/**
 * Crée une nouvelle candidature
 * @param applicationData - Données de la candidature
 * @returns Promise<ApplicationServiceResponse>
 */
export const createApplication = async (
  applicationData: {
    user_id: string;
    cv_id: string;
    job_offer_id: string;
    cover_letter?: string;
    status?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  }
): Promise<ApplicationServiceResponse> => {
  try {
    const newApplication = {
      user_id: applicationData.user_id,
      cv_id: applicationData.cv_id,
      job_offer_id: applicationData.job_offer_id,
      cover_letter: applicationData.cover_letter || null,
      status: applicationData.status || 'pending',
      applied_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('applications')
      .insert(newApplication as any)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la création de la candidature : ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Candidature créée avec succès',
      data: data
    };
  } catch (err: any) {
    console.error('createApplication error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue'
    };
  }
};
