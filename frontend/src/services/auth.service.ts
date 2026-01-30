import { supabase } from './supabase';

// Interface pour les données utilisateur lors de l'inscription
export interface UserSignUpData {
  fullName: string;
  phone?: string;
  profession?: string;
  city: string;
  country: string;
}

// Interface pour les réponses du service
export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
}

/**
 * Inscription d'un nouvel utilisateur
 * Crée un compte Auth ET un profil dans la table users
 */
export const signUp = async (
  email: string,
  password: string,
  userData: UserSignUpData
): Promise<AuthResponse> => {
  try {
    // 1. Créer le compte d'authentification Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Erreur lors de la création du compte',
      };
    }

    // 2. Créer le profil utilisateur dans la table users
    const newUser = {
      id: authData.user.id,
      email: email,
      full_name: userData.fullName,
      phone: userData.phone || null,
      profession: userData.profession || null,
      city: userData.city,
      country: userData.country,
    };

    const { error: userError } = await supabase
      .from('users')
      .insert(newUser as any);

    if (userError) {
      console.error('User profile creation error:', userError);
      return {
        success: false,
        error: 'Erreur lors de la création du profil utilisateur',
      };
    }

    // Succès !
    return {
      success: true,
      message: 'Compte créé avec succès',
      user: authData.user,
    };
  } catch (err: any) {
    console.error('SignUp error:', err);
    return {
      success: false,
      error: err.message || 'Une erreur inattendue est survenue',
    };
  }
};

/**
 * Connexion d'un utilisateur
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Identifiants incorrects',
      };
    }

    return {
      success: true,
      message: 'Connexion réussie',
      user: data.user,
    };
  } catch (err: any) {
    console.error('SignIn error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la connexion',
    };
  }
};

/**
 * Déconnexion de l'utilisateur
 */
export const signOut = async (): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Déconnexion réussie',
    };
  } catch (err: any) {
    console.error('SignOut error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la déconnexion',
    };
  }
};

/**
 * Récupère l'utilisateur actuellement connecté
 */
export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'Aucun utilisateur connecté',
      };
    }

    return {
      success: true,
      user: user,
    };
  } catch (err: any) {
    console.error('GetCurrentUser error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la récupération de l\'utilisateur',
    };
  }
};

/**
 * Récupère le profil complet de l'utilisateur depuis la table users
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data,
    };
  } catch (err: any) {
    console.error('GetUserProfile error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la récupération du profil',
    };
  }
};
