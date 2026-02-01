import { supabase } from './supabase';

// Interface pour les métadonnées du CV
export interface CVMetadata {
  skills: string[];
  experienceYears: number;
  education: string;
}

// Interface pour les réponses du service
export interface CVServiceResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Upload d'un CV avec ses métadonnées
 * 1. Upload le fichier dans Supabase Storage (bucket "cvs")
 * 2. Sauvegarde les métadonnées dans la table cvs
 */
export const uploadCV = async (
  userId: string,
  file: File,
  metadata: CVMetadata
): Promise<CVServiceResponse> => {
  try {
    // Validation du fichier
    if (!file) {
      return {
        success: false,
        error: 'Aucun fichier fourni',
      };
    }

    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Seuls les fichiers PDF sont acceptés',
      };
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'Le fichier ne doit pas dépasser 5MB',
      };
    }

    // 1. Upload du fichier vers Supabase Storage
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Erreur lors de l'upload : ${uploadError.message}`,
      };
    }

    // 2. Obtenir l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from('cvs')
      .getPublicUrl(fileName);

    // 3. Sauvegarder les métadonnées dans la table cvs
    const cvData = {
      user_id: userId,
      file_url: publicUrl,
      skills: metadata.skills,
      experience_years: metadata.experienceYears,
      education: metadata.education,
    };

    const { data: dbData, error: dbError } = await supabase
      .from('cvs')
      .insert(cvData as any)
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Nettoyer le fichier uploadé en cas d'erreur DB
      await supabase.storage
        .from('cvs')
        .remove([fileName]);

      return {
        success: false,
        error: `Erreur lors de la sauvegarde : ${dbError.message}`,
      };
    }

    return {
      success: true,
      message: 'CV uploadé avec succès',
      data: dbData,
    };
  } catch (err: any) {
    console.error('UploadCV error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue',
    };
  }
};

/**
 * Récupère le(s) CV d'un utilisateur
 */
export const getUserCV = async (userId: string): Promise<CVServiceResponse> => {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'ID utilisateur requis',
      };
    }

    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GetUserCV error:', error);
      return {
        success: false,
        error: `Erreur lors de la récupération : ${error.message}`,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    console.error('GetUserCV error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la récupération du CV',
    };
  }
};

/**
 * Récupère un CV spécifique par son ID
 */
export const getCVById = async (cvId: string): Promise<CVServiceResponse> => {
  try {
    if (!cvId) {
      return {
        success: false,
        error: 'ID du CV requis',
      };
    }

    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', cvId)
      .single();

    if (error) {
      console.error('GetCVById error:', error);
      return {
        success: false,
        error: `Erreur lors de la récupération : ${error.message}`,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (err: any) {
    console.error('GetCVById error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la récupération du CV',
    };
  }
};

/**
 * Met à jour les métadonnées d'un CV
 * Note: Ne met pas à jour le fichier PDF, seulement les métadonnées
 */
export const updateCV = async (
  cvId: string,
  metadata: Partial<CVMetadata>
): Promise<CVServiceResponse> => {
  try {
    if (!cvId) {
      return {
        success: false,
        error: 'ID du CV requis',
      };
    }

    // Construire l'objet de mise à jour
    const updateData: any = {};
    
    if (metadata.skills !== undefined) {
      updateData.skills = metadata.skills;
    }
    if (metadata.experienceYears !== undefined) {
      updateData.experience_years = metadata.experienceYears;
    }
    if (metadata.education !== undefined) {
      updateData.education = metadata.education;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'Aucune donnée à mettre à jour',
      };
    }

    const { data, error } = (await supabase
      .from('cvs')
      .update(updateData)
      .eq('id', cvId)
      .select()
      .single()) as { data: any; error: any };

    if (error) {
      console.error('UpdateCV error:', error);
      return {
        success: false,
        error: `Erreur lors de la mise à jour : ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'CV mis à jour avec succès',
      data: data,
    };
  } catch (err: any) {
    console.error('UpdateCV error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la mise à jour du CV',
    };
  }
};

/**
 * Supprime un CV (fichier + entrée DB)
 */
export const deleteCV = async (cvId: string): Promise<CVServiceResponse> => {
  try {
    if (!cvId) {
      return {
        success: false,
        error: 'ID du CV requis',
      };
    }

    // 1. Récupérer les infos du CV pour obtenir le file_url
    const { data: cvData, error: fetchError } = await supabase
      .from('cvs')
      .select('file_url')
      .eq('id', cvId)
      .single() as {
        data: { file_url: string } | null;
        error: any;
      };

    if (fetchError) {
      console.error('Fetch CV error:', fetchError);
      return {
        success: false,
        error: `CV introuvable : ${fetchError.message}`,
      };
    }

    // 2. Extraire le chemin du fichier depuis l'URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/cvs/{path}
    const fileUrl = cvData?.file_url;
    
    if (!fileUrl) {
      return {
        success: false,
        error: 'URL du fichier introuvable',
      };
    }
    
    const match = fileUrl.match(/\/cvs\/(.+)$/);
    const filePath = match ? match[1] : null;

    if (!filePath) {
      console.error('Could not extract file path from URL:', fileUrl);
      return {
        success: false,
        error: 'Impossible d\'extraire le chemin du fichier',
      };
    }

    // 3. Supprimer le fichier du storage
    const { error: storageError } = await supabase.storage
      .from('cvs')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue quand même la suppression en DB
    }

    // 4. Supprimer l'entrée de la base de données
    const { error: dbError } = await supabase
      .from('cvs')
      .delete()
      .eq('id', cvId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return {
        success: false,
        error: `Erreur lors de la suppression : ${dbError.message}`,
      };
    }

    return {
      success: true,
      message: 'CV supprimé avec succès',
    };
  } catch (err: any) {
    console.error('DeleteCV error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la suppression du CV',
    };
  }
};

/**
 * Télécharge un CV (génère une URL signée temporaire)
 */
export const downloadCV = async (cvId: string): Promise<CVServiceResponse> => {
  try {
    if (!cvId) {
      return {
        success: false,
        error: 'ID du CV requis',
      };
    }

    // Récupérer le file_url du CV
    const { data: cvData, error: fetchError } = await supabase
      .from('cvs')
      .select('file_url')
      .eq('id', cvId)
      .single() as {
        data: { file_url: string } | null;
        error: any;
      };

    if (fetchError) {
      console.error('Fetch CV error:', fetchError);
      return {
        success: false,
        error: `CV introuvable : ${fetchError.message}`,
      };
    }

    // Extraire le chemin du fichier
    const fileUrl = cvData?.file_url;
    
    if (!fileUrl) {
      return {
        success: false,
        error: 'URL du fichier introuvable',
      };
    }
    
    const match = fileUrl.match(/\/cvs\/(.+)$/);
    const filePath = match ? match[1] : null;

    if (!filePath) {
      return {
        success: false,
        error: 'Impossible d\'extraire le chemin du fichier',
      };
    }

    // Créer une URL signée valide pour 60 secondes
    const { data, error } = await supabase.storage
      .from('cvs')
      .createSignedUrl(filePath, 60);

    if (error) {
      console.error('Create signed URL error:', error);
      return {
        success: false,
        error: `Erreur lors de la génération du lien : ${error.message}`,
      };
    }

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
        expiresIn: 60, // secondes
      },
    };
  } catch (err: any) {
    console.error('DownloadCV error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors du téléchargement du CV',
    };
  }
};
